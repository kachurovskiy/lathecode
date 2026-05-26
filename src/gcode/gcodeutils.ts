import { Feed, LatheCode, Tool } from "../common/lathecode";
import { Move } from "../common/move";

export interface GeneratedGCode {
  text: string;
  lineMoveCounts: number[];
}

export function createGCode(latheCode: LatheCode, moves: Move[]): string {
  return createGCodeWithLineMap(latheCode, moves).text;
}

export function createGCodeWithLineMap(latheCode: LatheCode, moves: Move[]): GeneratedGCode {
  let feed = latheCode.getFeed().moveMmMin;
  const first = moves[0]!;
  const area = getMoveArea(moves);
  const lines: string[] = [];
  const lineMoveCounts: number[] = [];
  let moveCount = 0;
  const pushLine = (line: string) => {
    lines.push(line);
    lineMoveCounts.push(moveCount);
  };

  for (const line of latheCode.getText().trim().split('\n')) {
    pushLine(line.startsWith(';') ? line : `; ${line}`);
  }
  pushLine('');
  pushLine('; Run time $duration min, cutting $cutPercent% of time');
  pushLine(`; Working area ${area.widthMm.toFixed(2)} by ${area.heightMm.toFixed(2)} mm`);
  pushLine(`; Axes expected: Z+ points ${latheCode.getZDirection().toLowerCase()}, X+ points ${latheCode.getXDirection().toLowerCase()}`);
  pushLine('');
  pushLine('G21 ; metric');
  pushLine('G18 ; ZX plane');
  pushLine('G90 ; absolute positioning');
  pushLine(feedToGCode(feed));
  pushLine(`X${first.yStartMm} ; zero your tool X on centerline`);
  pushLine(`Z0 ; zero your tool Z at the right edge of the stock`);
  pushLine('G91 ; relative positioning');
  let duration = 0;
  let cutDuration = 0;
  for (const m of moves) {
    const newFeed = getFeedMmMin(m, latheCode.getFeed(), latheCode.getTool());
    if (feed !== newFeed) {
      feed = newFeed;
      pushLine('');
      pushLine(feedToGCode(feed));
    }
    moveCount++;
    pushLine(moveToGCode(latheCode, m));
    const moveDuration = getDurationMin(m, feed);
    duration += moveDuration;
    if (m.cutAreaMmSq) cutDuration += moveDuration;
  }
  const text = lines.join('\n')
      .replace('$duration', duration.toFixed(1))
      .replace('$cutPercent', (cutDuration * 100 / duration).toFixed(0));
  return {text, lineMoveCounts};
}

export function getMoveArea(moves: Move[]): {widthMm: number, heightMm: number} {
  let minXMm = Infinity;
  let maxXMm = -Infinity;
  let minYMm = Infinity;
  let maxYMm = -Infinity;
  moves.forEach(move => {
    minXMm = Math.min(move.xStartMm, move.xStartMm + move.xDeltaMm, minXMm);
    maxXMm = Math.max(move.xStartMm, move.xStartMm + move.xDeltaMm, maxXMm);
    minYMm = Math.min(move.yStartMm, move.yStartMm + move.yDeltaMm, minYMm);
    maxYMm = Math.max(move.yStartMm, move.yStartMm + move.yDeltaMm, maxYMm);
  });
  return {widthMm: maxXMm - minXMm, heightMm: maxYMm - minYMm};
}

export function moveToGCode(latheCode: LatheCode, m: Move): string {
  const xAxisName = 'Z';
  const yAxisName = 'X';
  const parts = [];
  if (m.xDeltaMm) parts.push(xAxisName + toNumberString(m.xDeltaMm * (latheCode.getZDirection() === 'LEFT' ? 1 : -1), 3));
  if (m.yDeltaMm) parts.push(yAxisName + toNumberString(m.yDeltaMm * (latheCode.getXDirection() === 'UP' ? 1 : -1), 3));
  if (m.cutAreaMmSq) {
    parts.push(`; cut ${toNumberString(m.cutAreaMmSq, 4)} mm2`);
    if (m.xDeltaMm * m.yDeltaMm !== 0 && !m.isBasic()) parts.push(`at ${(Math.atan(m.xDeltaMm / m.yDeltaMm) * 180 / Math.PI).toFixed(2)}°`);
  }
  return parts.join(' ');
}

export function getFeedMmMin(m: Move, feed: Feed, tool: Tool) {
  if (m.cutAreaMmSq <= 0.001) return feed.moveMmMin;
  if (!m.xDeltaMm && (m.cutAreaMaxWidthMm > tool.widthMm / 2)) return feed.partMmMin;
  return feed.passMmMin;
}

export function feedToGCode(mmMin: number): string {
  return 'F' + mmMin.toFixed(3).replace(/\.?0+$/, '');
}

export function toNumberString(value: number, precision: number): string {
  return value.toFixed(precision).replace(/\.?0+$/, '');
}

function getDurationMin(m: Move, feedMmMin: number): number {
  return Math.sqrt(m.xDeltaMm * m.xDeltaMm + m.yDeltaMm * m.yDeltaMm) / feedMmMin;
}
