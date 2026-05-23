import { describe, it, expect } from 'vitest'
import { createGCode, moveToGCode } from './gcodeutils';
import { Move } from '../common/move';
import { LatheCode } from '../common/lathecode';

describe('gcodeutils', () => {
  it('documents the expected axes directions in generated GCode', () => {
    expect(createGCode(
      new LatheCode('STOCK D10\nTOOL RECT R0.2 L2\nL1 R3'),
      [new Move(0, 0, 1, 1, 0, 0)],
    )).toContain('; Working area 1.00 by 1.00 mm\n; Axes expected: Z+ points left, X+ points up');

    expect(createGCode(
      new LatheCode('STOCK D10\nTOOL RECT R0.2 L2\nAXES RIGHT DOWN\nL1 R3'),
      [new Move(0, 0, 1, 1, 0, 0)],
    )).toContain('; Working area 1.00 by 1.00 mm\n; Axes expected: Z+ points right, X+ points down');
  });

  it('moveToGCode', () => {
    let latheCode = new LatheCode('L1\nL2 R3\nL3 D0');
    expect(moveToGCode(latheCode, new Move(1, 1, 0, 0.04, 0, 0))).toEqual('X0.04');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0.04, 0, 0))).toEqual('Z0.03 X0.04');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0, 0, 0))).toEqual('Z0.03');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0, 0.015, 1))).toEqual('Z0.03 ; cut 0.015 mm2');

    latheCode = new LatheCode('AXES RIGHT DOWN\nL1\nL2 R3\nL3 D0');
    expect(moveToGCode(latheCode, new Move(1, 1, 0, 0.04, 0, 0))).toEqual('X-0.04');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0.04, 0, 0))).toEqual('Z-0.03 X-0.04');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0, 0, 0))).toEqual('Z-0.03');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0, 0.015, 1))).toEqual('Z-0.03 ; cut 0.015 mm2');
  });
});
