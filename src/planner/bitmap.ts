import * as Colors from "../common/colors";

export enum PlannerCell {
  Empty = 0,
  Stock = 1,
  Finish = 2,
  Part = 3,
  Removed = 4,
  Tool = 5,
}

const CELL_RGB: Record<number, number> = {
  [PlannerCell.Empty]: 0x000000,
  [PlannerCell.Stock]: Colors.COLOR_STOCK.rgbNumber(),
  [PlannerCell.Finish]: Colors.COLOR_FINISH.rgbNumber(),
  [PlannerCell.Part]: Colors.COLOR_PART.rgbNumber(),
  [PlannerCell.Removed]: Colors.COLOR_REMOVED.rgbNumber(),
  [PlannerCell.Tool]: Colors.COLOR_TOOL.rgbNumber(),
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
    const result = new Uint8ClampedArray(this.width * this.height * 4);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.get(x, y);
        const rgb = CELL_RGB[cell] ?? 0;
        const i = (y * this.width + x) * 4;
        result[i] = (rgb >> 16) & 0xFF;
        result[i + 1] = (rgb >> 8) & 0xFF;
        result[i + 2] = rgb & 0xFF;
        result[i + 3] = transparentEmpty && cell === PlannerCell.Empty ? 0 : 255;
      }
    }
    return result;
  }
}
