import { describe, expect, it } from 'vitest';
import { LatheCode } from '../common/lathecode';
import { buildLatheCodeFromDrawing } from './serialization';
import { canSelectedSegmentEndpointHaveFeature, getDefaultSegmentFeatureSize } from './state';
import type { DrawingState, ProfileDraft, SegmentEdgeFeatures } from './types';

describe('profile serialization', () => {
  it('keeps chamfers on continuous cone corners', () => {
    const state = drawingState({
      points: [
        {z: 0, radius: 2},
        {z: 2, radius: 3},
        {z: 4, radius: 2},
      ],
      segmentFeatures: [
        {start: null, end: {kind: 'chamfer', size: 0.5}},
        emptyFeatures(),
      ],
    });

    const text = buildLatheCodeFromDrawing(state);

    expect(text).toContain('L2 DS4 DE6 CH0.5');
    expect(new LatheCode(text).getOutsideProfileSegments().length).toBeGreaterThan(2);
  });

  it('allows endpoint features on cone-to-cylinder corners', () => {
    const state = drawingState({
      points: [
        {z: 0, radius: 2},
        {z: 2, radius: 3},
        {z: 4, radius: 3},
      ],
      segmentFeatures: [
        {start: null, end: {kind: 'fillet', size: 0.5}},
        emptyFeatures(),
      ],
    });
    state.segmentSelection = {side: 'outside', index: 0};

    expect(canSelectedSegmentEndpointHaveFeature(state, 'end')).toBe(true);
    expect(getDefaultSegmentFeatureSize(state, 'end')).toBeGreaterThan(0);
    expect(buildLatheCodeFromDrawing(state)).toContain('L2 DS4 DE6 FI0.5');
  });
});

function drawingState(outside: Partial<ProfileDraft>): DrawingState {
  const outsideProfile: ProfileDraft = {
    enabled: true,
    points: outside.points ?? [
      {z: 0, radius: 2},
      {z: 4, radius: 2},
    ],
    segmentTools: outside.segmentTools ?? Array.from({length: Math.max(0, (outside.points?.length ?? 2) - 1)}, () => 'line'),
    segmentFeatures: outside.segmentFeatures ?? Array.from({length: Math.max(0, (outside.points?.length ?? 2) - 1)}, emptyFeatures),
  };
  return {
    diameterMm: 10,
    lengthMm: 4,
    snapMm: 1,
    gridMm: 1,
    profiles: {
      outside: outsideProfile,
      inside: {
        enabled: false,
        points: [
          {z: 0, radius: 0},
          {z: 4, radius: 0},
        ],
        segmentTools: ['line'],
        segmentFeatures: [emptyFeatures()],
      },
    },
    activeSide: 'outside',
    activeTool: 'select',
    selection: null,
    segmentSelection: null,
  };
}

function emptyFeatures(): SegmentEdgeFeatures {
  return {start: null, end: null};
}
