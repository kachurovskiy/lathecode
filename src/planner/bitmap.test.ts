import { describe, expect, it } from 'vitest';
import { getPlannerBitmapPreviewScale, PlannerBitmap, type PlannerBitmapImageData, PlannerCell } from './bitmap';

describe('PlannerBitmap preview images', () => {
  it('downsamples to the requested pixel budget', () => {
    expect(getPlannerBitmapPreviewScale(2001, 1000, 2000000, 16384)).toBe(2);
  });

  it('keeps small uncut areas visible when downsampling', () => {
    const bitmap = new PlannerBitmap(4, 4, PlannerCell.Removed);
    bitmap.set(1, 1, PlannerCell.Stock);
    bitmap.set(3, 3, PlannerCell.Finish);

    const image = bitmap.toPreviewImageData(4, 16384);

    expect(image.width).toBe(2);
    expect(image.height).toBe(2);
    expect(image.scale).toBe(2);
    expect(getRgba(image, 0, 0)).toEqual([0, 255, 0, 255]);
    expect(getRgba(image, 1, 1)).toEqual([255, 255, 0, 255]);
  });
});

function getRgba(image: PlannerBitmapImageData, x: number, y: number): number[] {
  const offset = (y * image.width + x) * 4;
  return Array.from(image.data.slice(offset, offset + 4));
}
