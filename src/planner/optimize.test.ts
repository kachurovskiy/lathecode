import { describe, it, expect } from 'vitest'
import { sameMoves, countPatterns, mergeMoves, detectCodirectional, optimizeTravel, detectTravel, optimizeMoves, isSmoothingAllowed, smoothMoves } from './optimize';
import { PixelMove } from './pixel';

describe('plannerworker', () => {
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
