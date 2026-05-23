import * as THREE from "three";
import {
  parseLatheCode,
  type AxesDirective,
  type CommentList,
  type CurvedLine,
  type DepthDirective,
  type FeedDirective,
  type LatheEntry,
  type LatheLine,
  type ModeDirective,
  type ModeType,
  type NumericParam,
  type ParserData,
  type StockDirective,
  type StraightLine,
  type ToolDirective,
  type UnitsDirective,
  type XDirection,
  type ZDirection,
} from './latheparser.ts';

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

export type ProfileSide = 'outside' | 'inside';

export class Profile {
  constructor(readonly side: ProfileSide, readonly segments: Segment[]) {}
}

export class Stock {
  readonly innerDiameter: number;

  constructor(readonly diameter: number, readonly length: number, innerDiameter = 0) {
    if (innerDiameter < 0) throw new Error('Error: stock internal hole must not be negative');
    if (innerDiameter >= diameter) throw new Error('Error: stock internal hole must be smaller than stock diameter');
    this.innerDiameter = innerDiameter;
  }

  get radius(): number {
    return this.diameter / 2;
  }

  get innerRadius(): number {
    return this.innerDiameter / 2;
  }

  getSegments(): Segment[] {
    return [
      new Segment('LINE', new Point(this.innerRadius, 0), new Point(this.radius, 0)),
      new Segment('LINE', new Point(this.radius, 0), new Point(this.radius, this.length)),
      new Segment('LINE', new Point(this.radius, this.length), new Point(this.innerRadius, this.length)),
      new Segment('LINE', new Point(this.innerRadius, this.length), new Point(this.innerRadius, 0)),
    ];
  }
}

export class PartDimensions {
  constructor(readonly diameter: number, readonly length: number) {}
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
const SCALE_DECIMAL_PLACES = 4;

export class LatheCode {
  private data: ParserData;
  private unitsMultiplier = 1;
  private outsideMaxRadius = 0;
  private outside: Segment[];
  private outsideSegments: Segment[];
  private inside: Segment[];
  private insideSegments: Segment[];

  constructor(private text: string) {
    this.data = parseLatheCode(text + '\n');
    this.unitsMultiplier = this.data[1] ? UNITS[this.data[1][2]] : 1;
    // console.log('this.data', this.data);
    const stockInnerRadius = this.getStockInnerDiameter() / 2;
    this.outside = this.getSegmentsForSide(this.data[14], stockInnerRadius);
    this.outsideMaxRadius = this.outside.length ? Math.max.apply(null, this.outside.map(p => Math.max(p.start.x, p.end.x))) : 0;
    this.inside = this.data[15] ? this.getSegmentsForSide(this.data[15][2], this.getStockDiameter() / 2) : [];
    this.outsideSegments = this.closeLoop(this.outside, stockInnerRadius);
    this.insideSegments = this.getStockDiameter() > 0 ? this.closeLoop(this.inside, this.getStockDiameter() / 2) : [];
    this.getStock(); // validate the stock
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
    const id = this.getStockInnerDiameter();
    return d > 0 && l > 0 ? new Stock(d, l, id) : null;
  }

  getPartDimensions(): PartDimensions | null {
    const dimensions = this.getPartDimensionsInLatheUnits();
    return dimensions
      ? new PartDimensions(dimensions.diameter * this.unitsMultiplier, dimensions.length * this.unitsMultiplier)
      : null;
  }

  getBoundingBox(): THREE.Vector3 {
    const stock = this.getStock();
    if (!stock) return new THREE.Vector3();
    if (stock.diameter > stock.length) return new THREE.Vector3(stock.diameter, stock.diameter, stock.length);
    return new THREE.Vector3(stock.length, stock.diameter, stock.diameter);
  }

  getTool(): Tool {
    if (!this.data[5]) return new Tool('RECT', 3, 3, 0.4);
    const type = this.data[5][2];
    const params = this.data[5][4];
    const radius = params[0] ? params[0][1] * this.unitsMultiplier : 0;
    const length = params[1] ? params[1][1] * this.unitsMultiplier : 0;
    const height = params[2] ? params[2][1] * this.unitsMultiplier : 0;
    const angle = params[3] ? params[3][1] : 0;
    const noseAngle = params[4] ? params[4][1] : 0;
    if (type === 'RECT') {
      if (angle) throw new Error('A not implemented for TOOL RECT');
      if (noseAngle) throw new Error('NA not supported for TOOL RECT');
      // Rectangular tools in fact have sloping sides incapable of cutting.
      // Modelling these inserts as having small height fixes right-and-back cuts.
      return new Tool('RECT', length || 3, height || length || 3, radius);
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

  getMode(): ModeType {
    if (!this.data[11]) return 'FACE';
    return this.data[11][2];
  }

  getZDirection(): ZDirection {
    if (!this.data[13]) return 'LEFT';
    return this.data[13][2][0];
  }

  getXDirection(): XDirection {
    if (!this.data[13]) return 'UP';
    return this.data[13][2][2];
  }

  isNanoElsCompatible(): boolean {
    return this.getZDirection() === 'LEFT' && this.getXDirection() === 'UP';
  }

  /** Segments forming the part after outside cuts. */
  getOutsideSegments(): Segment[] {
    return this.outsideSegments.concat();
  }

  /** Open outside profile path before it is closed to the stock inner radius or centerline. */
  getOutsideProfileSegments(): Segment[] {
    return this.outside.concat();
  }

  /** Segments forming the part after inside cuts. */
  getInsideSegments(): Segment[] {
    return this.insideSegments.concat();
  }

  /** Open inside profile path before it is closed to the stock outer radius. */
  getInsideProfileSegments(): Segment[] {
    return this.inside.concat();
  }

  /** Explicitly named profiles present in this lathe code. */
  getProfiles(): Profile[] {
    const profiles: Profile[] = [];
    if (this.outsideSegments.length) profiles.push(new Profile('outside', this.getOutsideSegments()));
    if (this.insideSegments.length) profiles.push(new Profile('inside', this.getInsideSegments()));
    return profiles;
  }

  /** Single active profile, or null when there are none or both inside and outside profiles. */
  getSingleProfile(): Profile | null {
    const profiles = this.getProfiles();
    return profiles.length === 1 ? profiles[0] : null;
  }

  /** LatheCode containing only the selected profile and shared setup directives. */
  getLatheCodeForProfile(side: ProfileSide): LatheCode | null {
    const entries = side === 'outside' ? this.data[14] : this.data[15]?.[2] || [];
    if (!entries.length) return null;

    const lines = this.getSetupLines(side);
    if (side === 'inside') {
      const insideBlock = this.data[15];
      lines.push(`INSIDE${formatComment(insideBlock?.[1][1] || '')}`);
    }
    lines.push(...entries.map(entry => latheLineToString(entry[1])));
    return new LatheCode(lines.join('\n'));
  }

  /** Z coordinates of vertical lines where each part ends and cutoff area starts. */
  getCutoffStarts(): number[] {
    const result: number[] = [];
    let seenPart = false;
    let z = 0;
    for (let commentsAndLine of this.data[14]) {
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
    if (!this.data[3]) return this.outsideMaxRadius * 2;
    const stockParams = this.data[3][2];
    return stockParams[1] * (stockParams[0] == 'D' ? 1 : 2) * this.unitsMultiplier;
  }

  private getStockInnerDiameter(): number {
    if (!this.data[3]) return 0;
    const stockHole = this.data[3][2][2];
    if (!stockHole) return 0;
    return stockHole[1] * (stockHole[0] == 'ID' ? 1 : 2) * this.unitsMultiplier;
  }

  private getPartDimensionsInLatheUnits(): PartDimensions | null {
    const outside = getProfileLineDimensions(this.data[14]);
    const inside = this.data[15] ? getProfileLineDimensions(this.data[15][2]) : null;
    const stockDiameter = this.data[3] ? getStockDirectiveDiameterInLatheUnits(this.data[3]) : 0;
    const diameter = outside?.maxRadius
      ? outside.maxRadius * 2
      : inside?.maxRadius && stockDiameter
        ? stockDiameter
        : (inside?.maxRadius || 0) * 2;
    const length = Math.max(outside?.materialLength || 0, inside?.materialLength || 0);
    return diameter > 0 && length > 0 ? new PartDimensions(diameter, length) : null;
  }

  private getSetupLines(side: ProfileSide): string[] {
    const lines: string[] = [];
    const pushComments = (comments: CommentList) => lines.push(...comments.map(commentToString));
    pushComments(this.data[0]);
    if (this.data[1]) lines.push(unitsDirectiveToString(this.data[1]));
    pushComments(this.data[2]);
    if (this.data[3]) {
      lines.push(stockDirectiveToString(this.data[3], {includeHole: side !== 'outside'}));
    } else if (side === 'inside') {
      const stock = this.getStock();
      if (stock) lines.push(`STOCK D${numberToString(stock.diameter)}`);
    }
    pushComments(this.data[4]);
    if (this.data[5]) lines.push(toolDirectiveToString(this.data[5]));
    pushComments(this.data[6]);
    if (this.data[7]) lines.push(depthDirectiveToString(this.data[7]));
    pushComments(this.data[8]);
    if (this.data[9]) lines.push(feedDirectiveToString(this.data[9]));
    pushComments(this.data[10]);
    if (this.data[11]) lines.push(modeDirectiveToString(this.data[11]));
    pushComments(this.data[12]);
    if (this.data[13]) lines.push(axesDirectiveToString(this.data[13]));
    return lines;
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

  private getSegmentsForSide(side: LatheEntry[], zeroX: number): Segment[] {
    const segments: Segment[] = [];
    let z = 0;
    for (let commentsAndLine of side) {
      let line = commentsAndLine[1];
      let startX: number;
      let endX: number;
      if (isStraightLine(line)) {
        startX = endX = line[3] / (line[2] === 'D' ? 2 : 1) * this.unitsMultiplier;
      } else if (isCurvedLine(line)) {
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

  reverse(): string {
    const insideBlock = this.data[15];
    const firstLLine = this.data[14].length
      ? findLineStart(this.text, 'L')
      : findLineStart(this.text, 'L', findLineStart(this.text, 'INSIDE'));
    if (firstLLine === -1) return this.text;
    const preambula = this.text.substring(0, firstLLine);
    const result: string[] = [];
    result.push(...reverseEntries(this.data[14]));
    if (insideBlock) {
      if (this.data[14].length) {
        result.push(...insideBlock[0].map(commentToString));
        result.push(insideDirectiveToString(insideBlock[1]));
      }
      result.push(...reverseEntries(insideBlock[2]));
    }
    return (preambula ? preambula + '\n' : '') + result.join('\n');
  }

  scale(xScale: number, zScale = xScale): string {
    if (!isPositiveFiniteNumber(xScale) || !isPositiveFiniteNumber(zScale)) {
      throw new Error('Scale factors must be positive numbers');
    }

    const partDimensions = this.getPartDimensionsInLatheUnits();
    const scaledPartDiameter = partDimensions ? scaleNumber(partDimensions.diameter, xScale) : null;
    const lines: string[] = [];
    const pushComments = (comments: CommentList) => lines.push(...comments.map(commentToString));
    const pushEntries = (entries: LatheEntry[]) => {
      for (const entry of entries) {
        pushComments(entry[0]);
        lines.push(scaleLatheLine(entry[1], xScale, zScale));
      }
    };

    pushComments(this.data[0]);
    if (this.data[1]) lines.push(unitsDirectiveToString(this.data[1]));
    pushComments(this.data[2]);
    if (this.data[3]) lines.push(stockDirectiveToString(scaleStockDirective(this.data[3], xScale, scaledPartDiameter)));
    pushComments(this.data[4]);
    if (this.data[5]) lines.push(toolDirectiveToString(this.data[5]));
    pushComments(this.data[6]);
    if (this.data[7]) lines.push(depthDirectiveToString(this.data[7]));
    pushComments(this.data[8]);
    if (this.data[9]) lines.push(feedDirectiveToString(this.data[9]));
    pushComments(this.data[10]);
    if (this.data[11]) lines.push(modeDirectiveToString(this.data[11]));
    pushComments(this.data[12]);
    if (this.data[13]) lines.push(axesDirectiveToString(this.data[13]));
    pushEntries(this.data[14]);

    const insideBlock = this.data[15];
    if (insideBlock) {
      pushComments(insideBlock[0]);
      lines.push(insideDirectiveToString(insideBlock[1]));
      pushEntries(insideBlock[2]);
    }

    pushComments(this.data[16]);
    return lines.join('\n');
  }
}

function reverseEntries(entries: LatheEntry[]): string[] {
  return entries.map(line => reverseLine(line[1])).reverse();
}

function insideDirectiveToString(directive: ['INSIDE', string]): string {
  return `INSIDE${formatComment(directive[1])}`;
}

function findLineStart(text: string, lineStart: string, fromIndex = 0): number {
  if (fromIndex < 0) return -1;
  if (text.startsWith(lineStart, fromIndex)) return fromIndex;
  return text.indexOf('\n' + lineStart, fromIndex);
}

function reverseLine(line: LatheLine): string {
  if (line[0] !== 'L') throw new Error('Expected L line');
  const second = line[2];
  if (isStraightLine(line)) {
    return `L${line[1]} ${second}${line[3]}${line[4] ? ' ; ' + line[4] : ''}`;
  }
  if (isCurvedLine(line)) {
    return `L${line[1]} ${second}${line[5]} ${line[4]}${line[3]}${line[6] ? ' ' + line[6] : ''}${line[7] ? ' ; ' + (line[6] ? (line[7] as string).substring(1).trim() : line[7]) : ''}`;
  }
  return `L${line[1]}${line[2] ? ' ; ' + line[2] : ''}`;
}

function getProfileLineDimensions(entries: LatheEntry[]): {maxRadius: number, materialLength: number} | null {
  let maxRadius = 0;
  let materialLength = 0;
  for (const entry of entries) {
    const line = entry[1];
    if (isPartingLine(line)) continue;
    materialLength += line[1];
    if (isStraightLine(line)) {
      maxRadius = Math.max(maxRadius, line[3] / (line[2] === 'D' ? 2 : 1));
    } else if (isCurvedLine(line)) {
      maxRadius = Math.max(
        maxRadius,
        line[3] / (line[2] === 'DS' ? 2 : 1),
        line[5] / (line[4] === 'DE' ? 2 : 1),
      );
    }
  }
  return maxRadius > 0 && materialLength > 0 ? {maxRadius, materialLength} : null;
}

function getStockDirectiveDiameterInLatheUnits(directive: StockDirective): number {
  const stock = directive[2];
  return stock[1] * (stock[0] === 'D' ? 1 : 2);
}

function scaleStockDirective(directive: StockDirective, xScale: number, scaledPartDiameter: number | null): StockDirective {
  const stock = directive[2];
  const stockHole = scaleNumericParam(stock[2], xScale);
  const scaledStockDiameter = scaleNumber(getStockDirectiveDiameterInLatheUnits(directive), xScale);
  const stockHoleDiameter = stockHole ? stockHole[1] * (stockHole[0] === 'ID' ? 1 : 2) : 0;
  const stockDiameter = scaledPartDiameter !== null && scaledPartDiameter > stockHoleDiameter
    ? scaledPartDiameter
    : scaledStockDiameter;
  return [
    directive[0],
    directive[1],
    [
      stock[0],
      stock[0] === 'D' ? stockDiameter : scaleNumber(stockDiameter / 2, 1),
      stockHole,
      stock[3],
    ],
    directive[3],
  ];
}

function scaleLatheLine(line: LatheLine, xScale: number, zScale: number): string {
  if (isCurvedLine(line)) {
    return `L${numberToString(scaleNumber(line[1], zScale))} ${line[2]}${numberToString(scaleNumber(line[3], xScale))} ${line[4]}${numberToString(scaleNumber(line[5], xScale))}${line[6] ? ' ' + line[6] : ''}${formatComment(line[7])}`;
  }
  if (isStraightLine(line)) {
    return `L${numberToString(scaleNumber(line[1], zScale))} ${line[2]}${numberToString(scaleNumber(line[3], xScale))}${formatComment(line[4])}`;
  }
  return latheLineToString(line);
}

function scaleNumericParam<Name extends string>(param: NumericParam<Name> | null, scale: number): NumericParam<Name> | null {
  return param ? [param[0], scaleNumber(param[1], scale)] : null;
}

function scaleNumber(value: number, scale: number): number {
  const multiplier = 10 ** SCALE_DECIMAL_PLACES;
  const rounded = Math.round(value * scale * multiplier) / multiplier;
  const integer = Math.round(rounded);
  return integer !== 0 && Math.abs(rounded - integer) <= 1 / multiplier ? integer : rounded;
}

function isPositiveFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function commentToString(comment: string): string {
  return comment ? `; ${comment}` : '';
}

function formatComment(comment: string): string {
  if (!comment) return '';
  return comment.startsWith(';') ? ` ${comment}` : ` ; ${comment}`;
}

function unitsDirectiveToString(directive: UnitsDirective): string {
  return `UNITS ${directive[2]}${formatComment(directive[3])}`;
}

function stockDirectiveToString(directive: StockDirective, options: {includeHole?: boolean} = {}): string {
  const includeHole = options.includeHole ?? true;
  const stock = directive[2];
  const stockHole = includeHole && stock[2] ? ` ${stock[2][0]}${numberToString(stock[2][1])}` : '';
  const allowance = stock[3] ? ` ${stock[3][0]}${numberToString(stock[3][1])}` : '';
  return `STOCK ${stock[0]}${numberToString(stock[1])}${stockHole}${allowance}${formatComment(directive[3])}`;
}

function toolDirectiveToString(directive: ToolDirective): string {
  const params = numericParamsToString(directive[4]);
  return `TOOL ${directive[2]}${params.length ? ' ' + params.join(' ') : ''}${formatComment(directive[5])}`;
}

function depthDirectiveToString(directive: DepthDirective): string {
  const params = numericParamsToString(directive[2]);
  return `DEPTH ${params.join(' ')}${formatComment(directive[3])}`;
}

function feedDirectiveToString(directive: FeedDirective): string {
  const params = numericParamsToString(directive[2]);
  return `FEED ${params.join(' ')}${formatComment(directive[3])}`;
}

function numericParamsToString(params: readonly (NumericParam<string> | null)[]): string[] {
  return params.flatMap(param => param ? [`${param[0]}${numberToString(param[1])}`] : []);
}

function modeDirectiveToString(directive: ModeDirective): string {
  return `MODE ${directive[2]}${formatComment(directive[3])}`;
}

function axesDirectiveToString(directive: AxesDirective): string {
  return `AXES ${directive[2][0]} ${directive[2][2]}${formatComment(directive[3])}`;
}

function latheLineToString(line: LatheLine): string {
  if (isCurvedLine(line)) {
    return `L${numberToString(line[1])} ${line[2]}${numberToString(line[3])} ${line[4]}${numberToString(line[5])}${line[6] ? ' ' + line[6] : ''}${formatComment(line[7])}`;
  }
  if (isStraightLine(line)) {
    return `L${numberToString(line[1])} ${line[2]}${numberToString(line[3])}${formatComment(line[4])}`;
  }
  return `L${numberToString(line[1])}${formatComment(line[2])}`;
}

function numberToString(value: number): string {
  const rounded = Math.round(value * 1e12) / 1e12;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
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

function isStraightLine(line: LatheLine): line is StraightLine {
  return line[2] === 'D' || line[2] === 'R';
}

function isCurvedLine(line: LatheLine): line is CurvedLine {
  return line[2] === 'DS' || line[2] === 'RS';
}

function isPartingLine(line: LatheLine) {
  return line.length === 3 || line[2] === 'D' && !line[3];
}
