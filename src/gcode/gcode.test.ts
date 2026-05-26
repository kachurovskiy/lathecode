import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LatheCode } from '../common/lathecode';
import { Move } from '../common/move';
import { GCode, GCodeMoveSelectionEvent } from './gcode';

describe('GCode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('shows Copy and hides NanoEls H4 controls by default', () => {
    const container = createGCodeContainer();

    new GCode(container);

    expect(container.querySelector<HTMLButtonElement>('.copyGcodeButton')!.hidden).toBe(false);
    const h5Link = container.querySelector<HTMLAnchorElement>('.nanoElsH5Link')!;
    expect(h5Link.textContent).toBe('Run on NanoEls H5');
    expect(h5Link.href).toBe('https://github.com/kachurovskiy/nanoels/tree/main/h5');
    expect(h5Link.target).toBe('_blank');
    expect(container.querySelector<HTMLElement>('.h4Controls')!.hidden).toBe(true);
  });

  it('shows NanoEls H4 controls when enabled in settings', () => {
    localStorage.setItem('showNanoElsH4Controls', 'true');
    const container = createGCodeContainer();
    const gcode = new GCode(container);

    expect(container.querySelector<HTMLElement>('.h4Controls')!.hidden).toBe(false);

    localStorage.setItem('showNanoElsH4Controls', 'false');
    gcode.updateSettings();

    expect(container.querySelector<HTMLElement>('.h4Controls')!.hidden).toBe(true);
  });

  it('copies generated GCode to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {writeText},
      configurable: true,
    });
    const container = createGCodeContainer();
    new GCode(container);
    container.querySelector<HTMLTextAreaElement>('textarea')!.value = 'G1 X2';

    container.querySelector<HTMLButtonElement>('.copyGcodeButton')!.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('G1 X2');
  });

  it('emits the completed move count for the selected generated GCode line', () => {
    const container = createGCodeContainer();
    const gcode = new GCode(container);
    const moveCounts: number[] = [];
    gcode.addEventListener(GCodeMoveSelectionEvent.type, event => {
      moveCounts.push((event as GCodeMoveSelectionEvent).moveCount);
    });

    gcode.show(new LatheCode(`STOCK D4
TOOL RECT R0 L1 H1
DEPTH CUT0.5 FINISH0.1
L2 R1`), [
      new Move(0, -2, 1, 0, 1, 1),
      new Move(1, -2, 0, 1, 0, 0),
    ]);

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
    const lines = textarea.value.split('\n');
    const relativeLineIndex = lines.findIndex(line => line.startsWith('G91'));
    const firstMoveLineIndex = lines.findIndex((line, index) => index > relativeLineIndex && line.startsWith('Z1'));
    const secondMoveLineIndex = lines.findIndex((line, index) => index > firstMoveLineIndex && line.startsWith('X1'));
    expect(relativeLineIndex).toBeGreaterThanOrEqual(0);
    expect(firstMoveLineIndex).toBeGreaterThan(relativeLineIndex);
    expect(secondMoveLineIndex).toBeGreaterThan(firstMoveLineIndex);

    setCursorToLine(textarea, 0);
    textarea.dispatchEvent(new Event('click', {bubbles: true}));
    setCursorToLine(textarea, firstMoveLineIndex);
    textarea.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true}));
    setCursorToLine(textarea, secondMoveLineIndex);
    textarea.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true}));

    expect(moveCounts).toEqual([0, 1, 2]);
  });
});

function setCursorToLine(textarea: HTMLTextAreaElement, lineIndex: number) {
  const offset = textarea.value
    .split('\n')
    .slice(0, lineIndex)
    .reduce((sum, line) => sum + line.length + 1, 0);
  textarea.setSelectionRange(offset, offset);
}

function createGCodeContainer(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <textarea id="gcodeTextarea"></textarea>
    <div class="senderError" style="display: none;"></div>
    <progress max="1" style="display: none;"></progress>
    <div class="gcodeActions">
      <button class="copyGcodeButton">Copy</button>
      <a class="whatLink nanoElsH5Link" href="https://github.com/kachurovskiy/nanoels/tree/main/h5" target="_blank" rel="noopener noreferrer">Run on NanoEls H5</a>
      <span class="h4Controls" hidden>
        <button class="sendButton">Run on H4</button>
        <button class="saveGcodeButton">Save to H4</button>
        <button class="stopButton" style="display: none;">Stop</button>
        <a class="whatLink" href="https://github.com/kachurovskiy/nanoels/tree/main/h4" target="_blank" rel="noopener noreferrer">What is NanoEls H4?</a>
      </span>
    </div>
  `;
  document.body.appendChild(container);
  return container;
}
