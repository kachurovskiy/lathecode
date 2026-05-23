import { describe, expect, it } from 'vitest';
import {
  differenceGeometry,
  emptyGeometry,
  geometryArea,
  geometryBounds,
  horizontalSpansAtY,
  intersectGeometry,
  minkowskiSumPath,
  openPathIntersectsGeometryInterior,
  pointsToRing,
  polygonArea,
  polygonBounds,
  polygonFromPoints,
  rectangleGeometry,
  ringArea,
  sortedPolygonsByBounds,
  subtractGeometryFromOpenPath,
  unionGeometry,
  verticalSpansAtX,
  type VectorGeometry,
} from './polygon';

type TestRing = [number, number][];

describe('polygon helpers', () => {
  it('returns stable empty geometry values', () => {
    expect(emptyGeometry()).toEqual([]);
    expect(geometryArea(emptyGeometry())).toBe(0);
    expect(geometryBounds(emptyGeometry())).toBeNull();
    expect(horizontalSpansAtY(emptyGeometry(), 0)).toEqual([]);
  });

  it('computes boolean areas and bounds', () => {
    const stock = rectangleGeometry(-10, -5, 0, 0);
    const protectedPart = rectangleGeometry(-10, -3, 0, 0);

    const removable = differenceGeometry(stock, protectedPart);
    const cut = intersectGeometry(removable, rectangleGeometry(-10, -5, 0, -4));

    expect(geometryArea(removable)).toBeCloseTo(20);
    expect(geometryArea(cut)).toBeCloseTo(10);
    expect(geometryBounds(cut)).toEqual({minX: -10, minY: -5, maxX: 0, maxY: -4});
  });

  it('ignores empty boolean operands where safe', () => {
    const rectangle = rectangleGeometry(0, 0, 2, 3);

    expect(differenceGeometry(rectangle, emptyGeometry())).toEqual(rectangle);
    expect(unionGeometry(emptyGeometry(), rectangle)).toEqual(rectangle);
    expect(intersectGeometry(rectangle, emptyGeometry())).toEqual([]);
  });

  it('unions overlapping geometries', () => {
    const left = rectangleGeometry(0, 0, 2, 2);
    const right = rectangleGeometry(1, 0, 3, 2);

    expect(geometryArea(unionGeometry(left, right))).toBeCloseTo(6);
  });

  it('creates empty rectangles for zero or negative dimensions', () => {
    expect(rectangleGeometry(0, 0, 0, 1)).toEqual([]);
    expect(rectangleGeometry(0, 0, 1, 0)).toEqual([]);
    expect(rectangleGeometry(1, 0, 0, 1)).toEqual([]);
    expect(rectangleGeometry(0, 1, 1, 0)).toEqual([]);
  });

  it('converts points to rings after removing invalid coordinates and duplicates', () => {
    expect(pointsToRing([
      {x: 0, y: 0},
      {x: Number.NaN, y: 1},
      {x: 0, y: 0},
      {x: 1, y: 0},
      {x: Number.POSITIVE_INFINITY, y: 1},
      {x: 1, y: 1},
      {x: 0, y: 1},
      {x: 0, y: 0},
    ])).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
  });

  it('drops duplicate closing points', () => {
    const geometry = polygonFromPoints([
      {x: 0, y: 0},
      {x: 1, y: 0},
      {x: 1, y: 1},
      {x: 0, y: 1},
      {x: 0, y: 0},
    ]);

    expect(geometryArea(geometry)).toBeCloseTo(1);
  });

  it('drops degenerate polygons', () => {
    expect(polygonFromPoints([
      {x: 0, y: 0},
      {x: 1, y: 0},
      {x: 2, y: 0},
    ])).toEqual([]);
  });

  it('computes signed ring area and polygon area with holes', () => {
    const outer: TestRing = [[0, 0], [4, 0], [4, 4], [0, 4]];
    const hole: TestRing = [[1, 1], [3, 1], [3, 3], [1, 3]];

    expect(ringArea(outer)).toBeCloseTo(16);
    expect(ringArea([...outer].reverse())).toBeCloseTo(-16);
    expect(polygonArea([outer, hole])).toBeCloseTo(12);
  });

  it('computes polygon bounds and sorts non-empty polygons by x bounds', () => {
    const geometry: VectorGeometry = [
      [[[10, 0], [11, 0], [11, 1], [10, 1]]],
      [[[0, 0], [2, 0], [2, 1], [0, 1]]],
      [[[5, 0], [5, 0], [5, 0]]],
    ];

    const sorted = sortedPolygonsByBounds(geometry);

    expect(polygonBounds([])).toBeNull();
    expect(sorted.map(polygon => polygonBounds(polygon))).toEqual([
      {minX: 0, minY: 0, maxX: 2, maxY: 1},
      {minX: 10, minY: 0, maxX: 11, maxY: 1},
    ]);
  });

  it('finds horizontal spans through clipped polygons', () => {
    const geometry = polygonFromPoints([
      {x: 0, y: 0},
      {x: 4, y: 0},
      {x: 2, y: 4},
    ]);

    expect(horizontalSpansAtY(geometry, 2)).toEqual([{minX: 1, maxX: 3}]);
  });

  it('uses half-open scanlines to avoid double-counting polygon vertices', () => {
    const square = rectangleGeometry(0, 0, 4, 4);

    expect(horizontalSpansAtY(square, -0.01)).toEqual([]);
    expect(horizontalSpansAtY(square, 0)).toEqual([{minX: 0, maxX: 4}]);
    expect(horizontalSpansAtY(square, 4)).toEqual([]);
  });

  it('splits horizontal spans around polygon holes', () => {
    const geometry: VectorGeometry = [[
      [[0, 0], [4, 0], [4, 4], [0, 4]],
      [[1, 1], [3, 1], [3, 3], [1, 3]],
    ]];

    expect(horizontalSpansAtY(geometry, 2)).toEqual([
      {minX: 0, maxX: 1},
      {minX: 3, maxX: 4},
    ]);
  });

  it('merges touching or overlapping horizontal spans', () => {
    const geometry: VectorGeometry = [
      ...rectangleGeometry(0, 0, 2, 2),
      ...rectangleGeometry(2, 0, 4, 2),
      ...rectangleGeometry(3, 0, 5, 2),
    ];

    expect(horizontalSpansAtY(geometry, 1)).toEqual([{minX: 0, maxX: 5}]);
  });

  it('keeps separated horizontal spans sorted', () => {
    const geometry: VectorGeometry = [
      ...rectangleGeometry(4, 0, 6, 2),
      ...rectangleGeometry(0, 0, 2, 2),
    ];

    expect(horizontalSpansAtY(geometry, 1)).toEqual([
      {minX: 0, maxX: 2},
      {minX: 4, maxX: 6},
    ]);
  });

  it('finds vertical spans through polygons', () => {
    const geometry = polygonFromPoints([
      {x: 0, y: 0},
      {x: 4, y: 2},
      {x: 0, y: 4},
    ]);

    expect(verticalSpansAtX(geometry, 2)).toEqual([{minY: 1, maxY: 3}]);
  });

  it('uses half-open vertical scanlines to avoid double-counting polygon vertices', () => {
    const square = rectangleGeometry(0, 0, 4, 4);

    expect(verticalSpansAtX(square, -0.01)).toEqual([]);
    expect(verticalSpansAtX(square, 0)).toEqual([{minY: 0, maxY: 4}]);
    expect(verticalSpansAtX(square, 4)).toEqual([]);
  });

  it('splits vertical spans around polygon holes', () => {
    const geometry: VectorGeometry = [[
      [[0, 0], [4, 0], [4, 4], [0, 4]],
      [[1, 1], [3, 1], [3, 3], [1, 3]],
    ]];

    expect(verticalSpansAtX(geometry, 2)).toEqual([
      {minY: 0, maxY: 1},
      {minY: 3, maxY: 4},
    ]);
  });

  it('merges touching or overlapping vertical spans', () => {
    const geometry: VectorGeometry = [
      ...rectangleGeometry(0, 0, 2, 2),
      ...rectangleGeometry(0, 2, 2, 4),
      ...rectangleGeometry(0, 3, 2, 5),
    ];

    expect(verticalSpansAtX(geometry, 1)).toEqual([{minY: 0, maxY: 5}]);
  });

  it('builds swept open-path areas with endpoint caps', () => {
    const sweep = minkowskiSumPath([
      {x: -2, y: -3},
      {x: 0, y: -3},
      {x: 0, y: 0},
      {x: -2, y: 0},
    ], [
      {x: 10, y: -5},
      {x: 10, y: -3},
    ], false);

    expect(geometryBounds(sweep)).toEqual({minX: 8, minY: -8, maxX: 10, maxY: -3});
    expect(geometryArea(sweep)).toBeCloseTo(10);
  });

  it('clips open tool-origin paths against closed keepouts', () => {
    const keepout = rectangleGeometry(0, 0, 1, 1);

    expect(subtractGeometryFromOpenPath([
      {x: -1, y: 0.5},
      {x: 2, y: 0.5},
    ], keepout)).toEqual([
      [{x: -1, y: 0.5}, {x: 0, y: 0.5}],
      [{x: 1, y: 0.5}, {x: 2, y: 0.5}],
    ]);
  });

  it('allows boundary contact but detects keepout interior crossings', () => {
    const keepout = rectangleGeometry(0, 0, 1, 1);

    expect(openPathIntersectsGeometryInterior([
      {x: 0, y: 0},
      {x: 1, y: 0},
    ], keepout)).toBe(false);
    expect(openPathIntersectsGeometryInterior([
      {x: -1, y: 0.5},
      {x: 2, y: 0.5},
    ], keepout)).toBe(true);
  });
});
