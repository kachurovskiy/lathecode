import { LatheCode } from '../common/lathecode';
import { getCuttingEdges, optimizeMoves } from './optimize';
import { Painter } from './painter';
import * as Colors from "../common/colors";
import { Pixel, PixelMove } from "./pixel";

export class ToWorkerMessage {
  constructor(readonly latheCode?: LatheCode, readonly pxPerMm?: number) {}
}

export class FromWorkerMessage {
  constructor(
    readonly progressMessage?: string,
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
  private toolCuttingEdges: Pixel[];
  private toolOvershootX: number;
  private toolOvershootY: number;
  private toolX;
  private toolY;
  private passIndex = 0;
  private moves: PixelMove[] = [];
  private partBitmap: number[][] = [];

  constructor(private latheCode: LatheCode, private pxPerMm: number) {
    this.painter = new Painter(latheCode, pxPerMm);
    this.canvas = this.painter.createCanvas();
    this.canvasCtx = this.canvas.getContext("2d")!;
    this.tool = this.painter.createTool();
    this.toolCuttingEdges = getCuttingEdges(this.tool);
    this.toolOvershootX = this.toolCuttingEdges.filter(e => e.y === 0)[0]?.x || 0;
    this.toolOvershootY = this.toolCuttingEdges.filter(e => e.x === 0)[0]?.y || 0;
    this.toolX = this.canvas.width;
    this.toolY = this.canvas.height;
    this.partBitmap = this.createPartBitmap();

    // Generate moves.
    let time = Date.now();
    postMessage({progressMessage: `Starting first pass...`});
    this.postProgress();
    while (this.step()) {
      if (Date.now() > time + 1000) {
        this.postProgress();
        time = Date.now();
      }
    }
    this.postProgress();
    postMessage({progressMessage: `Optimizing ${this.moves.length} moves...`});
    postMessage({moves: optimizeMoves(this.moves, (progressMessage) => postMessage({progressMessage}))});
  }

  private postProgress() {
    const includeCanvas = this.canvas.width * this.canvas.height < 2000000;
    if (includeCanvas) this.flushBitmap();
    postMessage({
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

  private flushBitmap() {
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

  private step(): boolean {
    if (this.passIndex === 0) {
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, this.getXForPass(1) - this.toolX, 0));
      this.passIndex = 1;
      return true;
    }
    if (this.tryMove(0, -1)) {
      return true;
    }
    const rightAllowed = this.toolX < this.getXForPass(this.passIndex - 1);
    if (rightAllowed && this.tryMove(1, -1)) {
      return true;
    }
    if (rightAllowed && this.tryMove(1, 0)) {
      return true;
    }
    if (rightAllowed && this.tryMove(1, 1)) {
      return true;
    }
    if (this.getXForPass(this.passIndex) > 0) {
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, this.getDepthOfCutPx(), 0)); // return right
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, 0, this.canvas.height - this.toolY)); // pull back
      postMessage({progressMessage: `Finished pass ${this.passIndex}`});
      this.passIndex++;
      this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, this.getXForPass(this.passIndex) - this.toolX, 0)); // position for the next face
      return true;
    }
    this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, 0, this.canvas.height - this.toolY)); // pull back
    this.addMove(PixelMove.withoutCut(this.toolX, this.toolY, this.canvas.width - this.toolX, 0)); // return right
    console.log('done');
    return false;
  }

  private getDepthOfCutPx() {
    return this.latheCode.getDepth().cut * this.pxPerMm;
  }

  private getXForPass(i: number) {
    return Math.max(0, this.canvas.width - this.getDepthOfCutPx() * i);
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
      this.setBitmap(p.x, p.y, REMOVED_RGB_NUMBER);
    }
  }

  private calculateMove(xDelta: number, yDelta: number): PixelMove | null {
    const topLeftX = this.toolX + xDelta;
    const topLeftY = this.toolY + yDelta;
    if (topLeftY < -this.toolOvershootY || topLeftX < -this.toolOvershootX || topLeftX > this.canvas.width || topLeftY > this.canvas.height) return null;
    let pixels: Pixel[] = [];
    for (let p of this.toolCuttingEdges) {
      const rgb = this.getBitmap(topLeftX + p.x, topLeftY + p.y);
      if (rgb === STOCK_RGB_NUMBER) {
        pixels.push(new Pixel(topLeftX + p.x, topLeftY + p.y));
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
      new PlannerWorker(latheCode, data.pxPerMm || 100);
    } catch (e) {
      postMessage({error: e instanceof Error ? e.message : String(e)});
    }
  }
};
