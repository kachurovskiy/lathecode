import { Point, Segment } from './lathecode';

const DEFAULT_MAX_CHORD_MM = 0.2;

export function approximateSegments(segments: Segment[], maxChordMm = DEFAULT_MAX_CHORD_MM): Point[] {
  if (!segments.length) return [];
  const points: Point[] = [segments[0].start];
  for (const segment of segments) {
    points.push(...approximateSegmentEndPoints(segment, maxChordMm));
  }
  return removeConsecutiveDuplicatePoints(points);
}

export function offsetSegmentsRadially(segments: Segment[], radiusDeltaMm: number): Segment[] {
  return segments.map(segment => segment.offsetBy(radiusDeltaMm, 0));
}

function approximateSegmentEndPoints(segment: Segment, maxChordMm: number): Point[] {
  const isLineCircle = (segment.type === 'CONV' || segment.type === 'CONC') && segment.start.x === segment.end.x;
  if (segment.type === 'LINE' || isLineCircle) return [segment.end];
  if (segment.type === 'BSPLINE') return approximateSplineSegmentEndPoints(segment, maxChordMm);
  if (segment.type !== 'CONV' && segment.type !== 'CONC') throw new Error('Unable to approximate segment of type ' + segment.type);

  const convex = segment.type === 'CONV';
  const asc = segment.end.x > segment.start.x;
  const center = asc === convex ? new Point(segment.start.x, segment.end.z) : new Point(segment.end.x, segment.start.z);
  let startAngle = 0;
  let endAngle = 0;
  let counterclockwise = false;

  if (asc && convex) {
    startAngle = 0;
    endAngle = Math.PI / 2;
  } else if (asc && !convex) {
    startAngle = Math.PI * 3 / 2;
    endAngle = Math.PI;
    counterclockwise = true;
  } else if (!asc && convex) {
    startAngle = Math.PI / 2;
    endAngle = Math.PI;
  } else {
    startAngle = Math.PI * 2;
    endAngle = Math.PI * 3 / 2;
    counterclockwise = true;
  }

  let delta = endAngle - startAngle;
  if (!counterclockwise && delta < 0) delta += Math.PI * 2;
  if (counterclockwise && delta > 0) delta -= Math.PI * 2;

  const rx = Math.abs(segment.end.z - segment.start.z);
  const ry = Math.abs(segment.end.x - segment.start.x);
  const steps = Math.max(1, Math.ceil(Math.max(rx, ry) * Math.PI / 2 / Math.max(maxChordMm, 0.001)));
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const angle = startAngle + delta * i / steps;
    points.push(new Point(
      center.x + ry * Math.sin(angle),
      center.z - rx * Math.cos(angle),
    ));
  }
  points[points.length - 1] = segment.end;
  return points;
}

function approximateSplineSegmentEndPoints(segment: Segment, maxChordMm: number): Point[] {
  if (segment.controlPoints.length < 2) return [segment.end];

  const controls = segment.controlPoints;
  const degree = Math.min(3, controls.length - 1);
  const knots = openUniformKnots(controls.length, degree);
  const maxChord = Math.max(maxChordMm, 0.001);
  const points: Point[] = [];
  const start = evaluateBSpline(controls, degree, knots, 0);
  const end = evaluateBSpline(controls, degree, knots, 1);

  appendSplineRange(points, controls, degree, knots, 0, start, 1, end, maxChord, 0);
  points[points.length - 1] = segment.end;
  return points;
}

function appendSplineRange(
  points: Point[],
  controls: readonly Point[],
  degree: number,
  knots: readonly number[],
  startT: number,
  start: Point,
  endT: number,
  end: Point,
  maxChordMm: number,
  depth: number,
): void {
  const midT = (startT + endT) / 2;
  const mid = evaluateBSpline(controls, degree, knots, midT);
  const chordLength = distance(start, end);
  const midpointError = distanceToSegment(mid, start, end);
  if (depth >= 24 || (chordLength <= maxChordMm && midpointError <= maxChordMm / 4)) {
    points.push(end);
    return;
  }

  appendSplineRange(points, controls, degree, knots, startT, start, midT, mid, maxChordMm, depth + 1);
  appendSplineRange(points, controls, degree, knots, midT, mid, endT, end, maxChordMm, depth + 1);
}

function evaluateBSpline(controlPoints: readonly Point[], degree: number, knots: readonly number[], t: number): Point {
  const lastControlIndex = controlPoints.length - 1;
  if (t <= 0) return controlPoints[0];
  if (t >= 1) return controlPoints[lastControlIndex];

  const span = findKnotSpan(lastControlIndex, degree, t, knots);
  const points = controlPoints
    .slice(span - degree, span + 1)
    .map(point => new Point(point.x, point.z));

  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const knotLeft = knots[span - degree + j];
      const knotRight = knots[span + j - r + 1];
      const alpha = knotRight === knotLeft ? 0 : (t - knotLeft) / (knotRight - knotLeft);
      points[j] = interpolate(points[j - 1], points[j], alpha);
    }
  }
  return points[degree];
}

function findKnotSpan(lastControlIndex: number, degree: number, t: number, knots: readonly number[]): number {
  let low = degree;
  let high = lastControlIndex + 1;
  let mid = Math.floor((low + high) / 2);
  while (t < knots[mid] || t >= knots[mid + 1]) {
    if (t < knots[mid]) {
      high = mid;
    } else {
      low = mid;
    }
    mid = Math.floor((low + high) / 2);
  }
  return mid;
}

function openUniformKnots(controlPointCount: number, degree: number): number[] {
  const lastControlIndex = controlPointCount - 1;
  const knots: number[] = [];
  for (let index = 0; index <= lastControlIndex + degree + 1; index++) {
    if (index <= degree) {
      knots.push(0);
    } else if (index >= lastControlIndex + 1) {
      knots.push(1);
    } else {
      knots.push((index - degree) / (lastControlIndex - degree + 1));
    }
  }
  return knots;
}

function interpolate(start: Point, end: Point, ratio: number): Point {
  return new Point(
    start.x + (end.x - start.x) * ratio,
    start.z + (end.z - start.z) * ratio,
  );
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const segmentLengthSquared = squaredDistance(start, end);
  if (segmentLengthSquared <= 1e-18) return distance(point, start);
  const ratio = Math.max(0, Math.min(1, (
    (point.x - start.x) * (end.x - start.x)
    + (point.z - start.z) * (end.z - start.z)
  ) / segmentLengthSquared));
  return distance(point, interpolate(start, end, ratio));
}

function distance(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function squaredDistance(start: Point, end: Point): number {
  const x = end.x - start.x;
  const z = end.z - start.z;
  return x * x + z * z;
}

function removeConsecutiveDuplicatePoints(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    if (!result.at(-1)?.isEqual(point)) result.push(point);
  }
  if (result.length > 1 && result[0].isEqual(result.at(-1)!)) result.pop();
  return result;
}
