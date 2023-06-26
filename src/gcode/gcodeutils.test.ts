import { describe, it, expect } from 'vitest'
import { moveToGCode } from './gcodeutils';
import { Move } from '../common/move';

describe('gcodeutils', () => {
  it('moveToGCode', () => {
    expect(moveToGCode(new Move(1, 1, 0, 0.04, 0))).toEqual('X0.04');
    expect(moveToGCode(new Move(1, 1, 0.03, 0.04, 0))).toEqual('Z0.03 X0.04');
    expect(moveToGCode(new Move(1, 1, 0.03, 0, 0))).toEqual('Z0.03');
    expect(moveToGCode(new Move(1, 1, 0.03, 0, 0.015))).toEqual('Z0.03 ; cut 0.015 mm2');
  });
});
