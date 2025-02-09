import {parser} from './parser.js'

export class Point {
  constructor(readonly x: number, readonly z: number) {}

  isEqual(other: Point) {
    return this.x === other.x && this.z === other.z;
  }

  toString() {
    return `${this.x},${this.z}`;
  }

  offsetBy(xDelta: number, zDelta: number = 0): Point {
    return new Point(this.x + xDelta, this.z + zDelta);
  }
}

export class Segment {
  constructor(readonly type: string, readonly start: Point, public end: Point) {}

  isEqual(other: Segment) {
    return this.type === other.type && this.start.isEqual(other.start) && this.end.isEqual(other.end);
  }

  isColinear(other: Segment) {
    if (this.type !== 'LINE' || this.type !== other.type) return;
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

  offsetBy(xDelta: number, zDelta: number): Segment {
    return new Segment(this.type, this.start.offsetBy(xDelta, zDelta), this.end.offsetBy(xDelta, zDelta));
  }
}

export class Stock {
  constructor(readonly diameter: number, readonly length: number) {}

  getSegments(): Segment[] {
    return [
      new Segment('LINE', new Point(0, 0), new Point(this.diameter / 2, 0)),
      new Segment('LINE', new Point(this.diameter / 2, 0), new Point(this.diameter / 2, this.length)),
      new Segment('LINE', new Point(this.diameter / 2, this.length), new Point(0, this.length)),
      new Segment('LINE', new Point(0, this.length), new Point(0, 0)),
    ];
  }
}

export class Tool {
  constructor(
    readonly type: 'RECT'|'ROUND'|'ANG',
    readonly widthMm: number,
    readonly heightMm: number,
    readonly cornerRadiusMm: number,
    readonly angleDeg?: number,
    readonly noseAngleDeg?: number) {}
}

export class Feed {
  constructor(readonly moveMmMin: number, readonly passMmMin: number, readonly partMmMin: number) {}
}

export class Depth {
  constructor(readonly cutMm: number, readonly finishMm: number) {}
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
    // console.log('this.data', this.data);
    this.outside = this.getSegmentsForSide(this.data[this.data.length - 3], 0);
    this.outsideMaxRadius = this.outside.length ? Math.max.apply(null, this.outside.map(p => Math.max(p.start.x, p.end.x))) : 0;
    this.inside = this.data[this.data.length - 2] ? this.getSegmentsForSide(this.data[this.data.length - 2][2], this.getStockDiameter() / 2) : [];
    this.outsideSegments = this.closeLoop(this.outside, 0);
    this.insideSegments = this.getStockDiameter() > 0 ? this.closeLoop(this.inside, this.getStockDiameter() / 2) : [];
    this.getTool(); // validate the tool
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
    if (!this.data[5]) return new Tool('RECT', 3, 0.8, 0.4);
    const type = this.data[5][2];
    const params = this.data[5][4];
    const radius = params[0] ? params[0][1] * this.unitsMultiplier : 0;
    const length = params[1] ? params[1][1] * this.unitsMultiplier : 0;
    const height = params[2] ? params[2][1] * this.unitsMultiplier : 0;
    const angle = params[3] ? params[3][1] * this.unitsMultiplier : 0;
    const noseAngle = params[4] ? params[4][1] * this.unitsMultiplier : 0;
    if (type === 'RECT') {
      if (angle) throw new Error('A not implemented for TOOL RECT');
      if (noseAngle) throw new Error('NA not supported for TOOL RECT');
      // Rectangular tools in fact have sloping sides incapable of cutting.
      // Modelling these inserts as having small height fixes right-and-back cuts.
      return new Tool('RECT', length || 3, height || (radius * 2), radius);
    } else if (type === 'ROUND') {
      if (length) throw new Error('TOOL ROUND L is already defined by R');
      if (height) throw new Error('TOOL ROUND H is already defined by R');
      return new Tool('ROUND', radius * 2, radius * 2, radius);
    } else if (type === 'ANG') {
      if (noseAngle <= 0) throw new Error('Specify positive tool nose angle NA');
      if (height) throw new Error('TOOL ANG H is ignored, use L');
      return new Tool('ANG', length || 10, height || 10, radius, angle, noseAngle);
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

  getMode(): 'FACE'|'TURN' {
    if (!this.data[11]?.length) return 'FACE';
    return this.data[11][2];
  }

  getZDirection(): 'LEFT' | 'RIGHT' {
    if (!this.data[13] || !this.data[13][2]) return 'LEFT';
    return this.data[13][2][0];
  }

  getXDirection(): 'UP' | 'DOWN' {
    if (!this.data[13] || !this.data[13][2]) return 'UP';
    return this.data[13][2][2];
  }

  isNanoElsCompatible(): boolean {
    return this.getZDirection() === 'LEFT' && this.getXDirection() === 'UP';
  }

  /** Segments forming the part after outside cuts. */
  getOutsideSegments(): Segment[] {
    return this.outsideSegments.concat();
  }

  /** Segments forming the part after inside cuts. */
  getInsideSegments(): Segment[] {
    return this.insideSegments.concat();
  }

  /** Z coordinates of vertical lines where each part ends and cutoff area starts. */
  getCutoffStarts(): number[] {
    const result: number[] = [];
    let seenPart = false;
    let z = 0;
    for (let commentsAndLine of this.data[this.data.length - 3]) {
      let line = commentsAndLine[1];
      if (isPartingLine(line) && seenPart) {
        result.push(z);
      } else {
        seenPart = true;
      }
      z += line[1] * this.unitsMultiplier;
    }
    return result;
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
      new Segment('LINE', new Point(x, first.start.z), first.start),
      ...mainSequence,
      new Segment('LINE', last.end, new Point(x, last.end.z)),
      new Segment('LINE', new Point(x, last.end.z), new Point(x, first.start.z)),
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
      } else if (isPartingLine(line)) {
        startX = zeroX;
        endX = zeroX;
      } else {
        throw new Error('unimplemented ' + line);
      }
      const start = new Point(startX, z);
      if (segments.length) {
        const prevEnd = segments.at(-1)!.end;
        if (!prevEnd.isEqual(start)) segments.push(new Segment('LINE', prevEnd, start));
      }
      segments.push(new Segment(line[6] || 'LINE', start, new Point(endX, z += line[1] * this.unitsMultiplier)));
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

function isPartingLine(line: any) {
  return line.length === 3 || line[2] === 'D' && !line[3];
}
