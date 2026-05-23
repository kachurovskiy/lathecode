import { describe, expect, it } from 'vitest';
import { Tool } from './lathecode';
import { geometryArea, geometryBounds, rectangleGeometry } from './polygon';
import {
  createLinearSweptToolGeometry,
  createSweptToolGeometry,
  createToolFootprintGeometry,
  createToolKeepoutGeometry,
  getToolRadialBoundaryOvertravel,
} from './toolgeometry';

describe('toolgeometry', () => {
  it('anchors rectangular outside tool footprints at the cutting corner', () => {
    const footprint = createToolFootprintGeometry(new Tool('RECT', 2, 3, 0), 1);

    expect(geometryBounds(footprint)).toEqual({minX: -2, minY: -3, maxX: 0, maxY: 0});
    expect(geometryArea(footprint)).toBeCloseTo(6);
  });

  it('mirrors rectangular inside tool footprints radially', () => {
    const footprint = createToolFootprintGeometry(new Tool('RECT', 2, 3, 0), -1);

    expect(geometryBounds(footprint)).toEqual({minX: -2, minY: 0, maxX: 0, maxY: 3});
    expect(geometryArea(footprint)).toBeCloseTo(6);
  });

  it('models round tools as circular footprints', () => {
    const footprint = createToolFootprintGeometry(new Tool('ROUND', 2, 2, 1), 1);
    const bounds = geometryBounds(footprint);

    expect(bounds!.minX).toBeCloseTo(-2);
    expect(bounds!.maxX).toBeCloseTo(0);
    expect(bounds!.minY).toBeCloseTo(-2);
    expect(bounds!.maxY).toBeCloseTo(0);
    expect(geometryArea(footprint)).toBeCloseTo(Math.PI, 1);
  });

  it('normalizes angled tool footprints for outside and inside cutting', () => {
    const outside = createToolFootprintGeometry(new Tool('ANG', 7.8, 7.8, 0.4, 32.5, 55), 1);
    const inside = createToolFootprintGeometry(new Tool('ANG', 7.8, 7.8, 0.4, 32.5, 55), -1);
    const outsideBounds = geometryBounds(outside)!;
    const insideBounds = geometryBounds(inside)!;

    expect(outsideBounds.maxX).toBeCloseTo(0);
    expect(outsideBounds.maxY).toBeCloseTo(0);
    expect(outsideBounds.minX).toBeLessThan(-1);
    expect(outsideBounds.minY).toBeLessThan(-1);
    expect(insideBounds.maxX).toBeCloseTo(0);
    expect(insideBounds.minY).toBeCloseTo(0);
    expect(insideBounds.minX).toBeLessThan(-1);
    expect(insideBounds.maxY).toBeGreaterThan(1);
  });

  it('creates a swept footprint envelope for plunges', () => {
    const sweep = createSweptToolGeometry(new Tool('RECT', 2, 3, 0), 1, 10, -5, -3);

    expect(geometryBounds(sweep)).toEqual({minX: 8, minY: -8, maxX: 10, maxY: -3});
    expect(geometryArea(sweep)).toBeCloseTo(10);
  });

  it('creates a swept footprint envelope for axial moves', () => {
    const sweep = createLinearSweptToolGeometry(new Tool('RECT', 2, 3, 0), 1, 10, -5, 13, -5);

    expect(geometryBounds(sweep)).toEqual({minX: 8, minY: -8, maxX: 13, maxY: -5});
    expect(geometryArea(sweep)).toBeCloseTo(15);
  });

  it('builds reflected-tool keepouts for the tool control point', () => {
    const keepout = createToolKeepoutGeometry(new Tool('RECT', 1, 0.5, 0), 1, rectangleGeometry(0, 0, 2, 1));

    expect(geometryBounds(keepout)).toEqual({minX: 0, minY: 0, maxX: 3, maxY: 1.5});
    expect(geometryArea(keepout)).toBeCloseTo(4.5);
  });

  it('sweeps rounded tool corners instead of the square footprint bounds', () => {
    const sweep = createLinearSweptToolGeometry(new Tool('RECT', 2, 3, 0.5), 1, 10, -5, 13, -5);

    expect(geometryBounds(sweep)).toEqual({minX: 8, minY: -8, maxX: 13, maxY: -5});
    expect(geometryArea(sweep)).toBeLessThan(15);
    expect(geometryArea(sweep)).toBeCloseTo(14.78, 1);
  });

  it('computes radial cleanup overtravel from the whole rounded footprint', () => {
    expect(getToolRadialBoundaryOvertravel(new Tool('RECT', 3, 3, 0), 1)).toBeCloseTo(0);
    expect(getToolRadialBoundaryOvertravel(new Tool('RECT', 3, 3, 0.4), 1)).toBeCloseTo(0.4, 4);
    expect(getToolRadialBoundaryOvertravel(new Tool('ROUND', 0.8, 0.8, 0.4), 1)).toBeCloseTo(0.4, 4);
  });
});
