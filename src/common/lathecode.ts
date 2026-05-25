import * as THREE from "three";
import {
  parseLatheCode,
  type AxesDirective,
  type CommentList,
  type CurvedLine,
  type DepthDirective,
  type EdgeFeature,
  type FeedDirective,
  type InsideDirective,
  type LatheEntry,
  type LatheLine,
  type ModeDirective,
  type ModeType,
  type NumericParam,
  type ParserData,
  type SegmentAnchorType,
  type SplineLine,
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
  constructor(readonly type: string, readonly start: Point, public end: Point, readonly controlPoints: readonly Point[] = []) {}

  isEqual(other: Segment) {
    return this.type === other.type
      && this.start.isEqual(other.start)
      && this.end.isEqual(other.end)
      && pointsEqual(this.controlPoints, other.controlPoints);
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
    const controls = this.controlPoints.length ? `[${this.controlPoints.join('|')}]` : '';
    return `${this.type}:${this.start}-${this.end}${controls}`;
  }

  offsetBy(xDelta: number, zDelta: number): Segment {
    return new Segment(
      this.type,
      this.start.offsetBy(xDelta, zDelta),
      this.end.offsetBy(xDelta, zDelta),
      this.controlPoints.map(point => point.offsetBy(xDelta, zDelta)),
    );
  }
}

export type ProfileSide = 'outside' | 'inside';

export class Profile {
  constructor(readonly side: ProfileSide, readonly segments: Segment[]) {}
}

export type ProfileSegmentDefinition = {
  readonly segment: Segment;
  readonly startFeature: EdgeFeature | null;
  readonly endFeature: EdgeFeature | null;
};

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
const EDGE_FEATURE_EPSILON = 1e-9;
const FILLET_ARC_CHORD_MM = 0.1;

type ProfileSegmentSpec = ProfileSegmentDefinition & {
  line: LatheLine;
};

type EndpointFeatureGeometry = {
  radialPoint: Point;
  segmentPoint: Point;
  trimDistance: number;
  segments: Segment[];
};

type Vector = {
  x: number;
  z: number;
};

type ProfileSizeType = 'D' | 'R';

export class LatheCode {
  private data: ParserData;
  private unitsMultiplier = 1;
  private outsideMaxRadius = 0;
  private commonMaterialEndZ = 0;
  private outside: Segment[];
  private outsideSegments: Segment[];
  private inside: Segment[];
  private insideSegments: Segment[];

  constructor(private text: string) {
    this.data = parseLatheCode(text + '\n');
    this.unitsMultiplier = this.data.units ? UNITS[this.data.units.unit] : 1;
    // console.log('this.data', this.data);
    const stockInnerRadius = this.getStockInnerDiameter() / 2;
    const outside = this.getSegmentsForSide(this.data.outside, stockInnerRadius);
    this.outsideMaxRadius = outside.length ? Math.max(...outside.flatMap(segmentRadii)) : 0;
    const inside = this.data.inside ? this.getSegmentsForSide(this.data.inside.entries, this.getStockDiameter() / 2) : [];
    const outsideMaterialEndZ = getProfileMaterialEndZ(this.data.outside, this.unitsMultiplier);
    const insideMaterialEndZ = this.data.inside ? getProfileMaterialEndZ(this.data.inside.entries, this.unitsMultiplier) : 0;
    this.commonMaterialEndZ = Math.max(outsideMaterialEndZ, insideMaterialEndZ);
    [this.outside, this.inside] = extendMixedProfilesToCommonEnd(outside, inside, this.commonMaterialEndZ, stockInnerRadius);
    this.outsideSegments = this.closeLoop(this.outside, stockInnerRadius);
    this.insideSegments = this.getStockDiameter() > 0 ? this.closeLoop(this.inside, this.getStockDiameter() / 2) : [];
    this.getStock(); // validate the stock
    this.getTool(); // validate the tool
  }

  getText(): string {
    return this.text;
  }

  getTitle(): string {
    return this.data.leadingComments[1] || '';
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
    const directive = this.data.tool;
    if (!directive) return new Tool('RECT', 3, 3, 0.4);
    const type = directive.type;
    const radius = directive.radius ? directive.radius.value * this.unitsMultiplier : 0;
    const length = directive.length ? directive.length.value * this.unitsMultiplier : 0;
    const height = directive.height ? directive.height.value * this.unitsMultiplier : 0;
    const angle = directive.angle ? directive.angle.value : 0;
    const noseAngle = directive.noseAngle ? directive.noseAngle.value : 0;
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
    return new Feed(
      ((this.data.feed?.move?.value || 0) * this.unitsMultiplier) || 200,
      ((this.data.feed?.pass?.value || 0) * this.unitsMultiplier) || 50,
      ((this.data.feed?.part?.value || 0) * this.unitsMultiplier) || 10);
  }

  getDepth(): Depth {
    return new Depth(
      ((this.data.depth?.cut?.value || 0) * this.unitsMultiplier) || 0.5,
      ((this.data.depth?.finish?.value || 0) * this.unitsMultiplier) || 0.1
    );
  }

  getMode(): ModeType {
    if (!this.data.mode) return 'FACE';
    return this.data.mode.mode;
  }

  getZDirection(): ZDirection {
    if (!this.data.axes) return 'LEFT';
    return this.data.axes.zDirection;
  }

  getXDirection(): XDirection {
    if (!this.data.axes) return 'UP';
    return this.data.axes.xDirection;
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

  /** Open outside part boundary, excluding trailing cutoff/parting moves. */
  getOutsidePartProfileSegments(): Segment[] {
    return truncateProfileToZ(this.outside, this.commonMaterialEndZ);
  }

  /** Open outside profile lines before chamfers and fillets are expanded into geometry. */
  getOutsidePartProfileSegmentDefinitions(): ProfileSegmentDefinition[] {
    const definitions = truncateProfileSegmentDefinitionsToZ(
      this.getProfileSegmentDefinitionsForSide(this.data.outside, this.getStockInnerDiameter() / 2),
      this.commonMaterialEndZ,
    );
    return this.data.outside.length && this.data.inside?.entries.length
      ? extendProfileSegmentDefinitionsToZ(definitions, this.commonMaterialEndZ)
      : definitions;
  }

  /** Segments forming the part after inside cuts. */
  getInsideSegments(): Segment[] {
    return this.insideSegments.concat();
  }

  /** Open inside profile path before it is closed to the stock outer radius. */
  getInsideProfileSegments(): Segment[] {
    return this.inside.concat();
  }

  /** Open inside part boundary, excluding trailing cutoff/parting moves. */
  getInsidePartProfileSegments(): Segment[] {
    return truncateProfileToZ(this.inside, this.commonMaterialEndZ);
  }

  /** Open inside profile lines before chamfers and fillets are expanded into geometry. */
  getInsidePartProfileSegmentDefinitions(): ProfileSegmentDefinition[] {
    const definitions = truncateProfileSegmentDefinitionsToZ(
      this.getProfileSegmentDefinitionsForSide(this.data.inside?.entries ?? [], this.getStockDiameter() / 2),
      this.commonMaterialEndZ,
    );
    return this.data.outside.length && this.data.inside?.entries.length
      ? extendInsideProfileSegmentDefinitionsToZ(definitions, this.commonMaterialEndZ, this.getStockInnerDiameter() / 2)
      : definitions;
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
    const entries = side === 'outside' ? this.data.outside : this.data.inside?.entries || [];
    if (!entries.length) return null;

    const lines = this.getSetupLines(side);
    if (side === 'inside') {
      const insideBlock = this.data.inside;
      lines.push(`INSIDE${formatComment(insideBlock?.directive.comment || '')}`);
    }
    lines.push(...entries.map(entry => latheLineToString(entry.line)));
    const extensionLine = this.getProfileExtensionLine(side);
    if (extensionLine) lines.push(extensionLine);
    return new LatheCode(lines.join('\n'));
  }

  /** Z coordinates of vertical lines where each part ends and cutoff area starts. */
  getCutoffStarts(): number[] {
    const result: number[] = [];
    let seenPart = false;
    let z = 0;
    for (let entry of this.data.outside) {
      let line = entry.line;
      if (isPartingLine(line) && seenPart) {
        result.push(z);
      } else {
        seenPart = true;
      }
      z += line.length * this.unitsMultiplier;
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
    const stock = this.data.stock;
    if (!stock) return this.outsideMaxRadius * 2;
    return stock.size * (stock.sizeType == 'D' ? 1 : 2) * this.unitsMultiplier;
  }

  private getStockInnerDiameter(): number {
    if (!this.data.stock) return 0;
    const stockHole = this.data.stock.hole;
    if (!stockHole) return 0;
    return stockHole.value * (stockHole.name == 'ID' ? 1 : 2) * this.unitsMultiplier;
  }

  private getPartDimensionsInLatheUnits(): PartDimensions | null {
    const outside = getProfileLineDimensions(this.data.outside);
    const inside = this.data.inside ? getProfileLineDimensions(this.data.inside.entries) : null;
    const stockDiameter = this.data.stock ? getStockDirectiveDiameterInLatheUnits(this.data.stock) : 0;
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
    pushComments(this.data.leadingComments);
    if (this.data.units) lines.push(unitsDirectiveToString(this.data.units));
    pushComments(this.data.afterUnitsComments);
    if (this.data.stock) {
      lines.push(stockDirectiveToString(this.data.stock, {includeHole: side !== 'outside'}));
    } else if (side === 'inside') {
      const stock = this.getStock();
      if (stock) lines.push(`STOCK D${numberToString(stock.diameter)}`);
    }
    pushComments(this.data.afterStockComments);
    if (this.data.tool) lines.push(toolDirectiveToString(this.data.tool));
    pushComments(this.data.afterToolComments);
    if (this.data.depth) lines.push(depthDirectiveToString(this.data.depth));
    pushComments(this.data.afterDepthComments);
    if (this.data.feed) lines.push(feedDirectiveToString(this.data.feed));
    pushComments(this.data.afterFeedComments);
    if (this.data.mode) lines.push(modeDirectiveToString(this.data.mode));
    pushComments(this.data.afterModeComments);
    if (this.data.axes) lines.push(axesDirectiveToString(this.data.axes));
    return lines;
  }

  private getProfileExtensionLine(side: ProfileSide): string | null {
    if (!this.data.outside.length || !this.data.inside?.entries.length) return null;
    const entries = side === 'outside' ? this.data.outside : this.data.inside.entries;
    const otherEntries = side === 'outside' ? this.data.inside.entries : this.data.outside;
    const materialEndZ = getProfileMaterialEndZ(entries, this.unitsMultiplier);
    const extraLengthMm = getProfileMaterialEndZ(otherEntries, this.unitsMultiplier)
      - materialEndZ;
    if (extraLengthMm <= EDGE_FEATURE_EPSILON) return null;

    if (side === 'inside') {
      const stockInnerDiameter = this.getStockInnerDiameter() / this.unitsMultiplier;
      return `L${numberToString(extraLengthMm / this.unitsMultiplier)} D${numberToString(stockInnerDiameter)}`;
    }

    const sizeType = getProfileEndSizeType(entries);
    if (!sizeType) return null;

    const profile = side === 'outside' ? this.outside : this.inside;
    const materialProfile = truncateProfileToZ(profile, materialEndZ);
    const last = materialProfile.at(-1);
    if (!last) return null;
    const radius = last.end.x / this.unitsMultiplier;
    const size = sizeType === 'D' ? radius * 2 : radius;
    return `L${numberToString(extraLengthMm / this.unitsMultiplier)} ${sizeType}${numberToString(size)}`;
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
    return hasClosedProfileArea(result) ? result : [];
  }

  private getProfileSegmentDefinitionsForSide(side: readonly LatheEntry[], zeroX: number): ProfileSegmentDefinition[] {
    return this.getSegmentSpecsForSide(side, zeroX).map(spec => ({
      segment: spec.segment,
      startFeature: scaleEdgeFeatureToUnits(spec.startFeature, this.unitsMultiplier),
      endFeature: scaleEdgeFeatureToUnits(spec.endFeature, this.unitsMultiplier),
    }));
  }

  private getSegmentsForSide(side: readonly LatheEntry[], zeroX: number): Segment[] {
    return this.applyEdgeFeatures(this.getSegmentSpecsForSide(side, zeroX), zeroX);
  }

  private getSegmentSpecsForSide(side: readonly LatheEntry[], zeroX: number): ProfileSegmentSpec[] {
    const specs: ProfileSegmentSpec[] = [];
    let z = 0;
    for (let entry of side) {
      let line = entry.line;
      let startX: number;
      let endX: number;
      if (isStraightLine(line)) {
        startX = endX = line.size / (line.sizeType === 'D' ? 2 : 1) * this.unitsMultiplier;
      } else if (isCurvedLine(line)) {
        startX = line.start / (line.startType === 'DS' ? 2 : 1) * this.unitsMultiplier;
        endX = line.end / (line.endType === 'DE' ? 2 : 1) * this.unitsMultiplier;
      } else if (isSplineLine(line)) {
        startX = line.start / (line.startType === 'DS' ? 2 : 1) * this.unitsMultiplier;
        endX = line.end / (line.endType === 'DE' ? 2 : 1) * this.unitsMultiplier;
      } else if (isPartingLine(line)) {
        startX = zeroX;
        endX = zeroX;
      } else {
        throw new Error('unimplemented ' + line);
      }
      const start = new Point(startX, z);
      const end = new Point(endX, z += line.length * this.unitsMultiplier);
      const controlPoints = isSplineLine(line)
        ? getSplineControlPoints(line, start, end, this.unitsMultiplier)
        : [];
      specs.push({
        line,
        segment: new Segment(getLineSegmentType(line), start, end, controlPoints),
        startFeature: getLineStartFeature(line),
        endFeature: getLineEndFeature(line),
      });
    }
    return specs;
  }

  private applyEdgeFeatures(specs: ProfileSegmentSpec[], zeroX: number): Segment[] {
    const features = specs.map((spec, index) => {
      const previousRadius = index === 0 ? zeroX : specs[index - 1].segment.end.x;
      const nextRadius = index === specs.length - 1 ? zeroX : specs[index + 1].segment.start.x;
      const start = this.createEndpointFeature(spec, 'start', previousRadius);
      const end = this.createEndpointFeature(spec, 'end', nextRadius);
      this.validateSegmentFeatureFit(spec, start, end);
      return {start, end};
    });

    const result: Segment[] = [];
    let currentEnd: Point | null = null;

    for (let index = 0; index < specs.length; index++) {
      const spec = specs[index];
      const startFeature = features[index].start;
      const endFeature = features[index].end;
      const segmentStart = startFeature?.segmentPoint ?? spec.segment.start;
      const segmentEnd = endFeature?.segmentPoint ?? spec.segment.end;
      const entryStart = startFeature?.radialPoint ?? segmentStart;

      if (currentEnd) {
        this.validateConnectorFeatureFit(specs[index - 1].segment.end, spec.segment.start, currentEnd, entryStart);
        appendSegment(result, new Segment('LINE', currentEnd, entryStart));
      } else {
        currentEnd = entryStart;
      }

      if (startFeature) {
        appendSegments(result, startFeature.segments);
      }
      const controlPoints = segmentStart.isEqual(spec.segment.start) && segmentEnd.isEqual(spec.segment.end)
        ? spec.segment.controlPoints
        : [];
      appendSegment(result, new Segment(spec.segment.type, segmentStart, segmentEnd, controlPoints));
      if (endFeature) {
        appendSegments(result, endFeature.segments);
      }

      currentEnd = endFeature?.radialPoint ?? segmentEnd;
    }

    return result;
  }

  private createEndpointFeature(spec: ProfileSegmentSpec, endpoint: 'start' | 'end', neighborRadius: number): EndpointFeatureGeometry | null {
    const feature = normalizeEdgeFeature(endpoint === 'start' ? spec.startFeature : spec.endFeature);
    if (!feature) return null;
    if (spec.segment.type !== 'LINE') {
      throw new Error('Error: chamfers and fillets are not supported for CONV or CONC segments');
    }

    const size = feature.value * this.unitsMultiplier;
    const edgePoint = endpoint === 'start' ? spec.segment.start : spec.segment.end;
    const radialDelta = neighborRadius - edgePoint.x;
    const radialGap = Math.abs(radialDelta);
    if (radialGap <= EDGE_FEATURE_EPSILON) {
      throw new Error('Error: chamfer or fillet requires a radial edge');
    }

    const lineVector = pointDelta(spec.segment.start, spec.segment.end);
    const span = horizontalSpan(spec.segment);
    if (span <= EDGE_FEATURE_EPSILON) {
      throw new Error('Error: chamfer or fillet is too large for the segment to contain');
    }

    const radialDirection = {x: Math.sign(radialDelta), z: 0};
    const segmentDirection = endpoint === 'start'
      ? normalizeVector(lineVector)
      : scaleVector(normalizeVector(lineVector), -1);
    const angle = angleBetween(radialDirection, segmentDirection);
    if (angle <= EDGE_FEATURE_EPSILON || Math.PI - angle <= EDGE_FEATURE_EPSILON) {
      throw new Error('Error: chamfer or fillet requires a corner angle');
    }

    if (feature.name === 'CH') {
      const segmentPoint = pointAtHorizontalTrim(spec.segment, endpoint, size);
      const radialPoint = addVector(edgePoint, scaleVector(radialDirection, size));
      this.validateEndpointFeatureFit(size, radialGap);
      return {
        radialPoint,
        segmentPoint,
        trimDistance: size,
        segments: endpoint === 'start'
          ? [new Segment('LINE', radialPoint, segmentPoint)]
          : [new Segment('LINE', segmentPoint, radialPoint)],
      };
    }

    const fullSegmentCurveType = getFullSegmentFilletCurveType(spec.segment, endpoint, radialDirection.x, size);
    if (fullSegmentCurveType) {
      return endpoint === 'start'
        ? {
          radialPoint: spec.segment.start,
          segmentPoint: spec.segment.end,
          trimDistance: size,
          segments: [new Segment(fullSegmentCurveType, spec.segment.start, spec.segment.end)],
        }
        : {
          radialPoint: spec.segment.end,
          segmentPoint: spec.segment.start,
          trimDistance: size,
          segments: [new Segment(fullSegmentCurveType, spec.segment.start, spec.segment.end)],
        };
    }

    const horizontalComponent = Math.abs(segmentDirection.z);
    if (horizontalComponent <= EDGE_FEATURE_EPSILON) {
      throw new Error('Error: chamfer or fillet requires horizontal segment length');
    }

    const tangentDistance = size / horizontalComponent;
    const radius = tangentDistance * Math.tan(angle / 2);
    this.validateEndpointFeatureFit(tangentDistance, radialGap);
    const radialPoint = addVector(edgePoint, scaleVector(radialDirection, tangentDistance));
    const segmentPoint = pointAtHorizontalTrim(spec.segment, endpoint, size);
    const bisector = normalizeVector(addVectors(radialDirection, segmentDirection));
    const center = addVector(edgePoint, scaleVector(bisector, radius / Math.sin(angle / 2)));
    return {
      radialPoint,
      segmentPoint,
      trimDistance: size,
      segments: endpoint === 'start'
        ? filletArcSegments(center, radius, radialPoint, segmentPoint)
        : filletArcSegments(center, radius, segmentPoint, radialPoint),
    };
  }

  private validateEndpointFeatureFit(radialTrimDistance: number, radialGap: number): void {
    if (radialTrimDistance - radialGap > EDGE_FEATURE_EPSILON) {
      throw new Error('Error: chamfer or fillet is too large for the adjacent radial edge');
    }
  }

  private validateSegmentFeatureFit(
    spec: ProfileSegmentSpec,
    startFeature: EndpointFeatureGeometry | null,
    endFeature: EndpointFeatureGeometry | null,
  ): void {
    const segmentLength = horizontalSpan(spec.segment);
    const featureLength = (startFeature?.trimDistance ?? 0) + (endFeature?.trimDistance ?? 0);
    if (featureLength - segmentLength > EDGE_FEATURE_EPSILON) {
      throw new Error('Error: chamfer or fillet is too large for the segment to contain');
    }
  }

  private validateConnectorFeatureFit(originalStart: Point, originalEnd: Point, start: Point, end: Point): void {
    const radialDirection = Math.sign(originalEnd.x - originalStart.x);
    if (!radialDirection) return;
    if (Math.abs(start.z - end.z) > EDGE_FEATURE_EPSILON) return;
    if (radialDirection * (end.x - start.x) < -EDGE_FEATURE_EPSILON) {
      throw new Error('Error: chamfers or fillets are too large for the adjacent radial edge');
    }
  }

  reverse(): string {
    const insideBlock = this.data.inside;
    const firstLLine = this.data.outside.length
      ? findLineStart(this.text, 'L')
      : findLineStart(this.text, 'L', findLineStart(this.text, 'INSIDE'));
    if (firstLLine === -1) return this.text;
    const preambula = this.text.substring(0, firstLLine);
    const result: string[] = [];
    result.push(...reverseEntries(this.data.outside));
    if (insideBlock) {
      if (this.data.outside.length) {
        result.push(...insideBlock.comments.map(commentToString));
        result.push(insideDirectiveToString(insideBlock.directive));
      }
      result.push(...reverseEntries(insideBlock.entries));
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
    const pushEntries = (entries: readonly LatheEntry[]) => {
      for (const entry of entries) {
        pushComments(entry.comments);
        lines.push(scaleLatheLine(entry.line, xScale, zScale));
      }
    };

    pushComments(this.data.leadingComments);
    if (this.data.units) lines.push(unitsDirectiveToString(this.data.units));
    pushComments(this.data.afterUnitsComments);
    if (this.data.stock) lines.push(stockDirectiveToString(scaleStockDirective(this.data.stock, xScale, scaledPartDiameter)));
    pushComments(this.data.afterStockComments);
    if (this.data.tool) lines.push(toolDirectiveToString(this.data.tool));
    pushComments(this.data.afterToolComments);
    if (this.data.depth) lines.push(depthDirectiveToString(this.data.depth));
    pushComments(this.data.afterDepthComments);
    if (this.data.feed) lines.push(feedDirectiveToString(this.data.feed));
    pushComments(this.data.afterFeedComments);
    if (this.data.mode) lines.push(modeDirectiveToString(this.data.mode));
    pushComments(this.data.afterModeComments);
    if (this.data.axes) lines.push(axesDirectiveToString(this.data.axes));
    pushEntries(this.data.outside);

    const insideBlock = this.data.inside;
    if (insideBlock) {
      pushComments(insideBlock.comments);
      lines.push(insideDirectiveToString(insideBlock.directive));
      pushEntries(insideBlock.entries);
    }

    pushComments(this.data.trailingComments);
    return lines.join('\n');
  }
}

function reverseEntries(entries: readonly LatheEntry[]): string[] {
  return entries.map(entry => reverseLine(entry.line)).reverse();
}

function getProfileEndSizeType(entries: readonly LatheEntry[]): ProfileSizeType | null {
  for (const entry of [...entries].reverse()) {
    const line = entry.line;
    if (isPartingLine(line)) continue;
    if (isStraightLine(line)) return line.sizeType;
    if (isCurvedLine(line)) return line.endType === 'DE' ? 'D' : 'R';
    if (isSplineLine(line)) return line.endType === 'DE' ? 'D' : 'R';
  }
  return null;
}

function insideDirectiveToString(directive: InsideDirective): string {
  return `INSIDE${formatComment(directive.comment)}`;
}

function findLineStart(text: string, lineStart: string, fromIndex = 0): number {
  if (fromIndex < 0) return -1;
  if (text.startsWith(lineStart, fromIndex)) return fromIndex;
  return text.indexOf('\n' + lineStart, fromIndex);
}

function reverseLine(line: LatheLine): string {
  if (isCurvedLine(line)) {
    return latheLineToString({
      ...line,
      start: line.end,
      end: line.start,
      angle: line.angle ? {...line.angle, value: -line.angle.value} : null,
      angleAnchorType: line.angleAnchorType ? reverseAngleAnchorType(line.angleAnchorType) : null,
      startFeature: line.endFeature,
      endFeature: line.startFeature,
    });
  }
  if (isSplineLine(line)) {
    return latheLineToString({
      ...line,
      start: line.end,
      end: line.start,
      controls: [...line.controls].reverse(),
    });
  }
  return latheLineToString(line);
}

function getProfileLineDimensions(entries: readonly LatheEntry[]): {maxRadius: number, materialLength: number} | null {
  let maxRadius = 0;
  let materialLength = 0;
  for (const entry of entries) {
    const line = entry.line;
    if (isPartingLine(line)) continue;
    materialLength += line.length;
    if (isStraightLine(line)) {
      maxRadius = Math.max(maxRadius, line.size / (line.sizeType === 'D' ? 2 : 1));
    } else if (isCurvedLine(line)) {
      maxRadius = Math.max(
        maxRadius,
        line.start / (line.startType === 'DS' ? 2 : 1),
        line.end / (line.endType === 'DE' ? 2 : 1),
      );
    } else if (isSplineLine(line)) {
      maxRadius = Math.max(
        maxRadius,
        line.start / (line.startType === 'DS' ? 2 : 1),
        line.end / (line.endType === 'DE' ? 2 : 1),
        ...line.controls.map(control => control.size / (control.sizeType === 'D' ? 2 : 1)),
      );
    }
  }
  return maxRadius > 0 && materialLength > 0 ? {maxRadius, materialLength} : null;
}

function getProfileMaterialEndZ(entries: readonly LatheEntry[], unitsMultiplier: number): number {
  let z = 0;
  let endZ = 0;
  for (const entry of entries) {
    z += entry.line.length * unitsMultiplier;
    if (!isPartingLine(entry.line)) endZ = z;
  }
  return endZ;
}

function getStockDirectiveDiameterInLatheUnits(directive: StockDirective): number {
  return directive.size * (directive.sizeType === 'D' ? 1 : 2);
}

function extendMixedProfilesToCommonEnd(
  outside: Segment[],
  inside: Segment[],
  targetZ: number,
  insideExtensionX: number,
): [Segment[], Segment[]] {
  if (!outside.length || !inside.length) return [outside, inside];
  return [extendProfileToZ(outside, targetZ), extendInsideProfileToZ(inside, targetZ, insideExtensionX)];
}

function extendProfileToZ(profile: Segment[], targetZ: number): Segment[] {
  const last = profile.at(-1);
  if (!last || targetZ - last.end.z <= EDGE_FEATURE_EPSILON) return profile;
  return removeColinearSegments([
    ...profile,
    new Segment('LINE', last.end, new Point(last.end.x, targetZ)),
  ]);
}

function extendInsideProfileToZ(profile: Segment[], targetZ: number, extensionX: number): Segment[] {
  const last = profile.at(-1);
  if (!last || targetZ - last.end.z <= EDGE_FEATURE_EPSILON) return profile;
  const extension = Math.abs(last.end.x - extensionX) <= EDGE_FEATURE_EPSILON
    ? [new Segment('LINE', last.end, new Point(extensionX, targetZ))]
    : [
        new Segment('LINE', last.end, new Point(extensionX, last.end.z)),
        new Segment('LINE', new Point(extensionX, last.end.z), new Point(extensionX, targetZ)),
      ];
  return removeColinearSegments([
    ...profile,
    ...extension,
  ]);
}

function hasClosedProfileArea(segments: readonly Segment[]): boolean {
  const points = segments.flatMap(segment => [segment.start, segment.end, ...segment.controlPoints]);
  if (!points.length) return false;
  const minX = Math.min(...points.map(point => point.x));
  const maxX = Math.max(...points.map(point => point.x));
  const minZ = Math.min(...points.map(point => point.z));
  const maxZ = Math.max(...points.map(point => point.z));
  return maxX - minX > EDGE_FEATURE_EPSILON && maxZ - minZ > EDGE_FEATURE_EPSILON;
}

function truncateProfileToZ(profile: Segment[], targetZ: number): Segment[] {
  const result: Segment[] = [];
  for (const segment of profile) {
    if (segment.start.z > targetZ + EDGE_FEATURE_EPSILON) break;
    if (segment.end.z > targetZ + EDGE_FEATURE_EPSILON) {
      const trimmed = trimSegmentEndToZ(segment, targetZ);
      if (trimmed) result.push(trimmed);
      break;
    }
    if (Math.abs(segment.end.z - segment.start.z) <= EDGE_FEATURE_EPSILON
      && segment.start.z >= targetZ - EDGE_FEATURE_EPSILON) break;
    result.push(segment);
  }
  return result;
}

function truncateProfileSegmentDefinitionsToZ(
  definitions: ProfileSegmentDefinition[],
  targetZ: number,
): ProfileSegmentDefinition[] {
  const result: ProfileSegmentDefinition[] = [];
  for (const definition of definitions) {
    const segment = definition.segment;
    if (segment.start.z > targetZ + EDGE_FEATURE_EPSILON) break;
    if (segment.end.z > targetZ + EDGE_FEATURE_EPSILON) {
      const trimmed = trimSegmentEndToZ(segment, targetZ);
      if (trimmed) {
        result.push({
          segment: trimmed,
          startFeature: definition.startFeature,
          endFeature: null,
        });
      }
      break;
    }
    if (Math.abs(segment.end.z - segment.start.z) <= EDGE_FEATURE_EPSILON
      && segment.start.z >= targetZ - EDGE_FEATURE_EPSILON) break;
    result.push(definition);
  }
  return result;
}

function extendProfileSegmentDefinitionsToZ(
  definitions: ProfileSegmentDefinition[],
  targetZ: number,
): ProfileSegmentDefinition[] {
  const last = definitions.at(-1);
  if (!last || targetZ - last.segment.end.z <= EDGE_FEATURE_EPSILON) return definitions;
  return mergeColinearSegmentDefinitions([
    ...definitions,
    createLineSegmentDefinition(last.segment.end, new Point(last.segment.end.x, targetZ)),
  ]);
}

function extendInsideProfileSegmentDefinitionsToZ(
  definitions: ProfileSegmentDefinition[],
  targetZ: number,
  extensionX: number,
): ProfileSegmentDefinition[] {
  const last = definitions.at(-1);
  if (!last || targetZ - last.segment.end.z <= EDGE_FEATURE_EPSILON) return definitions;
  const extension = Math.abs(last.segment.end.x - extensionX) <= EDGE_FEATURE_EPSILON
    ? [createLineSegmentDefinition(last.segment.end, new Point(extensionX, targetZ))]
    : [
        createLineSegmentDefinition(last.segment.end, new Point(extensionX, last.segment.end.z)),
        createLineSegmentDefinition(new Point(extensionX, last.segment.end.z), new Point(extensionX, targetZ)),
      ];
  return mergeColinearSegmentDefinitions([
    ...definitions,
    ...extension,
  ]);
}

function createLineSegmentDefinition(start: Point, end: Point): ProfileSegmentDefinition {
  return {
    segment: new Segment('LINE', start, end),
    startFeature: null,
    endFeature: null,
  };
}

function mergeColinearSegmentDefinitions(definitions: ProfileSegmentDefinition[]): ProfileSegmentDefinition[] {
  const result: ProfileSegmentDefinition[] = [];
  for (const definition of definitions) {
    const previous = result.at(-1);
    if (previous && canMergeSegmentDefinitions(previous, definition)) {
      result[result.length - 1] = {
        segment: new Segment('LINE', previous.segment.start, definition.segment.end),
        startFeature: previous.startFeature,
        endFeature: definition.endFeature,
      };
      continue;
    }
    result.push(definition);
  }
  return result;
}

function canMergeSegmentDefinitions(previous: ProfileSegmentDefinition, next: ProfileSegmentDefinition): boolean {
  return previous.segment.type === 'LINE'
    && next.segment.type === 'LINE'
    && !previous.endFeature
    && !next.startFeature
    && previous.segment.end.isEqual(next.segment.start)
    && previous.segment.isColinear(next.segment) === true;
}

function trimSegmentEndToZ(segment: Segment, targetZ: number): Segment | null {
  if (segment.type !== 'LINE') return null;
  const span = segment.end.z - segment.start.z;
  if (span <= EDGE_FEATURE_EPSILON) return null;
  const ratio = (targetZ - segment.start.z) / span;
  if (ratio <= EDGE_FEATURE_EPSILON || ratio >= 1) return null;
  return new Segment('LINE', segment.start, new Point(
    segment.start.x + (segment.end.x - segment.start.x) * ratio,
    targetZ,
  ));
}

function segmentRadii(segment: Segment): number[] {
  return [segment.start.x, segment.end.x, ...segment.controlPoints.map(point => point.x)];
}

function scaleStockDirective(directive: StockDirective, xScale: number, scaledPartDiameter: number | null): StockDirective {
  const stockHole = scaleNumericParam(directive.hole, xScale);
  const scaledStockDiameter = scaleNumber(getStockDirectiveDiameterInLatheUnits(directive), xScale);
  const stockHoleDiameter = stockHole ? stockHole.value * (stockHole.name === 'ID' ? 1 : 2) : 0;
  const stockDiameter = scaledPartDiameter !== null && scaledPartDiameter > stockHoleDiameter
    ? scaledPartDiameter
    : scaledStockDiameter;
  return {
    ...directive,
    size: directive.sizeType === 'D' ? stockDiameter : scaleNumber(stockDiameter / 2, 1),
    hole: stockHole,
  };
}

function scaleLatheLine(line: LatheLine, xScale: number, zScale: number): string {
  if (isCurvedLine(line)) {
    return latheLineToString({
      ...line,
      length: scaleNumber(line.length, zScale),
      start: scaleNumber(line.start, xScale),
      end: scaleNumber(line.end, xScale),
      angle: line.angle ? {...line.angle, value: scaleConeAngle(line.angle.value, xScale, zScale)} : null,
      startFeature: scaleEdgeFeature(line.startFeature, xScale),
      endFeature: scaleEdgeFeature(line.endFeature, xScale),
    });
  }
  if (isSplineLine(line)) {
    return latheLineToString({
      ...line,
      length: scaleNumber(line.length, zScale),
      start: scaleNumber(line.start, xScale),
      end: scaleNumber(line.end, xScale),
      controls: line.controls.map(control => ({
        ...control,
        size: scaleNumber(control.size, xScale),
      })),
    });
  }
  if (isStraightLine(line)) {
    return latheLineToString({
      ...line,
      length: scaleNumber(line.length, zScale),
      size: scaleNumber(line.size, xScale),
      startFeature: scaleEdgeFeature(line.startFeature, xScale),
      endFeature: scaleEdgeFeature(line.endFeature, xScale),
    });
  }
  return latheLineToString(line);
}

function scaleNumericParam<Name extends string>(param: NumericParam<Name> | null, scale: number): NumericParam<Name> | null {
  return param ? {...param, value: scaleNumber(param.value, scale)} : null;
}

function scaleEdgeFeature(feature: EdgeFeature | null, scale: number): EdgeFeature | null {
  return feature ? {...feature, value: scaleNumber(feature.value, scale)} : null;
}

function scaleEdgeFeatureToUnits(feature: EdgeFeature | null, unitsMultiplier: number): EdgeFeature | null {
  return feature ? {...feature, value: feature.value * unitsMultiplier} : null;
}

function scaleNumber(value: number, scale: number): number {
  const multiplier = 10 ** SCALE_DECIMAL_PLACES;
  const rounded = Math.round(value * scale * multiplier) / multiplier;
  const integer = Math.round(rounded);
  return integer !== 0 && Math.abs(rounded - integer) <= 1 / multiplier ? integer : rounded;
}

function scaleConeAngle(angleDeg: number, xScale: number, zScale: number): number {
  return scaleNumber(Math.atan(Math.tan(angleDeg * Math.PI / 180) * xScale / zScale) * 180 / Math.PI, 1);
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
  return `UNITS ${directive.unit}${formatComment(directive.comment)}`;
}

function stockDirectiveToString(directive: StockDirective, options: {includeHole?: boolean} = {}): string {
  const includeHole = options.includeHole ?? true;
  const stockHole = includeHole && directive.hole ? ` ${directive.hole.name}${numberToString(directive.hole.value)}` : '';
  const allowance = directive.allowance ? ` ${directive.allowance.name}${numberToString(directive.allowance.value)}` : '';
  return `STOCK ${directive.sizeType}${numberToString(directive.size)}${stockHole}${allowance}${formatComment(directive.comment)}`;
}

function toolDirectiveToString(directive: ToolDirective): string {
  const params = numericParamsToString([directive.radius, directive.length, directive.height, directive.angle, directive.noseAngle]);
  return `TOOL ${directive.type}${params.length ? ' ' + params.join(' ') : ''}${formatComment(directive.comment)}`;
}

function depthDirectiveToString(directive: DepthDirective): string {
  const params = numericParamsToString([directive.cut, directive.finish]);
  return `DEPTH ${params.join(' ')}${formatComment(directive.comment)}`;
}

function feedDirectiveToString(directive: FeedDirective): string {
  const params = numericParamsToString([directive.move, directive.pass, directive.part]);
  return `FEED ${params.join(' ')}${formatComment(directive.comment)}`;
}

function numericParamsToString(params: readonly (NumericParam<string> | null)[]): string[] {
  return params.flatMap(param => param ? [`${param.name}${numberToString(param.value)}`] : []);
}

function edgeFeatureToString(feature: EdgeFeature | null): string {
  return feature ? ` ${feature.name}${numberToString(feature.value)}` : '';
}

function edgeFeaturesEqual(a: EdgeFeature | null, b: EdgeFeature | null): boolean {
  if (!a || !b) return a === b;
  return a.name === b.name && a.value === b.value;
}

function modeDirectiveToString(directive: ModeDirective): string {
  return `MODE ${directive.mode}${formatComment(directive.comment)}`;
}

function axesDirectiveToString(directive: AxesDirective): string {
  return `AXES ${directive.zDirection} ${directive.xDirection}${formatComment(directive.comment)}`;
}

function latheLineToString(line: LatheLine): string {
  if (isCurvedLine(line)) {
    if (line.angle && line.angleAnchorType) {
      const isStartAnchor = line.angleAnchorType === 'DS' || line.angleAnchorType === 'RS';
      const anchor = isStartAnchor ? line.start : line.end;
      const feature = isStartAnchor ? line.startFeature : line.endFeature;
      return `L${numberToString(line.length)} ${line.angleAnchorType}${numberToString(anchor)}${edgeFeatureToString(feature)} A${numberToString(line.angle.value)}${formatComment(line.comment)}`;
    }
    return `L${numberToString(line.length)} ${line.startType}${numberToString(line.start)}${edgeFeatureToString(line.startFeature)} ${line.endType}${numberToString(line.end)}${edgeFeatureToString(line.endFeature)}${line.curveType ? ' ' + line.curveType : ''}${formatComment(line.comment)}`;
  }
  if (isSplineLine(line)) {
    const controls = line.controls.map(control => `${control.sizeType}${numberToString(control.size)}`).join(' ');
    return `L${numberToString(line.length)} ${line.startType}${numberToString(line.start)} ${line.endType}${numberToString(line.end)} BSPLINE ${controls}${formatComment(line.comment)}`;
  }
  if (isStraightLine(line)) {
    if (!edgeFeaturesEqual(line.startFeature, line.endFeature)) {
      const startType = line.sizeType === 'D' ? 'DS' : 'RS';
      const endType = line.sizeType === 'D' ? 'DE' : 'RE';
      return `L${numberToString(line.length)} ${startType}${numberToString(line.size)}${edgeFeatureToString(line.startFeature)} ${endType}${numberToString(line.size)}${edgeFeatureToString(line.endFeature)}${formatComment(line.comment)}`;
    }
    return `L${numberToString(line.length)} ${line.sizeType}${numberToString(line.size)}${edgeFeatureToString(line.startFeature)}${formatComment(line.comment)}`;
  }
  return `L${numberToString(line.length)}${formatComment(line.comment)}`;
}

function numberToString(value: number): string {
  const rounded = Math.round(value * 1e12) / 1e12;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
}

function reverseAngleAnchorType(anchorType: SegmentAnchorType): SegmentAnchorType {
  if (anchorType === 'DS') return 'DE';
  if (anchorType === 'DE') return 'DS';
  if (anchorType === 'RS') return 'RE';
  return 'RS';
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

function getLineSegmentType(line: LatheLine): string {
  if (isSplineLine(line)) return 'BSPLINE';
  return isCurvedLine(line) ? line.curveType || 'LINE' : 'LINE';
}

function getLineStartFeature(line: LatheLine): EdgeFeature | null {
  if (isStraightLine(line)) return line.startFeature;
  if (isCurvedLine(line)) return line.startFeature;
  return null;
}

function getLineEndFeature(line: LatheLine): EdgeFeature | null {
  if (isStraightLine(line)) return line.endFeature;
  if (isCurvedLine(line)) return line.endFeature;
  return null;
}

function getSplineControlPoints(line: SplineLine, start: Point, end: Point, unitsMultiplier: number): Point[] {
  const radii = [
    start.x,
    ...line.controls.map(control => control.size / (control.sizeType === 'D' ? 2 : 1) * unitsMultiplier),
    end.x,
  ];
  const length = end.z - start.z;
  return radii.map((radius, index) => new Point(
    radius,
    start.z + length * index / (radii.length - 1),
  ));
}

function normalizeEdgeFeature(feature: EdgeFeature | null): EdgeFeature | null {
  return feature && feature.value > 0 ? feature : null;
}

function appendSegments(result: Segment[], segments: Segment[]): void {
  for (const segment of segments) appendSegment(result, segment);
}

function appendSegment(result: Segment[], segment: Segment): void {
  if (distance(segment.start, segment.end) <= EDGE_FEATURE_EPSILON) return;
  result.push(segment);
}

function pointAtHorizontalTrim(segment: Segment, endpoint: 'start' | 'end', trimDistance: number): Point {
  const span = horizontalSpan(segment);
  if (span <= EDGE_FEATURE_EPSILON) throw new Error('Error: chamfer or fillet requires horizontal segment length');
  const ratio = trimDistance / span;
  const vector = pointDelta(segment.start, segment.end);
  return endpoint === 'start'
    ? new Point(segment.start.x + vector.x * ratio, segment.start.z + vector.z * ratio)
    : new Point(segment.end.x - vector.x * ratio, segment.end.z - vector.z * ratio);
}

function horizontalSpan(segment: Segment): number {
  return Math.abs(segment.end.z - segment.start.z);
}

function getFullSegmentFilletCurveType(segment: Segment, endpoint: 'start' | 'end', radialDirection: number, trimDistance: number): 'CONV' | 'CONC' | null {
  if (Math.abs(trimDistance - horizontalSpan(segment)) > EDGE_FEATURE_EPSILON) return null;

  const radialDelta = segment.end.x - segment.start.x;
  const segmentRadialDirection = Math.sign(radialDelta);
  if (!segmentRadialDirection || radialDirection !== segmentRadialDirection) return null;

  if (endpoint === 'start') return segmentRadialDirection > 0 ? 'CONV' : 'CONC';
  return segmentRadialDirection > 0 ? 'CONC' : 'CONV';
}

function filletArcSegments(center: Point, radius: number, start: Point, end: Point): Segment[] {
  const startAngle = Math.atan2(start.z - center.z, start.x - center.x);
  const endAngle = Math.atan2(end.z - center.z, end.x - center.x);
  const delta = normalizeAngle(endAngle - startAngle);
  const steps = Math.max(2, Math.ceil(Math.abs(delta) * radius / FILLET_ARC_CHORD_MM));
  const segments: Segment[] = [];
  let previous = start;
  for (let i = 1; i <= steps; i++) {
    const point = i === steps
      ? end
      : new Point(
        center.x + radius * Math.cos(startAngle + delta * i / steps),
        center.z + radius * Math.sin(startAngle + delta * i / steps),
      );
    appendSegment(segments, new Segment('LINE', previous, point));
    previous = point;
  }
  return segments;
}

function normalizeAngle(angle: number): number {
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function distance(a: Point, b: Point): number {
  return vectorLength(pointDelta(a, b));
}

function pointsEqual(left: readonly Point[], right: readonly Point[]): boolean {
  return left.length === right.length && left.every((point, index) => point.isEqual(right[index]));
}

function pointDelta(a: Point, b: Point): Vector {
  return {x: b.x - a.x, z: b.z - a.z};
}

function vectorLength(vector: Vector): number {
  return Math.hypot(vector.x, vector.z);
}

function normalizeVector(vector: Vector): Vector {
  const length = vectorLength(vector);
  if (length <= EDGE_FEATURE_EPSILON) throw new Error('Error: unable to normalize zero-length vector');
  return {x: vector.x / length, z: vector.z / length};
}

function addVector(point: Point, vector: Vector): Point {
  return new Point(point.x + vector.x, point.z + vector.z);
}

function addVectors(a: Vector, b: Vector): Vector {
  return {x: a.x + b.x, z: a.z + b.z};
}

function scaleVector(vector: Vector, scale: number): Vector {
  return {x: vector.x * scale, z: vector.z * scale};
}

function angleBetween(a: Vector, b: Vector): number {
  return Math.acos(clamp(dot(a, b) / (vectorLength(a) * vectorLength(b)), -1, 1));
}

function dot(a: Vector, b: Vector): number {
  return a.x * b.x + a.z * b.z;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isStraightLine(line: LatheLine): line is StraightLine {
  return line.kind === 'straight';
}

function isCurvedLine(line: LatheLine): line is CurvedLine {
  return line.kind === 'curved';
}

function isSplineLine(line: LatheLine): line is SplineLine {
  return line.kind === 'spline';
}

function isPartingLine(line: LatheLine) {
  return line.kind === 'parting' || line.kind === 'straight' && line.sizeType === 'D' && !line.size;
}
