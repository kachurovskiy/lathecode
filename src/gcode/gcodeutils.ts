import { Feed, LatheCode, Tool } from "../common/lathecode";
import { Move } from "../common/move";

export function createGCode(latheCode: LatheCode, moves: Move[]): string {
  let feed = latheCode.getFeed().moveMmMin;
  const first = moves[0]!;
  const lines = [
    ... latheCode.getText().trim().split('\n').map(line => line.startsWith(';') ? line : `; ${line}`),
    '',
    '; Run time $duration min, cutting $cutPercent% of time',
    '',
    'G21 ; metric',
    'G18 ; ZX plane',
    'G90 ; absolute positioning',
    feedToGCode(feed),
    `X${first.yStartMm} ; zero your tool X on centerline`,
    `Z0 ; zero your tool Z at the right edge of the stock`,
    'G91 ; relative positioning',
  ];
  let duration = 0;
  let cutDuration = 0;
  for (const m of moves) {
    const newFeed = getFeedMmMin(m, latheCode.getFeed(), latheCode.getTool());
    if (feed !== newFeed) {
      feed = newFeed;
      lines.push('', feedToGCode(feed));
    }
    lines.push(moveToGCode(m));
    const moveDuration = getDurationMin(m, feed);
    duration += moveDuration;
    if (m.cutAreaMmSq) cutDuration += moveDuration;
  }
  return lines.join('\n').replace('$duration', duration.toFixed(1)).replace('$cutPercent', (cutDuration * 100 / duration).toFixed(0));
}

export function moveToGCode(m: Move): string {
  const xAxisName = 'Z';
  const yAxisName = 'X';
  const parts = [];
  if (m.xDeltaMm) parts.push(xAxisName + toNumberString(m.xDeltaMm, 3));
  if (m.yDeltaMm) parts.push(yAxisName + toNumberString(m.yDeltaMm, 3));
  if (m.cutAreaMmSq) {
    parts.push(`; cut ${toNumberString(m.cutAreaMmSq, 4)} mm2`);
    if (m.xDeltaMm * m.yDeltaMm !== 0 && !m.isBasic()) parts.push(`at ${(Math.atan(m.xDeltaMm / m.yDeltaMm) * 180 / Math.PI).toFixed(2)}°`);
  }
  return parts.join(' ');
}

export function getFeedMmMin(m: Move, feed: Feed, tool: Tool) {
  if (m.cutAreaMmSq <= 0.001) return feed.moveMmMin;
  if (!m.xDeltaMm && (m.cutAreaMmSq / m.yDeltaMm > tool.widthMm / 2)) return feed.partMmMin;
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
