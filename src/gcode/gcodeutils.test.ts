import { describe, it, expect } from 'vitest'
import { moveToGCode } from './gcodeutils';
import { Move } from '../common/move';
import { LatheCode } from '../common/lathecode';

describe('gcodeutils', () => {
  it('moveToGCode', () => {
    let latheCode = new LatheCode('L1\nL2 R3\nL3 D0');
    expect(moveToGCode(latheCode, new Move(1, 1, 0, 0.04, 0))).toEqual('X0.04');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0.04, 0))).toEqual('Z0.03 X0.04');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0, 0))).toEqual('Z0.03');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0, 0.015))).toEqual('Z0.03 ; cut 0.015 mm2');

    latheCode = new LatheCode('AXES RIGHT DOWN\nL1\nL2 R3\nL3 D0');
    expect(moveToGCode(latheCode, new Move(1, 1, 0, 0.04, 0))).toEqual('X-0.04');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0.04, 0))).toEqual('Z-0.03 X-0.04');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0, 0))).toEqual('Z-0.03');
    expect(moveToGCode(latheCode, new Move(1, 1, 0.03, 0, 0.015))).toEqual('Z-0.03 ; cut 0.015 mm2');
  });
});
