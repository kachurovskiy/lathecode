import { Feed, LatheCode, Segment, Stock, Tool } from './lathecode';
import * as Colors from './colors';
import { Move, Planner } from './planner';

const PX_MULTIPLIER = 100;

export class ToWorkerMessage {
  constructor(readonly latheCode?: LatheCode) {}
}

export class FromWorkerMessage {
  constructor(
    readonly progress?: number,
    readonly error?: string,
    readonly gcode?: string,
    readonly canvas?: {width: number, height: number, data: Uint8ClampedArray},
    readonly tool?: {width: number, height: number, data: Uint8ClampedArray, x: number, y: number}) {}
}

export class GCodeWorker {
  private planner: Planner | null = null;
  private stock: Stock | null = null;
  private canvas: OffscreenCanvas | null = null;
  private canvasCtx: OffscreenCanvasRenderingContext2D | null = null;
  private tool: OffscreenCanvas | null = null;

  constructor(private latheCode: LatheCode, readonly postMessage: (message: any) => any) {
    this.stock = this.latheCode.getStock();
    if (!this.stock) {
      postMessage({error: 'Error: specify stock'});
      return;
    }
    if (this.stock.diameter == 0) {
      postMessage({error: 'Error: stock diameter is 0'});
      return;
    }
    if (this.stock.length == 0) {
      postMessage({error: 'Error: stock length is 0'});
      return;
    }
    const insideSegments = this.latheCode.getInsideSegments();
    const outsideSegments = this.latheCode.getOutsideSegments();
    if (insideSegments.length && outsideSegments.length) {
      postMessage({error: 'Error: inside and outside not supported yet'});
      return;
    }
    if (!insideSegments.length && !outsideSegments.length) {
      postMessage({error: 'Error: no segments'});
      return;
    }
    this.canvas = new OffscreenCanvas(this.stock.length * PX_MULTIPLIER, this.stock.diameter / 2 * PX_MULTIPLIER);
    this.canvasCtx = this.canvas.getContext('2d')!;
    this.fillSegments(this.canvasCtx, this.stock.getSegments(), Colors.COLOR_STOCK.hex());
    this.fillSegments(this.canvasCtx, insideSegments.length ? insideSegments : outsideSegments, Colors.COLOR_PART.hex());
    this.createTool(this.latheCode.getTool());
    this.planner = new Planner(this.canvas!, this.tool!);
    let i = 0;
    this.postProgress();
    while (this.planner.step()) {
      if (i++ % 1000 === 0) this.postProgress();
    }
    const moves = optimizeMoves(this.planner.getMoves());
    this.postProgress();
    postMessage({gcode: createGCode(this.latheCode, moves)});
  }

  private postProgress() {
    if (!this.canvas || !this.canvasCtx || !this.planner) return;
    const sendCanvas = this.canvas.width * this.canvas.height < 2000000;
    if (sendCanvas) this.planner.flushBitmap();
    this.postMessage.call(null, {
      progress: this.planner.getProgress(),
      canvas: sendCanvas ? {
        width: this.canvas.width,
        height: this.canvas.height,
        data: this.canvasCtx.getImageData(0, 0, this.canvas.width, this.canvas.height).data,
      } : undefined,
      tool: sendCanvas ? {
        width: this.tool!.width,
        height: this.tool!.height,
        data: this.tool!.getContext('2d')!.getImageData(0, 0, this.tool!.width, this.tool!.height).data,
        x: this.planner.getToolX(),
        y: this.planner.getToolY(),
      } : undefined,
    });
  }

  private xToY(x: number) {
    return x * PX_MULTIPLIER;
  }

  private zToX(z: number) {
    return this.stock!.length * PX_MULTIPLIER - z * PX_MULTIPLIER;
  }

  private fillSegments(ctx: OffscreenCanvasRenderingContext2D, segments: Segment[], color: string) {
    ctx.beginPath();
    ctx.moveTo(this.zToX(segments[0].start.z), this.xToY(segments[0].start.x));
    for (let s of segments) {
      this.drawSegment(ctx, s);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  private drawSegment(ctx: OffscreenCanvasRenderingContext2D, s: Segment) {
    ctx.lineTo(this.zToX(s.end.z), this.xToY(s.end.x));
  }

  private createTool(tool: Tool) {
    if (tool.type === 'RECT') {
      const widthPixels = tool.widthMm * PX_MULTIPLIER;
      const heightPixels = tool.heightMm * PX_MULTIPLIER;
      const cornerRadiusPixels = tool.cornerRadiusMm * PX_MULTIPLIER;
      this.tool = new OffscreenCanvas(widthPixels, heightPixels);
      const ctx = this.tool.getContext('2d')!;
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
      this.tool = new OffscreenCanvas(widthPixels, heightPixels);
      const ctx = this.tool.getContext('2d')!;
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
  }
}

export function createGCode(latheCode: LatheCode, moves: Move[]): string {
  let feed = latheCode.getFeed().moveMmMin;
  const first = moves[0]!;
  const lines = [
    ... latheCode.getText().trim().split('\n').map(line => line.startsWith(';') ? line : `; ${line}`),
    '',
    'G21 ; metric',
    'G18 ; ZX plane',
    'G90 ; absolute positioning',
    feedToGCode(feed),
    `X${pixelToMm(first.yStart)}`,
    `Z0`,
    'G91 ; relative positioning',
  ];
  for (const m of moves) {
    const newFeed = getFeedMmMin(m, latheCode.getFeed(), latheCode.getTool());
    if (feed !== newFeed) {
      feed = newFeed;
      lines.push('', feedToGCode(feed));
    }
    lines.push(moveToGCode(m));
  }
  return lines.join('\n');
}

export function optimizeMoves(moves: Move[]): Move[] {
  const result: Move[] = [];
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
        result.push(... travel.moves);
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
      result.push(mergeMoves(moves, i, maxCount * occurrenceLength));
      i += maxCount * occurrenceLength;
      continue;
    }

    const condirectional = detectCodirectional(moves, i);
    if (condirectional.length > 1) {
      result.push(condirectional.move);
      i += condirectional.length;
      continue;
    }

    result.push(m);
    i++;
  }
  return result.length < moves.length ? optimizeMoves(result) : result;
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

export function getFeedMmMin(m: Move, feed: Feed, tool: Tool) {
  if (!m.cutArea) return feed.moveMmMin;
  if (!m.xDelta && (m.getCutWidth() >= tool.widthMm / 2)) return feed.partMmMin;
  return feed.passMmMin;
}

export function feedToGCode(mmMin: number): string {
  return 'F' + mmMin.toFixed(3).replace(/\.?0+$/, '');
}

export function toMmSquare(cutArea: number): string {
  return (cutArea / PX_MULTIPLIER / PX_MULTIPLIER).toFixed(3).replace(/\.?0+$/, '') + ' mm2';
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

self.onmessage = (event) => {
  const data = event.data as ToWorkerMessage;
  const latheCode = data.latheCode;
  if (latheCode) {
    Object.setPrototypeOf(latheCode, LatheCode.prototype);
    new GCodeWorker(latheCode, self.postMessage);
  }
};
