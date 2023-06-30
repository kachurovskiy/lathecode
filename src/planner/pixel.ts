import { Move } from "../common/move";

export class Pixel {
  constructor(readonly x: number, readonly y: number) {}
}

export class PixelMove {
  static withoutCut(xStart: number, yStart: number, xDelta: number, yDelta: number) {
    return new PixelMove(xStart, yStart, xDelta, yDelta, 0, []);
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

  toMove(pxPerMm: number): Move {
    return new Move(-this.xStart / pxPerMm, -this.yStart / pxPerMm, -this.xDelta / pxPerMm, -this.yDelta / pxPerMm, this.cutArea / pxPerMm / pxPerMm);
  }

  isEmpty() {
    return !this.xDelta && !this.yDelta;
  }

  isCodirectional(m: PixelMove) {
    if (!this.xDelta && !m.xDelta && this.yDelta * m.yDelta > 0) return true;
    if (!this.yDelta && !m.yDelta && this.xDelta * m.xDelta > 0) return true;
    if (this.yDelta * m.yDelta >= 0 && this.xDelta * m.xDelta >= 0 && this.yDelta / this.xDelta === m.yDelta / m.xDelta) return true;
    return false;
  }

  merge(m: PixelMove) {
    return new PixelMove(this.xStart, this.yStart, this.xDelta + m.xDelta, this.yDelta + m.yDelta, this.cutArea + m.cutArea, this.cutPixels.concat(m.cutPixels));
  }

  getCutWidth() {
    if (!this.cutArea) return 0;
    let minX = Infinity;
    let maxX = 0;
    for (let p of this.cutPixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
    }
    return maxX - minX;
  }
}
