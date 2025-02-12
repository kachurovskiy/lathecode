import { describe, it, expect } from 'vitest'
import { cutPolygonLower, deduplicatePixelMoves, findFirstNextDifferentY, getNLargestPolygons, getPolygonArea, moveIntoNonNegtiveX, polygonToTurnSegment, removeConsecutiveDuplicatePoints, removeTinyAreaPolygons, repairPointsGoingBack, scaleAndRoundPolygon, trimSegmentEnds } from './pixelutils';
import { Pixel, PixelMove } from './pixel';

describe('getPolygonArea', () => {
  it('calculates the area of a simple triangle', () => {
    const triangle: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(4, 0),
      new Pixel(0, 3),
    ];
    expect(getPolygonArea(triangle)).toBeCloseTo(6);
  });

  it('calculates the area of a square', () => {
    const square: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(4, 0),
      new Pixel(4, 4),
      new Pixel(0, 4),
    ];
    expect(getPolygonArea(square)).toBeCloseTo(16);
  });

  it('calculates the area of a complex polygon', () => {
    const pentagon: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(6, 0),
      new Pixel(6, 2),
      new Pixel(4, 2),
      new Pixel(4, 4),
      new Pixel(0, 4),
    ];
    expect(getPolygonArea(pentagon)).toBeCloseTo(20);
  });

  it('returns 0 for a degenerate polygon (line segment)', () => {
    const line: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(4, 0),
    ];
    expect(getPolygonArea(line)).toBe(0);
  });

  it('returns 0 for a single point', () => {
    const point: Pixel[] = [
      new Pixel(1, 1),
    ];
    expect(getPolygonArea(point)).toBe(0);
  });

  it('returns 0 for an empty polygon', () => {
    expect(getPolygonArea([])).toBe(0);
  });
});

describe('getNLargestPolygons', () => {
  it('returns the n largest polygons', () => {
    const polygons: Pixel[][] = [
      [
        new Pixel(0, 0),
        new Pixel(4, 0),
        new Pixel(4, 4),
        new Pixel(0, 4),
      ],
      [
        new Pixel(0, 0),
        new Pixel(6, 0),
        new Pixel(6, 2),
        new Pixel(4, 2),
        new Pixel(4, 4),
        new Pixel(0, 4),
      ],
      [
        new Pixel(0, 0),
        new Pixel(3, 0),
        new Pixel(3, 3),
        new Pixel(0, 3),
      ],
    ];
    const largest = getNLargestPolygons(polygons, 2);
    expect(largest).toEqual([
      polygons[1],
      polygons[0],
    ]);
  });

  it('returns an empty array if there are no polygons', () => {
    expect(getNLargestPolygons([], 1)).toEqual([]);
  });
});

describe('removeTinyAreaPolygons', () => {
  it('removes polygons with area less than 0.001', () => {
    const polygons: Pixel[][] = [
      [
        new Pixel(0, 0),
        new Pixel(4, 0),
        new Pixel(4, 4),
        new Pixel(0, 4),
      ],
      [
        new Pixel(0, 0),
        new Pixel(0.01, 0),
        new Pixel(0, 0.01),
      ],
      [
        new Pixel(0, 0),
        new Pixel(3, 0),
      ],
      [
        new Pixel(0, 0),
      ],
    ];
    const filtered = removeTinyAreaPolygons(polygons);
    expect(filtered).toEqual([
      polygons[0],
    ]);
  });

  it('returns an empty array if there are no polygons', () => {
    expect(removeTinyAreaPolygons([])).toEqual([]);
  });
});

describe('deduplicatePixelMoves', () => {
  it('removes duplicate move options', () => {
    const moveOptions: PixelMove[][] = [
      [
        PixelMove.withoutCut(0, 0, 1, 1),
        PixelMove.withoutCut(1, 1, 2, 2),
      ],
      [
        PixelMove.withoutCut(0, 0, 1, 1),
        PixelMove.withoutCut(1, 1, 2, 2),
      ],
      [
        PixelMove.withoutCut(0, 0, 1, 1),
        PixelMove.withoutCut(2, 2, 3, 3),
      ],
    ];
    const deduplicated = deduplicatePixelMoves(moveOptions);
    expect(deduplicated).toEqual([
      moveOptions[0],
      moveOptions[2],
    ]);
  });

  it('does not remove different move options', () => {
    const moveOptions: PixelMove[][] = [
      [
        PixelMove.withoutCut(0, 0, 1, 1),
        PixelMove.withoutCut(1, 1, 2, 2),
      ],
      [
        PixelMove.withoutCut(0, 0, 1, 1),
        PixelMove.withoutCut(2, 2, 3, 3),
      ],
    ];
    const deduplicated = deduplicatePixelMoves(moveOptions);
    expect(deduplicated).toEqual(moveOptions);
  });

  it('returns an empty array if there are no move options', () => {
    expect(deduplicatePixelMoves([])).toEqual([]);
  });
});

describe('scaleAndRoundPolygon', () => {
  it('scales and rounds a polygon', () => {
    const polygon: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(0.041, 0),
      new Pixel(0.042, 0.044),
      new Pixel(0, 0.041),
    ];
    const scaled = scaleAndRoundPolygon(polygon, 100);
    expect(scaled).toEqual([
      new Pixel(0, 0),
      new Pixel(4, 0),
      new Pixel(4, 4),
      new Pixel(0, 4),
    ]);
  });
});

describe('removeConsecutiveDuplicatePoints', () => {
  it('removes consecutive duplicate points', () => {
    const polygon: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(0, 0),
      new Pixel(1, 1),
      new Pixel(1, 1),
      new Pixel(2, 2),
    ];
    const deduplicated = removeConsecutiveDuplicatePoints(polygon);
    expect(deduplicated).toEqual([
      new Pixel(0, 0),
      new Pixel(1, 1),
      new Pixel(2, 2),
    ]);
  });

  it('removes the last point if it is the same as the first', () => {
    const polygon: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(1, 1),
      new Pixel(2, 2),
      new Pixel(0, 0),
    ];
    const deduplicated = removeConsecutiveDuplicatePoints(polygon);
    expect(deduplicated).toEqual([
      new Pixel(0, 0),
      new Pixel(1, 1),
      new Pixel(2, 2),
    ]);
  });

  it('returns an empty array if there are no points', () => {
    expect(removeConsecutiveDuplicatePoints([])).toEqual([]);
  });
});

describe('cutPolygonLower', () => {
  it('cuts a polygon at y=0', () => {
    const polygon: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(1, 1),
      new Pixel(2, 1),
      new Pixel(3, 0),
      new Pixel(2, -1),
      new Pixel(1, -1),
    ];
    const lower = cutPolygonLower(polygon);
    expect(lower).toEqual([
      new Pixel(0, 0),
      new Pixel(3, 0),
      new Pixel(2, -1),
      new Pixel(1, -1),
    ]);
  });

  it('cuts a polygon with edges crossing y=0 vertically', () => {
    const polygon: Pixel[] = [
      new Pixel(4, 4),
      new Pixel(4, -4),
      new Pixel(-4, -4),
      new Pixel(-4, 4),
    ];
    const lower = cutPolygonLower(polygon);
    expect(lower).toEqual([
      new Pixel(4, 0),
      new Pixel(4, -4),
      new Pixel(-4, -4),
      new Pixel(-4, 0),
    ]);
  });

  it('cuts a polygon with edges crossing y=0 at an angle', () => {
    const polygon: Pixel[] = [
      new Pixel(5, 4),
      new Pixel(3, -4),
      new Pixel(-5, -4),
      new Pixel(-3, 4),
    ];
    const lower = cutPolygonLower(polygon);
    expect(lower).toEqual([
      new Pixel(4, 0),
      new Pixel(3, -4),
      new Pixel(-5, -4),
      new Pixel(-4, 0),
    ]);
  });

  it('returns an empty array if the polygon is entirely above y=0', () => {
    const polygon: Pixel[] = [
      new Pixel(0, 1),
      new Pixel(1, 2),
      new Pixel(2, 2),
      new Pixel(3, 1),
    ];
    expect(cutPolygonLower(polygon)).toEqual([]);
  });

  it('returns an entire array if the polygon is entirely below y=0', () => {
    const polygon: Pixel[] = [
      new Pixel(0, -1),
      new Pixel(1, -2),
      new Pixel(2, -2),
      new Pixel(3, -1),
    ];
    expect(cutPolygonLower(polygon)).toEqual(polygon);
  });

  it('returns an empty array if the polygon is empty', () => {
    expect(cutPolygonLower([])).toEqual([]);
  });
});

/*
export function findFirstNextDifferentY(polygon: Pixel[], start: Pixel): number {
  const startIndex = polygon.indexOf(start);
  if (startIndex === -1) throw new Error('Start pixel not found in polygon: ' + start);
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[(startIndex + i) % polygon.length];
    if (current.y !== start.y) {
      return i;
    }
  }
  return polygon.length;
}
 */

describe('findFirstNextDifferentY', () => {
  it('finds the next different y value', () => {
    const polygon: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(1, 0),
      new Pixel(2, 1),
      new Pixel(3, 1),
      new Pixel(4, 1),
      new Pixel(5, 0),
    ];
    expect(findFirstNextDifferentY(polygon, new Pixel(0, 0))).toBe(1);
    expect(findFirstNextDifferentY(polygon, new Pixel(2, 1))).toBe(0);
    expect(findFirstNextDifferentY(polygon, new Pixel(3, 1))).toBe(0);
    expect(findFirstNextDifferentY(polygon, new Pixel(4, 1))).toBe(0);
    expect(findFirstNextDifferentY(polygon, new Pixel(5, 0))).toBe(1);
  });

  it('throws an error if the start pixel is not in the polygon', () => {
    const polygon: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(1, 0),
      new Pixel(2, 0),
      new Pixel(3, 0),
    ];
    expect(() => findFirstNextDifferentY(polygon, new Pixel(0, 1))).toThrow();
  });
});

/*
export function moveIntoNonNegtiveX(polygon: Pixel[]): Pixel[] {
  if (polygon.length === 0) return polygon;
  const minX = polygon.reduce((min, p) => Math.min(min, p.x), polygon[0].x);
  return polygon.map(p => new Pixel(p.x - minX, p.y));
}
 */

describe('moveIntoNonNegtiveX', () => {
  it('moves a polygon into the non-negative x range', () => {
    const polygon: Pixel[] = [
      new Pixel(1 - 5, 0),
      new Pixel(2 - 5, 0),
      new Pixel(3 - 5, 1),
      new Pixel(4 - 5, 1),
    ];
    expect(moveIntoNonNegtiveX(polygon)).toEqual([
      new Pixel(0, 0),
      new Pixel(1, 0),
      new Pixel(2, 1),
      new Pixel(3, 1),
    ]);
  });

  it('moves a polygon that is already in the non-negative x range', () => {
    const polygon: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(1, 0),
      new Pixel(2, 1),
      new Pixel(3, 1),
    ];
    expect(moveIntoNonNegtiveX(polygon)).toEqual(polygon);
  });

  it('returns an empty array if the polygon is empty', () => {
    expect(moveIntoNonNegtiveX([])).toEqual([]);
  });
});

describe('polygonToTurnSegment', () => {
  it('finds the turn segment of a polygon', () => {
    const polygon: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(0, 1),
      new Pixel(1, 2),
      new Pixel(2, 1),
      new Pixel(2, 0),
    ];
    expect(polygonToTurnSegment(polygon, 1).toString()).toEqual([
      new Pixel(0, 1),
      new Pixel(1, 2),
      new Pixel(2, 1),
    ].toString());
  });
});

describe('trimSegmentEnds', () => {
  it('trims the ends of a segment', () => {
    const segment: Pixel[] = [
      new Pixel(-1, 10),
      new Pixel(-1, 0),
      new Pixel(0, 0),
      new Pixel(1, 1),
      new Pixel(1, 1),
      new Pixel(2, 2),
      new Pixel(2, 0),
      new Pixel(3, 0),
      new Pixel(3, 5),
    ];
    expect(trimSegmentEnds(segment)).toEqual([
      new Pixel(0, 0),
      new Pixel(1, 1),
      new Pixel(1, 1),
      new Pixel(2, 2),
      new Pixel(2, 0),
    ]);
  });

  it('returns the segment if it has no ends to trim', () => {
    const segment: Pixel[] = [
      new Pixel(1, 1),
      new Pixel(1, 1),
      new Pixel(2, 2),
    ];
    expect(trimSegmentEnds(segment)).toEqual(segment);
  });

  it('returns an empty array if the segment is empty', () => {
    expect(trimSegmentEnds([])).toEqual([]);
  });
});

describe('repairPointsGoingBack', () => {
  it('repairs points going back', () => {
    const segment: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(2, 2),
      new Pixel(1, 0.5),
      new Pixel(4, 0.5),
      new Pixel(3, 2),
      new Pixel(5, 1),
    ];
    expect(repairPointsGoingBack(segment)).toEqual([
      new Pixel(0, 0),
      new Pixel(2, 2),
      new Pixel(2, 0.5),
      new Pixel(3, 0.5),
      new Pixel(3, 2),
      new Pixel(5, 1),
    ]);
  });

  it('handles reverse x direction', () => {
    const segment: Pixel[] = [
      new Pixel(5, 1),
      new Pixel(3, 2),
      new Pixel(4, 0.5),
      new Pixel(1, 0.5),
      new Pixel(2, 2),
      new Pixel(0, 0),
    ];
    expect(repairPointsGoingBack(segment)).toEqual([
      new Pixel(5, 1),
      new Pixel(3, 2),
      new Pixel(3, 0.5),
      new Pixel(2, 0.5),
      new Pixel(2, 2),
      new Pixel(0, 0),
    ]);
  });

  it('returns the segment if there are no points going back', () => {
    const segment: Pixel[] = [
      new Pixel(0, 0),
      new Pixel(1, 1),
      new Pixel(2, 2),
      new Pixel(3, 3),
    ];
    expect(repairPointsGoingBack(segment)).toEqual(segment);
  });

  it('returns the segment if there are no points', () => {
    expect(repairPointsGoingBack([])).toEqual([]);
  });
});
