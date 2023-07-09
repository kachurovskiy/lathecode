export class Move {
  constructor(
    readonly xStartMm: number,
    readonly yStartMm: number,
    readonly xDeltaMm: number,
    readonly yDeltaMm: number,
    readonly cutAreaMmSq: number) { }

  toString() {
    return `${this.xDeltaMm},${this.yDeltaMm}:${this.cutAreaMmSq}`;
  }

  toConstructorString() {
    return `new Move(${this.xStartMm}, ${this.yStartMm}, ${this.xDeltaMm}, ${this.yDeltaMm}, ${this.cutAreaMmSq})`;
  }

  isEmpty() {
    return !this.xDeltaMm && !this.yDeltaMm;
  }

  isBasic() {
    return Math.abs(this.xDeltaMm) <= 0.01 && Math.abs(this.yDeltaMm) <= 0.01;
  }

  toLatheCode() {
    if (!this.xDeltaMm) return '';
    const format = (a: number) => Math.abs(a).toFixed(3);
    if (this.yDeltaMm) return `L${format(this.xDeltaMm)} RS${format(this.yStartMm)} RE${format(this.yStartMm + this.yDeltaMm)}`;
    return `L${format(this.xDeltaMm)} R${format(this.yStartMm)}`;
  }
}
