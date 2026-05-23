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
