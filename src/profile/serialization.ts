import { LatheCode } from '../common/lathecode.ts';
import { fitProfileEdgeFeatures } from './edgefeatures.ts';
import { hasSegmentLength, normalizeSegmentLength, sameSplineSpan } from './geometry.ts';
import { createEmptySegmentFeatures, hasDrawableProfile } from './state.ts';
import { buildSourceLatheCode } from './source.ts';
import { assertFeaturesSupported, edgeFeaturesEqual, formatProgramNumber as formatNumber, segmentLineToLatheCode, splineLineToLatheCode } from './programlines.ts';
import { PROFILE_SIDES, type DrawingState, type ProfileDraft, type ProfileSide, type SegmentEdgeFeature, type SegmentFeatureEndpoint, } from './types.ts';
export function buildLatheCodeFromDrawing(state: DrawingState): string {
  if (state.source) return buildSourceLatheCode(state);
  const outsideLines = profileLinesFromDraft(state.profiles.outside, state, 'outside');
  const insideLines = hasDrawableProfile(state.profiles.inside) ? profileLinesFromDraft(state.profiles.inside, state, 'inside') : [];
  const lines = ['; Drawn Profile', 'UNITS MM', `STOCK D${formatNumber(state.diameterMm)}`, hasCurvedSegment(state) ? 'TOOL ROUND R1.5' : 'TOOL ANG R0.2 L7.8 A32.5 NA55', 'DEPTH CUT0.5 FINISH0.1', 'FEED MOVE200 PASS45 PART10', 'MODE TURN', '', ...outsideLines,];
  if (insideLines.length) {
    lines.push('', 'INSIDE', ...insideLines);
  }
  return lines.join('\n');
}
export function buildOutgoingLatheCodeFromDrawing(state: DrawingState): string {
  try {
    const text = buildLatheCodeFromDrawing(state);
    const latheCode = new LatheCode(text);
    const outgoing = state.source ? text : latheCode.reverse();
    new LatheCode(outgoing);
    return outgoing;
  }
  catch (caught) {
    if (!isEdgeFeatureValidationError(caught))
      throw caught;
    const corrections = getDrawingFeatureCorrections(state);
    const details = corrections.map(formatFeatureCorrection).join('\n');
    throw new Error(`${caught instanceof Error ? caught.message : caught}\n${details}\nReduce the affected feature sizes or explicitly remove them. No features were changed.`);
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
export function profileLinesFromDraft(profile: ProfileDraft, state: DrawingState, side: ProfileSide): string[] {
  const lines: string[] = [];
  const features = profile.segmentFeatures;
  for (let index = 0;
    index < profile.segmentTools.length;
  ) {
    if (profile.segmentTools[index] === 'spline') {
      let endIndex = index + 1;
      while (sameSplineSpan(profile, index, endIndex))
        endIndex++;
      for (let i = index; i < endIndex; i++) assertFeaturesSupported('spline', features[i]);
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
      lines.push(segmentLineToLatheCode(normalizeSegmentLength(length), start.radius, end.radius, profile.segmentTools[index], features[index] ?? createEmptySegmentFeatures()));
    } else if (features[index]?.start || features[index]?.end) {
      throw new Error(`Chamfer or fillet on segment ${index + 1} cannot fit a zero-length span. Remove it explicitly or increase the segment length.`);
    }
    index++;
  }
  const fallbackDiameterMm = side === 'outside' ? state.diameterMm : 0;
  return lines.length ? lines : [`L${formatNumber(state.lengthMm)} D${formatNumber(fallbackDiameterMm)}`];
}
export type DrawingFeatureCorrection = {
  side: ProfileSide;
  index: number;
  endpoint: SegmentFeatureEndpoint;
  before: SegmentEdgeFeature;
  after: SegmentEdgeFeature | null;
};
export function getDrawingFeatureCorrections(state: DrawingState): DrawingFeatureCorrection[] {
  const corrections: DrawingFeatureCorrection[] = [];
  for (const side of PROFILE_SIDES) {
    const profile = state.profiles[side];
    const closure = side === 'inside' ? state.diameterMm / 2 : (state.source?.stockInnerDiameterMm ?? 0) / 2;
    const fitted = fitProfileEdgeFeatures(profile, closure);
    profile.segmentFeatures.forEach((features, index) => {
      for (const endpoint of ['start', 'end'] as const) {
        const before = features[endpoint];
        const after = fitted[index]?.[endpoint] ?? null;
        if (before && !edgeFeaturesEqual(before, after)) corrections.push({side, index, endpoint, before, after});
      }
    });
  }
  return corrections;
}
export function formatFeatureCorrection(correction: DrawingFeatureCorrection): string {
  const {side, index, endpoint, before, after} = correction;
  return `${side === 'outside' ? 'Outside' : 'Inside'} segment ${index + 1}, ${endpoint} ${before.kind}: ${formatNumber(before.size)} mm → ${after ? `${formatNumber(after.size)} mm` : 'remove'}`;
}
export function applyDrawingFeatureCorrections(state: DrawingState, corrections: readonly DrawingFeatureCorrection[]): void {
  for (const correction of corrections) {
    state.profiles[correction.side].segmentFeatures[correction.index][correction.endpoint] = correction.after ? {...correction.after} : null;
  }
}
export function isEdgeFeatureValidationError(caught: unknown): boolean {
  return caught instanceof Error && /\bchamfer|fillet\b/i.test(caught.message);
}
