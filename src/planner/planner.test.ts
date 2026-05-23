import { describe, expect, it } from 'vitest';
import { Move } from '../common/move';
import { createMovesCanvas, createMovesViewer } from './planner';

describe('createMovesCanvas', () => {
  it('keeps a visible canvas for flat toolpaths', () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.getContext = ((() => ({
      beginPath() {},
      clearRect() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      lineWidth: 0,
      strokeStyle: '',
    }) as unknown as CanvasRenderingContext2D) as unknown) as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = function() {
      return this.height > 0 ? 'data:image/png;base64,AA==' : 'data:,';
    };
    try {
      const canvas = createMovesCanvas([
        new Move(0, -2.98, 10, 0, 1, 1),
      ], 500, 250, 0);

      expect(canvas.height).toBeGreaterThanOrEqual(1);
      expect(canvas.toDataURL('image/png')).not.toBe('data:,');
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    }
  });

  it('creates a range scrubber that redraws arbitrary toolpath progress', () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    let strokeCount = 0;
    HTMLCanvasElement.prototype.getContext = ((() => ({
      beginPath() {},
      clearRect() {},
      moveTo() {},
      lineTo() {},
      stroke() {
        strokeCount++;
      },
      lineWidth: 0,
      strokeStyle: '',
    }) as unknown as CanvasRenderingContext2D) as unknown) as typeof HTMLCanvasElement.prototype.getContext;
    try {
      const viewer = createMovesViewer([
        new Move(0, 0, 1, 0, 1, 1),
        new Move(1, 0, 0, 1, 0, 0),
      ], 500, 250, 0);

      const input = viewer.querySelector<HTMLInputElement>('input[type="range"]')!;
      const output = viewer.querySelector<HTMLElement>('.movesScrubberOutput')!;
      expect(input.max).toBe('2');
      expect(input.value).toBe('2');
      expect(output.textContent).toBe('Move 2 / 2');

      strokeCount = 0;
      input.value = '1';
      input.dispatchEvent(new Event('input', {bubbles: true}));

      expect(output.textContent).toBe('Move 1 / 2');
      expect(strokeCount).toBe(1);
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
  });
});
