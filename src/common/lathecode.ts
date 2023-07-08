import {parser} from './parser.js'

export class Point {
  constructor(readonly x: number, readonly z: number) {}

  isEqual(other: Point) {
    return this.x === other.x && this.z === other.z;
  }

  toString() {
    return `${this.x},${this.z}`;
  }
}

export class Segment {
  constructor(readonly type: string, readonly start: Point, public end: Point) {}

  isEqual(other: Segment) {
    return this.type === other.type && this.start.isEqual(other.start) && this.end.isEqual(other.end);
  }

  isColinear(other: Segment) {
    const thisXDelta = this.end.x - this.start.x;
    const otherXDelta = other.end.x - other.start.x;
    const slope1 = (this.end.z - this.start.z) / thisXDelta;
    const slope2 = (other.end.z - other.start.z) / otherXDelta;
    if (!(thisXDelta === 0 && otherXDelta === 0) && Math.abs(slope1 - slope2) > 0.00001) return false;
    return (this.start.x - other.start.x) * (this.end.z - this.start.z) === thisXDelta * (this.start.z - other.start.z);
  }

  isEmpty() {
    return this.start.isEqual(this.end);
  }

  toString() {
    return `${this.type}:${this.start}-${this.end}`;
  }
}

export class Stock {
  constructor(readonly diameter: number, readonly length: number) {}

  getSegments(): Segment[] {
    return [
      new Segment('line', new Point(0, 0), new Point(this.diameter / 2, 0)),
      new Segment('line', new Point(this.diameter / 2, 0), new Point(this.diameter / 2, this.length)),
      new Segment('line', new Point(this.diameter / 2, this.length), new Point(0, this.length)),
      new Segment('line', new Point(0, this.length), new Point(0, 0)),
    ];
  }
}

export class Tool {
  constructor(
    readonly type: string,
    readonly widthMm: number,
    readonly heightMm: number,
    readonly cornerRadiusMm: number,
    readonly angleDeg?: number,
    readonly angleCenterDeg?: number) {}
}

export class Feed {
  constructor(readonly moveMmMin: number, readonly passMmMin: number, readonly partMmMin: number) {}
}

export class Depth {
  constructor(readonly cut: number, readonly finish: number) {}
}

const UNITS: {
  [key: string]: number,
 } = {
  "MM": 1,
  "CM": 10,
  "M": 1000,
  "FT": 304.8,
  "IN": 25.4,
};

export class LatheCode {
  private data: any;
  private unitsMultiplier = 1;
  private outsideMaxRadius = 0;
  private outside: Segment[];
  private outsideSegments: Segment[];
  private inside: Segment[];
  private insideSegments: Segment[];

  constructor(private text: string) {
    this.data = parser.parse(text + '\n');
    this.unitsMultiplier = this.data[1] ? UNITS[this.data[1][2] as string] : 1;
    console.log('this.data', this.data);
    this.outside = this.getSegmentsForSide(this.data[10], 0);
    this.outsideMaxRadius = this.outside.length ? Math.max.apply(null, this.outside.map(p => Math.max(p.start.x, p.end.x))) : 0;
    this.inside = this.data[11] ? this.getSegmentsForSide(this.data[11][2], this.getStockDiameter() / 2) : [];
    this.outsideSegments = this.closeLoop(this.outside, 0);
    this.insideSegments = this.getStockDiameter() > 0 ? this.closeLoop(this.inside, this.getStockDiameter() / 2) : [];
  }

  getText(): string {
    return this.text;
  }

  getTitle(): string {
    return this.data[0][1] || '';
  }

  getStock(): Stock|null {
    const d = this.getStockDiameter();
    const l = this.getStockLength();
    return d > 0 && l > 0 ? new Stock(d, l) : null;
  }

  getTool(): Tool {
    if (!this.data[5]) return new Tool('RECT', 3, 10, 0.2);
    const type = this.data[5][2];
    const params = this.data[5][4];
    const radius = params[0] ? params[0][1] * this.unitsMultiplier : 0;
    if (type === 'RECT') {
      return new Tool('RECT', params[1] ? params[1][1] * this.unitsMultiplier : 3, params[2] ? params[2][1] * this.unitsMultiplier : 10, radius);
    } else if (type === 'ROUND') {
      return new Tool('ROUND', radius * 2, radius * 2, radius);
    }
    throw new Error('Unknown tool ' + type);
  }

  getFeed(): Feed {
    const params = this.data[9] ? this.data[9][2] : [];
    return new Feed(
      ((params[0] ? params[0][1] : 0) * this.unitsMultiplier) || 200,
      ((params[1] ? params[1][1] : 0) * this.unitsMultiplier) || 50,
      ((params[2] ? params[2][1] : 0) * this.unitsMultiplier) || 10);
  }

  getDepth(): Depth {
    const params = this.data[7] ? this.data[7][2] : [];
    const cut = params[0];
    const finish = params[1];
    return new Depth(
      ((cut ? cut[1] : 0) * this.unitsMultiplier) || 0.5,
      ((finish ? finish[1] : 0) * this.unitsMultiplier) || 0.1
    );
  }

  /** Segments forming the part after outside cuts. */
  getOutsideSegments(): Segment[] {
    return this.outsideSegments.concat();
  }

  /** Segments forming the part after inside cuts. */
  getInsideSegments(): Segment[] {
    return this.insideSegments.concat();
  }

  private getStockLength() {
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let segment of [...this.outside, ...this.inside]) {
      if (segment.start.z < minZ) minZ = segment.start.z;
      if (segment.end.z < minZ) minZ = segment.end.z;
      if (segment.start.z > maxZ) maxZ = segment.start.z;
      if (segment.end.z > maxZ) maxZ = segment.end.z;
    }
    return maxZ - minZ;
  }

  private getStockDiameter(): number {
    if (!this.data || !this.data[3]) return this.outsideMaxRadius * 2;
    const stockParams = this.data[3][2];
    return stockParams[1] * (stockParams[0] == 'D' ? 1 : 2) * this.unitsMultiplier;
  }

  private closeLoop(mainSequence: Segment[], x: number): Segment[] {
    if (!mainSequence.length) {
      return [];
    }
    const first = mainSequence.at(0)!;
    const last = mainSequence.at(-1)!;
    let result = removeEmptySegments(removeColinearSegments(removeEmptySegments([
      new Segment('line', new Point(x, first.start.z), first.start),
      ...mainSequence,
      new Segment('line', last.end, new Point(x, last.end.z)),
      new Segment('line', new Point(x, last.end.z), new Point(x, first.start.z)),
    ])));
    if (result.length) {
      result.unshift(result.pop()!);
      result = removeColinearSegments(result);
    }
    return result.length < 3 ? [] : result;
  }

  private getSegmentsForSide(side: any, zeroX: number): Segment[] {
    const segments: Segment[] = [];
    let z = 0;
    for (let commentsAndLine of side) {
      let line = commentsAndLine[1];
      let startX, endX;
      if (line[2] === 'R') {
        startX = endX = line[3] * this.unitsMultiplier;
      } else if (line[2] === 'D') {
        startX = endX = line[3] / 2 * this.unitsMultiplier;
      } else if (line[2] === 'DS' || line[2] === 'RS') {
        startX = line[3] / (line[2] === 'DS' ? 2 : 1) * this.unitsMultiplier;
        endX = line[5] / (line[4] === 'DE' ? 2 : 1) * this.unitsMultiplier;
      } else if (line.length === 3) {
        startX = zeroX;
        endX = zeroX;
      } else {
        throw new Error('unimplemented ' + line);
      }
      const start = new Point(startX, z);
      if (segments.length) {
        const prevEnd = segments.at(-1)!.end;
        if (!prevEnd.isEqual(start)) segments.push(new Segment('line', prevEnd, start));
      }
      segments.push(new Segment('line', start, new Point(endX, z += line[1] * this.unitsMultiplier)));
    }
    return segments;
  }
}

export function removeColinearSegments(segments: Segment[]): Segment[] {
  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i];
    const b = segments[i + 1];
    if (a.isColinear(b)) {
      const copy = segments.concat();
      copy.splice(i, 2, new Segment(a.type, a.start, b.end));
      return removeColinearSegments(copy);
    }
  }
  return segments;
}

export function removeEmptySegments(segments: Segment[]): Segment[] {
  const result: Segment[] = [];
  for (let s of segments) {
    if (!s.isEmpty()) result.push(s);
  }
  return result;
}
