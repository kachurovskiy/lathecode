import * as Colors from "../common/colors";

export enum PlannerCell {
  Empty = 0,
  Stock = 1,
  Finish = 2,
  Part = 3,
  Removed = 4,
  Tool = 5,
  ProtectedEmpty = 6,
}

const CELL_RGB: Record<number, number> = {
  [PlannerCell.Empty]: 0x000000,
  [PlannerCell.Stock]: Colors.COLOR_STOCK.rgbNumber(),
  [PlannerCell.Finish]: Colors.COLOR_FINISH.rgbNumber(),
  [PlannerCell.Part]: Colors.COLOR_PART.rgbNumber(),
  [PlannerCell.Removed]: Colors.COLOR_REMOVED.rgbNumber(),
  [PlannerCell.Tool]: Colors.COLOR_TOOL.rgbNumber(),
  [PlannerCell.ProtectedEmpty]: 0x000000,
};

const CELL_PREVIEW_PRIORITY: Record<number, number> = {
  [PlannerCell.Empty]: 0,
  [PlannerCell.Removed]: 1,
  [PlannerCell.Part]: 2,
  [PlannerCell.Tool]: 2,
  [PlannerCell.Stock]: 3,
  [PlannerCell.Finish]: 4,
  [PlannerCell.ProtectedEmpty]: 0,
};

export type PlannerBitmapImageData = {
  width: number,
  height: number,
  data: Uint8ClampedArray,
  scale: number,
};

export class PlannerBitmap {
  readonly data: Uint8Array;

  constructor(readonly width: number, readonly height: number, fill = PlannerCell.Empty) {
    if (!Number.isInteger(width) || width < 1) throw new Error(`Invalid bitmap width ${width}`);
    if (!Number.isInteger(height) || height < 1) throw new Error(`Invalid bitmap height ${height}`);
    this.data = new Uint8Array(width * height);
    if (fill !== PlannerCell.Empty) this.data.fill(fill);
  }

  get(x: number, y: number): PlannerCell {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return PlannerCell.Empty;
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return PlannerCell.Empty;
    return this.data[y * this.width + x] as PlannerCell;
  }

  set(x: number, y: number, value: PlannerCell) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return;
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.data[y * this.width + x] = value;
  }

  cropToNonEmpty(): PlannerBitmap {
    let minX = this.width;
    let minY = this.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) !== PlannerCell.Empty) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX < minX || maxY < minY) return new PlannerBitmap(1, 1);

    const result = new PlannerBitmap(maxX - minX + 1, maxY - minY + 1);
    for (let y = 0; y < result.height; y++) {
      for (let x = 0; x < result.width; x++) {
        result.set(x, y, this.get(minX + x, minY + y));
      }
    }
    return result;
  }

  toImageDataArray(transparentEmpty = false): Uint8ClampedArray {
    return this.toImageData(transparentEmpty).data;
  }

  toPreviewImageData(maxPixels: number, maxDimension: number, transparentEmpty = false): PlannerBitmapImageData {
    return this.toImageData(transparentEmpty, getPlannerBitmapPreviewScale(this.width, this.height, maxPixels, maxDimension));
  }

  toImageData(transparentEmpty = false, scale = 1): PlannerBitmapImageData {
    scale = Math.max(1, Math.floor(scale));
    const width = Math.ceil(this.width / scale);
    const height = Math.ceil(this.height / scale);
    const result = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = scale === 1
          ? this.get(x, y)
          : this.getPreviewCell(x * scale, y * scale, Math.min(this.width, (x + 1) * scale), Math.min(this.height, (y + 1) * scale));
        writeImageDataPixel(result, width, x, y, cell, transparentEmpty);
      }
    }
    return {width, height, data: result, scale};
  }

  private getPreviewCell(startX: number, startY: number, endX: number, endY: number): PlannerCell {
    let bestCell = PlannerCell.Empty;
    let bestPriority = -1;
    // Bias previews toward uncut cells so small leftover islands stay visible after downsampling.
    for (let y = startY; y < endY; y++) {
      const rowOffset = y * this.width;
      for (let x = startX; x < endX; x++) {
        const cell = this.data[rowOffset + x] as PlannerCell;
        const priority = CELL_PREVIEW_PRIORITY[cell] ?? 0;
        if (priority > bestPriority) {
          bestCell = cell;
          bestPriority = priority;
          if (priority === CELL_PREVIEW_PRIORITY[PlannerCell.Finish]) return bestCell;
        }
      }
    }
    return bestCell;
  }
}

export function getPlannerBitmapPreviewScale(width: number, height: number, maxPixels: number, maxDimension: number): number {
  let scale = 1;
  if (Number.isFinite(maxDimension) && maxDimension > 0) {
    scale = Math.max(scale, Math.ceil(width / maxDimension), Math.ceil(height / maxDimension));
  }
  if (Number.isFinite(maxPixels) && maxPixels > 0) {
    scale = Math.max(scale, Math.ceil(Math.sqrt(width * height / maxPixels)));
    while (Math.ceil(width / scale) * Math.ceil(height / scale) > maxPixels) scale++;
  }
  return scale;
}

function writeImageDataPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  cell: PlannerCell,
  transparentEmpty: boolean,
) {
  const rgb = CELL_RGB[cell] ?? 0;
  const i = (y * width + x) * 4;
  data[i] = (rgb >> 16) & 0xFF;
  data[i + 1] = (rgb >> 8) & 0xFF;
  data[i + 2] = rgb & 0xFF;
  data[i + 3] = transparentEmpty && cell === PlannerCell.Empty ? 0 : 255;
}
