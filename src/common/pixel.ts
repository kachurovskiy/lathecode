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

export type PixelBounds = {
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
};

export type PixelMoveData = {
  xStart: number,
  yStart: number,
  xDelta: number,
  yDelta: number,
  cutArea: number,
  cutPixels?: Pixel[],
  cutBounds?: PixelBounds | null,
  isFinishPass?: boolean,
};

const MERGED_CUT_PIXELS_INLINE_LIMIT = 10000;

export class PixelMove {
  static withoutCut(xStart: number, yStart: number, xDelta: number, yDelta: number, isFinishPass = false) {
    return new PixelMove(xStart, yStart, xDelta, yDelta, 0, [], null, isFinishPass);
  }

  static fromData(data: PixelMoveData): PixelMove {
    return new PixelMove(
      data.xStart,
      data.yStart,
      data.xDelta,
      data.yDelta,
      data.cutArea,
      data.cutPixels?.map(pixel => new Pixel(pixel.x, pixel.y)) ?? [],
      data.cutBounds ?? getPixelBounds(data.cutPixels ?? []),
      data.isFinishPass ?? false,
    );
  }

  constructor(
    readonly xStart: number,
    readonly yStart: number,
    readonly xDelta: number,
    readonly yDelta: number,
    readonly cutArea: number,
    readonly cutPixels: Pixel[],
    readonly cutBounds: PixelBounds | null = getPixelBounds(cutPixels),
    readonly isFinishPass = false) {}

  toString() {
    return `${this.xDelta},${this.yDelta}:${this.cutArea}`;
  }

  toConstructorString() {
    return `new PixelMove(${this.xStart}, ${this.yStart}, ${this.xDelta}, ${this.yDelta}, ${this.cutArea}, [])`;
  }

  toMove(pxPerMm: number): Move {
    return new Move(
      -this.xStart / pxPerMm,
      -this.yStart / pxPerMm,
      -this.xDelta / pxPerMm,
      -this.yDelta / pxPerMm,
      this.cutArea / pxPerMm / pxPerMm,
      this.getMaxCutWidth() / pxPerMm,
    );
  }

  getMaxCutWidth() {
    if (!this.cutBounds) return 0;
    return this.cutBounds.maxX - this.cutBounds.minX + 1;
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
    const cutPixelCount = this.cutPixels.length + m.cutPixels.length;
    const cutPixels = cutPixelCount <= MERGED_CUT_PIXELS_INLINE_LIMIT
      ? this.cutPixels.concat(m.cutPixels)
      : [];
    return new PixelMove(
      this.xStart,
      this.yStart,
      this.xDelta + m.xDelta,
      this.yDelta + m.yDelta,
      this.cutArea + m.cutArea,
      cutPixels,
      mergePixelBounds(this.cutBounds, m.cutBounds),
      this.isFinishPass || m.isFinishPass,
    );
  }

  getCut(): {width: number, height: number} {
    if (!this.cutBounds) return {width: 0, height: 0};
    return {
      width: this.cutBounds.maxX - this.cutBounds.minX + 1,
      height: this.cutBounds.maxY - this.cutBounds.minY + 1,
    };
  }

  withoutCutPixels(): PixelMove {
    if (!this.cutPixels.length) return this;
    return new PixelMove(this.xStart, this.yStart, this.xDelta, this.yDelta, this.cutArea, [], this.cutBounds, this.isFinishPass);
  }
}

function getPixelBounds(pixels: readonly Pixel[]): PixelBounds | null {
  if (!pixels.length) return null;
  let minX = pixels[0].x;
  let maxX = minX;
  let minY = pixels[0].y;
  let maxY = minY;
  for (const pixel of pixels) {
    minX = Math.min(minX, pixel.x);
    maxX = Math.max(maxX, pixel.x);
    minY = Math.min(minY, pixel.y);
    maxY = Math.max(maxY, pixel.y);
  }
  return {minX, maxX, minY, maxY};
}

function mergePixelBounds(a: PixelBounds | null, b: PixelBounds | null): PixelBounds | null {
  if (!a) return b;
  if (!b) return a;
  return {
    minX: Math.min(a.minX, b.minX),
    maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY),
    maxY: Math.max(a.maxY, b.maxY),
  };
}
