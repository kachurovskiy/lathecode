import {describe, expect, it} from 'vitest';
import {
  fitEdgeFeaturesForSegments,
  getEndpointFeatureContext,
  getEndpointFeatureSizeLimit,
  type EdgeFeatureSegment,
} from './edgefeatures.ts';

describe('edge feature geometry', () => {
  it('detects angled continuous cone corners', () => {
    const segments = lineSegments([
      [2, 0, 3, 2],
      [3, 2, 2, 4],
    ]);

    const context = getEndpointFeatureContext(segments, 0, 'end', 0);

    expect(context.kind).toBe('continuous');
    if (context.kind !== 'continuous') return;
    expect(context.neighborIndex).toBe(1);
    expect(getEndpointFeatureSizeLimit(segments[0], context, 'chamfer')).toBeCloseTo(2);
    expect(getEndpointFeatureSizeLimit(segments[0], context, 'fillet')).toBeCloseTo(2);
  });

  it('rejects collinear same-radius joins as feature corners', () => {
    const segments = lineSegments([
      [5, 0, 5, 2],
      [5, 2, 5, 4],
    ]);

    const context = getEndpointFeatureContext(segments, 0, 'end', 0);

    expect(context).toMatchObject({kind: 'invalid', reason: 'corner-angle'});
  });

  it('keeps only one feature owner at a continuous corner', () => {
    const segments = lineSegments([
      [2, 0, 3, 2],
      [3, 2, 2, 4],
    ]);

    const fitted = fitEdgeFeaturesForSegments(segments, [
      {start: null, end: {kind: 'chamfer', size: 0.5}},
      {start: {kind: 'fillet', size: 0.5}, end: null},
    ], 0);

    expect(fitted[0].end).toEqual({kind: 'chamfer', size: 0.5});
    expect(fitted[1].start).toBeNull();
  });

  it('scales features that would over-trim a shared conical segment', () => {
    const segments = lineSegments([
      [1, 0, 2, 2],
      [2, 2, 1, 4],
      [1, 4, 2, 6],
    ]);

    const fitted = fitEdgeFeaturesForSegments(segments, [
      {start: null, end: {kind: 'fillet', size: 2}},
      {start: null, end: {kind: 'fillet', size: 2}},
      {start: null, end: null},
    ], 0);

    expect(fitted[0].end?.size).toBeCloseTo(1);
    expect(fitted[1].end?.size).toBeCloseTo(1);
  });

  it('treats zero-horizontal radial neighbors as connector edges', () => {
    const segments = lineSegments([
      [15, 0, 15, 24],
      [15, 24, 9, 24],
      [9, 24, 15, 50],
    ]);

    const context = getEndpointFeatureContext(segments, 2, 'start', 0);
    const fitted = fitEdgeFeaturesForSegments(segments, [
      {start: null, end: {kind: 'chamfer', size: 4}},
      {start: null, end: null},
      {start: {kind: 'chamfer', size: 4}, end: null},
    ], 0);

    expect(context.kind).toBe('connector');
    if (context.kind !== 'connector') return;
    expect(context.trimLimit).toBeCloseTo(6);
    expect(fitted[0].end?.size).toBeCloseTo(3);
    expect(fitted[2].start?.size).toBeCloseTo(3);
  });
});

function lineSegments(entries: readonly [number, number, number, number][]): EdgeFeatureSegment[] {
  return entries.map(([startRadius, startZ, endRadius, endZ]) => ({
    type: 'line',
    start: {radius: startRadius, z: startZ},
    end: {radius: endRadius, z: endZ},
  }));
}
