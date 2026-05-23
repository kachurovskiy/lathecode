import polygonClipping, { type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping';
import {
  Clipper64,
  ClipType,
  FillRule,
  minkowskiSum as clipperMinkowskiSum,
  union as clipperUnion,
  type Path64,
  type Paths64,
  type Point64,
} from 'clipper2-ts';
import { type AppSettings, DEFAULT_APP_SETTINGS, normalizeAppSettings } from './settings';

export type VectorPoint = {
  x: number,
  y: number,
};

export type Bounds = {
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
};

export type Span = {
  minX: number,
  maxX: number,
};

export type VerticalSpan = {
  minY: number,
  maxY: number,
};

export type VectorGeometry = MultiPolygon;
export type VectorPath = VectorPoint[];

let EPSILON = DEFAULT_APP_SETTINGS.polygonEpsilonMm;
let CLIPPER_SCALE = DEFAULT_APP_SETTINGS.polygonClipperScale;
let CLIPPER_EPSILON = 1 / CLIPPER_SCALE;
const clipping = polygonClipping as {
  difference: (subjectGeom: MultiPolygon, ...clipGeoms: MultiPolygon[]) => MultiPolygon,
  intersection: (subjectGeom: MultiPolygon, ...clipGeoms: MultiPolygon[]) => MultiPolygon,
  union: (subjectGeom: MultiPolygon, ...clipGeoms: MultiPolygon[]) => MultiPolygon,
};

export function configurePolygonSettings(settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS): AppSettings {
  const normalizedSettings = normalizeAppSettings(settings);
  EPSILON = normalizedSettings.polygonEpsilonMm;
  CLIPPER_SCALE = normalizedSettings.polygonClipperScale;
  CLIPPER_EPSILON = 1 / CLIPPER_SCALE;
  return normalizedSettings;
}

export function emptyGeometry(): VectorGeometry {
  return [];
}

export function pointsToRing(points: VectorPoint[]): Ring {
  return removeConsecutiveDuplicatePoints(points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y)))
    .map(point => [point.x, point.y]);
}

export function polygonFromPoints(points: VectorPoint[]): VectorGeometry {
  const ring = pointsToRing(points);
  return ring.length >= 3 && Math.abs(ringArea(ring)) > EPSILON ? [[ring]] : [];
}

export function rectangleGeometry(minX: number, minY: number, maxX: number, maxY: number): VectorGeometry {
  if (maxX - minX <= EPSILON || maxY - minY <= EPSILON) return [];
  return [[[
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ]]];
}

export function intersectGeometry(subject: VectorGeometry, ...clips: VectorGeometry[]): VectorGeometry {
  if (!subject.length || clips.some(clip => !clip.length)) return [];
  try {
    return normalizeGeometry(clipping.intersection(subject, ...clips));
  } catch {
    return booleanGeometryClipper(ClipType.Intersection, subject, clips);
  }
}

export function differenceGeometry(subject: VectorGeometry, ...clips: VectorGeometry[]): VectorGeometry {
  if (!subject.length) return [];
  const nonEmptyClips = clips.filter(clip => clip.length);
  if (!nonEmptyClips.length) return subject;
  try {
    return normalizeGeometry(clipping.difference(subject, ...nonEmptyClips));
  } catch {
    return booleanGeometryClipper(ClipType.Difference, subject, nonEmptyClips);
  }
}

export function unionGeometry(...geometries: VectorGeometry[]): VectorGeometry {
  const nonEmpty = geometries.filter(geometry => geometry.length);
  if (!nonEmpty.length) return [];
  if (nonEmpty.length === 1) return nonEmpty[0];
  return unionGeometryClipper(...nonEmpty);
}

export function unionGeometryClipper(...geometries: VectorGeometry[]): VectorGeometry {
  const paths = geometries.flatMap(geometryToClipperPaths);
  if (!paths.length) return [];
  return clipperPathsToGeometry(clipperUnion(paths, FillRule.NonZero));
}

export function normalizeGeometry(geometry: VectorGeometry): VectorGeometry {
  return geometry
    .map(polygon => {
      const [outer, ...holes] = polygon
        .map(ring => pointsToRing(ring.map(([x, y]) => ({
          x: cleanClipperNumber(x),
          y: cleanClipperNumber(y),
        }))))
        .filter(ring => ring.length >= 3 && Math.abs(ringArea(ring)) > EPSILON);
      if (!outer) return [];

      const normalizedOuter = ringArea(outer) < 0 ? [...outer].reverse() : outer;
      const normalizedHoles = holes.map(hole => ringArea(hole) > 0 ? [...hole].reverse() : hole);
      return [normalizedOuter, ...normalizedHoles];
    })
    .filter(polygon => polygonArea(polygon) > EPSILON);
}

export function minkowskiSumPath(pattern: VectorPath, path: VectorPath, pathIsClosed: boolean): VectorGeometry {
  const patternPath = vectorPathToClipperPath(pattern, true);
  const subjectPath = vectorPathToClipperPath(path, pathIsClosed);
  if (patternPath.length < 3 || subjectPath.length < (pathIsClosed ? 3 : 2)) return [];
  const pieces = clipperMinkowskiSum(patternPath, subjectPath, pathIsClosed);
  pieces.push(...subjectPath.map(point => translateClipperPath(patternPath, point)));
  return clipperPathsToGeometry(clipperUnion(pieces, FillRule.NonZero), pathIsClosed);
}

export function subtractGeometryFromOpenPath(path: VectorPath, geometry: VectorGeometry): VectorPath[] {
  return clipOpenPathWithGeometry(path, geometry, ClipType.Difference);
}

export function intersectGeometryWithOpenPath(path: VectorPath, geometry: VectorGeometry): VectorPath[] {
  return clipOpenPathWithGeometry(path, geometry, ClipType.Intersection);
}

export function openPathIntersectsGeometryInterior(path: VectorPath, geometry: VectorGeometry): boolean {
  for (const clippedPath of intersectGeometryWithOpenPath(path, geometry)) {
    for (let i = 0; i < clippedPath.length - 1; i++) {
      const a = clippedPath[i];
      const b = clippedPath[i + 1];
      if (distanceSquared(a, b) <= CLIPPER_EPSILON ** 2) continue;
      const midpoint = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
      if (pointInGeometry(midpoint, geometry) === 'inside') return true;
    }
  }
  return false;
}

export function pointInGeometry(point: VectorPoint, geometry: VectorGeometry): 'inside' | 'outside' | 'boundary' {
  let onBoundary = false;
  for (const polygon of geometry) {
    const location = pointInPolygonGeometry(point, polygon);
    if (location === 'inside') return 'inside';
    if (location === 'boundary') onBoundary = true;
  }
  return onBoundary ? 'boundary' : 'outside';
}

export function geometryArea(geometry: VectorGeometry): number {
  return geometry.reduce((sum, polygon) => sum + polygonArea(polygon), 0);
}

export function polygonArea(polygon: Polygon): number {
  if (!polygon.length) return 0;
  const [outer, ...holes] = polygon;
  return Math.max(0, Math.abs(ringArea(outer)) - holes.reduce((sum, hole) => sum + Math.abs(ringArea(hole)), 0));
}

export function geometryBounds(geometry: VectorGeometry): Bounds | null {
  const bounds = geometry
    .flat(2)
    .reduce<Bounds | null>((result, pair) => extendBounds(result, pair[0], pair[1]), null);
  return bounds;
}

export function polygonBounds(polygon: Polygon): Bounds | null {
  return polygon
    .flat(1)
    .reduce<Bounds | null>((result, pair) => extendBounds(result, pair[0], pair[1]), null);
}

export function sortedPolygonsByBounds(geometry: VectorGeometry): Polygon[] {
  return geometry
    .filter(polygon => polygonArea(polygon) > EPSILON)
    .sort((a, b) => {
      const aBounds = polygonBounds(a);
      const bBounds = polygonBounds(b);
      if (!aBounds || !bBounds) return 0;
      return aBounds.minX - bBounds.minX || aBounds.maxX - bBounds.maxX;
    });
}

export function horizontalSpansAtY(geometry: VectorGeometry, y: number): Span[] {
  const spans = geometry.flatMap(polygon => polygonSpansAtY(polygon, y));
  return mergeSpans(spans);
}

export function verticalSpansAtX(geometry: VectorGeometry, x: number): VerticalSpan[] {
  const spans = geometry.flatMap(polygon => polygonSpansAtX(polygon, x));
  return mergeVerticalSpans(spans);
}

export function ringArea(ring: Ring): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

function clipOpenPathWithGeometry(path: VectorPath, geometry: VectorGeometry, clipType: ClipType): VectorPath[] {
  const subject = vectorPathToClipperPath(path, false);
  if (subject.length < 2) return [];

  const clips = geometryToClipperPaths(geometry);
  if (!clips.length) return clipType === ClipType.Difference ? [clipperPathToVectorPath(subject)] : [];

  const clipper = new Clipper64();
  const solutionClosed: Paths64 = [];
  const solutionOpen: Paths64 = [];
  clipper.addOpenSubject([subject]);
  clipper.addClip(clips);
  clipper.execute(clipType, FillRule.EvenOdd, solutionClosed, solutionOpen);

  return solutionOpen
    .map(clipperPathToVectorPath)
    .filter(openPathLengthIsMeaningful);
}

function booleanGeometryClipper(clipType: ClipType, subject: VectorGeometry, clips: VectorGeometry[]): VectorGeometry {
  const subjectPaths = geometryToClipperPaths(subject);
  const clipPaths = clips.flatMap(geometryToClipperPaths);
  if (!subjectPaths.length) return [];
  if (!clipPaths.length) return clipType === ClipType.Difference ? subject : [];

  const clipper = new Clipper64();
  const solution: Paths64 = [];
  clipper.addSubject(subjectPaths);
  clipper.addClip(clipPaths);
  clipper.execute(clipType, FillRule.EvenOdd, solution);
  return clipperPathsToGeometry(solution);
}

function geometryToClipperPaths(geometry: VectorGeometry): Paths64 {
  return geometry
    .flatMap(polygon => polygon)
    .map(ringToClipperPath)
    .filter(path => path.length >= 3);
}

function ringToClipperPath(ring: Ring): Path64 {
  return vectorPathToClipperPath(ring.map(([x, y]) => ({x, y})), true);
}

function vectorPathToClipperPath(path: VectorPath, closed: boolean): Path64 {
  const result: Path64 = [];
  for (const point of path) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const scaledPoint = vectorPointToClipperPoint(point);
    const previous = result.at(-1);
    if (!previous || previous.x !== scaledPoint.x || previous.y !== scaledPoint.y) result.push(scaledPoint);
  }

  const first = result[0];
  const last = result.at(-1);
  if (closed && first && last && result.length > 1 && first.x === last.x && first.y === last.y) result.pop();
  return result;
}

function vectorPointToClipperPoint(point: VectorPoint): Point64 {
  const x = Math.round(point.x * CLIPPER_SCALE);
  const y = Math.round(point.y * CLIPPER_SCALE);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new Error(`Geometry coordinate exceeds safe fixed-point range: ${point.x}, ${point.y}`);
  }
  return {x, y};
}

function translateClipperPath(path: Path64, by: Point64): Path64 {
  return path.map(point => ({x: point.x + by.x, y: point.y + by.y}));
}

function clipperPathToVectorPath(path: Path64): VectorPath {
  return path.map(point => ({
    x: cleanClipperNumber(point.x / CLIPPER_SCALE),
    y: cleanClipperNumber(point.y / CLIPPER_SCALE),
  }));
}

function clipperPathsToGeometry(paths: Paths64, fillHoles = false): VectorGeometry {
  const rings = paths
    .map(clipperPathToRing)
    .filter(ring => ring.length >= 3 && Math.abs(ringArea(ring)) > EPSILON);
  const outers = rings.filter(ring => ringArea(ring) > 0);
  const holes = fillHoles ? [] : rings.filter(ring => ringArea(ring) < 0);

  if (!outers.length) return rings.map(ring => [ringArea(ring) < 0 ? [...ring].reverse() : ring]);

  const polygons: VectorGeometry = outers.map(outer => [outer]);
  for (const hole of holes) {
    const containerIndex = findSmallestContainingRingIndex(hole, outers);
    if (containerIndex === -1) {
      polygons.push([[...hole].reverse()]);
    } else {
      polygons[containerIndex].push(hole);
    }
  }
  return polygons;
}

function clipperPathToRing(path: Path64): Ring {
  return clipperPathToVectorPath(path).map(point => [point.x, point.y]);
}

function findSmallestContainingRingIndex(hole: Ring, outers: Ring[]): number {
  const point = hole[0];
  let bestIndex = -1;
  let bestArea = Infinity;
  for (let i = 0; i < outers.length; i++) {
    const outer = outers[i];
    if (pointInRing({x: point[0], y: point[1]}, outer) === 'outside') continue;
    const area = Math.abs(ringArea(outer));
    if (area < bestArea) {
      bestArea = area;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function pointInPolygonGeometry(point: VectorPoint, polygon: Polygon): 'inside' | 'outside' | 'boundary' {
  if (!polygon.length) return 'outside';
  const [outerRing, ...holeRings] = polygon;
  const outerLocation = pointInRing(point, outerRing);
  if (outerLocation !== 'inside') return outerLocation;

  for (const holeRing of holeRings) {
    const holeLocation = pointInRing(point, holeRing);
    if (holeLocation === 'boundary') return 'boundary';
    if (holeLocation === 'inside') return 'outside';
  }
  return 'inside';
}

function pointInRing(point: VectorPoint, ring: Ring): 'inside' | 'outside' | 'boundary' {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = {x: ring[j][0], y: ring[j][1]};
    const b = {x: ring[i][0], y: ring[i][1]};
    if (pointOnSegment(point, a, b)) return 'boundary';
    if ((a.y > point.y) !== (b.y > point.y)) {
      const xIntersection = (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x;
      if (point.x < xIntersection) inside = !inside;
    }
  }
  return inside ? 'inside' : 'outside';
}

function pointOnSegment(point: VectorPoint, start: VectorPoint, end: VectorPoint): boolean {
  const cross = (point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x);
  if (Math.abs(cross) > CLIPPER_EPSILON) return false;
  const dot = (point.x - start.x) * (point.x - end.x) + (point.y - start.y) * (point.y - end.y);
  return dot <= CLIPPER_EPSILON ** 2;
}

function openPathLengthIsMeaningful(path: VectorPath): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    if (distanceSquared(path[i], path[i + 1]) > CLIPPER_EPSILON ** 2) return true;
  }
  return false;
}

function distanceSquared(a: VectorPoint, b: VectorPoint): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function cleanClipperNumber(value: number): number {
  if (Math.abs(value) <= CLIPPER_EPSILON / 2) return 0;
  return Math.round(value * CLIPPER_SCALE) / CLIPPER_SCALE;
}

function polygonSpansAtX(polygon: Polygon, x: number): VerticalSpan[] {
  if (!polygon.length) return [];
  const [outerRing, ...holeRings] = polygon;
  let spans = ringSpansAtX(outerRing, x);
  for (const holeRing of holeRings) {
    spans = subtractVerticalSpans(spans, ringSpansAtX(holeRing, x));
  }
  return spans;
}

function polygonSpansAtY(polygon: Polygon, y: number): Span[] {
  if (!polygon.length) return [];
  const [outerRing, ...holeRings] = polygon;
  let spans = ringSpansAtY(outerRing, y);
  for (const holeRing of holeRings) {
    spans = subtractSpans(spans, ringSpansAtY(holeRing, y));
  }
  return spans;
}

function ringSpansAtX(ring: Ring, x: number): VerticalSpan[] {
  const intersections: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) {
      intersections.push(a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0]));
    }
  }
  intersections.sort((a, b) => a - b);

  const spans: VerticalSpan[] = [];
  for (let i = 0; i + 1 < intersections.length; i += 2) {
    const minY = intersections[i];
    const maxY = intersections[i + 1];
    if (maxY - minY > EPSILON) spans.push({minY, maxY});
  }
  return spans;
}

function ringSpansAtY(ring: Ring, y: number): Span[] {
  const intersections: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
      intersections.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
  }
  intersections.sort((a, b) => a - b);

  const spans: Span[] = [];
  for (let i = 0; i + 1 < intersections.length; i += 2) {
    const minX = intersections[i];
    const maxX = intersections[i + 1];
    if (maxX - minX > EPSILON) spans.push({minX, maxX});
  }
  return spans;
}

function subtractVerticalSpans(subject: VerticalSpan[], clips: VerticalSpan[]): VerticalSpan[] {
  let result = subject;
  for (const clip of clips) {
    result = result.flatMap(span => subtractVerticalSpan(span, clip));
  }
  return result;
}

function subtractSpans(subject: Span[], clips: Span[]): Span[] {
  let result = subject;
  for (const clip of clips) {
    result = result.flatMap(span => subtractSpan(span, clip));
  }
  return result;
}

function subtractVerticalSpan(subject: VerticalSpan, clip: VerticalSpan): VerticalSpan[] {
  if (clip.maxY <= subject.minY + EPSILON || clip.minY >= subject.maxY - EPSILON) return [subject];
  const result: VerticalSpan[] = [];
  if (clip.minY > subject.minY + EPSILON) result.push({minY: subject.minY, maxY: Math.min(clip.minY, subject.maxY)});
  if (clip.maxY < subject.maxY - EPSILON) result.push({minY: Math.max(clip.maxY, subject.minY), maxY: subject.maxY});
  return result;
}

function subtractSpan(subject: Span, clip: Span): Span[] {
  if (clip.maxX <= subject.minX + EPSILON || clip.minX >= subject.maxX - EPSILON) return [subject];
  const result: Span[] = [];
  if (clip.minX > subject.minX + EPSILON) result.push({minX: subject.minX, maxX: Math.min(clip.minX, subject.maxX)});
  if (clip.maxX < subject.maxX - EPSILON) result.push({minX: Math.max(clip.maxX, subject.minX), maxX: subject.maxX});
  return result;
}

function mergeVerticalSpans(spans: VerticalSpan[]): VerticalSpan[] {
  const sorted = spans
    .filter(span => span.maxY - span.minY > EPSILON)
    .sort((a, b) => a.minY - b.minY || a.maxY - b.maxY);
  const result: VerticalSpan[] = [];
  for (const span of sorted) {
    const previous = result.at(-1);
    if (!previous || span.minY > previous.maxY + EPSILON) {
      result.push({...span});
    } else {
      previous.maxY = Math.max(previous.maxY, span.maxY);
    }
  }
  return result;
}

function mergeSpans(spans: Span[]): Span[] {
  const sorted = spans
    .filter(span => span.maxX - span.minX > EPSILON)
    .sort((a, b) => a.minX - b.minX || a.maxX - b.maxX);
  const result: Span[] = [];
  for (const span of sorted) {
    const previous = result.at(-1);
    if (!previous || span.minX > previous.maxX + EPSILON) {
      result.push({...span});
    } else {
      previous.maxX = Math.max(previous.maxX, span.maxX);
    }
  }
  return result;
}

function removeConsecutiveDuplicatePoints(points: VectorPoint[]): VectorPoint[] {
  const result: VectorPoint[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (!previous || Math.abs(previous.x - point.x) > EPSILON || Math.abs(previous.y - point.y) > EPSILON) {
      result.push(point);
    }
  }
  const first = result[0];
  const last = result.at(-1);
  if (first && last && result.length > 1 && Math.abs(first.x - last.x) <= EPSILON && Math.abs(first.y - last.y) <= EPSILON) {
    result.pop();
  }
  return result;
}

function extendBounds(bounds: Bounds | null, x: number, y: number): Bounds {
  if (!bounds) return {minX: x, minY: y, maxX: x, maxY: y};
  return {
    minX: Math.min(bounds.minX, x),
    minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, x),
    maxY: Math.max(bounds.maxY, y),
  };
}
