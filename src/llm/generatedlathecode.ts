import { LatheCode } from '../common/lathecode.ts';
import { LatheCodeSyntaxError } from '../common/latheparser.ts';

const SETUP_DIRECTIVE_ORDER = ['UNITS', 'STOCK', 'TOOL', 'DEPTH', 'FEED', 'MODE', 'AXES'] as const;

type SetupDirectiveKeyword = typeof SETUP_DIRECTIVE_ORDER[number];
type EdgeFeatureType = 'CH' | 'FI';
type EdgeFeature = {
  type: EdgeFeatureType,
  value: number,
};
type RepairableLatheProfileLine = {
  lineIndex: number,
  kind: 'parting' | 'straight' | 'endpoint',
  length: number,
  startRadius: number,
  endRadius: number,
  zeroRadius: number,
  code: string,
  comment: string,
  straightSizeType?: 'D' | 'R',
  straightSize?: number,
  startType?: 'DS' | 'RS',
  startValue?: number,
  endType?: 'DE' | 'RE',
  endValue?: number,
  curveType?: 'CONV' | 'CONC',
  startFeature: EdgeFeature | null,
  endFeature: EdgeFeature | null,
};
type MutableFeatureLine = {
  entry: RepairableLatheProfileLine,
  startFeature: EdgeFeature | null,
  endFeature: EdgeFeature | null,
};

export function stripLatheCode(text: string): string {
  const trimmed = text.trim();
  const jsonLatheCode = tryReadJsonLatheCode(trimmed);
  if (jsonLatheCode) return jsonLatheCode.trim();

  const fenced = trimmed.match(/```(?:lathecode|text|txt)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

export function normalizeGeneratedLatheCode(text: string): string {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .reduce<{lines: string[], inSetupScaffold: boolean}>((state, line) => {
      if (isGeneratedSetupScaffoldHeader(line)) {
        state.lines.push(line.trimEnd());
        state.inSetupScaffold = true;
        return state;
      }

      if (state.inSetupScaffold) {
        if (!line.trim()) {
          state.lines.push(line.trimEnd());
          state.inSetupScaffold = false;
          return state;
        }
        if (/^\s*;/.test(line)) {
          state.lines.push(line.trimEnd());
          return state;
        }
        if (getSetupDirectiveKeyword(line)) {
          state.lines.push(`; ${normalizeGeneratedLatheCodeLine(line)}`);
          return state;
        }
        state.inSetupScaffold = false;
      }

      state.lines.push(normalizeGeneratedLatheCodeLine(line));
      return state;
    }, {lines: [], inSetupScaffold: false})
    .lines
    .join('\n')
    .trim();
  return canonicalizeGeneratedSetupDirectives(normalized).trim();
}

function normalizeGeneratedLatheCodeLine(line: string): string {
  const uncommentedCode = getCommentedCodeLine(line);
  if (uncommentedCode !== null) return normalizeGeneratedLatheCodeLine(uncommentedCode);
  if (/^\s*;/.test(line)) return line.trimEnd();
  const commentIndex = line.indexOf(';');
  const code = commentIndex >= 0 ? line.substring(0, commentIndex) : line;
  const comment = commentIndex >= 0 ? line.substring(commentIndex) : '';
  const normalizedCode = normalizeLoneCurveStartParams(code.replace(
    /\b(CUT|FINISH|MOVE|PASS|PART|ID|IR|DS|DE|RS|RE|CH|FI|NA|R|D|L|H|A)\s+([0-9]+(?:\.[0-9]*)?|\.[0-9]+)/g,
    '$1$2',
  ));
  return `${normalizedCode.trimEnd()}${comment ? ` ${comment.trim()}` : ''}`;
}

function isGeneratedSetupScaffoldHeader(line: string): boolean {
  return /^\s*;\s*Uncomment and modify lines below as needed\s*$/i.test(line);
}

function canonicalizeGeneratedSetupDirectives(text: string): string {
  const lines = text.split('\n');
  const profileStartIndex = lines.findIndex(isGeneratedProfileStartLine);
  const setupEndIndex = profileStartIndex >= 0 ? profileStartIndex : lines.length;
  const setupPrefix = lines.slice(0, setupEndIndex);
  const setupEntries = setupPrefix
    .map((line, index) => ({line, index, keyword: getSetupDirectiveKeyword(line)}))
    .filter((entry): entry is {line: string, index: number, keyword: SetupDirectiveKeyword} => entry.keyword !== null);

  if (!shouldCanonicalizeSetupDirectives(setupEntries)) return text;

  const firstSetupIndex = setupEntries[0].index;
  const lastSetupIndex = setupEntries[setupEntries.length - 1].index;
  const latestSetupLines = new Map<SetupDirectiveKeyword, string>();
  for (const entry of setupEntries) latestSetupLines.set(entry.keyword, entry.line);

  const beforeSetup = setupPrefix.slice(0, firstSetupIndex).filter(shouldKeepSetupPrefixLine);
  const betweenSetup = setupPrefix.slice(firstSetupIndex, lastSetupIndex + 1)
    .filter(line => !getSetupDirectiveKeyword(line) && shouldKeepSetupPrefixLine(line));
  const afterSetup = setupPrefix.slice(lastSetupIndex + 1).filter(shouldKeepSetupPrefixLine);
  const setupLines = SETUP_DIRECTIVE_ORDER.flatMap(keyword => (
    latestSetupLines.has(keyword) ? [latestSetupLines.get(keyword)!] : []
  ));

  return [
    ...beforeSetup,
    ...setupLines,
    ...betweenSetup,
    ...afterSetup,
    ...lines.slice(setupEndIndex),
  ].join('\n');
}

function shouldCanonicalizeSetupDirectives(entries: readonly {keyword: SetupDirectiveKeyword}[]): boolean {
  const seen = new Set<SetupDirectiveKeyword>();
  let previousOrder = -1;
  for (const entry of entries) {
    if (seen.has(entry.keyword)) return true;
    seen.add(entry.keyword);

    const order = SETUP_DIRECTIVE_ORDER.indexOf(entry.keyword);
    if (order < previousOrder) return true;
    previousOrder = order;
  }
  return false;
}

function shouldKeepSetupPrefixLine(line: string): boolean {
  return !isGeneratedSetupScaffoldHeader(line);
}

function isGeneratedProfileStartLine(line: string): boolean {
  return /^L\s*([0-9]+(?:\.[0-9]*)?|\.[0-9]+)/.test(line.trimStart()) || /^INSIDE\b/.test(line.trimStart());
}

function getSetupDirectiveKeyword(line: string): SetupDirectiveKeyword | null {
  const keyword = line.trimStart().match(/^([A-Z]+)\b/)?.[1];
  return isSetupDirectiveKeyword(keyword) ? keyword : null;
}

function isSetupDirectiveKeyword(keyword: string | undefined): keyword is SetupDirectiveKeyword {
  return SETUP_DIRECTIVE_ORDER.includes(keyword as SetupDirectiveKeyword);
}

function getCommentedCodeLine(line: string): string | null {
  const uncommented = line.trimStart().match(/^;\s*(.*)$/)?.[1].trimStart();
  if (!uncommented || !isLatheCodeLine(uncommented)) return null;
  return uncommented;
}

function isLatheCodeLine(line: string): boolean {
  return /^(UNITS|STOCK|TOOL|DEPTH|FEED|MODE|AXES|INSIDE)\b/.test(line) || /^L\s*([0-9]+(?:\.[0-9]*)?|\.[0-9]+)/.test(line);
}

function normalizeLoneCurveStartParams(code: string): string {
  return code
    .replace(/^(\s*L[0-9]+(?:\.[0-9]*)?\s+)DS([0-9]+(?:\.[0-9]*)?|\.[0-9]+)\s*$/i, '$1D$2')
    .replace(/^(\s*L[0-9]+(?:\.[0-9]*)?\s+)RS([0-9]+(?:\.[0-9]*)?|\.[0-9]+)\s*$/i, '$1R$2');
}

export function validateOrRepairGeneratedLatheCode(text: string): string {
  try {
    validateGeneratedLatheCode(text);
    return text;
  } catch (error) {
    if (!hasEdgeFeatureToken(text)) throw error;
    for (const candidate of getEdgeFeatureRepairCandidates(text)) {
      if (candidate === text) continue;
      try {
        validateGeneratedLatheCode(candidate);
        return candidate;
      } catch {
        // Try the next local repair candidate before asking the model.
      }
    }
    throw error;
  }
}

function hasEdgeFeatureToken(text: string): boolean {
  return text.split('\n').some(line => {
    const code = splitCodeAndComment(line).code;
    return isGeneratedProfileStartLine(code) && /\s+(?:CH|FI)/.test(code);
  });
}

function getEdgeFeatureRepairCandidates(text: string): string[] {
  return [
    reduceGeneratedEdgeFeatures(text),
    removeAllGeneratedEdgeFeatures(text),
  ].filter((candidate, index, candidates) => candidate !== text && candidates.indexOf(candidate) === index);
}

function reduceGeneratedEdgeFeatures(text: string): string {
  const lines = text.split('\n');
  const stockRadii = getGeneratedStockRadii(lines);
  let zeroRadius = stockRadii.innerRadius;
  let profileEntries: RepairableLatheProfileLine[] = [];
  let changed = false;

  const flushProfile = () => {
    if (repairGeneratedProfileEdgeFeatures(lines, profileEntries)) changed = true;
    profileEntries = [];
  };

  lines.forEach((line, lineIndex) => {
    const {code, comment} = splitCodeAndComment(line);
    if (/^INSIDE\b/.test(code.trimStart())) {
      flushProfile();
      zeroRadius = stockRadii.outerRadius;
      return;
    }

    const entry = parseRepairableLatheProfileLine(code, comment, lineIndex, zeroRadius);
    if (entry) profileEntries.push(entry);
  });
  flushProfile();

  return changed ? lines.join('\n') : text;
}

function repairGeneratedProfileEdgeFeatures(lines: string[], entries: readonly RepairableLatheProfileLine[]): boolean {
  const mutable = entries.map(entry => ({
    entry,
    startFeature: cloneEdgeFeature(entry.startFeature),
    endFeature: cloneEdgeFeature(entry.endFeature),
  }));
  let changed = false;

  mutable.forEach((line, index) => {
    if (line.entry.curveType) {
      if (line.startFeature || line.endFeature) changed = true;
      line.startFeature = null;
      line.endFeature = null;
      return;
    }

    const startFeature = repairFeatureForEndpoint(mutable, index, 'start');
    const endFeature = repairFeatureForEndpoint(mutable, index, 'end');
    if (!edgeFeaturesEqual(line.startFeature, startFeature) || !edgeFeaturesEqual(line.endFeature, endFeature)) changed = true;
    line.startFeature = startFeature;
    line.endFeature = endFeature;
    if (fitFeaturesToSegment(line)) changed = true;
  });

  for (let index = 0; index < mutable.length - 1; index++) {
    if (fitFeaturesToConnector(mutable[index], mutable[index + 1])) changed = true;
  }

  mutable.forEach(line => {
    const repairedCode = repairableLatheLineToCode(line);
    if (repairedCode !== line.entry.code.trimEnd()) {
      changed = true;
      lines[line.entry.lineIndex] = joinCodeAndComment(repairedCode, line.entry.comment);
    }
  });

  return changed;
}

function repairFeatureForEndpoint(lines: readonly MutableFeatureLine[], index: number, endpoint: 'start' | 'end'): EdgeFeature | null {
  const line = lines[index];
  const feature = endpoint === 'start' ? line.startFeature : line.endFeature;
  if (!feature || feature.value <= 0) return null;
  const radius = endpoint === 'start' ? line.entry.startRadius : line.entry.endRadius;
  const neighborRadius = getEndpointNeighborRadius(lines, index, endpoint);
  const radialGap = Math.abs(neighborRadius - radius);
  if (radialGap > 1e-9) {
    return {
      type: feature.type,
      value: Math.min(feature.value, radialGap),
    };
  }
  const cornerLimit = getContinuousCornerFeatureLimit(lines, index, endpoint, feature);
  if (cornerLimit <= 1e-9) return null;
  return {
    type: feature.type,
    value: Math.min(feature.value, cornerLimit),
  };
}

function getEndpointNeighborRadius(lines: readonly MutableFeatureLine[], index: number, endpoint: 'start' | 'end'): number {
  const line = lines[index].entry;
  if (endpoint === 'start') return index === 0 ? line.zeroRadius : lines[index - 1].entry.endRadius;
  return index === lines.length - 1 ? line.zeroRadius : lines[index + 1].entry.startRadius;
}

function getContinuousCornerFeatureLimit(
  lines: readonly MutableFeatureLine[],
  index: number,
  endpoint: 'start' | 'end',
  feature: EdgeFeature,
): number {
  const neighborIndex = endpoint === 'start' ? index - 1 : index + 1;
  const line = lines[index]?.entry;
  const neighbor = lines[neighborIndex]?.entry;
  if (!line || !neighbor || line.kind === 'parting' || neighbor.kind === 'parting' || line.curveType || neighbor.curveType) return 0;

  const lineDirection = getEndpointDirection(line, endpoint);
  const neighborDirection = endpoint === 'start'
    ? getEndpointDirection(neighbor, 'end')
    : getEndpointDirection(neighbor, 'start');
  const angle = angleBetweenVectors(lineDirection, neighborDirection);
  if (angle <= 1e-9 || Math.PI - angle <= 1e-9) return 0;
  if (feature.type === 'CH') return neighbor.length;

  const lineHorizontalComponent = horizontalComponent(line);
  const neighborHorizontalComponent = horizontalComponent(neighbor);
  if (lineHorizontalComponent <= 1e-9 || neighborHorizontalComponent <= 1e-9) return 0;
  return neighbor.length * lineHorizontalComponent / neighborHorizontalComponent;
}

function fitFeaturesToSegment(line: MutableFeatureLine): boolean {
  const total = (line.startFeature?.value ?? 0) + (line.endFeature?.value ?? 0);
  if (total <= line.entry.length || total <= 0) return false;
  scaleMutableFeatures(line, line.entry.length / total);
  return true;
}

function fitFeaturesToConnector(left: MutableFeatureLine, right: MutableFeatureLine): boolean {
  const radialGap = Math.abs(right.entry.startRadius - left.entry.endRadius);
  const total = (left.endFeature?.value ?? 0) + (right.startFeature?.value ?? 0);
  if (total <= radialGap || total <= 0) return false;
  if (radialGap <= 1e-9) {
    if (isContinuousCornerBetween(left.entry, right.entry)) {
      if (!left.endFeature || !right.startFeature) return false;
      right.startFeature = null;
    } else {
      left.endFeature = null;
      right.startFeature = null;
    }
  } else {
    const scale = radialGap / total;
    if (left.endFeature) left.endFeature.value *= scale;
    if (right.startFeature) right.startFeature.value *= scale;
  }
  return true;
}

function scaleMutableFeatures(line: MutableFeatureLine, scale: number): void {
  if (line.startFeature) line.startFeature.value *= scale;
  if (line.endFeature) line.endFeature.value *= scale;
}

function isContinuousCornerBetween(left: RepairableLatheProfileLine, right: RepairableLatheProfileLine): boolean {
  if (left.kind === 'parting' || right.kind === 'parting' || left.curveType || right.curveType) return false;
  if (Math.abs(left.endRadius - right.startRadius) > 1e-9) return false;
  const angle = angleBetweenVectors(getEndpointDirection(left, 'end'), getEndpointDirection(right, 'start'));
  return angle > 1e-9 && Math.PI - angle > 1e-9;
}

function getEndpointDirection(line: RepairableLatheProfileLine, endpoint: 'start' | 'end'): {radius: number, z: number} {
  const vector = {radius: line.endRadius - line.startRadius, z: line.length};
  return endpoint === 'start' ? vector : {radius: -vector.radius, z: -vector.z};
}

function horizontalComponent(line: RepairableLatheProfileLine): number {
  const length = Math.hypot(line.endRadius - line.startRadius, line.length);
  return length > 1e-9 ? line.length / length : 0;
}

function angleBetweenVectors(a: {radius: number, z: number}, b: {radius: number, z: number}): number {
  const aLength = Math.hypot(a.radius, a.z);
  const bLength = Math.hypot(b.radius, b.z);
  if (aLength <= 1e-9 || bLength <= 1e-9) return 0;
  const dot = (a.radius * b.radius + a.z * b.z) / (aLength * bLength);
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

function repairableLatheLineToCode(line: MutableFeatureLine): string {
  const entry = line.entry;
  if (entry.kind === 'parting') return `L${formatGeneratedNumber(entry.length)}`;
  if (entry.kind === 'straight') {
    const straightFeature = line.startFeature && edgeFeaturesEqual(line.startFeature, line.endFeature)
      ? line.startFeature
      : null;
    if (straightFeature || (!line.startFeature && !line.endFeature)) {
      return [
        `L${formatGeneratedNumber(entry.length)}`,
        `${entry.straightSizeType}${formatGeneratedNumber(entry.straightSize ?? 0)}`,
        straightFeature ? edgeFeatureToCode(straightFeature) : '',
      ].filter(Boolean).join(' ');
    }
    const startType = entry.straightSizeType === 'D' ? 'DS' : 'RS';
    const endType = entry.straightSizeType === 'D' ? 'DE' : 'RE';
    return endpointLatheLineToCode(entry.length, startType, entry.straightSize ?? 0, line.startFeature, endType, entry.straightSize ?? 0, line.endFeature);
  }
  return endpointLatheLineToCode(
    entry.length,
    entry.startType ?? 'RS',
    entry.startValue ?? 0,
    line.startFeature,
    entry.endType ?? 'RE',
    entry.endValue ?? 0,
    line.endFeature,
    entry.curveType,
  );
}

function endpointLatheLineToCode(
  length: number,
  startType: 'DS' | 'RS',
  startValue: number,
  startFeature: EdgeFeature | null,
  endType: 'DE' | 'RE',
  endValue: number,
  endFeature: EdgeFeature | null,
  curveType?: 'CONV' | 'CONC',
): string {
  return [
    `L${formatGeneratedNumber(length)}`,
    `${startType}${formatGeneratedNumber(startValue)}`,
    startFeature ? edgeFeatureToCode(startFeature) : '',
    `${endType}${formatGeneratedNumber(endValue)}`,
    endFeature ? edgeFeatureToCode(endFeature) : '',
    curveType ?? '',
  ].filter(Boolean).join(' ');
}

function edgeFeatureToCode(feature: EdgeFeature): string {
  return `${feature.type}${formatGeneratedNumber(feature.value)}`;
}

function removeAllGeneratedEdgeFeatures(text: string): string {
  return text.split('\n').map(line => {
    const {code, comment} = splitCodeAndComment(line);
    if (!isGeneratedProfileStartLine(code)) return line;
    const repairedCode = code.replace(/\s+(?:CH|FI)(?:\s*[^\s;]+)?/g, '').trimEnd();
    return joinCodeAndComment(repairedCode, comment);
  }).join('\n');
}

function parseRepairableLatheProfileLine(
  code: string,
  comment: string,
  lineIndex: number,
  zeroRadius: number,
): RepairableLatheProfileLine | null {
  const trimmed = code.trim();
  const parting = trimmed.match(/^L([0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/);
  if (parting) {
    return {
      lineIndex,
      kind: 'parting',
      length: Number.parseFloat(parting[1]),
      startRadius: zeroRadius,
      endRadius: zeroRadius,
      zeroRadius,
      code: trimmed,
      comment,
      startFeature: null,
      endFeature: null,
    };
  }

  const straight = trimmed.match(/^L([0-9]+(?:\.[0-9]*)?|\.[0-9]+)\s+([DR])([0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:\s+(CH|FI)([0-9]+(?:\.[0-9]*)?|\.[0-9]+))?$/);
  if (straight) {
    const sizeType = straight[2] as 'D' | 'R';
    const size = Number.parseFloat(straight[3]);
    const radius = radiusFromLatheSize(sizeType, size);
    const feature = parseEdgeFeature(straight[4], straight[5]);
    return {
      lineIndex,
      kind: 'straight',
      length: Number.parseFloat(straight[1]),
      startRadius: radius,
      endRadius: radius,
      zeroRadius,
      code: trimmed,
      comment,
      straightSizeType: sizeType,
      straightSize: size,
      startFeature: cloneEdgeFeature(feature),
      endFeature: cloneEdgeFeature(feature),
    };
  }

  const endpoint = trimmed.match(/^L([0-9]+(?:\.[0-9]*)?|\.[0-9]+)\s+(DS|RS)([0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:\s+(CH|FI)([0-9]+(?:\.[0-9]*)?|\.[0-9]+))?\s+(DE|RE)([0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:\s+(CH|FI)([0-9]+(?:\.[0-9]*)?|\.[0-9]+))?(?:\s+(CONV|CONC))?$/);
  if (!endpoint) return null;

  const startType = endpoint[2] as 'DS' | 'RS';
  const endType = endpoint[6] as 'DE' | 'RE';
  const startValue = Number.parseFloat(endpoint[3]);
  const endValue = Number.parseFloat(endpoint[7]);
  return {
    lineIndex,
    kind: 'endpoint',
    length: Number.parseFloat(endpoint[1]),
    startRadius: radiusFromLatheSize(startType, startValue),
    endRadius: radiusFromLatheSize(endType, endValue),
    zeroRadius,
    code: trimmed,
    comment,
    startType,
    startValue,
    endType,
    endValue,
    curveType: endpoint[10] as 'CONV' | 'CONC' | undefined,
    startFeature: parseEdgeFeature(endpoint[4], endpoint[5]),
    endFeature: parseEdgeFeature(endpoint[8], endpoint[9]),
  };
}

function parseEdgeFeature(type: string | undefined, value: string | undefined): EdgeFeature | null {
  if ((type !== 'CH' && type !== 'FI') || !value) return null;
  return {type, value: Number.parseFloat(value)};
}

function cloneEdgeFeature(feature: EdgeFeature | null): EdgeFeature | null {
  return feature ? {...feature} : null;
}

function edgeFeaturesEqual(left: EdgeFeature | null, right: EdgeFeature | null): boolean {
  if (!left || !right) return left === right;
  return left.type === right.type && Math.abs(left.value - right.value) <= 1e-9;
}

function radiusFromLatheSize(type: 'D' | 'R' | 'DS' | 'RS' | 'DE' | 'RE', value: number): number {
  return type.startsWith('D') ? value / 2 : value;
}

function getGeneratedStockRadii(lines: readonly string[]): {outerRadius: number, innerRadius: number} {
  for (const line of lines) {
    const code = splitCodeAndComment(line).code.trim();
    const stock = code.match(/^STOCK\s+([DR])([0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:\s+(ID|IR)([0-9]+(?:\.[0-9]*)?|\.[0-9]+))?/);
    if (!stock) continue;
    const outerRadius = radiusFromLatheSize(stock[1] as 'D' | 'R', Number.parseFloat(stock[2]));
    const innerRadius = stock[3] && stock[4]
      ? radiusFromLatheSize(stock[3] === 'ID' ? 'D' : 'R', Number.parseFloat(stock[4]))
      : 0;
    return {outerRadius, innerRadius};
  }
  return {outerRadius: 0, innerRadius: 0};
}

function splitCodeAndComment(line: string): {code: string, comment: string} {
  const commentIndex = line.indexOf(';');
  return commentIndex >= 0
    ? {code: line.substring(0, commentIndex).trimEnd(), comment: line.substring(commentIndex).trim()}
    : {code: line.trimEnd(), comment: ''};
}

function joinCodeAndComment(code: string, comment: string): string {
  return `${code.trimEnd()}${comment ? ` ${comment}` : ''}`.trimEnd();
}

function formatGeneratedNumber(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function tryReadJsonLatheCode(text: string): string | null {
  if (!text.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(text) as {lathecode?: unknown, latheCode?: unknown};
    if (typeof parsed.lathecode === 'string') return parsed.lathecode;
    if (typeof parsed.latheCode === 'string') return parsed.latheCode;
  } catch {
    return null;
  }
  return null;
}

function validateGeneratedLatheCode(text: string) {
  let latheCode: LatheCode;
  try {
    latheCode = new LatheCode(text);
  } catch (error) {
    throw new Error(formatLatheCodeValidationError(error, text));
  }
  if (!latheCode.getStock()) throw new Error('missing valid STOCK dimensions');
  if (!latheCode.getProfiles().length) throw new Error('missing profile L lines');
}

function formatLatheCodeValidationError(error: unknown, text: string): string {
  if (!(error instanceof LatheCodeSyntaxError)) {
    const message = error instanceof Error ? error.message : String(error);
    const hint = getValidationHint(message);
    return `${message}${hint ? `\nHint: ${hint}` : ''}`;
  }

  const line = text.split(/\n/)[error.line - 1] ?? '';
  const hint = getSyntaxHint(error.message, line);
  return `${error.message}
Line ${error.line}: ${line || '(empty)'}${hint ? `\nHint: ${hint}` : ''}`;
}

function getValidationHint(message: string): string {
  if (message.includes('chamfer or fillet requires a radial edge')) {
    return 'CH/FI can only be used at a real radial shoulder or an angled corner between straight/tapered lines. Remove endpoint CH/FI from smooth or collinear segment joins.';
  }
  return '';
}

function getSyntaxHint(message: string, line: string): string {
  if (message.includes('Expected digit') && /\b(CUT|FINISH|MOVE|PASS|PART|ID|IR|DS|DE|RS|RE|CH|FI|NA|R|D|L|H|A)\s+[0-9.]/.test(line)) {
    return 'lathecode numeric parameters have no space between the name and value, for example CUT1, MOVE100, L5, R5, DS5, RE10, CH0.5, or FI0.5.';
  }
  if (message.includes('Invalid lathe line') && /\b[DR]S[0-9.]+\s*$/.test(line)) {
    return 'DS and RS are start values for curved or tapered lines and need matching DE or RE. Use D or R for a straight segment, for example L2 D24.';
  }
  if (message.includes('Unexpected line')) {
    if (getSetupDirectiveKeyword(line)) {
      return 'setup directives must appear once in order before profile lines. Remove duplicate setup blocks such as imported STL scaffolds.';
    }
    return 'only setup directives, L profile lines, INSIDE, and comment lines are allowed in generated lathecode.';
  }
  return '';
}

export function formatInvalidGeneratedLatheCodeError(errorMessage: string, returnedText: string): string {
  const fields = [
    'OpenRouter returned invalid lathecode.',
    '',
    'Error:',
    errorMessage,
  ];
  if (returnedText) {
    fields.push('', 'Returned lathecode:', truncateText(returnedText, 800));
  }
  return fields.join('\n');
}

export function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;
}
