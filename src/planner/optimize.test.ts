import { describe, it, expect } from 'vitest'
import { sameMoves, countPatterns, mergeMoves, detectCodirectional, optimizeTravel, detectTravel, optimizeMoves, isSmoothingAllowed, smoothMoves, detectRoughStair } from './optimize';
import { PixelMove } from '../common/pixel';
import { PlannerWorker } from './plannerworker';
import { LatheCode } from '../common/lathecode';
import { PlannerBitmap, PlannerCell } from './bitmap';

describe('plannerworker', () => {
  it('keeps outside tool overshoot when the side cutting edge reaches centerline', () => {
    const messages: any[] = [];
    const canvas = bitmap(2, 2, () => PlannerCell.Stock);
    const tool = bitmap(2, 2, (x, y) => x === 1 && y === 0 || x === 0 && y === 1 ? PlannerCell.Tool : PlannerCell.Empty);

    new PlannerWorker(new LatheCode('STOCK D4\nDEPTH CUT1 FINISH0\nMODE TURN\nL2 R1'), 1, {
      rasterizer: {
        createPartBitmap: () => canvas,
        createToolBitmap: () => tool,
      },
      postMessage: message => messages.push(message),
      optimizeMoves: moves => moves,
    });

    const moves = messages.find(message => message.moves)?.moves as PixelMove[];
    const minToolY = Math.min(...moves.flatMap(move => [move.yStart, move.yStart + move.yDelta]));

    expect(minToolY).toBe(-1);
  });

  it('plans inside-only profiles from the centerline side', () => {
    const messages: any[] = [];
    const canvas = bitmap(3, 4, (_x, y) => y < 3 ? PlannerCell.Stock : PlannerCell.Part);
    const tool = bitmap(1, 1, () => PlannerCell.Tool);

    new PlannerWorker(new LatheCode('STOCK D8\nDEPTH CUT1 FINISH0\nINSIDE\nL3 R3'), 1, {
      rasterizer: {
        createPartBitmap: () => canvas,
        createToolBitmap: () => tool,
      },
      postMessage: message => messages.push(message),
      optimizeMoves: moves => moves,
    });

    const moves = messages.find(message => message.moves)?.moves as PixelMove[];
    const cutPixels = moves.flatMap(move => move.cutPixels);

    expect(cutPixels.length).toBeGreaterThan(0);
    expect(moves.some(move => move.cutArea && move.yDelta > 0)).toBeTruthy();
    expect(Math.max(...cutPixels.map(pixel => pixel.y))).toBeLessThan(3);
  });

  it('plans inside-only profiles from an existing stock hole radius', () => {
    const messages: any[] = [];
    const canvas = bitmap(3, 5, (_x, y) => y < 2 ? PlannerCell.Empty : y < 3 ? PlannerCell.Stock : PlannerCell.Part);
    const tool = bitmap(1, 1, () => PlannerCell.Tool);

    new PlannerWorker(new LatheCode('STOCK D10 ID4\nDEPTH CUT1 FINISH0\nINSIDE\nL3 R3'), 1, {
      rasterizer: {
        createPartBitmap: () => canvas,
        createToolBitmap: () => tool,
      },
      postMessage: message => messages.push(message),
      optimizeMoves: moves => moves,
    });

    const moves = messages.find(message => message.moves)?.moves as PixelMove[];
    const cutPixels = moves.flatMap(move => move.cutPixels);
    const yCoords = moves.flatMap(move => [move.yStart, move.yStart + move.yDelta]);

    expect(Math.min(...yCoords)).toBe(2);
    expect(cutPixels.length).toBeGreaterThan(0);
    expect(Math.min(...cutPixels.map(pixel => pixel.y))).toBe(2);
    expect(Math.max(...cutPixels.map(pixel => pixel.y))).toBe(2);
  });

  it('keeps inside-only cylinder toolpaths within the bore radius', () => {
    const messages: any[] = [];
    const canvas = bitmap(30, 25, (_x, y) => y < 14 ? PlannerCell.Stock : y === 14 ? PlannerCell.Finish : PlannerCell.Part);
    const tool = bitmap(30, 30, (x, y) => x === 0 || y === 29 ? PlannerCell.Tool : PlannerCell.Empty);

    new PlannerWorker(new LatheCode('STOCK D5\nINSIDE\nL3 D3'), 10, {
      rasterizer: {
        createPartBitmap: () => canvas,
        createToolBitmap: () => tool,
      },
      postMessage: message => messages.push(message),
    });

    const moves = messages.find(message => message.moves)?.moves as PixelMove[];
    const yCoords = moves.flatMap(move => [move.yStart, move.yStart + move.yDelta]);

    expect(Math.min(...yCoords)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...yCoords)).toBeLessThanOrEqual(15);
    expect(moves.some(move => move.cutArea)).toBeTruthy();
  });

  it('plans with the default rasterizer without browser canvas APIs', () => {
    const messages: any[] = [];

    new PlannerWorker(new LatheCode('STOCK D2\nTOOL RECT R0 L1 H1\nDEPTH CUT0.5 FINISH0\nL2 R0.5'), 10, {
      postMessage: message => messages.push(message),
    });

    const canvas = messages.find(message => message.canvas)?.canvas;
    const moves = messages.find(message => message.moves)?.moves as PixelMove[];

    expect(canvas.width).toBe(20);
    expect(canvas.height).toBe(10);
    expect(moves.some(move => move.cutArea)).toBeTruthy();
  });

  it('sameMoves', () => {
    expect(sameMoves([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 1),
    ], 0, 1, 1)).toBeTruthy();
    expect(sameMoves([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 2),
    ], 0, 1, 1)).toBeFalsy();
    expect(sameMoves([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 2),
      PixelMove.withoutCut(2, 3, 1, 1),
      PixelMove.withoutCut(3, 4, 1, 2),
    ], 0, 2, 2)).toBeTruthy();
  });

  it('countPatterns', () => {
    expect(countPatterns([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 1),
    ], 0, 1)).toBe(2);
    expect(countPatterns([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 2),
      PixelMove.withoutCut(2, 3, 1, 1),
      PixelMove.withoutCut(3, 4, 1, 2),
    ], 2, 1)).toBe(1);
    expect(countPatterns([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 2),
      PixelMove.withoutCut(2, 3, 1, 1),
      PixelMove.withoutCut(3, 4, 1, 2),
    ], 0, 1)).toBe(1);
    expect(countPatterns([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 2),
      PixelMove.withoutCut(2, 3, 1, 1),
      PixelMove.withoutCut(3, 4, 1, 2),
      PixelMove.withoutCut(4, 6, 1, 2),
    ], 0, 2)).toBe(2);
    const angle4 = [
      new PixelMove(182, 200, -1, 1, 38, []),
      new PixelMove(181, 201, -1, 0, 47, []),
      new PixelMove(180, 201, -1, 0, 47, []),
      new PixelMove(179, 201, -1, 0, 46, []),
      new PixelMove(178, 201, -1, 1, 37, []),
      new PixelMove(177, 202, -1, 0, 46, []),
      new PixelMove(176, 202, -1, 0, 46, []),
      new PixelMove(175, 202, -1, 0, 45, []),
      new PixelMove(174, 202, -1, 1, 36, []),
      new PixelMove(173, 203, -1, 0, 45, []),
      new PixelMove(172, 203, -1, 0, 45, []),
      new PixelMove(171, 203, -1, 0, 44, []),
      new PixelMove(170, 203, -1, 1, 35, []),
      new PixelMove(169, 204, -1, 0, 44, []),
      new PixelMove(168, 204, -1, 0, 44, []),
      new PixelMove(167, 204, -1, 0, 43, []),
      new PixelMove(166, 204, -1, 1, 34, []),
      new PixelMove(165, 205, -1, 0, 43, []),
      new PixelMove(164, 205, -1, 0, 43, []),
      new PixelMove(163, 205, -1, 0, 42, []),
      new PixelMove(162, 205, -1, 1, 33, []),
      new PixelMove(161, 206, -1, 0, 42, []),
      new PixelMove(160, 206, -1, 0, 42, []),
      new PixelMove(159, 206, -1, 0, 41, []),
      new PixelMove(158, 206, -1, 1, 32, []),
      new PixelMove(157, 207, -1, 0, 41, []),
      new PixelMove(156, 207, -1, 0, 41, []),
      new PixelMove(155, 207, -1, 0, 40, []),
    ];
    expect(countPatterns(angle4, 0, 1)).toBe(1);
    expect(countPatterns(angle4, 0, 2)).toBe(1);
    expect(countPatterns(angle4, 0, 3)).toBe(1);
    expect(countPatterns(angle4, 0, 4)).toBe(7);
    expect(countPatterns(angle4, 0, 5)).toBe(1);
    expect(countPatterns(angle4, 0, 6)).toBe(1);
    expect(countPatterns(angle4, 0, 7)).toBe(1);
    expect(countPatterns(angle4, 0, 8)).toBe(3);
  });

  it('mergeMoves', () => {
    expect(mergeMoves([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 2),
      PixelMove.withoutCut(2, 3, 1, 1),
      PixelMove.withoutCut(3, 4, 1, 2),
      PixelMove.withoutCut(4, 6, 1, 2),
    ], 1, 1)).toEqual(PixelMove.withoutCut(1, 1, 1, 2));

    expect(mergeMoves([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 2),
      PixelMove.withoutCut(2, 3, 1, 1),
      PixelMove.withoutCut(3, 4, 1, 2),
      PixelMove.withoutCut(4, 6, 1, 2),
    ], 1, 2)).toEqual(PixelMove.withoutCut(1, 1, 2, 3));

    expect(mergeMoves([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 2),
      PixelMove.withoutCut(2, 3, 1, 1),
      PixelMove.withoutCut(3, 4, 1, 2),
      PixelMove.withoutCut(4, 6, 1, 2),
    ], 0, 4)).toEqual(PixelMove.withoutCut(0, 0, 4, 6));

    expect(mergeMoves([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 1),
      PixelMove.withoutCut(2, 2, -1, -1),
      PixelMove.withoutCut(1, 1, -1, -1),
    ], 0, 4)).toEqual(PixelMove.withoutCut(0, 0, 0, 0));
  });

  it('detectCodirectional', () => {
    expect(detectCodirectional([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 2),
      PixelMove.withoutCut(2, 3, 1, 1),
      PixelMove.withoutCut(3, 4, 1, 2),
      PixelMove.withoutCut(4, 6, 1, 2),
    ], 1)).toEqual({move: PixelMove.withoutCut(1, 1, 1, 2), length: 1});

    expect(detectCodirectional([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 1),
      PixelMove.withoutCut(2, 2, 1, 1),
      PixelMove.withoutCut(3, 3, 1, 1),
      PixelMove.withoutCut(4, 4, 1, 1),
    ], 1)).toEqual({move: PixelMove.withoutCut(1, 1, 4, 4), length: 4});

    expect(detectCodirectional([
      PixelMove.withoutCut(0, 0, 1, 1),
      PixelMove.withoutCut(1, 1, 1, 1),
      PixelMove.withoutCut(2, 2, -1, 0),
      PixelMove.withoutCut(1, 2, -1, 0),
      PixelMove.withoutCut(0, 2, 1, 0),
    ], 2)).toEqual({move: PixelMove.withoutCut(2, 2, -2, 0), length: 2});
  });

  it('optimizeTravel', () => {
    expect(optimizeTravel([
      PixelMove.withoutCut(100, 100, 1, 0),
      PixelMove.withoutCut(101, 100, 1, 0),
      PixelMove.withoutCut(102, 100, 1, 0),
    ])).toEqual([
      PixelMove.withoutCut(100, 100, 3, 0),
    ]);

    expect(optimizeTravel([
      PixelMove.withoutCut(100, 100, 0, 1),
      PixelMove.withoutCut(100, 101, -1, 1),
      PixelMove.withoutCut(99, 102, -1, 1),
      PixelMove.withoutCut(98, 103, -1, 1),
      PixelMove.withoutCut(97, 104, -1, 0),
    ])).toEqual([
      PixelMove.withoutCut(100, 100, 0, 4),
      PixelMove.withoutCut(100, 104, -4, 0),
    ]);

    expect(optimizeTravel([
      PixelMove.withoutCut(100, 100, 0, 1),
      PixelMove.withoutCut(100, 101, -1, 1),
      PixelMove.withoutCut(99, 102, -1, 1),
      PixelMove.withoutCut(98, 103, -1, 1),
      PixelMove.withoutCut(97, 104, -1, 0),
      PixelMove.withoutCut(96, 104, 0, -1),
      PixelMove.withoutCut(96, 103, 0, -1),
      PixelMove.withoutCut(96, 102, 0, -1),
      PixelMove.withoutCut(96, 101, 0, -1),
    ])).toEqual([
      PixelMove.withoutCut(100, 100, 0, 4),
      PixelMove.withoutCut(100, 104, -4, 0),
      PixelMove.withoutCut(96, 104, 0, -4),
    ]);

    expect(optimizeTravel([
      PixelMove.withoutCut(0, 0, 0, 1),
      PixelMove.withoutCut(0, 1, 0, 1),
      PixelMove.withoutCut(0, 2, 0, -1),
      PixelMove.withoutCut(0, 1, 0, -1),
    ])).toEqual([]);

    expect(optimizeTravel([
      PixelMove.withoutCut(0, 0, 0, 1),
      PixelMove.withoutCut(0, 1, 0, 1),
      PixelMove.withoutCut(0, 2, 1, 0),
      PixelMove.withoutCut(1, 2, -1, 0),
      PixelMove.withoutCut(0, 2, 0, -1),
      PixelMove.withoutCut(0, 1, 0, -1),
    ])).toEqual([]);

    expect(optimizeTravel([
      PixelMove.withoutCut(0, 0, -2, 0),
      PixelMove.withoutCut(-2, 0, -5, 0),
    ])).toEqual([
      PixelMove.withoutCut(0, 0, -7, 0),
    ]);
  });

  it('optimizes long travel runs without overflowing the stack', () => {
    const moves: PixelMove[] = [];
    for (let i = 0; i < 20000; i++) {
      moves.push(PixelMove.withoutCut(i, i % 17, 1, i % 2 ? 3 : -3));
    }

    expect(optimizeTravel(moves)).toEqual([
      PixelMove.withoutCut(0, 0, 0, 19),
      PixelMove.withoutCut(0, 19, 20000, 0),
      PixelMove.withoutCut(20000, 19, 0, -9),
    ]);
  });

  it('detectTravel', () => {
    expect(detectTravel([
      PixelMove.withoutCut(100, 100, 0, 1),
    ], 0)).toEqual({moves: [
      PixelMove.withoutCut(100, 100, 0, 1),
    ], length: 1});

    expect(detectTravel([
      PixelMove.withoutCut(100, 100, 0, 1),
      PixelMove.withoutCut(100, 101, -1, 1),
      PixelMove.withoutCut(99, 102, -1, 1),
      PixelMove.withoutCut(98, 103, -1, 1),
      PixelMove.withoutCut(97, 104, -1, 0),
      PixelMove.withoutCut(96, 104, 0, -1),
      PixelMove.withoutCut(96, 103, 0, -1),
      PixelMove.withoutCut(96, 102, 0, -1),
      PixelMove.withoutCut(96, 101, 0, -1),
    ], 0)).toEqual({moves: [
      PixelMove.withoutCut(100, 100, 0, 4),
      PixelMove.withoutCut(100, 104, -4, 0),
      PixelMove.withoutCut(96, 104, 0, -4),
    ], length: 9});
  });

  it('optimizeMoves', () => {
    expect(optimizeMoves([
      PixelMove.withoutCut(0, 0, -2, 0),
      PixelMove.withoutCut(-2, 0, -5, 0),
    ], () => {})).toEqual([
      PixelMove.withoutCut(0, 0, -7, 0),
    ]);
  });

  it('simplifies monotone rough stair moves into bounded linear moves', () => {
    const moves = roughStairMoves(30);

    const stair = detectRoughStair(moves, 0, {
      pxPerMm: 100,
      pixelRoughStairToleranceMm: 0.025,
    });

    expect(stair.length).toBe(60);
    expect(stair.moves.length).toBeLessThanOrEqual(3);
    expect(stair.moves.reduce((sum, move) => sum + move.cutArea, 0))
      .toBe(moves.reduce((sum, move) => sum + move.cutArea, 0));
    expect(stair.moves[0].xStart).toBe(moves[0].xStart);
    expect(stair.moves[0].yStart).toBe(moves[0].yStart);
    const end = stair.moves.at(-1)!;
    expect({x: end.xStart + end.xDelta, y: end.yStart + end.yDelta})
      .toEqual({x: moves.at(-1)!.xStart + moves.at(-1)!.xDelta, y: moves.at(-1)!.yStart + moves.at(-1)!.yDelta});

    const optimized = optimizeMoves(moves, () => {}, 'maxY', {
      pxPerMm: 100,
      pixelRoughStairToleranceMm: 0.025,
      smoothingEpsilonPx: 0,
    });
    expect(optimized.length).toBeLessThanOrEqual(3);
  });

  it('does not simplify finish stair moves', () => {
    const moves = roughStairMoves(30).map(move =>
      new PixelMove(move.xStart, move.yStart, move.xDelta, move.yDelta, move.cutArea, [], move.cutBounds, true));

    expect(detectRoughStair(moves, 0, {
      pxPerMm: 100,
      pixelRoughStairToleranceMm: 0.025,
    })).toEqual({moves: [moves[0]], length: 1});
  });

  it('isSmoothingAllowed', () => {
    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 1), PixelMove.withoutCut(1, 1, 1, 0), 0.7)).toBeTruthy();
    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 1), PixelMove.withoutCut(1, 1, 1, 1), 0.7)).toBeTruthy();
    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 1), PixelMove.withoutCut(1, 1, 1, 2), 0.7)).toBeTruthy();
    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 1), PixelMove.withoutCut(1, 1, 1, 3), 0.7)).toBeTruthy();
    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 1), PixelMove.withoutCut(1, 1, 1, 4), 0.7)).toBeTruthy();
    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 1), PixelMove.withoutCut(1, 1, 1, 5), 0.7)).toBeTruthy();
    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 1), PixelMove.withoutCut(1, 1, 1, 6), 0.7)).toBeTruthy();
    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 1), PixelMove.withoutCut(1, 1, 1, 7), 0.7)).toBeFalsy();
    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 1), PixelMove.withoutCut(1, 1, 1, 8), 0.7)).toBeFalsy();

    expect(isSmoothingAllowed(PixelMove.withoutCut(0, 0, 1, 0), PixelMove.withoutCut(1, 0, 2, 2), 0.7)).toBeTruthy();

    expect(isSmoothingAllowed(new PixelMove(0, 1000, 0, -1014, 270150, []), new PixelMove(0, -14, 0, 1014, 0, []), 0.7)).toBeFalsy();
    expect(isSmoothingAllowed(new PixelMove(0, 900, 0, 100, 36, []), new PixelMove(0, 1000, 0, -1014, 270150, []), 0.7)).toBeFalsy();
  });

  it('smoothMoves', () => {
    expect(smoothMoves([
      new PixelMove(0, 900, 0, 100, 36, []),
      new PixelMove(0, 1000, 0, -1014, 270150, []),
      new PixelMove(0, -14, 0, 1014, 0, []),
      new PixelMove(0, 1000, 600, 0, 0, []),
    ], 0.7)).toEqual([
      new PixelMove(0, 900, 0, 100, 36, []),
      new PixelMove(0, 1000, 0, -1014, 270150, []),
      new PixelMove(0, -14, 0, 1014, 0, []),
      new PixelMove(0, 1000, 600, 0, 0, []),
    ]);
  });
});

function roughStairMoves(stepCount: number): PixelMove[] {
  const moves: PixelMove[] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < stepCount; i++) {
    moves.push(PixelMove.withoutCut(x, y, 0, 3));
    y += 3;
    moves.push(new PixelMove(x, y, -4, 0, 8, []));
    x -= 4;
  }
  return moves;
}

function bitmap(width: number, height: number, cellAt: (x: number, y: number) => PlannerCell): PlannerBitmap {
  const result = new PlannerBitmap(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result.set(x, y, cellAt(x, y));
    }
  }
  return result;
}
