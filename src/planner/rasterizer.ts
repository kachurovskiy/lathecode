import { LatheCode, Point, Segment } from "../common/lathecode";
import { approximateSegments } from "../common/lathegeometry";
import { PlannerBitmap, PlannerCell } from "./bitmap";

type RasterPoint = {
  x: number,
  y: number,
};

export class Rasterizer {
  constructor(private latheCode: LatheCode, private pxPerMm: number) {}

  createPartBitmap(): PlannerBitmap {
    const stock = this.latheCode.getStock();
    if (!stock) throw new Error('Error: specify stock');
    if (stock.diameter == 0) throw new Error('Error: stock diameter is 0');
    if (stock.length == 0) throw new Error('Error: stock length is 0');
    const profiles = this.latheCode.getProfiles();
    if (profiles.length > 1) throw new Error('Error: inside and outside not supported yet');
    const profile = profiles[0];
    if (!profile) throw new Error('Error: no segments');

    const bitmap = new PlannerBitmap(
      this.toDimensionPixels(stock.length),
      this.toDimensionPixels(stock.diameter / 2));
    const finishDepth = this.latheCode.getDepth().finishMm * (profile.side === 'inside' ? -1 : 1);
    this.fillSegments(bitmap, stock.getSegments(), PlannerCell.Stock);
    if (finishDepth !== 0) this.fillSegments(bitmap, profile.segments.map(s => s.offsetBy(finishDepth, 0)), PlannerCell.Finish);
    this.fillSegments(bitmap, profile.segments, PlannerCell.Part);
    return bitmap;
  }

  createToolBitmap(): PlannerBitmap {
    const tool = this.latheCode.getTool();
    if (tool.type === 'RECT' || tool.type === 'ROUND') {
      const widthPixels = this.toDimensionPixels(tool.widthMm);
      const heightPixels = this.toDimensionPixels(tool.heightMm);
      const radiusPixels = tool.cornerRadiusMm * this.pxPerMm;
      const result = new PlannerBitmap(widthPixels, heightPixels);
      this.fillByPredicate(result, PlannerCell.Tool, (x, y) => isInsideRoundedRect(x, y, widthPixels, heightPixels, radiusPixels));
      return result;
    }
    if (tool.type === 'ANG') {
      const edgeLengthPixels = tool.widthMm * this.pxPerMm;
      const sizePixels = this.toDimensionPixels((tool.cornerRadiusMm + tool.widthMm) * 2);
      const radiusPixels = tool.cornerRadiusMm * this.pxPerMm;
      const result = new PlannerBitmap(sizePixels, sizePixels);
      const center = { x: sizePixels / 2, y: sizePixels / 2 };
      const noseAngleDeg = tool.noseAngleDeg ?? 0;
      const rotation = tool.angleDeg ?? 0;
      const leftArmStart = translate(polarToCartesian(radiusPixels, 180 - noseAngleDeg / 2 + rotation), center);
      const leftArmEnd = translate(polarToCartesian(edgeLengthPixels, 270 - noseAngleDeg / 2 + rotation), leftArmStart);
      const rightArmStart = translate(polarToCartesian(radiusPixels, noseAngleDeg / 2 + rotation), center);
      const rightArmEnd = translate(polarToCartesian(edgeLengthPixels, 270 + noseAngleDeg / 2 + rotation), rightArmStart);
      const arm = [leftArmStart, leftArmEnd, rightArmEnd, rightArmStart];

      this.fillByPredicate(result, PlannerCell.Tool, (x, y) => {
        const dx = x - center.x;
        const dy = y - center.y;
        return dx * dx + dy * dy <= radiusPixels * radiusPixels || pointInPolygon({x, y}, arm);
      });
      return result.cropToNonEmpty();
    }
    throw new Error(`tool of type ${tool.type} not implemented`);
  }

  private fillSegments(bitmap: PlannerBitmap, segments: Segment[], cell: PlannerCell) {
    const polygon = this.segmentsToPolygon(segments);
    fillPolygon(bitmap, polygon, cell);
  }

  private segmentsToPolygon(segments: Segment[]): RasterPoint[] {
    return approximateSegments(segments, 1 / this.pxPerMm).map(point => this.pointToPixel(point));
  }

  private pointToPixel(p: Point): RasterPoint {
    return {
      x: this.latheCode.getStock()!.length * this.pxPerMm - p.z * this.pxPerMm,
      y: p.x * this.pxPerMm,
    };
  }

  private fillByPredicate(bitmap: PlannerBitmap, cell: PlannerCell, predicate: (x: number, y: number) => boolean) {
    for (let y = 0; y < bitmap.height; y++) {
      for (let x = 0; x < bitmap.width; x++) {
        if (predicate(x + 0.5, y + 0.5)) bitmap.set(x, y, cell);
      }
    }
  }

  private toDimensionPixels(mm: number): number {
    return Math.max(1, Math.ceil(mm * this.pxPerMm));
  }
}

export function fillPolygon(bitmap: PlannerBitmap, polygon: RasterPoint[], cell: PlannerCell) {
  if (polygon.length < 3) return;
  const minY = Math.max(0, Math.ceil(Math.min(...polygon.map(p => p.y)) - 0.5));
  const maxY = Math.min(bitmap.height - 1, Math.floor(Math.max(...polygon.map(p => p.y)) - 0.5));
  for (let y = minY; y <= maxY; y++) {
    const scanY = y + 0.5;
    const intersections: number[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      if ((a.y <= scanY && b.y > scanY) || (b.y <= scanY && a.y > scanY)) {
        intersections.push(a.x + (scanY - a.y) * (b.x - a.x) / (b.y - a.y));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const startX = Math.max(0, Math.ceil(intersections[i] - 0.5));
      const endX = Math.min(bitmap.width - 1, Math.floor(intersections[i + 1] - 0.5));
      for (let x = startX; x <= endX; x++) bitmap.set(x, y, cell);
    }
  }
}

export function polarToCartesian(radius: number, angleInDegrees: number): RasterPoint {
  const a = (angleInDegrees * Math.PI) / 180;
  return { x: radius * Math.cos(a), y: -radius * Math.sin(a) };
}

function translate(point: RasterPoint, by: RasterPoint): RasterPoint {
  return { x: point.x + by.x, y: point.y + by.y };
}

function isInsideRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
  radius = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (radius <= 0) return x >= 0 && x <= width && y >= 0 && y <= height;
  const closestX = Math.max(radius, Math.min(width - radius, x));
  const closestY = Math.max(radius, Math.min(height - radius, y));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function pointInPolygon(point: RasterPoint, polygon: RasterPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = (a.y > point.y) !== (b.y > point.y) &&
      point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
