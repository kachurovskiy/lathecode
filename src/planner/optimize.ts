import { Pixel, PixelMove } from "../common/pixel";
import { AppSettings, CUTTING_EDGE_THICKNESS_PX, DEFAULT_APP_SETTINGS, normalizeAppSettings } from "../common/settings";
import { PlannerBitmap, PlannerCell } from "./bitmap";

export type RadialCuttingEdge = 'top' | 'bottom';
export type TravelRetractionSide = 'minY' | 'maxY';

export function getCuttingEdges(tool: PlannerBitmap, radialEdge: RadialCuttingEdge = 'top', cuttingEdgeThicknessPx = CUTTING_EDGE_THICKNESS_PX): Pixel[] {
  const set: Set<string> = new Set();
  const result: Pixel[] = [];
  const maybeAdd = (x: number, y: number) => {
    const p = new Pixel(x, y);
    if (!set.has(p.toString())) {
      result.push(p);
      set.add(p.toString());
    }
  }
  for (let y = 0; y < tool.height; y++) {
    let depth = 0;
    for (let x = 0; x < tool.width; x++) {
      if (tool.get(x, y) === PlannerCell.Tool) {
        maybeAdd(x, y);
        if (++depth > cuttingEdgeThicknessPx) break;
      }
    }
  }
  for (let x = 0; x < tool.width; x++) {
    let depth = 0;
    for (let y = radialEdge === 'top' ? 0 : tool.height - 1; y >= 0 && y < tool.height; y += radialEdge === 'top' ? 1 : -1) {
      if (tool.get(x, y) === PlannerCell.Tool) {
        maybeAdd(x, y);
        if (++depth > cuttingEdgeThicknessPx) break;
      }
    }
  }
  return result;
}

export function isSmoothingAllowed(m1: PixelMove, m2: PixelMove, epsilonPx: number) {
  const m = mergeGeometry(m1, m2);
  const angleDegrees = m.getAngleToDegrees(m1);
  if (angleDegrees === 180) return false;
  const mistake = Math.sin(angleDegrees / 180 * Math.PI) * m1.length();
  return mistake <= epsilonPx;
}

export function smoothMoves(moves: PixelMove[], epsilonPx: number): PixelMove[] {
  let result = moves;
  let prevLength = result.length;
  do {
    prevLength = result.length;
    result = smoothMovesOnce(result, epsilonPx);
  } while (result.length < prevLength)
  return result;
}

export function smoothMovesOnce(moves: PixelMove[], epsilonPx: number): PixelMove[] {
  const result: PixelMove[] = [];
  let i = 0;
  while (i < moves.length) {
    let m = moves[i];
    if (i + 1 < moves.length && isSmoothingAllowed(moves[i], moves[i + 1], epsilonPx)) {
      result.push(moves[i].merge(moves[i + 1]));
      i += 2;
      continue;
    }
    result.push(m);
    i++;
  }
  return result;
}

export function optimizeMoves(
  moves: PixelMove[],
  progressCallback: (message: string) => void,
  travelRetractionSide: TravelRetractionSide = 'maxY',
  settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS): PixelMove[] {
  const normalizedSettings = normalizeAppSettings(settings);
  const result = optimizeMovesBeforeSmoothing(moves, progressCallback, travelRetractionSide, normalizedSettings);
  return smoothMoves(result, normalizedSettings.smoothingEpsilonPx);
}

export function optimizeMovesBeforeSmoothing(
  moves: PixelMove[],
  progressCallback: (message: string) => void,
  travelRetractionSide: TravelRetractionSide = 'maxY',
  settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS): PixelMove[] {
  const normalizedSettings = normalizeAppSettings(settings);
  let result = moves;
  let prevLength = result.length;
  do {
    prevLength = result.length;
    result = optimizeMovesOnce(result, progressCallback, travelRetractionSide, normalizedSettings);
    progressCallback(`Optimized moves to ${result.length}`);
  } while (result.length < prevLength)
  return result;
}

function optimizeMovesOnce(moves: PixelMove[], progressCallback: (message: string) => void, travelRetractionSide: TravelRetractionSide, settings: AppSettings): PixelMove[] {
  const result: PixelMove[] = [];
  let i = 0;
  while (i < moves.length) {
    let m = moves[i];
    if (m.isEmpty()) {
      i++;
      continue;
    }

    if (!m.cutArea) {
      const travel = detectTravel(moves, i, travelRetractionSide);
      if (travel.length > 1 && travel.moves.length < travel.length) {
        result.push(... travel.moves);
        i += travel.length;
        progressCallback(`Optimized ${travel.length} travel moves to ${travel.moves.length}`);
        continue;
      }
    }

    const condirectional = detectCodirectional(moves, i);
    if (condirectional.length > 1) {
      result.push(condirectional.move);
      i += condirectional.length;
      progressCallback(`Optimized ${condirectional.length} codirectional moves to 1`);
      continue;
    }

    // Detect cones.
    if (i + 1 < moves.length &&
        moves[i].isBasic() &&
        moves[i + 1].isHorizontalOrVertical()) {
      let count = 1;
      while (i + 1 + count * 2 < moves.length) {
        const j = i + count * 2;
        if (moves[j].isBasic() &&
            moves[j + 1].isHorizontalOrVertical() &&
            mergeGeometry(moves[j - 2], moves[j - 1]).getAngleToDegrees(mergeGeometry(moves[j], moves[j + 1])) < settings.optimizeEpsilonDegrees) {
          count++;
        } else {
          break;
        }
      }
      if (count > 1) {
        result.push(mergeMoves(moves, i, 2 * count));
        i += 2 * count;
        progressCallback(`Optimized ${2 * count} moves to 1`);
        continue;
      }
    }

    result.push(m);
    i++;
  }
  return result;
}

export function detectTravel(moves: PixelMove[], i: number, travelRetractionSide: TravelRetractionSide = 'maxY'): {moves: PixelMove[], length: number} {
  if (moves[i].cutArea) throw new Error('expecting a travel move');
  let end = i;
  while (end < moves.length - 1 && !moves[end + 1].cutArea) {
    end++;
  }
  return {moves: optimizeTravel(moves.slice(i, end + 1), travelRetractionSide), length: end - i + 1};
}

export function optimizeTravel(moves: PixelMove[], travelRetractionSide: TravelRetractionSide = 'maxY'): PixelMove[] {
  const result = [];
  const start = moves[0];
  const safeY = getSafeTravelY(moves, travelRetractionSide);
  const end = moves.at(-1)!;
  const endX = end.xStart + end.xDelta;
  const endY = end.yStart + end.yDelta;
  let currentY = start.yStart;
  if (endX != start.xStart) {
    if (start.yStart !== safeY) {
      // Move back.
      result.push(PixelMove.withoutCut(start.xStart, start.yStart, 0, safeY - start.yStart));
      currentY = safeY;
    }
    // Move to target x.
    result.push(PixelMove.withoutCut(start.xStart, safeY, endX - start.xStart, 0));
  }
  if (endY != currentY) {
    // Move to target y.
    result.push(PixelMove.withoutCut(endX, currentY, 0, endY - currentY));
  }
  return result;
}

function getSafeTravelY(moves: PixelMove[], travelRetractionSide: TravelRetractionSide): number {
  if (!moves.length) throw new Error('No travel moves');

  let minY = Infinity;
  let maxY = -Infinity;
  for (const move of moves) {
    const endY = move.yStart + move.yDelta;
    minY = Math.min(minY, move.yStart, endY);
    maxY = Math.max(maxY, move.yStart, endY);
  }
  return travelRetractionSide === 'minY' ? minY : maxY;
}

export function detectCodirectional(moves: PixelMove[], i: number): {move: PixelMove, length: number} {
  let m = moves[i];
  let length = 1;
  while (i < moves.length - 1) {
    const m1 = moves[i + 1];
    if (!m1.getAngleToDegrees(m)) {
      m = m.merge(m1);
      length++;
      i++;
    } else {
      break;
    }
  }
  return {move: m, length};
}

export function mergeMoves(moves: PixelMove[], startIndex: number, length: number): PixelMove {
  let m = moves[startIndex];
  for (let i = 1; i < length; i++) {
    m = m.merge(moves[startIndex + i]);
  }
  return m;
}

function mergeGeometry(m1: PixelMove, m2: PixelMove): PixelMove {
  if (m1.xStart + m1.xDelta !== m2.xStart || m1.yStart + m1.yDelta !== m2.yStart) throw new Error(`merge error: ${m1} + ${m2}`);
  return new PixelMove(m1.xStart, m1.yStart, m1.xDelta + m2.xDelta, m1.yDelta + m2.yDelta, m1.cutArea + m2.cutArea, []);
}

export function countPatterns(moves: PixelMove[], startIndex: number, patternLength: number): number {
  let count = 1;
  let i = startIndex + patternLength;
  while (i + patternLength <= moves.length) {
    if (sameMoves(moves, startIndex, i, patternLength)) {
      count++;
      i += patternLength;
    } else {
      break;
    }
  }
  return count;
}

export function sameMoves(moves: PixelMove[], i: number, j: number, length: number): boolean {
  if (j - i < length) throw new Error('overlapping move sequences');
  for (let k = 0; k < length; k++) {
    const moveI = moves[i + k];
    const moveJ = moves[j + k];
    if (moveI.xDelta != moveJ.xDelta || moveI.yDelta != moveJ.yDelta) return false;
  }
  return true;
}
