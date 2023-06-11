import { LatheCode, Segment, Stock, Tool } from './lathecode';
import * as Colors from './colors';
import { Move, Planner } from './planner';

const PX_MULTIPLIER = 100;

export class GCode {
  private latheCode: LatheCode | null = null;
  private stock: Stock | null = null;
  private gcodeCanvasContainer: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private tool: HTMLCanvasElement | null = null;
  private stepInterval = 0;
  private planner: Planner | null = null;
  private flushTime = 0;

  constructor(private container: HTMLElement) { }

  setLatheCode(value: LatheCode | null) {
    if (this.latheCode) {
      this.container.replaceChildren();
      window.clearInterval(this.stepInterval);
      this.stepInterval = 0;
      this.planner = null;
    }
    this.latheCode = value;
    if (this.latheCode) {
      this.stock = this.latheCode.getStock();
      if (!this.stock) {
        this.container.innerText = 'Error: specify stock';
        return;
      }
      if (this.stock.diameter == 0) {
        this.container.innerText = 'Error: stock diameter is 0';
        return;
      }
      if (this.stock.length == 0) {
        this.container.innerText = 'Error: stock length is 0';
        return;
      }
      this.createCanvas(this.stock.length * PX_MULTIPLIER, this.stock.diameter / 2 * PX_MULTIPLIER);
      const insideSegments = this.latheCode.getInsideSegments();
      const outsideSegments = this.latheCode.getOutsideSegments();
      if (insideSegments.length && outsideSegments.length) {
        this.container.innerText = 'Error: inside and outside not supported yet';
        return;
      }
      if (!insideSegments.length && !outsideSegments.length) {
        this.container.innerText = 'Error: no segments';
        return;
      }
      const ctx = this.canvas!.getContext('2d')!;
      this.fillSegments(ctx, this.stock.getSegments(), Colors.COLOR_STOCK.hex());
      this.fillSegments(ctx, insideSegments.length ? insideSegments : outsideSegments, Colors.COLOR_PART.hex());
      this.createTool(this.latheCode.getTool());
      this.planner = new Planner(this.canvas!, this.tool!);
      this.stepInterval = window.setInterval(() => {
        for (let i = 0; i < 200; i++) {
          if (!this.planner!.step()) {
            this.planner!.flushBitmap();
            window.clearInterval(this.stepInterval);
            this.stepInterval = 0;
            this.showGCode();
            return;
          }
        }
        if (Date.now() - this.flushTime > 500) {
          this.flushTime = Date.now();
          this.planner!.flushBitmap();
        }
      }, 1);
    }
  }

  private showGCode() {
    const text = createGCode(this.planner!.getMoves());
    const textarea = document.createElement('textarea');
    textarea.value = text;
    this.container.appendChild(textarea);
  }

  private createCanvas(width: number, height: number) {
    if (this.canvas) this.canvas.remove();
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'part';
    this.canvas.width = width;
    this.canvas.height = height;
    this.gcodeCanvasContainer = document.createElement('div');
    this.gcodeCanvasContainer.className = 'gcodeCanvasContainer';
    this.gcodeCanvasContainer.appendChild(this.canvas);
    this.container.appendChild(this.gcodeCanvasContainer);
    this.gcodeCanvasContainer.style.transform = `scale(${Math.min(1, 726 / width)})`;
    const spacer = document.createElement('div');
    spacer.innerHTML = '&nbsp;';
    spacer.style.height = `${this.gcodeCanvasContainer.getBoundingClientRect().height}px`;
    this.container.appendChild(spacer);
  }

  private xToY(x: number) {
    return x * PX_MULTIPLIER;
  }

  private zToX(z: number) {
    return this.stock!.length * PX_MULTIPLIER - z * PX_MULTIPLIER;
  }

  private fillSegments(ctx: CanvasRenderingContext2D, segments: Segment[], color: string) {
    ctx.beginPath();
    ctx.moveTo(this.zToX(segments[0].start.z), this.xToY(segments[0].start.x));
    for (let s of segments) {
      this.drawSegment(ctx, s);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  private drawSegment(ctx: CanvasRenderingContext2D, s: Segment) {
    ctx.lineTo(this.zToX(s.end.z), this.xToY(s.end.x));
  }

  private createTool(tool: Tool) {
    if (this.tool) this.tool.remove();
    this.tool = document.createElement('canvas');
    this.tool.className = 'tool';
    const ctx = this.tool.getContext('2d')!;
    if (tool.type === 'RECT') {
      const widthPixels = tool.widthMm * PX_MULTIPLIER;
      const heightPixels = tool.heightMm * PX_MULTIPLIER;
      const cornerRadiusPixels = tool.cornerRadiusMm * PX_MULTIPLIER;
      this.tool.width = widthPixels;
      this.tool.height = heightPixels;
      ctx.strokeStyle = Colors.COLOR_TOOL.hex();
      ctx.fillStyle = Colors.COLOR_TOOL_FILL.hex();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cornerRadiusPixels, 0);
      ctx.lineTo(widthPixels - cornerRadiusPixels, 0);
      ctx.arcTo(widthPixels, 0, widthPixels, cornerRadiusPixels, cornerRadiusPixels);
      ctx.lineTo(widthPixels, heightPixels - cornerRadiusPixels);
      ctx.arcTo(widthPixels, heightPixels, widthPixels - cornerRadiusPixels, heightPixels, cornerRadiusPixels);
      ctx.lineTo(cornerRadiusPixels, heightPixels);
      ctx.arcTo(0, heightPixels, 0, heightPixels - cornerRadiusPixels, cornerRadiusPixels);
      ctx.lineTo(0, cornerRadiusPixels);
      ctx.arcTo(0, 0, cornerRadiusPixels, 0, cornerRadiusPixels);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (tool.type === 'ROUND') {
      const widthPixels = tool.cornerRadiusMm * 2 * PX_MULTIPLIER;
      const heightPixels = tool.cornerRadiusMm * 2 * PX_MULTIPLIER;
      const cornerRadiusPixels = tool.cornerRadiusMm * PX_MULTIPLIER;
      this.tool.width = widthPixels;
      this.tool.height = heightPixels;
      ctx.strokeStyle = Colors.COLOR_TOOL.hex();
      ctx.fillStyle = Colors.COLOR_TOOL_FILL.hex();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cornerRadiusPixels, 0);
      ctx.arcTo(widthPixels, 0, widthPixels, cornerRadiusPixels, cornerRadiusPixels);
      ctx.arcTo(widthPixels, heightPixels, widthPixels - cornerRadiusPixels, heightPixels, cornerRadiusPixels);
      ctx.arcTo(0, heightPixels, 0, heightPixels - cornerRadiusPixels, cornerRadiusPixels);
      ctx.arcTo(0, 0, cornerRadiusPixels, 0, cornerRadiusPixels);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      throw new Error(`tool of type ${tool.type} not implemented`);
    }
    this.gcodeCanvasContainer!.appendChild(this.tool);
  }
}

export function createGCode(moves: Move[]): string {
  const first = moves[0]!;
  const lines = [
    'G21 G18 G90', // metric, ZX plane, absolute positioning
    `X${pixelToMm(first.yStart)}`,
    `Z0`,
    'G91', // relative positioning
  ];
  let i = 0;
  while (i < moves.length) {
    let m = moves[i];
    if (m.isEmpty()) {
      i++;
      continue;
    }

    if (!m.cutArea) {
      const travel = detectTravel(moves, i);
      if (travel.length > 1) {
        for (const tm of travel.moves) {
          lines.push(moveToGCode(tm));
        }
        i += travel.length;
        continue;
      }
    }

    let maxCount = 1;
    let occurrenceLength = 1;
    for (let j = 2; j < 200; j++) {
      const count = countPatterns(moves, i, j);
      if (count > 1 && count * j > maxCount * occurrenceLength) {
        maxCount = count;
        occurrenceLength = j;
      }
    }
    if (maxCount > 1) {
      lines.push(moveToGCode(mergeMoves(moves, i, maxCount * occurrenceLength)));
      i += maxCount * occurrenceLength;
      continue;
    }

    const condirectional = detectCodirectional(moves, i);
    if (condirectional.length > 1) {
      lines.push(moveToGCode(condirectional.move));
      i += condirectional.length;
      continue;
    }

    lines.push(moveToGCode(m));
    i++;
  }
  return lines.join('\n');
}

export function moveToGCode(m: Move): string {
  const xAxisName = 'Z';
  const yAxisName = 'X';
  const parts = [];
  if (m.xDelta) parts.push(xAxisName + pixelToMm(m.xDelta));
  if (m.yDelta) parts.push(yAxisName + pixelToMm(m.yDelta));
  if (m.cutArea) parts.push(`; cut ${toMmSquare(m.cutArea)}`);
  return parts.join(' ');
}

export function toMmSquare(cutArea: number): string {
  return (cutArea / PX_MULTIPLIER / PX_MULTIPLIER).toFixed(3) + ' mm2';
}

export function pixelToMm(pixel: number): string {
  return (-pixel / PX_MULTIPLIER).toFixed(3).replace(/\.?0+$/, '');
}

export function detectTravel(moves: Move[], i: number): {moves: Move[], length: number} {
  if (moves[i].cutArea) throw new Error('expecting a travel move');
  let end = i;
  while (end < moves.length - 1 && !moves[end + 1].cutArea) {
    end++;
  }
  return {moves: optimizeTravel(moves.slice(i, end + 1)), length: end - i + 1};
}

export function optimizeTravel(moves: Move[]): Move[] {
  const result = [];
  const start = moves[0];
  const maxY = Math.max.apply(null, moves.map(m => m.yStart + m.yDelta));
  const end = moves.at(-1)!;
  const endX = end.xStart + end.xDelta;
  const endY = end.yStart + end.yDelta;
  let currentY = start.yStart;
  if (endX != start.xStart) {
    if (start.yStart !== maxY) {
      // Move back.
      result.push(Move.withoutCut(start.xStart, start.yStart, 0, maxY - start.yStart));
      currentY = maxY;
    }
    // Move to target x.
    result.push(Move.withoutCut(start.xStart, maxY, endX - start.xStart, 0));
  }
  if (endY != currentY) {
    // Move to target y.
    result.push(Move.withoutCut(endX, currentY, 0, endY - currentY));
  }
  return result;
}

export function detectCodirectional(moves: Move[], i: number): {move: Move, length: number} {
  let m = moves[i];
  let length = 1;
  while (i < moves.length - 1) {
    if (moves[i + 1].isCodirectional(m)) {
      m = m.merge(moves[i + 1]);
      length++;
      i++;
    } else {
      break;
    }
  }
  return {move: m, length};
}

export function mergeMoves(moves: Move[], startIndex: number, length: number): Move {
  let m = moves[startIndex];
  for (let i = 1; i < length; i++) {
    m = m.merge(moves[startIndex + i]);
  }
  return m;
}

export function countPatterns(moves: Move[], startIndex: number, patternLength: number): number {
  let count = 1;
  let i = startIndex + patternLength;
  while (i + patternLength <= moves.length) {
    if (sameMoves(moves, startIndex, i, patternLength)) {
      count++;
      i += patternLength;
    } else {
      break;
    }
  }
  return count;
}

export function sameMoves(moves: Move[], i: number, j: number, length: number): boolean {
  if (j - i < length) throw new Error('overlapping move sequences');
  for (let k = 0; k < length; k++) {
    const moveI = moves[i + k];
    const moveJ = moves[j + k];
    if (moveI.xDelta != moveJ.xDelta || moveI.yDelta != moveJ.yDelta) return false;
  }
  return true;
}
