import { describe, it, expect } from 'vitest'
import { Pixel, PixelMove } from './pixel';
import { Move } from './move';

describe('pixel', () => {
  it('isBasic', () => {
    expect(PixelMove.withoutCut(0, 0, 1, 1).isBasic()).toBeTruthy();
    expect(PixelMove.withoutCut(0, 0, 0, 1).isBasic()).toBeTruthy();
    expect(PixelMove.withoutCut(0, 0, 1, 0).isBasic()).toBeTruthy();
    expect(PixelMove.withoutCut(0, 0, 0, 0).isBasic()).toBeTruthy();
    expect(PixelMove.withoutCut(0, 0, 0, -1).isBasic()).toBeTruthy();
    expect(PixelMove.withoutCut(0, 0, -1, 0).isBasic()).toBeTruthy();
    expect(PixelMove.withoutCut(0, 0, -1, -1).isBasic()).toBeTruthy();
    expect(PixelMove.withoutCut(0, 0, 2, 0).isBasic()).toBeFalsy();
    expect(PixelMove.withoutCut(0, 0, 0, 2).isBasic()).toBeFalsy();
    expect(PixelMove.withoutCut(0, 0, -2, -2).isBasic()).toBeFalsy();
  });

  it('toMove', () => {
    expect(PixelMove.withoutCut(10, 20, 1, -1).toMove(100)).toEqual(new Move(-0.1, -0.2, -0.01, 0.01, 0, 0));
  });

  it('isEmpty', () => {
    expect(PixelMove.withoutCut(10, 20, 0, 0).isEmpty()).toBeTruthy();
    expect(PixelMove.withoutCut(10, 20, 1, 0).isEmpty()).toBeFalsy();
    expect(PixelMove.withoutCut(10, 20, 0, 1).isEmpty()).toBeFalsy();
  });

  it('getAngleDegrees', () => {
    expect(isNaN(PixelMove.withoutCut(10, 20, 0, 0).getAngleDegrees())).toBeTruthy();
    expect(PixelMove.withoutCut(10, 20, 0, 1).getAngleDegrees()).toEqual(90);
    expect(PixelMove.withoutCut(10, 20, 1, 1).getAngleDegrees()).toEqual(45);
    expect(PixelMove.withoutCut(10, 20, 1, 0).getAngleDegrees()).toEqual(0);
    expect(PixelMove.withoutCut(10, 20, 1, -1).getAngleDegrees()).toEqual(315);
    expect(PixelMove.withoutCut(10, 20, 0, -1).getAngleDegrees()).toEqual(270);
    expect(PixelMove.withoutCut(10, 20, -1, -1).getAngleDegrees()).toEqual(225);
    expect(PixelMove.withoutCut(10, 20, -1, 0).getAngleDegrees()).toEqual(180);
    expect(PixelMove.withoutCut(10, 20, -1, 1).getAngleDegrees()).toEqual(135);
  });

  it('getAngleToDegrees', () => {
    expect(PixelMove.withoutCut(10, 20, 0, 1).getAngleToDegrees(PixelMove.withoutCut(10, 21, 0, 1))).toEqual(0);
    expect(PixelMove.withoutCut(10, 20, 1, 1).getAngleToDegrees(PixelMove.withoutCut(10, 21, 1, 1))).toEqual(0);
    expect(PixelMove.withoutCut(10, 20, 1, 0).getAngleToDegrees(PixelMove.withoutCut(10, 21, 1, 0))).toEqual(0);
    expect(PixelMove.withoutCut(10, 20, 0, -1).getAngleToDegrees(PixelMove.withoutCut(10, 21, 0, -1))).toEqual(0);
    expect(PixelMove.withoutCut(10, 20, -1, -1).getAngleToDegrees(PixelMove.withoutCut(10, 21, -1, -1))).toEqual(0);
    expect(PixelMove.withoutCut(10, 20, -1, 0).getAngleToDegrees(PixelMove.withoutCut(10, 21, -1, 0))).toEqual(0);

    expect(PixelMove.withoutCut(10, 20, 0, 1).getAngleToDegrees(PixelMove.withoutCut(10, 21, 1, 1))).toEqual(45);
    expect(PixelMove.withoutCut(10, 20, 1, 1).getAngleToDegrees(PixelMove.withoutCut(10, 21, 1, 0))).toEqual(45);
    expect(PixelMove.withoutCut(10, 20, 1, 0).getAngleToDegrees(PixelMove.withoutCut(10, 21, 0, -1))).toEqual(90);
    expect(PixelMove.withoutCut(10, 20, 0, -1).getAngleToDegrees(PixelMove.withoutCut(10, 21, -1, -1))).toEqual(45);
    expect(PixelMove.withoutCut(10, 20, -1, -1).getAngleToDegrees(PixelMove.withoutCut(10, 21, -1, 0))).toEqual(45);
    expect(PixelMove.withoutCut(10, 20, -1, 0).getAngleToDegrees(PixelMove.withoutCut(10, 21, 0, 1))).toEqual(90);

    expect(PixelMove.withoutCut(10, 20, 0, 1).getAngleToDegrees(PixelMove.withoutCut(10, 21, 0, -1))).toEqual(180);

    // 0.003 degrees difference
    expect(PixelMove.withoutCut(10, 20, 4, 222).getAngleToDegrees(PixelMove.withoutCut(10, 21, 3, 167)).toFixed(5)).toEqual('0.00309');
    // 0.044 degrees difference
    expect(PixelMove.withoutCut(10, 20, 4, 222).getAngleToDegrees(PixelMove.withoutCut(10, 21, 3, 174)).toFixed(5)).toEqual('0.04448');
    // 0.0501 degrees difference
    expect(PixelMove.withoutCut(10, 20, 4, 222).getAngleToDegrees(PixelMove.withoutCut(10, 21, 3, 175)).toFixed(5)).toEqual('0.05013');
  });

  it('merge', () => {
    expect(PixelMove.withoutCut(10, 20, 1, -1).merge(PixelMove.withoutCut(11, 19, 1, -1))).toEqual(PixelMove.withoutCut(10, 20, 2, -2));
  });

  it('getCut', () => {
    expect(new PixelMove(10, 20, 1, -1, 5, [new Pixel(11, 19), new Pixel(12, 19), new Pixel(13, 19), new Pixel(14, 19), new Pixel(14, 18)]).getCut()).toEqual({width: 4, height: 2});
  });
});
