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
  const radialTrimPerSize = getFeatureRadialTrimPerSize(profile, index, feature);
  const radialGap = getSegmentEndpointRadialGapForOutput(profile, index, endpoint, closureRadius);
  if (segmentLength <= GEOMETRY_EPSILON || radialTrimPerSize <= GEOMETRY_EPSILON || radialGap <= GEOMETRY_EPSILON) {
    return null;
  }
  const radialLimit = radialGap / radialTrimPerSize;
  const size = Math.min(feature.size, segmentLength, radialLimit);
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
  return Math.abs((neighbor?.radius ?? closureRadius) - point.radius);
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
