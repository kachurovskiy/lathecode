import { Pixel, PixelMove } from "./pixel";
import { LatheCode } from "./lathecode";

export function getPolygonArea(polygon: Pixel[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area) / 2;
}

export function getNLargestPolygons(polygons: Pixel[][], n: number): Pixel[][] {
  return polygons
    .map(polygon => ({ polygon, area: getPolygonArea(polygon) }))
    .sort((a, b) => b.area - a.area)
    .slice(0, n)
    .map(({ polygon }) => polygon);
}

export function removeTinyAreaPolygons(polygons: Pixel[][]): Pixel[][] {
  return polygons.filter(polygon => getPolygonArea(polygon) > 0.001);
}

export function deduplicatePixelMoves(moveOptions: PixelMove[][]): PixelMove[][] {
  const uniqueMoves = new Set<string>();
  const deduplicatedMoveOptions: PixelMove[][] = [];
  for (const moves of moveOptions) {
    const key = moves.map(m => m.toConstructorString()).join(',');
    if (!uniqueMoves.has(key)) {
      uniqueMoves.add(key);
      deduplicatedMoveOptions.push(moves);
    }
  }
  return deduplicatedMoveOptions;
}

export function scaleAndRoundPolygon(polygon: Pixel[], scale: number): Pixel[] {
  return polygon.map(p => new Pixel(Math.round(p.x * scale), Math.round(p.y * scale)));
}

export function removeConsecutiveDuplicatePoints(polygon: Pixel[]): Pixel[] {
  if (polygon.length < 2) return polygon;

  const uniqueProjection = [polygon[0]];
  for (let i = 1; i < polygon.length; i++) {
    if (!polygon[i].equals(polygon[i - 1])) {
      uniqueProjection.push(polygon[i]);
    }
  }

  // Also remove the last point if it's the same as the first
  if (uniqueProjection.length > 1 && uniqueProjection[0].equals(uniqueProjection[uniqueProjection.length - 1])) {
    uniqueProjection.pop();
  }

  return uniqueProjection;
}

export function cutPolygonLower(polygon: Pixel[]): Pixel[] {
  const lowerPart: Pixel[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    if (current.y <= 0) {
        lowerPart.push(current);
    }
    if ((current.y < 0 && next.y >= 0) || (current.y >= 0 && next.y < 0)) {
      const t = current.y / (current.y - next.y);
      const intersectX = current.x + t * (next.x - current.x);
      lowerPart.push(new Pixel(intersectX, 0));
    }
  }
  return removeConsecutiveDuplicatePoints(lowerPart);
}

export function findFirstNextDifferentY(polygon: Pixel[], start: Pixel): number {
  const startIndex = polygon.findIndex(p => p.equals(start));
  if (startIndex === -1) throw new Error('Start pixel not found in polygon: ' + start);
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[(startIndex + i) % polygon.length];
    if (current.y !== start.y) {
      return current.y;
    }
  }
  return start.y;
}

export function findFirstPreviousDifferentY(polygon: Pixel[], start: Pixel): number {
  const startIndex = polygon.findIndex(p => p.equals(start));
  if (startIndex === -1) throw new Error('Start pixel not found in polygon: ' + start);
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[(startIndex - i + polygon.length) % polygon.length];
    if (current.y !== start.y) {
      return current.y;
    }
  }
  return start.y;
}

export function moveIntoNonNegtiveX(polygon: Pixel[]): Pixel[] {
  if (polygon.length === 0) return polygon;
  const minX = polygon.reduce((min, p) => Math.min(min, p.x), polygon[0].x);
  return polygon.map(p => new Pixel(p.x - minX, p.y));
}

export function mirrorPolygonY(polygon: Pixel[]): Pixel[] {
  return polygon.map(p => new Pixel(p.x, -p.y));
}

export function mirrorPolygonX(polygon: Pixel[]): Pixel[] {
  return polygon.reverse().map(p => new Pixel(-p.x, p.y));
}

export function polygonToTurnSegments(polygon: Pixel[]): Pixel[][] {
  const result = [];
  const positiveDirectionSegment = polygonToTurnSegment(polygon, 1);
  if (positiveDirectionSegment.length > 1) result.push(positiveDirectionSegment);
  const negativeDirectionSegment = polygonToTurnSegment(polygon, -1);
  if (negativeDirectionSegment.length > 1) result.push(negativeDirectionSegment);
  return result;
}

export function polygonToTurnSegment(polygon: Pixel[], direction: number): Pixel[] {
  // Find the point with lowest x and among those with highest y
  let minXPoint = polygon[0];
  for (let pair of polygon) {
    if (pair.x < minXPoint.x || (pair.x === minXPoint.x && pair.y > minXPoint.y)) {
      minXPoint = pair;
    }
  }

  // Find the point with highest x and among those with highest y
  let maxXPoint = polygon[0];
  for (let pair of polygon) {
    if (pair.x > maxXPoint.x || (pair.x === maxXPoint.x && pair.y > maxXPoint.y)) {
      maxXPoint = pair;
    }
  }

  // Take the segment reachable by the turning tool from the polygon
  let segment = [minXPoint];
  let current = minXPoint;
  while (current !== maxXPoint) {
    const next = polygon[(polygon.indexOf(current) + direction + polygon.length) % polygon.length];
    segment.push(next);
    current = next;
  }

  // Less deflection to have a larger base for the part
  if (maxXPoint.y < minXPoint.y) {
    segment = moveIntoNonNegtiveX(mirrorPolygonX(segment));
  }

  return trimSegmentEnds(segment);
}

export function trimSegmentEnds(segment: Pixel[]): Pixel[] {
  if (segment.length < 2) return segment;
  let modified = false;
  let attempts = 0;
  do {
    attempts++;
    if (segment[0].x === segment[1].x && segment[1].y === 0) {
      segment.shift();
      modified = true;
    } else if (segment[0].y === 0 && segment[1].y === 0) {
      segment.shift();
      modified = true;
    } else if (segment[segment.length - 1].y === 0 && segment[segment.length - 2].y === 0) {
      segment.pop();
      modified = true;
    } else if (segment[segment.length - 1].x === segment[segment.length - 2].x && segment[segment.length - 2].y === 0) {
      segment.pop();
      modified = true;
    }
  } while (modified && segment.length > 1 && attempts < 50);
  return segment;
}

export function repairPointsGoingBack(segment: Pixel[]): Pixel[] {
  if (segment.length < 2) return segment;
  const direction = segment[0].x < segment[segment.length - 1].x ? 1 : -1;
  let modified = true;
  for (let attempts = 0; modified && attempts < 10; attempts++) {
    modified = false;
    for (let i = 0; i < segment.length - 1; i++) {
      const currentPoint = segment[i];
      const nextPoint = segment[i + 1];
      if (direction * nextPoint.x < direction * currentPoint.x) {
        if (nextPoint.y > currentPoint.y) {
          segment[i] = new Pixel(nextPoint.x, currentPoint.y);
        } else {
          segment[i + 1] = new Pixel(currentPoint.x, nextPoint.y);
        }
        modified = true;
      }
    }
  }
  return segment;
}

export function segmentToMoves(segment: Pixel[]): PixelMove[] {
  const moves: PixelMove[] = [];
  for (let i = 0; i < segment.length - 1; i++) {
    const currentPoint = segment[i];
    const nextPoint = segment[i + 1];
    const dx = nextPoint.x - currentPoint.x;
    const dy = nextPoint.y - currentPoint.y;
    moves.push(new PixelMove(currentPoint.x, currentPoint.y, dx, dy, 1, []));
  }
  return moves;
}

export function movesToLatheCodeOrNull(moves: PixelMove[], pxPerMm: number): LatheCode | null {
  const lc = new LatheCode(moves.map(m => {
    return m.toMove(pxPerMm).toLatheCode().trim();
  }).filter(line => line.length > 0).join('\n'));
  return lc.getStock() ? lc : null;
}
