import { describe, it, expect } from 'vitest'
import { sameMoves, countPatterns, mergeMoves, detectCodirectional, optimizeTravel, detectTravel, pixelToMm, moveToGCode } from './gcode';
import { Move, Pixel } from './planner';

describe('gcode', () => {
  it('sameMoves', () => {
    expect(sameMoves([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 1),
    ], 0, 1, 1)).toBeTruthy();
    expect(sameMoves([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 2),
    ], 0, 1, 1)).toBeFalsy();
    expect(sameMoves([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 2),
      Move.withoutCut(2, 3, 1, 1),
      Move.withoutCut(3, 4, 1, 2),
    ], 0, 2, 2)).toBeTruthy();
  });

  it('countPatterns', () => {
    expect(countPatterns([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 1),
    ], 0, 1)).toBe(2);
    expect(countPatterns([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 2),
      Move.withoutCut(2, 3, 1, 1),
      Move.withoutCut(3, 4, 1, 2),
    ], 2, 1)).toBe(1);
    expect(countPatterns([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 2),
      Move.withoutCut(2, 3, 1, 1),
      Move.withoutCut(3, 4, 1, 2),
    ], 0, 1)).toBe(1);
    expect(countPatterns([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 2),
      Move.withoutCut(2, 3, 1, 1),
      Move.withoutCut(3, 4, 1, 2),
      Move.withoutCut(4, 6, 1, 2),
    ], 0, 2)).toBe(2);
    const angle4 = [
      new Move(182, 200, -1, 1, 38, []),
      new Move(181, 201, -1, 0, 47, []),
      new Move(180, 201, -1, 0, 47, []),
      new Move(179, 201, -1, 0, 46, []),
      new Move(178, 201, -1, 1, 37, []),
      new Move(177, 202, -1, 0, 46, []),
      new Move(176, 202, -1, 0, 46, []),
      new Move(175, 202, -1, 0, 45, []),
      new Move(174, 202, -1, 1, 36, []),
      new Move(173, 203, -1, 0, 45, []),
      new Move(172, 203, -1, 0, 45, []),
      new Move(171, 203, -1, 0, 44, []),
      new Move(170, 203, -1, 1, 35, []),
      new Move(169, 204, -1, 0, 44, []),
      new Move(168, 204, -1, 0, 44, []),
      new Move(167, 204, -1, 0, 43, []),
      new Move(166, 204, -1, 1, 34, []),
      new Move(165, 205, -1, 0, 43, []),
      new Move(164, 205, -1, 0, 43, []),
      new Move(163, 205, -1, 0, 42, []),
      new Move(162, 205, -1, 1, 33, []),
      new Move(161, 206, -1, 0, 42, []),
      new Move(160, 206, -1, 0, 42, []),
      new Move(159, 206, -1, 0, 41, []),
      new Move(158, 206, -1, 1, 32, []),
      new Move(157, 207, -1, 0, 41, []),
      new Move(156, 207, -1, 0, 41, []),
      new Move(155, 207, -1, 0, 40, []),
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
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 2),
      Move.withoutCut(2, 3, 1, 1),
      Move.withoutCut(3, 4, 1, 2),
      Move.withoutCut(4, 6, 1, 2),
    ], 1, 1)).toEqual(Move.withoutCut(1, 1, 1, 2));

    expect(mergeMoves([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 2),
      Move.withoutCut(2, 3, 1, 1),
      Move.withoutCut(3, 4, 1, 2),
      Move.withoutCut(4, 6, 1, 2),
    ], 1, 2)).toEqual(Move.withoutCut(1, 1, 2, 3));

    expect(mergeMoves([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 2),
      Move.withoutCut(2, 3, 1, 1),
      Move.withoutCut(3, 4, 1, 2),
      Move.withoutCut(4, 6, 1, 2),
    ], 0, 4)).toEqual(Move.withoutCut(0, 0, 4, 6));

    expect(mergeMoves([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 1),
      Move.withoutCut(2, 3, -1, -1),
      Move.withoutCut(3, 4, -1, -1),
    ], 0, 4)).toEqual(Move.withoutCut(0, 0, 0, 0));
  });

  it('detectCodirectional', () => {
    expect(detectCodirectional([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 2),
      Move.withoutCut(2, 3, 1, 1),
      Move.withoutCut(3, 4, 1, 2),
      Move.withoutCut(4, 6, 1, 2),
    ], 1)).toEqual({move: Move.withoutCut(1, 1, 1, 2), length: 1});

    expect(detectCodirectional([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 1),
      Move.withoutCut(2, 2, 1, 1),
      Move.withoutCut(3, 3, 1, 1),
      Move.withoutCut(4, 4, 1, 1),
    ], 1)).toEqual({move: Move.withoutCut(1, 1, 4, 4), length: 4});

    expect(detectCodirectional([
      Move.withoutCut(0, 0, 1, 1),
      Move.withoutCut(1, 1, 1, 1),
      Move.withoutCut(2, 2, -1, 0),
      Move.withoutCut(1, 2, -1, 0),
      Move.withoutCut(0, 2, 1, 0),
    ], 2)).toEqual({move: Move.withoutCut(2, 2, -2, 0), length: 2});
  });

  it('optimizeTravel', () => {
    expect(optimizeTravel([
      Move.withoutCut(100, 100, 1, 0),
      Move.withoutCut(101, 100, 1, 0),
      Move.withoutCut(102, 100, 1, 0),
    ])).toEqual([
      Move.withoutCut(100, 100, 3, 0),
    ]);

    expect(optimizeTravel([
      Move.withoutCut(100, 100, 0, 1),
      Move.withoutCut(100, 101, -1, 1),
      Move.withoutCut(99, 102, -1, 1),
      Move.withoutCut(98, 103, -1, 1),
      Move.withoutCut(97, 104, -1, 0),
    ])).toEqual([
      Move.withoutCut(100, 100, 0, 4),
      Move.withoutCut(100, 104, -4, 0),
    ]);

    expect(optimizeTravel([
      Move.withoutCut(100, 100, 0, 1),
      Move.withoutCut(100, 101, -1, 1),
      Move.withoutCut(99, 102, -1, 1),
      Move.withoutCut(98, 103, -1, 1),
      Move.withoutCut(97, 104, -1, 0),
      Move.withoutCut(96, 104, 0, -1),
      Move.withoutCut(96, 103, 0, -1),
      Move.withoutCut(96, 102, 0, -1),
      Move.withoutCut(96, 101, 0, -1),
    ])).toEqual([
      Move.withoutCut(100, 100, 0, 4),
      Move.withoutCut(100, 104, -4, 0),
      Move.withoutCut(96, 104, 0, -4),
    ]);

    expect(optimizeTravel([
      Move.withoutCut(0, 0, 0, 1),
      Move.withoutCut(0, 1, 0, 1),
      Move.withoutCut(0, 2, 0, -1),
      Move.withoutCut(0, 1, 0, -1),
    ])).toEqual([]);

    expect(optimizeTravel([
      Move.withoutCut(0, 0, 0, 1),
      Move.withoutCut(0, 1, 0, 1),
      Move.withoutCut(0, 2, 1, 0),
      Move.withoutCut(1, 2, -1, 0),
      Move.withoutCut(0, 2, 0, -1),
      Move.withoutCut(0, 1, 0, -1),
    ])).toEqual([]);
  });

  it('detectTravel', () => {
    expect(detectTravel([
      Move.withoutCut(100, 100, 0, 1),
    ], 0)).toEqual({moves: [
      Move.withoutCut(100, 100, 0, 1),
    ], length: 1});

    expect(detectTravel([
      Move.withoutCut(100, 100, 0, 1),
      Move.withoutCut(100, 101, -1, 1),
      Move.withoutCut(99, 102, -1, 1),
      Move.withoutCut(98, 103, -1, 1),
      Move.withoutCut(97, 104, -1, 0),
      Move.withoutCut(96, 104, 0, -1),
      Move.withoutCut(96, 103, 0, -1),
      Move.withoutCut(96, 102, 0, -1),
      Move.withoutCut(96, 101, 0, -1),
    ], 0)).toEqual({moves: [
      Move.withoutCut(100, 100, 0, 4),
      Move.withoutCut(100, 104, -4, 0),
      Move.withoutCut(96, 104, 0, -4),
    ], length: 9});
  });

  it('pixelToMm', () => {
    expect(pixelToMm(0)).toEqual('0');
    expect(pixelToMm(3)).toEqual('-0.03');
    expect(pixelToMm(30)).toEqual('-0.3');
    expect(pixelToMm(300)).toEqual('-3');
    expect(pixelToMm(-300)).toEqual('3');
  });

  it('moveToGCode', () => {
    expect(moveToGCode(Move.withoutCut(100, 100, 0, 4))).toEqual('X-0.04');
    expect(moveToGCode(Move.withoutCut(100, 100, 3, 4))).toEqual('Z-0.03 X-0.04');
    expect(moveToGCode(Move.withoutCut(100, 100, 3, 0))).toEqual('Z-0.03');
    expect(moveToGCode(new Move(100, 100, 3, 0, 150, [new Pixel(101, 100), new Pixel(102, 100)]))).toEqual('Z-0.03 ; cut 0.015 mm2');
  });
});
