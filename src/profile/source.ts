import { LatheCode } from '../common/lathecode.ts';
import { sameSplineSpan } from './geometry.ts';
import { cloneDrawingState, createEmptySegmentFeatures, reverseDrawingStateForEditor } from './state.ts';
import { assertFeaturesSupported, formatProgramNumber, segmentLineToLatheCode, splineLineToLatheCode } from './programlines.ts';
import { GEOMETRY_EPSILON, PROFILE_SIDES, type DrawingState, type ProfileDraft, type ProfilePoint, type ProfileSide, type SegmentEdgeFeatures, type SegmentTool } from './types.ts';

type SourceSpan = {
  id: number | null;
  tool: SegmentTool;
  points: ProfilePoint[];
  features: SegmentEdgeFeatures;
};

/** Patch profile lines into the original document; setup and comments stay in place. */
export function buildSourceLatheCode(state: DrawingState): string {
  const source = state.source!;
  const program = cloneDrawingState(state);
  reverseDrawingStateForEditor(program);
  const originalLines = source.text.split(/\r?\n/);
  const replacements = new Map<number, string[]>();
  const addedProfiles: Record<ProfileSide, string[]> = {outside: [], inside: []};

  for (const side of PROFILE_SIDES) {
    const profile = program.profiles[side];
    const sourceIds = source.lineIndices[side];
    if (!sourceIds.length && isStockBoundary(profile, side === 'inside' ? source.stockInnerDiameterMm / 2 : state.diameterMm / 2)) continue;
    const originals = new Map(getSourceSpans(source.profiles[side]).map(span => [span.id, span]));
    const spans = getSourceSpans(profile);
    let pending: string[] = [];
    let lastId: number | null = null;
    const usedIds = new Set<number>();
    for (const span of spans) {
      const repeatedId = span.id !== null && usedIds.has(span.id);
      const original = span.id === null ? undefined : originals.get(span.id);
      const originalLine = span.id === null ? undefined : originalLines[span.id];
      let code = original && spanShapeKey(span) === spanShapeKey(original)
        ? originalLine!
        : serializeSpan(span, source.unitMm, originalLine, side === 'inside' ? state.diameterMm / 2 : source.stockInnerDiameterMm / 2);
      if (repeatedId) code = code.split(';')[0].trimEnd();
      if (span.id !== null && sourceIds.includes(span.id) && !repeatedId) {
        replacements.set(span.id, [...pending, code]);
        usedIds.add(span.id);
        pending = [];
        lastId = span.id;
      } else {
        pending.push(code);
      }
    }
    if (lastId !== null) replacements.get(lastId)!.push(...pending);
    else if (sourceIds.length) replacements.set(sourceIds[0], pending);
    else addedProfiles[side] = pending;
  }

  const sourceProfileIds = new Set([...source.lineIndices.outside, ...source.lineIndices.inside]);
  const lines = originalLines.flatMap((line, index) => {
    const replacement = replacements.get(index);
    if (replacement) {
      // A replacement without an original span still retains that source line's comment.
      const comment = line.includes(';') ? line.slice(line.indexOf(';')) : '';
      const hasComment = comment && replacement.some(text => text.includes(comment));
      return comment && !hasComment ? [...replacement, comment] : replacement;
    }
    if (!sourceProfileIds.has(index)) return [line];
    return line.includes(';') ? [line.slice(line.indexOf(';'))] : [];
  });
  if (addedProfiles.outside.length) {
    const insideIndex = lines.findIndex(line => /^INSIDE\b/.test(line));
    lines.splice(commentBlockStart(lines, insideIndex < 0 ? lines.length : insideIndex), 0, ...addedProfiles.outside);
  }
  if (addedProfiles.inside.length) lines.splice(commentBlockStart(lines, lines.length), 0, 'INSIDE', ...addedProfiles.inside);

  // The parser permits zero spaces between directive names and parameters.
  const stockIndex = lines.findIndex(line => line.startsWith('STOCK'));
  if (stockIndex >= 0 && Math.abs(state.diameterMm - source.diameterMm) > GEOMETRY_EPSILON) {
    lines[stockIndex] = lines[stockIndex].replace(/^(STOCK *)([DR])([\d.]+)/, (_match, prefix: string, type: string) => (
      `${prefix}${type}${formatProgramNumber(state.diameterMm / source.unitMm / (type === 'R' ? 2 : 1))}`
    ));
  }
  if (lines.length === originalLines.length && lines.every((line, index) => line === originalLines[index])) return source.text;
  const newline = source.text.includes('\r\n') ? '\r\n' : '\n';
  let text = lines.join(newline);
  if (stockIndex < 0 && text !== source.text) {
    // Keep implicitly sized stock from shrinking when a profile diameter is edited.
    const insertion = lines.findIndex(line => /^(?:TOOL|DEPTH|FEED|MODE|AXES|INSIDE|L\d)/.test(line));
    lines.splice(insertion < 0 ? lines.length : insertion, 0, `STOCK D${formatProgramNumber(state.diameterMm / source.unitMm)}`);
    text = lines.join(newline);
  }
  if (text === source.text) return source.text;
  // Validate the remaining endpoint feature sizes after the geometry edit.
  new LatheCode(text);
  return text;
}

function commentBlockStart(lines: readonly string[], end: number): number {
  let start = end;
  while (start > 0 && (!lines[start - 1].trim() || lines[start - 1].trimStart().startsWith(';'))) start--;
  return start;
}

function isStockBoundary(profile: ProfileDraft, radius: number): boolean {
  return profile.points.every(point => Math.abs(point.radius - radius) <= GEOMETRY_EPSILON)
    && profile.segmentTools.every(tool => tool === 'line')
    && profile.segmentFeatures.every(features => !features.start && !features.end);
}

function getSourceSpans(profile: ProfileDraft): SourceSpan[] {
  const spans: SourceSpan[] = [];
  for (let index = 0; index < profile.segmentTools.length;) {
    const tool = profile.segmentTools[index];
    let end = index + 1;
    if (tool === 'spline') while (sameSplineSpan(profile, index, end)) end++;
    const points = profile.points.slice(index, end + 1);
    const id = profile.segmentSourceIds?.[index] ?? null;
    const features = profile.segmentFeatures[index] ?? createEmptySegmentFeatures();
    for (let i = index; i < end; i++) assertFeaturesSupported(tool, profile.segmentFeatures[i]);
    // Radial connectors are implicit between source lines, not extra L0 cuts.
    if (id !== null || Math.abs(points.at(-1)!.z - points[0].z) > GEOMETRY_EPSILON) {
      spans.push({id, tool, points, features});
    } else if (features.start || features.end) {
      throw new Error(`Chamfer or fillet on zero-length segment ${index + 1} cannot be represented. Remove it explicitly or give the segment a positive length.`);
    }
    index = end;
  }
  return spans;
}

function spanShapeKey(span: SourceSpan): string {
  return JSON.stringify({
    tool: span.tool,
    points: span.points.map(point => ({z: Math.round((point.z - span.points[0].z) * 1e9), radius: Math.round(point.radius * 1e9)})),
    features: span.features,
  });
}

function serializeSpan(span: SourceSpan, unitMm: number, original: string | undefined, closure: number): string {
  const points = span.points.map(point => ({z: point.z / unitMm, radius: point.radius / unitMm}));
  const start = points[0];
  const end = points.at(-1)!;
  const features: SegmentEdgeFeatures = {
    start: span.features.start ? {...span.features.start, size: span.features.start.size / unitMm} : null,
    end: span.features.end ? {...span.features.end, size: span.features.end.size / unitMm} : null,
  };
  const wasParting = original && /^L[\d.]+\s*(?:;.*)?$/.test(original);
  const remainsParting = wasParting && span.tool === 'line' && !features.start && !features.end
    && span.points.every(point => Math.abs(point.radius - closure) <= GEOMETRY_EPSILON);
  const code = remainsParting ? `L${formatProgramNumber(end.z - start.z)}`
    : span.tool === 'spline' ? splineLineToLatheCode(points)
    : segmentLineToLatheCode(end.z - start.z, start.radius, end.radius, span.tool, features);
  const commentIndex = original?.indexOf(';') ?? -1;
  return code + (commentIndex >= 0 ? ` ${original!.slice(commentIndex)}` : '');
}
