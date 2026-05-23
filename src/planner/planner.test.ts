import { describe, expect, it } from 'vitest';
import { Move } from '../common/move';
import { createMovesCanvas } from './planner';

describe('createMovesCanvas', () => {
  it('keeps a visible canvas for flat toolpaths', () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.getContext = ((() => ({
      beginPath() {},
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
});
