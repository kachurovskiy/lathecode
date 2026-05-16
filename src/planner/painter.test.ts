import { afterEach, describe, it, expect, vi } from 'vitest'
import * as Colors from '../common/colors';
import { LatheCode } from '../common/lathecode';
import { Painter, polarToCartesian } from './painter';

class FakeCanvasRenderingContext2D {
  fillStyle = '';
  fills: string[] = [];

  beginPath() {}
  closePath() {}
  ellipse() {}
  fill() {
    this.fills.push(this.fillStyle);
  }
  lineTo() {}
  moveTo() {}
}

class FakeOffscreenCanvas {
  readonly context = new FakeCanvasRenderingContext2D();

  constructor(readonly width: number, readonly height: number) {}

  getContext(type: string) {
    return type === '2d' ? this.context : null;
  }
}

describe('Painter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('polarToCartesian', () => {
    expect(Math.round(polarToCartesian(10, 0).x)).toEqual(10);
    expect(Math.round(polarToCartesian(10, 0).y)).toEqual(-0);

    expect(Math.round(polarToCartesian(10, 90).x)).toEqual(0);
    expect(Math.round(polarToCartesian(10, 90).y)).toEqual(-10);

    expect(Math.round(polarToCartesian(10, 180).x)).toEqual(-10);
    expect(Math.round(polarToCartesian(10, 180).y)).toEqual(-0);
  });

  it('creates a canvas for an inside-only profile', () => {
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

    const latheCode = new LatheCode('STOCK D10\nINSIDE\nL2 R2\nL3 R3');
    const canvas = new Painter(latheCode, 10).createCanvas() as unknown as FakeOffscreenCanvas;

    expect(canvas.width).toBe(50);
    expect(canvas.height).toBe(50);
    expect(canvas.context.fills).toEqual([
      Colors.COLOR_STOCK.hex(),
      Colors.COLOR_FINISH.hex(),
      Colors.COLOR_PART.hex(),
    ]);
  });
});
