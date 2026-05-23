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

function removeConsecutiveDuplicatePoints(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    if (!result.at(-1)?.isEqual(point)) result.push(point);
  }
  if (result.length > 1 && result[0].isEqual(result.at(-1)!)) result.pop();
  return result;
}
