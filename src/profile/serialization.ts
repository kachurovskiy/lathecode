import { LatheCode } from '../common/lathecode.ts';
import { formatNumber } from './dom.ts';
import { hasSegmentLength, normalizeSegmentLength } from './geometry.ts';
import { createEmptySegmentFeatures, hasDrawableProfile } from './state.ts';
import { GEOMETRY_EPSILON, PROFILE_SIDES, type BuildLatheCodeOptions, type DrawingState, type ProfileDraft, type ProfilePoint, type ProfileSide, type SegmentEdgeFeature, type SegmentEdgeFeatures, type SegmentFeatureEndpoint, type SegmentTool, } from './types.ts';
export function buildLatheCodeFromDrawing(state: DrawingState, options: BuildLatheCodeOptions = {}): string {
  const outsideLines = profileLinesFromDraft(state.profiles.outside, state, 'outside', options);
  const insideLines = hasDrawableProfile(state.profiles.inside) ? profileLinesFromDraft(state.profiles.inside, state, 'inside', options) : [];
  const lines = ['; Drawn Profile', 'UNITS MM', `STOCK D${formatNumber(state.diameterMm)}`, hasCurvedSegment(state) ? 'TOOL ROUND R1.5' : 'TOOL ANG R0.2 L7.8 A32.5 NA55', 'DEPTH CUT0.5 FINISH0.1', 'FEED MOVE200 PASS45 PART10', 'MODE TURN', '', ...outsideLines,];
  if (insideLines.length) {
    lines.push('', 'INSIDE', ...insideLines);
  }
  return lines.join('\n');
}
export function buildOutgoingLatheCodeFromDrawing(state: DrawingState): string {
  try {
    return new LatheCode(buildLatheCodeFromDrawing(state)).reverse();
  }
  catch (caught) {
    if (!isEdgeFeatureValidationError(caught))
      throw caught;
    return new LatheCode(buildLatheCodeFromDrawing(state, { stripEdgeFeatures: true })).reverse();
  }
}
export function hasCurvedSegment(state: DrawingState): boolean {
  return PROFILE_SIDES.some(side => {
    const profile = state.profiles[side];
    if (side === 'inside' && !hasDrawableProfile(profile))
      return false;
    return profile.segmentTools.some(tool => tool !== 'line') || profile.segmentFeatures.some(features => features.start?.kind === 'fillet' || features.end?.kind === 'fillet');
  });
}
export function profileLinesFromDraft(profile: ProfileDraft, state: DrawingState, side: ProfileSide, options: BuildLatheCodeOptions = {}): string[] {
  const lines: string[] = [];
  const fittedFeatures = fitProfileSegmentFeaturesForOutput(profile, state, side, options);
  for (let index = 0;
    index < profile.segmentTools.length;
  ) {
    if (profile.segmentTools[index] === 'spline') {
      let endIndex = index + 1;
      while (endIndex < profile.segmentTools.length && profile.segmentTools[endIndex] === 'spline')
        endIndex++;
      const splinePoints = profile.points.slice(index, endIndex + 1);
      if (hasSegmentLength(splinePoints[0], splinePoints.at(-1)!)) {
        lines.push(splineLineToLatheCode(splinePoints));
      }
      index = endIndex;
      continue;
    }
    const start = profile.points[index];
    const end = profile.points[index + 1];
    const length = end.z - start.z;
    if (hasSegmentLength(start, end)) {
      lines.push(segmentLineToLatheCode(normalizeSegmentLength(length), start.radius, end.radius, profile.segmentTools[index], fittedFeatures[index] ?? createEmptySegmentFeatures()));
    }
    index++;
  }
  const fallbackDiameterMm = side === 'outside' ? state.diameterMm : 0;
  return lines.length ? lines : [`L${formatNumber(state.lengthMm)} D${formatNumber(fallbackDiameterMm)}`];
}
export function fitProfileSegmentFeaturesForOutput(profile: ProfileDraft, state: DrawingState, side: ProfileSide, options: BuildLatheCodeOptions): SegmentEdgeFeatures[] {
  const segmentCount = Math.max(0, profile.points.length - 1);
  if (options.stripEdgeFeatures) {
    return Array.from({ length: segmentCount }, createEmptySegmentFeatures);
  }
  const closureRadius = side === 'inside' ? state.diameterMm / 2 : 0;
  const fitted = Array.from({ length: segmentCount }, (_, index) => fitSegmentFeaturesForOutput(profile, index, profile.segmentFeatures[index] ?? createEmptySegmentFeatures(), closureRadius));
  fitAdjacentRadialEdgeFeatures(profile, fitted);
  fitContinuousCornerFeatureOwnership(profile, fitted);
  fitLineSegmentFeatureTrimBudgets(profile, fitted);
  return fitted;
}
export function fitSegmentFeaturesForOutput(profile: ProfileDraft, index: number, features: SegmentEdgeFeatures, closureRadius: number): SegmentEdgeFeatures {
  const start = profile.points[index];
  const end = profile.points[index + 1];
  if (profile.segmentTools[index] !== 'line' || !start || !end || !hasSegmentLength(start, end)) {
    return createEmptySegmentFeatures();
  }
  const segmentLength = Math.abs(end.z - start.z);
  const fitted: SegmentEdgeFeatures = { start: fitSegmentFeatureForOutput(profile, index, 'start', features.start, closureRadius), end: fitSegmentFeatureForOutput(profile, index, 'end', features.end, closureRadius), };
  fitFeaturePairToLimit(fitted, segmentLength, feature => feature.size);
  return fitted;
}
export function fitSegmentFeatureForOutput(profile: ProfileDraft, index: number, endpoint: SegmentFeatureEndpoint, feature: SegmentEdgeFeature | null, closureRadius: number): SegmentEdgeFeature | null {
  if (!feature || feature.size <= GEOMETRY_EPSILON || !Number.isFinite(feature.size))
    return null;
  const segmentLength = Math.abs(profile.points[index + 1].z - profile.points[index].z);
  const endpointLimit = getSegmentEndpointFeatureSizeLimitForOutput(profile, index, endpoint, feature, closureRadius);
  if (segmentLength <= GEOMETRY_EPSILON || endpointLimit <= GEOMETRY_EPSILON) {
    return null;
  }
  const size = Math.min(feature.size, segmentLength, endpointLimit);
  return size > GEOMETRY_EPSILON ? { ...feature, size } : null;
}
export function fitAdjacentRadialEdgeFeatures(profile: ProfileDraft, fittedFeatures: SegmentEdgeFeatures[]): void {
  let previousIndex: number | null = null;
  for (let index = 0;
    index < profile.segmentTools.length;
    index++) {
    const start = profile.points[index];
    const end = profile.points[index + 1];
    if (!start || !end || !hasSegmentLength(start, end))
      continue;
    if (previousIndex !== null) {
      fitRadialEdgeFeaturePair(profile, fittedFeatures, previousIndex, index);
    }
    previousIndex = index;
  }
}
export function fitRadialEdgeFeaturePair(profile: ProfileDraft, fittedFeatures: SegmentEdgeFeatures[], previousIndex: number, currentIndex: number): void {
  const previousEnd = profile.points[previousIndex + 1];
  const currentStart = profile.points[currentIndex];
  if (!previousEnd || !currentStart || Math.abs(previousEnd.z - currentStart.z) > GEOMETRY_EPSILON) {
    return;
  }
  const radialGap = Math.abs(currentStart.radius - previousEnd.radius);
  if (radialGap <= GEOMETRY_EPSILON)
    return;
  const features: SegmentEdgeFeatures = { start: fittedFeatures[previousIndex]?.end ?? null, end: fittedFeatures[currentIndex]?.start ?? null, };
  const changed = fitFeaturePairToLimit(features, radialGap, (feature, endpoint) => {
    const segmentIndex = endpoint === 'start' ? previousIndex : currentIndex;
    return feature.size * getFeatureRadialTrimPerSize(profile, segmentIndex, feature);
  });
  if (!changed)
    return;
  fittedFeatures[previousIndex].end = features.start;
  fittedFeatures[currentIndex].start = features.end;
}
export function fitContinuousCornerFeatureOwnership(profile: ProfileDraft, fittedFeatures: SegmentEdgeFeatures[]): void {
  for (let index = 0; index < profile.segmentTools.length - 1; index++) {
    if (!isContinuousLineCorner(profile, index, 'end')) continue;
    if (fittedFeatures[index]?.end && fittedFeatures[index + 1]?.start) {
      fittedFeatures[index + 1].start = null;
    }
  }
}
export function fitLineSegmentFeatureTrimBudgets(profile: ProfileDraft, fittedFeatures: SegmentEdgeFeatures[]): void {
  for (let index = 0; index < profile.segmentTools.length; index++) {
    const start = profile.points[index];
    const end = profile.points[index + 1];
    if (profile.segmentTools[index] !== 'line' || !start || !end || !hasSegmentLength(start, end))
      continue;
    const trims: {index: number, endpoint: SegmentFeatureEndpoint, amount: number}[] = [];
    const ownFeatures = fittedFeatures[index] ?? createEmptySegmentFeatures();
    if (ownFeatures.start) trims.push({index, endpoint: 'start', amount: ownFeatures.start.size});
    if (ownFeatures.end) trims.push({index, endpoint: 'end', amount: ownFeatures.end.size});
    const previousFeature = fittedFeatures[index - 1]?.end ?? null;
    if (previousFeature && getContinuousLineNeighborIndex(profile, index - 1, 'end') === index) {
      trims.push({index: index - 1, endpoint: 'end', amount: getFeatureNeighborTrimDistanceForOutput(profile, index - 1, 'end', previousFeature)});
    }
    const nextFeature = fittedFeatures[index + 1]?.start ?? null;
    if (nextFeature && getContinuousLineNeighborIndex(profile, index + 1, 'start') === index) {
      trims.push({index: index + 1, endpoint: 'start', amount: getFeatureNeighborTrimDistanceForOutput(profile, index + 1, 'start', nextFeature)});
    }
    const total = trims.reduce((sum, trim) => sum + trim.amount, 0);
    const segmentLength = Math.abs(end.z - start.z);
    if (total <= segmentLength + GEOMETRY_EPSILON || total <= GEOMETRY_EPSILON)
      continue;
    const scale = segmentLength / total;
    for (const trim of trims) {
      fittedFeatures[trim.index][trim.endpoint] = scaleFeatureForOutput(fittedFeatures[trim.index][trim.endpoint], scale);
    }
  }
}
export function fitFeaturePairToLimit(features: SegmentEdgeFeatures, limit: number, measure: (feature: SegmentEdgeFeature, endpoint: SegmentFeatureEndpoint) => number): boolean {
  const startAmount = features.start ? measure(features.start, 'start') : 0;
  const endAmount = features.end ? measure(features.end, 'end') : 0;
  const total = startAmount + endAmount;
  if (total <= limit + GEOMETRY_EPSILON)
    return false;
  const scale = limit > GEOMETRY_EPSILON && total > GEOMETRY_EPSILON ? limit / total : 0;
  features.start = scaleFeatureForOutput(features.start, scale);
  features.end = scaleFeatureForOutput(features.end, scale);
  return true;
}
export function scaleFeatureForOutput(feature: SegmentEdgeFeature | null, scale: number): SegmentEdgeFeature | null {
  if (!feature)
    return null;
  const size = feature.size * scale;
  return size > GEOMETRY_EPSILON ? { ...feature, size } : null;
}
export function getSegmentEndpointRadialGapForOutput(profile: ProfileDraft, index: number, endpoint: SegmentFeatureEndpoint, closureRadius: number): number {
  const pointIndex = endpoint === 'start' ? index : index + 1;
  const point = profile.points[pointIndex];
  if (!point)
    return 0;
  const neighbor = endpoint === 'start' ? profile.points[pointIndex - 1] : profile.points[pointIndex + 1];
  if (neighbor && Math.abs(neighbor.z - point.z) > GEOMETRY_EPSILON)
    return 0;
  return Math.abs((neighbor?.radius ?? closureRadius) - point.radius);
}
export function getSegmentEndpointFeatureSizeLimitForOutput(profile: ProfileDraft, index: number, endpoint: SegmentFeatureEndpoint, feature: SegmentEdgeFeature, closureRadius: number): number {
  const radialTrimPerSize = getFeatureRadialTrimPerSize(profile, index, feature);
  const radialGap = getSegmentEndpointRadialGapForOutput(profile, index, endpoint, closureRadius);
  if (radialTrimPerSize > GEOMETRY_EPSILON && radialGap > GEOMETRY_EPSILON)
    return radialGap / radialTrimPerSize;
  const neighborIndex = getContinuousLineNeighborIndex(profile, index, endpoint);
  if (neighborIndex === null)
    return 0;
  const neighborLength = Math.abs(profile.points[neighborIndex + 1].z - profile.points[neighborIndex].z);
  if (feature.kind === 'chamfer')
    return neighborLength;
  const ownHorizontalComponent = getSegmentHorizontalComponent(profile, index);
  const neighborHorizontalComponent = getSegmentHorizontalComponent(profile, neighborIndex);
  if (ownHorizontalComponent <= GEOMETRY_EPSILON || neighborHorizontalComponent <= GEOMETRY_EPSILON)
    return 0;
  return neighborLength * ownHorizontalComponent / neighborHorizontalComponent;
}
export function getFeatureRadialTrimPerSize(profile: ProfileDraft, index: number, feature: SegmentEdgeFeature): number {
  if (feature.kind === 'chamfer')
    return 1;
  const start = profile.points[index];
  const end = profile.points[index + 1];
  const segmentLength = Math.abs(end.z - start.z);
  const vectorLength = Math.hypot(end.radius - start.radius, end.z - start.z);
  return vectorLength > GEOMETRY_EPSILON ? vectorLength / segmentLength : Number.POSITIVE_INFINITY;
}
export function getFeatureNeighborTrimDistanceForOutput(profile: ProfileDraft, index: number, endpoint: SegmentFeatureEndpoint, feature: SegmentEdgeFeature): number {
  const neighborIndex = getContinuousLineNeighborIndex(profile, index, endpoint);
  if (neighborIndex === null)
    return 0;
  if (feature.kind === 'chamfer')
    return feature.size;
  const ownHorizontalComponent = getSegmentHorizontalComponent(profile, index);
  const neighborHorizontalComponent = getSegmentHorizontalComponent(profile, neighborIndex);
  if (ownHorizontalComponent <= GEOMETRY_EPSILON)
    return 0;
  return feature.size / ownHorizontalComponent * neighborHorizontalComponent;
}
export function getContinuousLineNeighborIndex(profile: ProfileDraft, index: number, endpoint: SegmentFeatureEndpoint): number | null {
  const neighborIndex = endpoint === 'start' ? index - 1 : index + 1;
  if (profile.segmentTools[index] !== 'line' || profile.segmentTools[neighborIndex] !== 'line')
    return null;
  if (!isContinuousLineCorner(profile, index, endpoint))
    return null;
  return neighborIndex;
}
export function isContinuousLineCorner(profile: ProfileDraft, index: number, endpoint: SegmentFeatureEndpoint): boolean {
  const start = profile.points[index];
  const end = profile.points[index + 1];
  const neighborIndex = endpoint === 'start' ? index - 1 : index + 1;
  const neighborStart = profile.points[neighborIndex];
  const neighborEnd = profile.points[neighborIndex + 1];
  if (!start || !end || !neighborStart || !neighborEnd)
    return false;
  if (!hasSegmentLength(start, end) || !hasSegmentLength(neighborStart, neighborEnd))
    return false;
  const corner = endpoint === 'start' ? start : end;
  const neighborCorner = endpoint === 'start' ? neighborEnd : neighborStart;
  if (Math.abs(corner.z - neighborCorner.z) > GEOMETRY_EPSILON || Math.abs(corner.radius - neighborCorner.radius) > GEOMETRY_EPSILON)
    return false;
  const own = endpoint === 'start'
    ? {z: end.z - start.z, radius: end.radius - start.radius}
    : {z: start.z - end.z, radius: start.radius - end.radius};
  const neighbor = endpoint === 'start'
    ? {z: neighborStart.z - start.z, radius: neighborStart.radius - start.radius}
    : {z: neighborEnd.z - end.z, radius: neighborEnd.radius - end.radius};
  const ownLength = Math.hypot(own.z, own.radius);
  const neighborLength = Math.hypot(neighbor.z, neighbor.radius);
  if (ownLength <= GEOMETRY_EPSILON || neighborLength <= GEOMETRY_EPSILON)
    return false;
  const dot = (own.z * neighbor.z + own.radius * neighbor.radius) / (ownLength * neighborLength);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  return angle > GEOMETRY_EPSILON && Math.PI - angle > GEOMETRY_EPSILON;
}
export function getSegmentHorizontalComponent(profile: ProfileDraft, index: number): number {
  const start = profile.points[index];
  const end = profile.points[index + 1];
  if (!start || !end)
    return 0;
  const segmentLength = Math.hypot(end.radius - start.radius, end.z - start.z);
  return segmentLength > GEOMETRY_EPSILON ? Math.abs(end.z - start.z) / segmentLength : 0;
}
export function isEdgeFeatureValidationError(caught: unknown): boolean {
  return caught instanceof Error && /\bchamfer|fillet\b/i.test(caught.message);
}
export function segmentLineToLatheCode(length: number, startRadius: number, endRadius: number, tool: SegmentTool, features: SegmentEdgeFeatures = createEmptySegmentFeatures()): string {
  const startDiameter = startRadius * 2;
  const endDiameter = endRadius * 2;
  const effectiveTool = Math.abs(length) <= GEOMETRY_EPSILON ? 'line' : tool;
  const effectiveFeatures = effectiveTool === 'line' ? features : createEmptySegmentFeatures();
  if (effectiveTool === 'line' && Math.abs(startDiameter - endDiameter) <= GEOMETRY_EPSILON && edgeFeaturesEqual(effectiveFeatures.start, effectiveFeatures.end)) {
    return `L${formatNumber(length)} D${formatNumber(startDiameter)}${edgeFeatureToLatheCode(effectiveFeatures.start)}`;
  }
  const curveType = effectiveTool === 'convex' ? ' CONV' : effectiveTool === 'concave' ? ' CONC' : '';
  return [`L${formatNumber(length)}`, `DS${formatNumber(startDiameter)}${edgeFeatureToLatheCode(effectiveFeatures.start)}`, `DE${formatNumber(endDiameter)}${edgeFeatureToLatheCode(effectiveFeatures.end)}${curveType}`,].join(' ');
}
export function edgeFeatureToLatheCode(feature: SegmentEdgeFeature | null): string {
  if (!feature || feature.size <= GEOMETRY_EPSILON)
    return '';
  return `${feature.kind === 'chamfer' ? ' CH' : ' FI'}${formatNumber(feature.size)}`;
}
export function edgeFeaturesEqual(a: SegmentEdgeFeature | null, b: SegmentEdgeFeature | null): boolean {
  if (!a || a.size <= GEOMETRY_EPSILON)
    return !b || b.size <= GEOMETRY_EPSILON;
  if (!b || b.size <= GEOMETRY_EPSILON)
    return false;
  return a.kind === b.kind && Math.abs(a.size - b.size) <= GEOMETRY_EPSILON;
}
export function splineLineToLatheCode(points: ProfilePoint[]): string {
  const start = points[0];
  const end = points.at(-1)!;
  if (Math.abs(end.z - start.z) <= GEOMETRY_EPSILON) {
    return segmentLineToLatheCode(0, start.radius, end.radius, 'line');
  }
  const controls = points.slice(1, -1).map(point => point.radius * 2);
  if (!controls.length)
    controls.push((start.radius + end.radius));
  return [`L${formatNumber(end.z - start.z)}`, `DS${formatNumber(start.radius * 2)}`, `DE${formatNumber(end.radius * 2)}`, 'BSPLINE', ...controls.map(diameter => `D${formatNumber(diameter)}`),
  ].join(' ');
}
