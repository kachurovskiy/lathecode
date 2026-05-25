import {
  fitEdgeFeaturesForSegments,
  getEndpointFeatureContext,
  getEndpointFeatureSizeLimit,
  type EdgeFeatureKind,
  type EdgeFeaturePair,
  type EdgeFeatureSegment,
  type EndpointFeatureContext,
  type SegmentFeatureEndpoint,
} from '../common/edgefeatures.ts';
import type {ProfileDraft, SegmentEdgeFeatures, SegmentTool} from './types.ts';

export function profileEdgeFeatureSegments(profile: ProfileDraft): EdgeFeatureSegment[] {
  const segmentCount = Math.max(0, profile.points.length - 1);
  return Array.from({length: segmentCount}, (_, index) => ({
    type: segmentToolToEdgeFeatureType(profile.segmentTools[index]),
    start: {
      radius: profile.points[index].radius,
      z: profile.points[index].z,
    },
    end: {
      radius: profile.points[index + 1].radius,
      z: profile.points[index + 1].z,
    },
  }));
}

export function fitProfileEdgeFeatures(profile: ProfileDraft, closureRadius: number): SegmentEdgeFeatures[] {
  return fitEdgeFeaturesForSegments(
    profileEdgeFeatureSegments(profile),
    profile.segmentFeatures as readonly EdgeFeaturePair[],
    closureRadius,
  ).map(pair => ({
    start: pair.start,
    end: pair.end,
  }));
}

export function getProfileEndpointFeatureContext(
  profile: ProfileDraft,
  index: number,
  endpoint: SegmentFeatureEndpoint,
  closureRadius: number,
): EndpointFeatureContext {
  return getEndpointFeatureContext(profileEdgeFeatureSegments(profile), index, endpoint, closureRadius);
}

export function getProfileEndpointFeatureSizeLimit(
  profile: ProfileDraft,
  index: number,
  endpoint: SegmentFeatureEndpoint,
  featureKind: EdgeFeatureKind,
  closureRadius: number,
): number {
  const segments = profileEdgeFeatureSegments(profile);
  const segment = segments[index];
  if (!segment) return 0;
  return getEndpointFeatureSizeLimit(
    segment,
    getEndpointFeatureContext(segments, index, endpoint, closureRadius),
    featureKind,
  );
}

function segmentToolToEdgeFeatureType(tool: SegmentTool | undefined): EdgeFeatureSegment['type'] {
  if (tool === 'line') return 'line';
  if (tool === 'spline') return 'spline';
  return 'curve';
}
