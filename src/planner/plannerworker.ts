import { LatheCode, type ProfileSide } from '../common/lathecode';
import { getCuttingEdges, optimizeMoves as optimizePlannerMoves } from './optimize';
import { Pixel, PixelMove } from "../common/pixel";
import { Move } from '../common/move';
import { AppSettings, normalizeAppSettings } from '../common/settings';
import { PlannerBitmap, PlannerCell } from './bitmap';
import { Rasterizer } from './rasterizer';
import { VectorPlannerWorker } from './vectorplanner';

export class ToWorkerMessage {
  constructor(readonly latheCode?: LatheCode, readonly pxPerMm?: number, readonly settings?: Partial<AppSettings>) {}
}

export class FromWorkerMessage {
  constructor(
    readonly progressMessage?: string,
    readonly error?: string,
    readonly moves?: Move[],
    readonly canvas?: {width: number, height: number, data: Uint8ClampedArray},
    readonly tool?: {width: number, height: number, data: Uint8ClampedArray, x: number, y: number}) {}
}

class Pass {
  constructor(readonly x: number, readonly finishAfter: boolean) {}
}

type PlannerWorkerPostMessage = (message: FromWorkerMessage | {progressMessage?: string, error?: string, moves?: PixelMove[] | Move[]}) => void;
type PlannerRasterizer = Pick<Rasterizer, 'createPartBitmap' | 'createToolBitmap'>;

export type PlannerWorkerOptions = {
  rasterizer?: PlannerRasterizer,
  postMessage?: PlannerWorkerPostMessage,
  optimizeMoves?: typeof optimizePlannerMoves,
};

export class PlannerWorker {
  constructor(latheCode: LatheCode, settings: number | Partial<AppSettings> = {}, options: PlannerWorkerOptions = {}) {
    const normalizedSettings = typeof settings === 'number'
      ? normalizeAppSettings({pxPerMm: settings})
      : normalizeAppSettings(settings);

    if (normalizedSettings.plannerEngine === 'vector') {
      new VectorPlannerWorker(latheCode, normalizedSettings, {
        postMessage: options.postMessage,
      });
      return;
    }

    new PixelPlannerWorker(latheCode, normalizedSettings, options);
  }
}

class PixelPlannerWorker {
  private rasterizer: PlannerRasterizer;
  private canvas: PlannerBitmap;
  private tool: PlannerBitmap;
  private toolCuttingEdges: Pixel[];
  private toolOvershootX: number;
  private toolOvershootY: number;
  private toolX;
  private toolY;
  private profileSide: ProfileSide;
  private radialCutDirection: -1 | 1;
  private radialSafeY: number;
  private radialMinY = 0;
  private radialMaxY = 0;
  private mode: 'FACE' | 'TURN';
  private passes: Pass[];
  private previousFinishPass: Pass|null = null;
  private moves: PixelMove[] = [];
  private radialCutAllowed = true;
  private isFinishPass = false;
  private postMessage: PlannerWorkerPostMessage;
  private postPixelMoves: boolean;
  private optimizeMoves: typeof optimizePlannerMoves;
  private settings: AppSettings;
  private pxPerMm: number;

  constructor(private latheCode: LatheCode, settings: number | Partial<AppSettings>, options: PlannerWorkerOptions = {}) {
    this.settings = typeof settings === 'number'
      ? normalizeAppSettings({pxPerMm: settings})
      : normalizeAppSettings(settings);
    this.pxPerMm = this.settings.pxPerMm;
    const profile = latheCode.getSingleProfile();
    if (!profile) {
      if (latheCode.getProfiles().length > 1) throw new Error('Error: inside and outside not supported yet');
      throw new Error('Error: no segments');
    }
    this.profileSide = profile.side;
    this.radialCutDirection = this.profileSide === 'inside' ? 1 : -1;
    this.postMessage = options.postMessage || (message => postMessage(message));
    this.postPixelMoves = !!options.postMessage;
    this.optimizeMoves = options.optimizeMoves || optimizePlannerMoves;
    this.rasterizer = options.rasterizer || new Rasterizer(latheCode, this.pxPerMm);
    this.canvas = this.rasterizer.createPartBitmap();
    this.tool = this.rasterizer.createToolBitmap();
    this.toolCuttingEdges = getCuttingEdges(this.tool, this.profileSide === 'inside' ? 'bottom' : 'top', this.settings.cuttingEdgeThicknessPx);
    this.toolOvershootX = this.getToolOvershootX();
    this.toolOvershootY = this.getToolOvershootY();
    this.toolX = this.canvas.width;
    this.radialSafeY = this.getRadialSafeY();
    this.toolY = this.radialSafeY;
    this.mode = this.latheCode.getMode();
    if (this.profileSide === 'outside') {
      this.radialMinY = -this.toolOvershootY;
      this.radialMaxY = this.canvas.height;
    } else {
      const radialCutLimitY = this.getRadialCutLimitY();
      this.radialMinY = Math.min(this.radialSafeY, radialCutLimitY);
      this.radialMaxY = Math.max(this.radialSafeY, radialCutLimitY);
    }

    // Plan passes in advance so that we can finish the part fully before cutting off.
    const cutXCoords = this.latheCode.getCutoffStarts().map(z => this.canvas.width - z * this.pxPerMm - this.tool.width + 1);
    this.passes = cutXCoords.map(x => new Pass(x, true));
    let hasCutPasses = this.passes.length > 0;
    if (this.mode === 'FACE') {
      let x = this.canvas.width;
      while (true) {
        x -= this.getDepthOfCutPx();
        if (!cutXCoords.includes(x)) this.passes.push(new Pass(Math.max(0, x), x <= 0 && !hasCutPasses));
        if (x <= 0) break;
      }
    } else if (this.mode === 'TURN') {
      this.passes.push(... this.latheCode.getCutoffStarts().map(z => new Pass(this.canvas.width - z * this.pxPerMm - this.tool.width, false)));
      if (!this.passes.length) this.passes.push(new Pass(0, true));
    }
    this.passes.sort((a, b) => b.x - a.x); // descending

    try {
      if (this.mode === 'FACE') this.modeFace();
      else if (this.mode === 'TURN') this.modeTurn();
      else throw new Error('unsupported mode ' + this.mode);
    } catch (e) {
      this.postMessage({progressMessage: `Mode failure: ${e}`});
    }

    this.pullBackRadially();
    this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, this.canvas.width - this.toolX, 0)); // return right
    this.postProgress();
    this.postMessage({progressMessage: `Optimizing ${this.moves.length} moves...`});
    const moves = this.normalizeMovesForOutput(this.optimizeMoves(
      this.moves,
      (progressMessage) => this.postMessage({progressMessage}),
      this.profileSide === 'inside' ? 'minY' : 'maxY',
      this.settings));
    this.postMessage({progressMessage: `Showing ${moves.length} moves...`});
    this.postMessage({moves: this.postPixelMoves ? moves : moves.map(m => m.toMove(this.pxPerMm))});
  }

  private modeFace() {
    this.postMessage({progressMessage: `Starting first pass...`});
    this.postProgress();
    for (let passIndex = 0; passIndex < this.passes.length; passIndex++) {
      const xForPass = this.passes[passIndex].x;
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, xForPass - this.toolX, 0)); // position for this pass
      const maxX = passIndex === 0 ? this.canvas.width : this.passes[passIndex - 1].x;
      this.postProgressWhile(() => this.creep(this.toolX < maxX, false));
      this.pullBackRadially();
      this.radialCutAllowed = true;
      if (this.passes[passIndex].finishAfter) {
        this.postMessage({progressMessage: `Finishing previously cut area`});
        this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, (this.previousFinishPass?.x ?? this.canvas.width) - this.toolX, 0)); // position for the finish pass
        this.isFinishPass = true;
        this.postProgressWhile(() => this.creep(false, this.toolX > xForPass));
        this.isFinishPass = false;
        this.radialCutAllowed = true;
        this.pullBackRadially();
        this.previousFinishPass = this.passes[passIndex];
      }
      this.postMessage({progressMessage: `Completed pass ${passIndex}`});
    }
  }

  private modeTurn() {
    this.postMessage({progressMessage: `Starting first pass...`});
    this.postProgress();
    for (let passIndex = 0; passIndex < this.passes.length; passIndex++) {
      const endX = this.passes[passIndex].x;
      const startX = passIndex === 0 ? this.canvas.width : this.passes[passIndex - 1].x;
      for (let startY of this.getTurnStartYs()) {
        this.postMessage({progressMessage: `Starting subpass ${startY}`});
        const endY = this.getTurnEndY(startY, this.passes[passIndex].finishAfter);
        this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, startX - this.toolX, startY - this.toolY)); // position for this pass
        this.postProgressWhile(() => this.creep(false, this.toolX > endX, this.canCutToward(endY)));
        this.pullBackRadially();
        this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, startX - this.toolX, 0)); // back to start position
        this.radialCutAllowed = true;
      }
      if (this.passes[passIndex].finishAfter) {
        this.postMessage({progressMessage: `Finishing previously cut area`});
        this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, (this.previousFinishPass?.x ?? this.canvas.width) - this.toolX, 0)); // position for the finish pass
        this.isFinishPass = true;
        this.postProgressWhile(() => this.creep(false, this.toolX > endX));
        this.isFinishPass = false;
        this.radialCutAllowed = true;
        this.pullBackRadially();
        this.previousFinishPass = this.passes[passIndex];
      }
      this.postMessage({progressMessage: `Completed pass ${passIndex}`});
    }
  }

  private postProgress() {
    const includeCanvas = this.canvas.width * this.canvas.height < 2000000;
    this.postMessage({
      canvas: includeCanvas ? {
        width: this.canvas.width,
        height: this.canvas.height,
        data: this.canvas.toImageDataArray(),
      } : undefined,
      tool: includeCanvas ? {
        width: this.tool!.width,
        height: this.tool!.height,
        data: this.tool!.toImageDataArray(true),
        x: this.toolX,
        y: this.toolY,
      } : undefined,
    });
  }

  private postProgressWhile(f: () => boolean) {
    let time = Date.now();
    this.postProgress();
    while (f()) {
      if (Date.now() > time + 1000) {
        this.postProgress();
        time = Date.now();
      }
    }
  }

  private getBitmap(x: number, y: number): PlannerCell {
    return this.canvas.get(x, y);
  }

  private setBitmap(x: number, y: number, cell: PlannerCell) {
    this.canvas.set(x, y, cell);
  }

  private getToolOvershootX(): number {
    const radialEdgeY = this.profileSide === 'inside' ? this.getMaxCuttingEdgeY() : 0;
    return this.toolCuttingEdges.filter(e => e.y === radialEdgeY)[0]?.x || 0;
  }

  private getToolOvershootY(): number {
    if (this.profileSide === 'inside') {
      return this.getMaxCuttingEdgeY();
    }
    return this.toolCuttingEdges.filter(e => e.x === 0)[0]?.y || 0;
  }

  private getMaxCuttingEdgeY(): number {
    return this.toolCuttingEdges.length ? Math.max(...this.toolCuttingEdges.map(e => e.y)) : 0;
  }

  private getRadialSafeY(): number {
    if (this.profileSide === 'outside') return this.canvas.height;
    const y = this.getMinRemovableY();
    return (y === null ? 0 : y) - this.toolOvershootY;
  }

  private getRadialCutLimitY(): number {
    if (this.profileSide === 'outside') return this.canvas.height;
    const y = this.getMaxRemovableY();
    return y === null ? this.radialSafeY : y - this.toolOvershootY;
  }

  private getMaxRemovableY(): number | null {
    let result: number | null = null;
    for (let x = 0; x < this.canvas.width; x++) {
      for (let y = 0; y < this.canvas.height; y++) {
        const rgb = this.getBitmap(x, y);
        if (rgb === PlannerCell.Stock || rgb === PlannerCell.Finish) {
          result = Math.max(result ?? y, y);
        }
      }
    }
    return result;
  }

  private getMinRemovableY(): number | null {
    let result: number | null = null;
    for (let x = 0; x < this.canvas.width; x++) {
      for (let y = 0; y < this.canvas.height; y++) {
        const rgb = this.getBitmap(x, y);
        if (rgb === PlannerCell.Stock || rgb === PlannerCell.Finish) {
          result = Math.min(result ?? y, y);
        }
      }
    }
    return result;
  }

  private pullBackRadially() {
    this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, 0, this.radialSafeY - this.toolY));
  }

  private getTurnStartYs(): number[] {
    const result: number[] = [];
    if (this.radialCutDirection < 0) {
      for (let startY = this.canvas.height; startY >= 0; startY -= this.getDepthOfCutPx()) {
        result.push(startY);
      }
    } else {
      for (let startY = this.radialSafeY; startY <= this.radialMaxY; startY += this.getDepthOfCutPx()) {
        result.push(startY);
      }
    }
    return result;
  }

  private getTurnEndY(startY: number, finishAfter: boolean): number {
    if (!finishAfter) return this.radialCutDirection < 0 ? this.radialMinY : this.radialMaxY;
    return this.radialCutDirection < 0
      ? Math.max(this.radialMinY, startY - this.getDepthOfCutPx())
      : Math.min(this.radialMaxY, startY + this.getDepthOfCutPx());
  }

  private canCutToward(endY: number): boolean {
    return this.radialCutDirection < 0 ? this.toolY > endY : this.toolY < endY;
  }

  private creep(rightAllowed: boolean, leftAllowed: boolean, radialAllowed = true): boolean {
    const towardAllowed = this.radialCutAllowed && radialAllowed;
    const towardY = this.radialCutDirection;
    const awayY = -this.radialCutDirection;
    if (towardAllowed && this.tryMove(0, towardY)) {
      return true;
    }
    if (rightAllowed && towardAllowed && this.tryMove(1, towardY)) {
      return true;
    }
    if (rightAllowed && this.tryMove(1, 0)) {
      return true;
    }
    if (rightAllowed && this.tryMove(1, awayY)) {
      this.radialCutAllowed = true;
      return true;
    }
    if (leftAllowed && towardAllowed && this.tryMove(-1, towardY)) {
      return true;
    }
    if (leftAllowed && this.tryMove(-1, 0)) {
      return true;
    }
    if (leftAllowed && this.tryMove(-1, awayY)) {
      this.radialCutAllowed = true;
      return true;
    }
    if (this.tryMove(0, awayY)) {
      this.radialCutAllowed = false;
      return true;
    }
    return false;
  }

  private getDepthOfCutPx() {
    return this.latheCode.getDepth().cutMm * this.pxPerMm;
  }

  private tryMove(xDelta: number, yDelta: number): boolean {
    const move = this.calculateMove(xDelta, yDelta);
    if (!move) return false;
    this.addMove(move);
    return true;
  }

  private addMove(m: PixelMove) {
    this.moves.push(m);
    this.drawMove(m);
    this.toolX += m.xDelta;
    this.toolY += m.yDelta;
  }

  private drawMove(m: PixelMove) {
    for (let p of m.cutPixels) {
      this.setBitmap(p.x, p.y, PlannerCell.Removed);
    }
  }

  private calculateMove(xDelta: number, yDelta: number): PixelMove | null {
    const topLeftX = this.toolX + xDelta;
    const topLeftY = this.toolY + yDelta;
    if (topLeftY < this.radialMinY || topLeftX < -this.toolOvershootX || topLeftX > this.canvas.width || topLeftY > this.radialMaxY) return null;
    let pixels: Pixel[] = [];
    for (let p of this.toolCuttingEdges) {
      const rgb = this.getBitmap(topLeftX + p.x, topLeftY + p.y);
      if (rgb === PlannerCell.Stock || (rgb === PlannerCell.Finish && this.isFinishPass)) {
        pixels.push(new Pixel(topLeftX + p.x, topLeftY + p.y));
      } else if (rgb === PlannerCell.Part) {
        // Not allowed to place cutter onto the part.
        return null;
      } else if (rgb === PlannerCell.Finish) {
        // Only allow to touch finished surface during the finish pass.
        return null;
      }
    }
    // Don't optimize away moves during the finish pass for better results.
    const pixelCount = Math.max(this.isFinishPass && this.toolX < this.canvas.width ? 1 : 0, pixels.length);
    return new PixelMove(this.toolX, this.toolY, xDelta, yDelta, pixelCount, pixels);
  }

  private normalizeMovesForOutput(moves: PixelMove[]): PixelMove[] {
    if (this.profileSide === 'outside') return moves;
    return moves.map(m => new PixelMove(m.xStart, m.yStart + this.toolOvershootY, m.xDelta, m.yDelta, m.cutArea, m.cutPixels));
  }
}

self.onmessage = (event) => {
  const data = event.data as ToWorkerMessage;
  const latheCode = data.latheCode;
  if (latheCode) {
    Object.setPrototypeOf(latheCode, LatheCode.prototype);
    try {
      new PlannerWorker(new LatheCode(latheCode.getText()), normalizeAppSettings({...(data.settings ?? {}), pxPerMm: data.pxPerMm ?? data.settings?.pxPerMm}));
    } catch (e) {
      postMessage({error: e instanceof Error ? e.message : String(e)});
    }
  }
};
