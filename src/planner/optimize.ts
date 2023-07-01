import * as Colors from "../common/colors";
import { Pixel, PixelMove } from "./pixel";

export function getCuttingEdges(tool: OffscreenCanvas): Pixel[] {
  const toolData = tool.getContext("2d")!.getImageData(0, 0, tool.width, tool.height).data;
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
      const i = (y * tool.width + x) * 4;
      if (
        toolData[i] == Colors.COLOR_TOOL.red() &&
        toolData[i + 1] == Colors.COLOR_TOOL.green() &&
        toolData[i + 2] == Colors.COLOR_TOOL.blue() &&
        toolData[i + 3] > 200
      ) {
        maybeAdd(x, y);
        if (++depth > 2) break;
      }
    }
  }
  for (let x = 0; x < tool.width; x++) {
    let depth = 0;
    for (let y = 0; y < tool.height; y++) {
      const i = (y * tool.width + x) * 4;
      if (
        toolData[i] == Colors.COLOR_TOOL.red() &&
        toolData[i + 1] == Colors.COLOR_TOOL.green() &&
        toolData[i + 2] == Colors.COLOR_TOOL.blue() &&
        toolData[i + 3] > 200
      ) {
        maybeAdd(x, y);
        if (++depth > 2) break;
      }
    }
  }
  return result;
}

export function optimizeMoves(moves: PixelMove[], progressCallback: (message: string) => void): PixelMove[] {
  const result: PixelMove[] = [];
  let i = 0;
  while (i < moves.length) {
    let m = moves[i];
    if (m.isEmpty()) {
      i++;
      continue;
    }

    if (!m.cutArea) {
      const travel = detectTravel(moves, i);
      if (travel.length > 1) {
        result.push(... travel.moves);
        i += travel.length;
        continue;
      }
    }

    let maxCount = 1;
    let occurrenceLength = 1;
    for (let j = 2; j < 200; j++) {
      const count = countPatterns(moves, i, j);
      if (count > 1 && count * j > maxCount * occurrenceLength) {
        maxCount = count;
        occurrenceLength = j;
      }
    }
    if (maxCount > 1) {
      result.push(mergeMoves(moves, i, maxCount * occurrenceLength));
      i += maxCount * occurrenceLength;
      continue;
    }

    const condirectional = detectCodirectional(moves, i);
    if (condirectional.length > 1) {
      result.push(condirectional.move);
      i += condirectional.length;
      continue;
    }

    result.push(m);
    i++;
  }
  if (result.length < moves.length) {
    progressCallback(`Optimized ${moves.length} moves down to ${result.length}`);
    return optimizeMoves(result, progressCallback);
  } else {
    return result;
  }
}

export function detectTravel(moves: PixelMove[], i: number): {moves: PixelMove[], length: number} {
  if (moves[i].cutArea) throw new Error('expecting a travel move');
  let end = i;
  while (end < moves.length - 1 && !moves[end + 1].cutArea) {
    end++;
  }
  return {moves: optimizeTravel(moves.slice(i, end + 1)), length: end - i + 1};
}

export function optimizeTravel(moves: PixelMove[]): PixelMove[] {
  const result = [];
  const start = moves[0];
  const maxY = Math.max.apply(null, moves.map(m => m.yStart + m.yDelta));
  const end = moves.at(-1)!;
  const endX = end.xStart + end.xDelta;
  const endY = end.yStart + end.yDelta;
  let currentY = start.yStart;
  if (endX != start.xStart) {
    if (start.yStart !== maxY) {
      // Move back.
      result.push(PixelMove.withoutCut(start.xStart, start.yStart, 0, maxY - start.yStart));
      currentY = maxY;
    }
    // Move to target x.
    result.push(PixelMove.withoutCut(start.xStart, maxY, endX - start.xStart, 0));
  }
  if (endY != currentY) {
    // Move to target y.
    result.push(PixelMove.withoutCut(endX, currentY, 0, endY - currentY));
  }
  return result;
}

export function detectCodirectional(moves: PixelMove[], i: number): {move: PixelMove, length: number} {
  let m = moves[i];
  let length = 1;
  while (i < moves.length - 1) {
    if (moves[i + 1].isCodirectional(m)) {
      m = m.merge(moves[i + 1]);
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
