import { LatheCode } from '../common/lathecode.ts';
import { formatNumber } from './dom.ts';
import { fitProfileEdgeFeatures } from './edgefeatures.ts';
import { hasSegmentLength, normalizeSegmentLength } from './geometry.ts';
import { createEmptySegmentFeatures, hasDrawableProfile } from './state.ts';
import { GEOMETRY_EPSILON, PROFILE_SIDES, type BuildLatheCodeOptions, type DrawingState, type ProfileDraft, type ProfilePoint, type ProfileSide, type SegmentEdgeFeature, type SegmentEdgeFeatures, type SegmentTool, } from './types.ts';
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
  return fitProfileEdgeFeatures(profile, closureRadius);
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
