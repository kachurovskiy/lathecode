import * as Colors from "./colors";

const REMOVED_RGB_NUMBER = Colors.COLOR_REMOVED.rgbNumber();
const STOCK_RGB_NUMBER = Colors.COLOR_STOCK.rgbNumber();
const PART_RGB_NUMBER = Colors.COLOR_PART.rgbNumber();

export class Pixel {
  constructor(readonly x: number, readonly y: number) {}
}

export class Move {
  static withoutCut(xStart: number, yStart: number, xDelta: number, yDelta: number) {
    return new Move(xStart, yStart, xDelta, yDelta, 0, []);
  }

  constructor(
    readonly xStart: number,
    readonly yStart: number,
    readonly xDelta: number,
    readonly yDelta: number,
    readonly cutArea: number,
    readonly cutPixels: Pixel[]) {}

  toString() {
    return `${this.xDelta},${this.yDelta}:${this.cutArea}`;
  }

  toConstructorString() {
    return `new Move(${this.xStart}, ${this.yStart}, ${this.xDelta}, ${this.yDelta}, ${this.cutArea}, [])`;
  }

  isEmpty() {
    return !this.xDelta && !this.yDelta;
  }

  isCodirectional(m: Move) {
    if (!this.xDelta && !m.xDelta && this.yDelta * m.yDelta > 0) return true;
    if (!this.yDelta && !m.yDelta && this.xDelta * m.xDelta > 0) return true;
    if (this.yDelta * m.yDelta >= 0 && this.xDelta * m.xDelta >= 0 && this.yDelta / this.xDelta === m.yDelta / m.xDelta) return true;
    return false;
  }

  merge(m: Move) {
    return new Move(this.xStart, this.yStart, this.xDelta + m.xDelta, this.yDelta + m.yDelta, this.cutArea + m.cutArea, this.cutPixels.concat(m.cutPixels));
  }
}

export class Planner {
  private stopped = false;
  private toolX;
  private toolY;
  private upAllowed = true;
  private passMaxDepth = 50;
  private passIndex = 0;
  private passHasCuts = false;
  private moves: Move[] = [];
  private partCtx: CanvasRenderingContext2D;
  private partBitmap: number[][] = [];
  private toolCtx: CanvasRenderingContext2D;
  private toolData: Uint8ClampedArray;
  private toolCuttingEdges: Set<number> = new Set();
  private toolCuttingEdgeX: Map<number, number> = new Map();
  private toolCuttingEdgeY: Map<number, number> = new Map();

  constructor(private partCanvas: HTMLCanvasElement, private toolCanvas: HTMLCanvasElement) {
    this.toolX = this.partCanvas.width;
    this.toolY = this.partCanvas.height;
    this.partCtx = this.partCanvas.getContext("2d")!;
    this.partBitmap = this.createPartBitmap();

    this.toolCtx = this.toolCanvas.getContext("2d")!;
    this.toolData = this.toolCtx.getImageData(0, 0, this.toolCanvas.width, this.toolCanvas.height).data;

    for (let y = 0; y < this.toolCanvas.height; y++) {
      for (let x = 0; x < this.toolCanvas.width; x++) {
        const i = (y * this.toolCanvas.width + x) * 4;
        if (
          this.toolData[i] == Colors.COLOR_TOOL.red() &&
          this.toolData[i + 1] == Colors.COLOR_TOOL.green() &&
          this.toolData[i + 2] == Colors.COLOR_TOOL.blue() &&
          this.toolData[i + 3] > 200
        ) {
          this.toolCuttingEdges.add(i);
          this.toolCuttingEdgeX.set(i, x);
          this.toolCuttingEdgeY.set(i, y);
          break;
        }
      }
    }
    for (let x = 0; x < this.toolCanvas.width; x++) {
      for (let y = 0; y < this.toolCanvas.height; y++) {
        const i = (y * this.toolCanvas.width + x) * 4;
        if (
          this.toolData[i] == Colors.COLOR_TOOL.red() &&
          this.toolData[i + 1] == Colors.COLOR_TOOL.green() &&
          this.toolData[i + 2] == Colors.COLOR_TOOL.blue() &&
          this.toolData[i + 3] > 200
        ) {
          this.toolCuttingEdges.add(i);
          this.toolCuttingEdgeX.set(i, x);
          this.toolCuttingEdgeY.set(i, y);
          break;
        }
      }
    }
  }

  getMoves() {
    if (!this.stopped) throw new Error('Planning did not finish yet');
    return this.moves.concat();
  }

  private createPartBitmap(): number[][] {
    const out: number[][] = [];
    const data = this.partCtx.getImageData(0, 0, this.partCanvas.width, this.partCanvas.height).data;
    for (let x = 0; x < this.partCanvas.width; x++) {
      out[x] = [];
      for (let y = 0; y < this.partCanvas.height; y++) {
        const i = (y * this.partCanvas.width + x) * 4;
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
    const imageData = this.partCtx.createImageData(this.partCanvas.width, this.partCanvas.height);
    const data = imageData.data;
    for (let x = 0; x < this.partCanvas.width; x++) {
      for (let y = 0; y < this.partCanvas.height; y++) {
        const i = (y * this.partCanvas.width + x) * 4;
        const rgbNumber = this.partBitmap[x][y];
        data[i] = (rgbNumber >> 16) & 0xFF;
        data[i+1] = (rgbNumber >> 8) & 0xFF;
        data[i+2] = rgbNumber & 0xFF;
        data[i+3] = 255;
      }
    }
    this.partCtx.putImageData(imageData, 0, 0);
  }

  /** Step tool by 1 pixel. */
  step(): boolean {
    if (this.stopped) return false;
    if (this.passIndex === 0) {
      this.addMove(Move.withoutCut(this.toolX, this.toolY, 0, this.getYForPass(1) - this.toolY));
      this.passIndex = 1;
      return true;
    }
    if (this.toolY > this.getYForPass(this.passIndex)) {
      if (this.upAllowed && this.tryMove(0, -1)) {
        return true;
      }
      if (this.tryMove(-1, -1)) {
        return true;
      }
    }
    if (this.tryMove(-1, 0)) {
      return true;
    }
    if (this.tryMove(-1, 1)) {
      return true;
    }
    if (this.tryMove(0, 1)) {
      this.upAllowed = false;
      return true;
    }
    if (this.getYForPass(this.passIndex) > 0 && this.passHasCuts) {
      this.upAllowed = true;
      this.addMove(Move.withoutCut(this.toolX, this.toolY, 0, this.partCanvas.height - this.toolY)); // pull back
      this.addMove(Move.withoutCut(this.toolX, this.toolY, this.partCanvas.width - this.toolX, 0)); // return right
      this.passIndex++;
      this.passHasCuts = false;
      this.addMove(Move.withoutCut(this.toolX, this.toolY, 0, this.getYForPass(this.passIndex) - this.toolY)); // move in
      return true;
    } else {
      this.addMove(Move.withoutCut(this.toolX, this.toolY, this.partCanvas.width - this.toolX, 0)); // return right
    }
    this.stopped = true;
    return false;
  }

  private getYForPass(i: number) {
    return Math.max(0, this.partCanvas.height - this.passMaxDepth * i);
  }

  private tryMove(xDelta: number, yDelta: number): boolean {
    const move = this.calculateMove(xDelta, yDelta);
    if (!move) return false;
    if (move.cutArea) this.passHasCuts = true;
    this.addMove(move);
    return true;
  }

  private addMove(m: Move) {
    this.moves.push(m);
    this.drawMove(m);
    this.toolX += m.xDelta;
    this.toolY += m.yDelta;
    this.toolCanvas.style.left = `${this.toolX}px`;
    this.toolCanvas.style.top = `${this.toolY}px`;
  }

  private drawMove(m: Move) {
    for (let p of m.cutPixels) {
      this.setBitmap(p.x, p.y, REMOVED_RGB_NUMBER);
    }
  }

  private calculateMove(xDelta: number, yDelta: number): Move | null {
    const topLeftX = this.toolX + xDelta;
    const topLeftY = this.toolY + yDelta;
    if (topLeftX < 0 || topLeftX > this.partCanvas.width || topLeftY < 0 || topLeftY > this.partCanvas.height) return null;
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
    return new Move(this.toolX, this.toolY, xDelta, yDelta, pixels.length, pixels);
  }
}
