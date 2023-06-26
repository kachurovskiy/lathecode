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
}
