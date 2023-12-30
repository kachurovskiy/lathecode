import { describe, it, expect } from 'vitest'
import { polarToCartesian } from './painter';

describe('Painter', () => {
  it('polarToCartesian', () => {
    expect(Math.round(polarToCartesian(10, 0).x)).toEqual(10);
    expect(Math.round(polarToCartesian(10, 0).y)).toEqual(-0);

    expect(Math.round(polarToCartesian(10, 90).x)).toEqual(0);
    expect(Math.round(polarToCartesian(10, 90).y)).toEqual(-10);

    expect(Math.round(polarToCartesian(10, 180).x)).toEqual(-10);
    expect(Math.round(polarToCartesian(10, 180).y)).toEqual(-0);
  });
});
