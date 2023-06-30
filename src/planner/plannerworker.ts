import { LatheCode } from '../common/lathecode';
import { optimizeMoves } from './optimize';
import { Painter } from './painter';
import * as Colors from "../common/colors";
import { Pixel, PixelMove } from "./pixel";

export class ToWorkerMessage {
  constructor(readonly latheCode?: LatheCode, readonly pxPerMm?: number) {}
}

export class FromWorkerMessage {
  constructor(
    readonly progress?: number,
    readonly error?: string,
    readonly moves?: PixelMove[],
    readonly canvas?: {width: number, height: number, data: Uint8ClampedArray},
    readonly tool?: {width: number, height: number, data: Uint8ClampedArray, x: number, y: number}) {}
}

const REMOVED_RGB_NUMBER = Colors.COLOR_REMOVED.rgbNumber();
const STOCK_RGB_NUMBER = Colors.COLOR_STOCK.rgbNumber();
const PART_RGB_NUMBER = Colors.COLOR_PART.rgbNumber();

export class PlannerWorker {
  private painter: Painter;
  private canvas: OffscreenCanvas;
  private canvasCtx: OffscreenCanvasRenderingContext2D;
  private tool: OffscreenCanvas;
  private toolCtx: OffscreenCanvasRenderingContext2D;

  private done = false;
  private toolX;
  private toolY;
  private upAllowed = true;
  private passMaxDepth = 50;
  private passIndex = 0;
  private passHasCuts = false;
  private moves: PixelMove[] = [];
  private partBitmap: number[][] = [];
  private toolData: Uint8ClampedArray;
  private toolCuttingEdges: Set<number> = new Set();
  private toolCuttingEdgeX: Map<number, number> = new Map();
  private toolCuttingEdgeY: Map<number, number> = new Map();

  constructor(latheCode: LatheCode, pxPerMm: number, readonly postMessage: (message: any) => any) {
    this.painter = new Painter(latheCode, pxPerMm);
    this.canvas = this.painter.createCanvas();
    this.tool = this.painter.createTool();

    this.toolX = this.canvas.width;
    this.toolY = this.canvas.height;
    this.canvasCtx = this.canvas.getContext("2d")!;
    this.partBitmap = this.createPartBitmap();

    this.toolCtx = this.tool.getContext("2d")!;
    this.toolData = this.toolCtx.getImageData(0, 0, this.tool.width, this.tool.height).data;

    for (let y = 0; y < this.tool.height; y++) {
      let depth = 0;
      for (let x = 0; x < this.tool.width; x++) {
        const i = (y * this.tool.width + x) * 4;
        if (
          this.toolData[i] == Colors.COLOR_TOOL.red() &&
          this.toolData[i + 1] == Colors.COLOR_TOOL.green() &&
          this.toolData[i + 2] == Colors.COLOR_TOOL.blue() &&
          this.toolData[i + 3] > 200
        ) {
          this.toolCuttingEdges.add(i);
          this.toolCuttingEdgeX.set(i, x);
          this.toolCuttingEdgeY.set(i, y);
          if (++depth > 2) break;
        }
      }
    }
    for (let x = 0; x < this.tool.width; x++) {
      let depth = 0;
      for (let y = 0; y < this.tool.height; y++) {
        const i = (y * this.tool.width + x) * 4;
        if (
          this.toolData[i] == Colors.COLOR_TOOL.red() &&
          this.toolData[i + 1] == Colors.COLOR_TOOL.green() &&
          this.toolData[i + 2] == Colors.COLOR_TOOL.blue() &&
          this.toolData[i + 3] > 200 && depth < 2
        ) {
          this.toolCuttingEdges.add(i);
          this.toolCuttingEdgeX.set(i, x);
          this.toolCuttingEdgeY.set(i, y);
          if (++depth > 2) break;
        }
      }
    }
  }

  plan() {
    let i = 0;
    this.postProgress();
    while (this.step()) {
      if (i++ % 1000 === 0) this.postProgress();
    }
    const moves = optimizeMoves(this.moves);
    this.postProgress();
    postMessage({moves});
  }

  private getProgress() {
    if (this.done) return 1;
    const currentPassProgress0To1 = (this.canvas.width - this.toolX) / this.canvas.width;
    return (this.passIndex - 1 + currentPassProgress0To1) * this.passMaxDepth / this.canvas.height;
  }

  private postProgress() {
    const includeCanvas = this.canvas.width * this.canvas.height < 2000000;
    if (includeCanvas) this.flushBitmap();
    this.postMessage.call(null, {
      progress: this.getProgress(),
      canvas: includeCanvas ? {
        width: this.canvas.width,
        height: this.canvas.height,
        data: this.canvas.getContext('2d')!.getImageData(0, 0, this.canvas.width, this.canvas.height).data,
      } : undefined,
      tool: includeCanvas ? {
        width: this.tool!.width,
        height: this.tool!.height,
        data: this.tool!.getContext('2d')!.getImageData(0, 0, this.tool!.width, this.tool!.height).data,
        x: this.toolX,
        y: this.toolY,
      } : undefined,
    });
  }

  private createPartBitmap(): number[][] {
    const out: number[][] = [];
    const data = this.canvasCtx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    for (let x = 0; x < this.canvas.width; x++) {
      out[x] = [];
      for (let y = 0; y < this.canvas.height; y++) {
        const i = (y * this.canvas.width + x) * 4;
        out[x][y] = (data[i] << 16) | (data[i+1] << 8) | data[i+2];
      }
    }
    return out;
  }

  private getBitmap(x: number, y: number) {
    if (!this.partBitmap[x]) return 0;
    return this.partBitmap[x][y] || 0;
  }

  private setBitmap(x: number, y: number, rgb: number) {
    this.partBitmap[x][y] = rgb;
  }

  flushBitmap() {
    const imageData = this.canvasCtx.createImageData(this.canvas.width, this.canvas.height);
    const data = imageData.data;
    for (let x = 0; x < this.canvas.width; x++) {
      for (let y = 0; y < this.canvas.height; y++) {
        const i = (y * this.canvas.width + x) * 4;
        const rgbNumber = this.partBitmap[x][y];
        data[i] = (rgbNumber >> 16) & 0xFF;
        data[i+1] = (rgbNumber >> 8) & 0xFF;
        data[i+2] = rgbNumber & 0xFF;
        data[i+3] = 255;
      }
    }
    this.canvasCtx.putImageData(imageData, 0, 0);
  }

  /** Step tool by 1 pixel. */
  step(): boolean {
    if (this.done) return false;
    if (this.passIndex === 0) {
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, 0, this.getYForPass(1) - this.toolY));
      this.passIndex = 1;
      return true;
    }
    if (this.toolY > this.getYForPass(this.passIndex)) {
      if (this.upAllowed && this.tryMove(0, -1)) {
        return true;
      }
      if (this.tryMove(-1, -1)) {
        this.upAllowed = true;
        return true;
      }
    }
    if (this.tryMove(-1, 0)) {
      this.upAllowed = true;
      return true;
    }
    if (this.tryMove(-1, 1)) {
      this.upAllowed = true;
      return true;
    }
    if (this.tryMove(0, 1)) {
      this.upAllowed = false;
      return true;
    }
    if (this.getYForPass(this.passIndex) > 0 && this.passHasCuts) {
      this.upAllowed = true;
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, 0, this.canvas.height - this.toolY)); // pull back
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, this.canvas.width - this.toolX, 0)); // return right
      this.passIndex++;
      this.passHasCuts = false;
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, 0, this.getYForPass(this.passIndex) - this.toolY)); // move in
      return true;
    } else {
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, this.canvas.width - this.toolX, 0)); // return right
    }
    this.done = true;
    return false;
  }

  private getYForPass(i: number) {
    return Math.max(0, this.canvas.height - this.passMaxDepth * i);
  }

  private tryMove(xDelta: number, yDelta: number): boolean {
    const move = this.calculateMove(xDelta, yDelta);
    if (!move) return false;
    if (move.cutArea) this.passHasCuts = true;
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
      this.setBitmap(p.x, p.y, REMOVED_RGB_NUMBER);
    }
  }

  private calculateMove(xDelta: number, yDelta: number): PixelMove | null {
    const topLeftX = this.toolX + xDelta;
    const topLeftY = this.toolY + yDelta;
    if (topLeftX < 0 || topLeftX > this.canvas.width || topLeftY < 0 || topLeftY > this.canvas.height) return null;
    let pixels: Pixel[] = [];
    for (let i of this.toolCuttingEdges) {
      const x = this.toolCuttingEdgeX.get(i)!;
      const y = this.toolCuttingEdgeY.get(i)!;
      const rgb = this.getBitmap(topLeftX + x, topLeftY + y);
      if (rgb === STOCK_RGB_NUMBER) {
        pixels.push(new Pixel(topLeftX + x, topLeftY + y));
      } else if (rgb === PART_RGB_NUMBER) {
        // Not allowed to place cutter onto the part.
        return null;
      }
    }
    return new PixelMove(this.toolX, this.toolY, xDelta, yDelta, pixels.length, pixels);
  }
}

self.onmessage = (event) => {
  const data = event.data as ToWorkerMessage;
  const latheCode = data.latheCode;
  if (latheCode) {
    Object.setPrototypeOf(latheCode, LatheCode.prototype);
    try {
      new PlannerWorker(latheCode, data.pxPerMm || 100, self.postMessage).plan();
    } catch (e) {
      self.postMessage({error: e instanceof Error ? e.message : String(e)});
    }
  }
};
