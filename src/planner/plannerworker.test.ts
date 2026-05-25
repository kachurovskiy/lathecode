import { describe, expect, it } from 'vitest';
import { LatheCode } from '../common/lathecode';
import { Move } from '../common/move';
import { PixelMove } from '../common/pixel';
import { AppSettings } from '../common/settings';
import { PlannerWorker } from './plannerworker';

describe('PlannerWorker', () => {
  it('uses the pixel planner by default', () => {
    const messages = planMessages('STOCK D4\nTOOL RECT R0 L1 H1\nDEPTH CUT0.5 FINISH0.1\nMODE TURN\nL2 R1', 10);
    const moves = messages.find(message => message.moves)?.moves;

    expect(moves?.length).toBeGreaterThan(0);
    expect(moves?.[0]).toBeInstanceOf(PixelMove);
    expect(messages.some(message => message.canvas || message.tool)).toBeTruthy();
    expect(messages.some(message => message.progressMessage?.startsWith('Vector '))).toBeFalsy();
  });

  it('uses the vector planner only when selected', () => {
    const messages = planMessages(
      'STOCK D4\nTOOL RECT R0 L1 H1\nDEPTH CUT0.5 FINISH0.1\nMODE TURN\nL2 R1',
      {pxPerMm: 10, plannerEngine: 'vector'},
    );
    const moves = messages.find(message => message.moves)?.moves;

    expect(moves?.length).toBeGreaterThan(0);
    expect(moves?.[0]).toBeInstanceOf(Move);
    expect(messages.some(message => message.canvas || message.tool)).toBeFalsy();
    expect(messages.some(message => message.progressMessage?.startsWith('Vector turn roughing pass '))).toBeTruthy();
  });

  it('finishes the chuck-side region after the last face-mode cutoff', () => {
    const messages = planMessages(`STOCK D22
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.45 FINISH0.1
FEED MOVE220 PASS50 PART12
L2 D12
L4 D14
L1.5
L2 D10
L5 D16
L1.5
L2 D12
L7 D18
L3 D20`, 10);

    const finishMessages = messages.filter(message => message.progressMessage === 'Finishing previously cut area');

    expect(finishMessages.length).toBe(3);
  });

  it('merges duplicate cutoff passes in turn mode', () => {
    const messages = planMessages(`STOCK D4
TOOL RECT R0 L1 H1
DEPTH CUT0.5 FINISH0.1
MODE TURN
L2 D2
L1
L1 D2`, 10);

    const completedPasses = messages.filter(message => message.progressMessage?.startsWith('Completed pass '));

    expect(completedPasses.map(message => message.progressMessage)).toEqual([
      'Completed pass 0',
      'Completed pass 1',
    ]);
  });

  it('preserves finishing when merging duplicate face passes', () => {
    const messages = planMessages(`STOCK D4
TOOL RECT R0 L1 H1
DEPTH CUT0.5 FINISH0.1
L1 D2
L1`, 10);

    const finishMessages = messages.filter(message => message.progressMessage === 'Finishing previously cut area');

    expect(finishMessages.length).toBe(2);
  });

  it('keeps inch depth-of-cut passes on the integer pixel grid', () => {
    const moves = planMoves(`UNITS IN
STOCK D1
TOOL RECT R0 L0.1 H0.1
DEPTH CUT0.025 FINISH0.004
MODE TURN
L1 D0.5`, 10);

    expect(moves.every(move => move instanceof PixelMove)).toBe(true);
    for (const move of moves as PixelMove[]) {
      expect(Number.isInteger(move.xStart)).toBe(true);
      expect(Number.isInteger(move.yStart)).toBe(true);
      expect(Number.isInteger(move.xDelta)).toBe(true);
      expect(Number.isInteger(move.yDelta)).toBe(true);
    }
  });

  it('does not change vector-generated moves when pxPerMm changes', () => {
    const text = 'STOCK D6\nTOOL RECT R0 L1 H1\nDEPTH CUT0.75 FINISH0.15\nL3 R2\nL2 R1.5';

    expect(planMoves(text, {pxPerMm: 10, plannerEngine: 'vector'}))
      .toEqual(planMoves(text, {pxPerMm: 1000, plannerEngine: 'vector'}));
  });
});

type PlannerMessage = {
  progressMessage?: string,
  moves?: (Move | PixelMove)[],
  canvas?: unknown,
  tool?: unknown,
};

function planMoves(text: string, settings: number | Partial<AppSettings>): (Move | PixelMove)[] {
  return planMessages(text, settings).find(message => message.moves)?.moves ?? [];
}

function planMessages(text: string, settings: number | Partial<AppSettings>): PlannerMessage[] {
  const messages: PlannerMessage[] = [];
  new PlannerWorker(new LatheCode(text), settings, {
    postMessage: message => messages.push(message),
  });
  return messages;
}
