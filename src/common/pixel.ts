import { Move } from "./move";

export class Pixel {
  constructor(readonly x: number, readonly y: number) {}

  toString() {
    return `${this.x},${this.y}`;
  }

  equals(p: Pixel) {
    return this.x === p.x && this.y === p.y;
  }

  toConstructorString() {
    return `new Pixel(${this.x}, ${this.y})`;
  }
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
    return `new PixelMove(${this.xStart}, ${this.yStart}, ${this.xDelta}, ${this.yDelta}, ${this.cutArea}, [])`;
  }

  toMove(pxPerMm: number): Move {
    return new Move(-this.xStart / pxPerMm, -this.yStart / pxPerMm, -this.xDelta / pxPerMm, -this.yDelta / pxPerMm, this.cutArea / pxPerMm / pxPerMm);
  }

  isEmpty() {
    return !this.xDelta && !this.yDelta;
  }

  isBasic() {
    return (this.xDelta === 1 || this.xDelta === 0 || this.xDelta === -1) && (this.yDelta === 1 || this.yDelta === 0 || this.yDelta === -1);
  }

  length() {
    return Math.sqrt(this.xDelta * this.xDelta + this.yDelta * this.yDelta);
  }

  isHorizontalOrVertical() {
    return this.xDelta * this.yDelta === 0 && !this.isEmpty();
  }

  getAngleDegrees(): number {
    if (this.isEmpty()) return NaN;
    let degrees = Math.atan2(this.yDelta, this.xDelta) * 180 / Math.PI;
    if (degrees < 0) degrees += 360;
    return degrees;
  }

  getAngleToDegrees(m: PixelMove): number {
    let a = Math.abs(this.getAngleDegrees() - m.getAngleDegrees());
    return 360 - a < a ? 360 - a : a;
  }

  merge(m: PixelMove) {
    if (this.xStart + this.xDelta !== m.xStart || this.yStart + this.yDelta !== m.yStart) throw new Error(`merge error: ${this} + ${m}`);
    return new PixelMove(this.xStart, this.yStart, this.xDelta + m.xDelta, this.yDelta + m.yDelta, this.cutArea + m.cutArea, this.cutPixels.concat(m.cutPixels));
  }

  getCut(): {width: number, height: number} {
    if (!this.cutArea) return {width: 0, height: 0};
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let p of this.cutPixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return {width: maxX - minX + 1, height: maxY - minY + 1};
  }
}
