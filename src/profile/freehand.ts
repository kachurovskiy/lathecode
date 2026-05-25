import { createLatheCodePreview } from '../start/preview.ts';
import { svgElement } from './dom.ts';
import { buildLatheCodeFromDrawing } from './serialization.ts';
import { renderDrawing } from './render.ts';
import { FREEHAND_CANDIDATE_SETTINGS, FREEHAND_PART_PREVIEW_RENDER_SIZE, GEOMETRY_EPSILON, VIEW_HEIGHT, VIEW_WIDTH, type DrawingState, type FreehandCandidate, type FreehandCandidateSetting, type ProfileDraft, type ProfilePoint, type SegmentTool, } from './types.ts';
import { clampProfilePoint, cloneDrawingState, cloneProfileDraft, createEmptySegmentFeatures, normalizeProfileSplineControlZ, removeConsecutiveProfileDuplicates, sameProfilePoint, } from './state.ts';
export function createFreehandProfilePreview(state: DrawingState, candidate: FreehandCandidate): SVGSVGElement {
  const previewState = createFreehandCandidateState(state, candidate);
  const svg = svgElement('svg');
  svg.classList.add('profileDrawingFreehandProfilePreview');
  svg.setAttribute('viewBox', `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  renderDrawing(svg, previewState);
  return svg;
}
export function createFreehandPartPreview(state: DrawingState, candidate: FreehandCandidate): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'profileDrawingFreehandPartPreview';
  wrapper.appendChild(createLatheCodePreview(buildLatheCodeFromDrawing(createFreehandCandidateState(state, candidate)), { width: FREEHAND_PART_PREVIEW_RENDER_SIZE, height: FREEHAND_PART_PREVIEW_RENDER_SIZE, }));
  return wrapper;
}
export function createFreehandCandidateState(state: DrawingState, candidate: FreehandCandidate): DrawingState {
  const candidateState = cloneDrawingState(state);
  candidateState.profiles[state.activeSide] = cloneProfileDraft(candidate.draft);
  candidateState.profiles[state.activeSide].enabled = true;
  candidateState.activeSide = state.activeSide;
  candidateState.activeTool = 'select';
  candidateState.selection = null;
  candidateState.segmentSelection = null;
  return candidateState;
}
export function appendFreehandStrokePoint(state: DrawingState, stroke: ProfilePoint[], point: ProfilePoint): void {
  const last = stroke.at(-1);
  if (last && Math.hypot(point.z - last.z, point.radius - last.radius) < 0.05)
    return;
  stroke.push(clampProfilePoint(state, point));
}
export function createFreehandCandidates(state: DrawingState, stroke: readonly ProfilePoint[]): FreehandCandidate[] {
  if (stroke.length < 2)
    return [];
  const baseSnap = state.snapMm > 0 ? state.snapMm : 1;
  const sourcePoints = normalizeFreehandSourcePoints(state, stroke);
  const candidates: FreehandCandidate[] = [];
  for (const setting of FREEHAND_CANDIDATE_SETTINGS) {
    const toleranceMm = Math.max(setting.minToleranceMm, baseSnap * setting.toleranceScale);
    const proximityMm = Math.max(setting.minToleranceMm, baseSnap * setting.proximityScale);
    const points = profilePointsFromFreehandStroke(state, stroke, toleranceMm, proximityMm);
    if (points.length < 2)
      continue;
    const draft = createFreehandDraft(setting, points, sourcePoints, toleranceMm);
    candidates.push({ id: setting.id, label: setting.label, description: setting.description, toolset: setting.toolset, draft, });
  }
  return candidates;
}
export function normalizeFreehandSourcePoints(state: DrawingState, stroke: readonly ProfilePoint[]): ProfilePoint[] {
  let points = stroke.map(point => clampProfilePoint(state, point));
  if (points.length >= 2 && points[0].z > points.at(-1)!.z)
    points = [...points].reverse();
  return points;
}
export function createFreehandDraft(setting: FreehandCandidateSetting, points: readonly ProfilePoint[], sourcePoints: readonly ProfilePoint[], toleranceMm: number): ProfileDraft {
  const draftPoints = points.map(point => ({ ...point }));
  const draft = { enabled: true, points: draftPoints, segmentTools: createFreehandSegmentTools(setting, draftPoints, sourcePoints, toleranceMm), segmentFeatures: Array.from({ length: Math.max(0, draftPoints.length - 1) }, createEmptySegmentFeatures), };
  normalizeProfileSplineControlZ(draft);
  return draft;
}
export function createFreehandSegmentTools(setting: FreehandCandidateSetting, points: readonly ProfilePoint[], sourcePoints: readonly ProfilePoint[], toleranceMm: number): SegmentTool[] {
  if (points.length < 2)
    return [];
  if (setting.toolset === 'spline') {
    return Array.from({ length: points.length - 1 }, () => 'spline');
  }
  if (setting.toolset === 'lines') {
    return Array.from({ length: points.length - 1 }, () => 'line');
  }
  const curveThresholdMm = Math.max(0.12, toleranceMm * 0.35);
  const tools = Array.from({ length: points.length - 1 }, (_, index) => guessFreehandSegmentTool(points, sourcePoints, index, curveThresholdMm));
  if (!tools.some(tool => tool !== 'line')) {
    forceFreehandCurveTool(points, sourcePoints, tools);
  }
  return tools;
}
export function guessFreehandSegmentTool(points: readonly ProfilePoint[], sourcePoints: readonly ProfilePoint[], index: number, curveThresholdMm: number): SegmentTool {
  const start = points[index];
  const end = points[index + 1];
  if (Math.abs(end.z - start.z) <= GEOMETRY_EPSILON || Math.abs(end.radius - start.radius) <= GEOMETRY_EPSILON) {
    return 'line';
  }
  const deviation = getFreehandSegmentDeviation(sourcePoints, start, end);
  if (deviation.maxAbs <= curveThresholdMm)
    return 'line';
  return deviation.average >= 0 ? 'convex' : 'concave';
}
export function forceFreehandCurveTool(points: readonly ProfilePoint[], sourcePoints: readonly ProfilePoint[], tools: SegmentTool[]): void {
  let bestIndex = -1;
  let bestScore = 0;
  for (let index = 0;
    index < points.length - 1;
    index++) {
    const start = points[index];
    const end = points[index + 1];
    const score = Math.abs(end.z - start.z) * Math.abs(end.radius - start.radius);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  if (bestIndex < 0 || bestScore <= GEOMETRY_EPSILON)
    return;
  const deviation = getFreehandSegmentDeviation(sourcePoints, points[bestIndex], points[bestIndex + 1]);
  if (Math.abs(deviation.average) > GEOMETRY_EPSILON) {
    tools[bestIndex] = deviation.average >= 0 ? 'convex' : 'concave';
    return;
  }
  const previousSlope = bestIndex > 0 ? getProfileSegmentSlope(points[bestIndex - 1], points[bestIndex]) : null;
  const nextSlope = bestIndex < points.length - 2 ? getProfileSegmentSlope(points[bestIndex + 1], points[bestIndex + 2]) : null;
  if (previousSlope !== null && nextSlope !== null && Math.abs(nextSlope - previousSlope) > GEOMETRY_EPSILON) {
    tools[bestIndex] = nextSlope < previousSlope ? 'convex' : 'concave';
    return;
  }
  tools[bestIndex] = points[bestIndex + 1].radius >= points[bestIndex].radius ? 'convex' : 'concave';
}
export function getFreehandSegmentDeviation(sourcePoints: readonly ProfilePoint[], start: ProfilePoint, end: ProfilePoint): {
  average: number;
  maxAbs: number;
} {
  const zDelta = end.z - start.z;
  if (Math.abs(zDelta) <= GEOMETRY_EPSILON)
    return { average: 0, maxAbs: 0 };
  const minZ = Math.min(start.z, end.z) - GEOMETRY_EPSILON;
  const maxZ = Math.max(start.z, end.z) + GEOMETRY_EPSILON;
  let sum = 0;
  let count = 0;
  let maxAbs = 0;
  for (const point of sourcePoints) {
    if (point.z < minZ || point.z > maxZ)
      continue;
    const ratio = (point.z - start.z) / zDelta;
    const expectedRadius = start.radius + (end.radius - start.radius) * ratio;
    const residual = point.radius - expectedRadius;
    sum += residual;
    count++;
    maxAbs = Math.max(maxAbs, Math.abs(residual));
  }
  return { average: count ? sum / count : 0, maxAbs, };
}
export function getProfileSegmentSlope(start: ProfilePoint, end: ProfilePoint): number | null {
  const zDelta = end.z - start.z;
  if (Math.abs(zDelta) <= GEOMETRY_EPSILON)
    return null;
  return (end.radius - start.radius) / zDelta;
}
export function profilePointsFromFreehandStroke(state: DrawingState, stroke: readonly ProfilePoint[], toleranceMm: number, proximityMm: number): ProfilePoint[] {
  let points = stroke.map(point => clampProfilePoint(state, point));
  if (points[0].z > points.at(-1)!.z)
    points = [...points].reverse();
  points = removeNearbyProfilePoints(points, Math.max(0.05, toleranceMm / 4));
  points = enforceMonotoneFreehandZ(points, proximityMm);
  points = anchorFreehandProfileBounds(points, state.lengthMm, proximityMm);
  points = simplifyProfilePolyline(points, toleranceMm);
  points = applyFreehandAxisProximity(points, proximityMm);
  points = enforceMonotoneFreehandZ(points, proximityMm);
  points = anchorFreehandProfileBounds(points, state.lengthMm, proximityMm);
  return removeRedundantProfilePoints(removeConsecutiveProfileDuplicates(points));
}
export function removeNearbyProfilePoints(points: readonly ProfilePoint[], minDistanceMm: number): ProfilePoint[] {
  const result: ProfilePoint[] = [];
  for (const point of points) {
    const last = result.at(-1);
    if (last && Math.hypot(point.z - last.z, point.radius - last.radius) < minDistanceMm)
      continue;
    result.push({ ...point });
  }
  return result;
}
export function enforceMonotoneFreehandZ(points: readonly ProfilePoint[], proximityMm: number): ProfilePoint[] {
  const result: ProfilePoint[] = [];
  for (const point of points) {
    const last = result.at(-1);
    if (!last) {
      result.push({ ...point });
      continue;
    }
    if (point.z < last.z - proximityMm)
      continue;
    result.push({ ...point, z: Math.max(last.z, point.z), });
  }
  return result;
}
export function anchorFreehandProfileBounds(points: readonly ProfilePoint[], lengthMm: number, proximityMm: number): ProfilePoint[] {
  if (!points.length)
    return [];
  const result = points.map(point => ({ ...point }));
  if (result[0].z <= proximityMm) {
    result[0].z = 0;
  }
  else {
    result.unshift({ z: 0, radius: result[0].radius });
  }
  const last = result.at(-1)!;
  if (lengthMm - last.z <= proximityMm) {
    last.z = lengthMm;
  }
  else {
    result.push({ z: lengthMm, radius: last.radius });
  }
  return result;
}
export function simplifyProfilePolyline(points: readonly ProfilePoint[], toleranceMm: number): ProfilePoint[] {
  if (points.length <= 2)
    return points.map(point => ({ ...point }));
  const keep = Array.from({ length: points.length }, () => false);
  keep[0] = true;
  keep[points.length - 1] = true;
  simplifyProfilePolylineRange(points, 0, points.length - 1, toleranceMm, keep);
  return points.filter((_, index) => keep[index]).map(point => ({ ...point }));
}
export function simplifyProfilePolylineRange(points: readonly ProfilePoint[], startIndex: number, endIndex: number, toleranceMm: number, keep: boolean[]): void {
  if (endIndex - startIndex <= 1)
    return;
  let maxDistance = -1;
  let maxIndex = startIndex;
  for (let index = startIndex + 1;
    index < endIndex;
    index++) {
    const distance = distanceToProfileSegment(points[index], points[startIndex], points[endIndex]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }
  if (maxDistance <= toleranceMm)
    return;
  keep[maxIndex] = true;
  simplifyProfilePolylineRange(points, startIndex, maxIndex, toleranceMm, keep);
  simplifyProfilePolylineRange(points, maxIndex, endIndex, toleranceMm, keep);
}
export function distanceToProfileSegment(point: ProfilePoint, start: ProfilePoint, end: ProfilePoint): number {
  const zDelta = end.z - start.z;
  const rDelta = end.radius - start.radius;
  const lengthSquared = zDelta * zDelta + rDelta * rDelta;
  if (lengthSquared <= GEOMETRY_EPSILON)
    return Math.hypot(point.z - start.z, point.radius - start.radius);
  const ratio = Math.max(0, Math.min(1, ((point.z - start.z) * zDelta + (point.radius - start.radius) * rDelta) / lengthSquared));
  return Math.hypot(point.z - (start.z + zDelta * ratio), point.radius - (start.radius + rDelta * ratio));
}
export function applyFreehandAxisProximity(points: readonly ProfilePoint[], proximityMm: number): ProfilePoint[] {
  if (!points.length)
    return [];
  const result = points.map(point => ({ ...point }));
  for (let index = 1;
    index < result.length;
    index++) {
    const previous = result[index - 1];
    const point = result[index];
    if (Math.abs(point.z - previous.z) <= proximityMm)
      point.z = previous.z;
    if (Math.abs(point.radius - previous.radius) <= proximityMm)
      point.radius = previous.radius;
  }
  return removeConsecutiveProfileDuplicates(result);
}
export function removeRedundantProfilePoints(points: readonly ProfilePoint[]): ProfilePoint[] {
  const result: ProfilePoint[] = [];
  for (const point of points) {
    result.push({ ...point });
    while (result.length >= 3 && isRedundantProfilePoint(result[result.length - 3], result[result.length - 2], result[result.length - 1])) {
      result.splice(result.length - 2, 1);
    }
  }
  return result;
}
export function isRedundantProfilePoint(start: ProfilePoint, middle: ProfilePoint, end: ProfilePoint): boolean {
  const zDelta = end.z - start.z;
  const radiusDelta = end.radius - start.radius;
  const middleZDelta = middle.z - start.z;
  const middleRadiusDelta = middle.radius - start.radius;
  const length = Math.hypot(zDelta, radiusDelta);
  if (length <= GEOMETRY_EPSILON)
    return sameProfilePoint(start, middle);
  const distanceFromLine = Math.abs(zDelta * middleRadiusDelta - radiusDelta * middleZDelta) / length;
  if (distanceFromLine > GEOMETRY_EPSILON)
    return false;
  return middle.z >= Math.min(start.z, end.z) - GEOMETRY_EPSILON && middle.z <= Math.max(start.z, end.z) + GEOMETRY_EPSILON && middle.radius >= Math.min(start.radius, end.radius) - GEOMETRY_EPSILON && middle.radius <= Math.max(start.radius, end.radius) + GEOMETRY_EPSILON;
}
