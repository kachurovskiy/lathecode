import { describe, expect, it } from 'vitest';
import { Point, Segment } from './lathecode';
import { approximateSegments, offsetSegmentsRadially } from './lathegeometry';

describe('lathegeometry', () => {
  it('returns no points for an empty segment list', () => {
    expect(approximateSegments([])).toEqual([]);
  });

  it('approximates line segments with their original endpoints', () => {
    const segments = [
      new Segment('LINE', new Point(1, 0), new Point(2, 3)),
      new Segment('LINE', new Point(2, 3), new Point(2, 5)),
    ];

    expect(approximateSegments(segments)).toEqual([
      new Point(1, 0),
      new Point(2, 3),
      new Point(2, 5),
    ]);
  });

  it('removes duplicate closing points after approximation', () => {
    const segments = [
      new Segment('LINE', new Point(1, 0), new Point(2, 0)),
      new Segment('LINE', new Point(2, 0), new Point(2, 1)),
      new Segment('LINE', new Point(2, 1), new Point(1, 0)),
    ];

    expect(approximateSegments(segments)).toEqual([
      new Point(1, 0),
      new Point(2, 0),
      new Point(2, 1),
    ]);
  });

  it('treats same-radius curved segments as straight vertical segments', () => {
    const segments = [
      new Segment('CONV', new Point(2, 0), new Point(2, 3)),
    ];

    expect(approximateSegments(segments)).toEqual([
      new Point(2, 0),
      new Point(2, 3),
    ]);
  });

  it('approximates ascending convex quarter ellipses without missing endpoints', () => {
    const points = approximateSegments([
      new Segment('CONV', new Point(1, 0), new Point(3, 2)),
    ], 0.5);

    expect(points[0]).toEqual(new Point(1, 0));
    expect(points.at(-1)).toEqual(new Point(3, 2));
    expect(points.length).toBeGreaterThan(2);
    expect(points.every(point => point.x >= 1 && point.x <= 3 && point.z >= 0 && point.z <= 2)).toBeTruthy();
    expect(isMonotonic(points.map(point => point.x), 1)).toBeTruthy();
    expect(isMonotonic(points.map(point => point.z), 1)).toBeTruthy();
  });

  it('approximates ascending concave quarter ellipses without missing endpoints', () => {
    const points = approximateSegments([
      new Segment('CONC', new Point(1, 0), new Point(3, 2)),
    ], 0.5);

    expect(points[0]).toEqual(new Point(1, 0));
    expect(points.at(-1)).toEqual(new Point(3, 2));
    expect(points.length).toBeGreaterThan(2);
    expect(points.every(point => point.x >= 1 && point.x <= 3 && point.z >= 0 && point.z <= 2)).toBeTruthy();
    expect(isMonotonic(points.map(point => point.x), 1)).toBeTruthy();
    expect(isMonotonic(points.map(point => point.z), 1)).toBeTruthy();
  });

  it('approximates descending convex quarter ellipses without missing endpoints', () => {
    const points = approximateSegments([
      new Segment('CONV', new Point(3, 0), new Point(1, 2)),
    ], 0.5);

    expect(points[0]).toEqual(new Point(3, 0));
    expect(points.at(-1)).toEqual(new Point(1, 2));
    expect(points.length).toBeGreaterThan(2);
    expect(points.every(point => point.x >= 1 && point.x <= 3 && point.z >= 0 && point.z <= 2)).toBeTruthy();
    expect(isMonotonic(points.map(point => point.x), -1)).toBeTruthy();
    expect(isMonotonic(points.map(point => point.z), 1)).toBeTruthy();
  });

  it('approximates descending concave quarter ellipses without missing endpoints', () => {
    const points = approximateSegments([
      new Segment('CONC', new Point(3, 0), new Point(1, 2)),
    ], 0.5);

    expect(points[0]).toEqual(new Point(3, 0));
    expect(points.at(-1)).toEqual(new Point(1, 2));
    expect(points.length).toBeGreaterThan(2);
    expect(points.every(point => point.x >= 1 && point.x <= 3 && point.z >= 0 && point.z <= 2)).toBeTruthy();
    expect(isMonotonic(points.map(point => point.x), -1)).toBeTruthy();
    expect(isMonotonic(points.map(point => point.z), 1)).toBeTruthy();
  });

  it('uses smaller chords to produce more curve points', () => {
    const segments = [
      new Segment('CONV', new Point(1, 0), new Point(3, 2)),
    ];

    expect(approximateSegments(segments, 0.1).length).toBeGreaterThan(approximateSegments(segments, 1).length);
  });

  it('offsets segments radially without changing z coordinates or mutating input', () => {
    const original = [
      new Segment('LINE', new Point(1, 0), new Point(2, 3)),
      new Segment('CONV', new Point(2, 3), new Point(4, 5)),
    ];

    const offset = offsetSegmentsRadially(original, 0.25);

    expect(offset).toEqual([
      new Segment('LINE', new Point(1.25, 0), new Point(2.25, 3)),
      new Segment('CONV', new Point(2.25, 3), new Point(4.25, 5)),
    ]);
    expect(original).toEqual([
      new Segment('LINE', new Point(1, 0), new Point(2, 3)),
      new Segment('CONV', new Point(2, 3), new Point(4, 5)),
    ]);
  });
});

function isMonotonic(values: number[], direction: 1 | -1): boolean {
  for (let i = 1; i < values.length; i++) {
    if (direction * values[i] < direction * values[i - 1] - 1e-9) return false;
  }
  return true;
}
