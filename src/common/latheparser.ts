export type UnitType = 'MM' | 'CM' | 'M' | 'FT' | 'IN';
export type ToolType = 'RECT' | 'ROUND' | 'ANG';
export type ModeType = 'FACE' | 'TURN';
export type ZDirection = 'LEFT' | 'RIGHT';
export type XDirection = 'UP' | 'DOWN';
export type RadiusDiameterType = 'R' | 'D';
export type StockHoleType = 'IR' | 'ID';
export type SegmentStartType = 'DS' | 'RS';
export type SegmentEndType = 'DE' | 'RE';
export type CurveType = 'CONV' | 'CONC';
export type EdgeFeatureType = 'CH' | 'FI';
export type CommentList = readonly string[];

export interface NumericParam<Name extends string> {
  readonly name: Name;
  readonly value: number;
}

export type EdgeFeature = NumericParam<EdgeFeatureType>;

export interface UnitsDirective {
  readonly keyword: 'UNITS';
  readonly unit: UnitType;
  readonly comment: string;
}

export interface StockDirective {
  readonly keyword: 'STOCK';
  readonly sizeType: RadiusDiameterType;
  readonly size: number;
  readonly hole: NumericParam<StockHoleType> | null;
  readonly allowance: NumericParam<'A'> | null;
  readonly comment: string;
}

export interface ToolDirective {
  readonly keyword: 'TOOL';
  readonly type: ToolType;
  readonly radius: NumericParam<'R'> | null;
  readonly length: NumericParam<'L'> | null;
  readonly height: NumericParam<'H'> | null;
  readonly angle: NumericParam<'A'> | null;
  readonly noseAngle: NumericParam<'NA'> | null;
  readonly comment: string;
}

export interface DepthDirective {
  readonly keyword: 'DEPTH';
  readonly cut: NumericParam<'CUT'> | null;
  readonly finish: NumericParam<'FINISH'> | null;
  readonly comment: string;
}

export interface FeedDirective {
  readonly keyword: 'FEED';
  readonly move: NumericParam<'MOVE'> | null;
  readonly pass: NumericParam<'PASS'> | null;
  readonly part: NumericParam<'PART'> | null;
  readonly comment: string;
}

export interface ModeDirective {
  readonly keyword: 'MODE';
  readonly mode: ModeType;
  readonly comment: string;
}

export interface AxesDirective {
  readonly keyword: 'AXES';
  readonly zDirection: ZDirection;
  readonly xDirection: XDirection;
  readonly comment: string;
}

export interface InsideDirective {
  readonly keyword: 'INSIDE';
  readonly comment: string;
}

export interface PartingLine {
  readonly kind: 'parting';
  readonly length: number;
  readonly comment: string;
}

export interface StraightLine {
  readonly kind: 'straight';
  readonly length: number;
  readonly sizeType: RadiusDiameterType;
  readonly size: number;
  readonly comment: string;
  readonly startFeature: EdgeFeature | null;
  readonly endFeature: EdgeFeature | null;
}

export interface CurvedLine {
  readonly kind: 'curved';
  readonly length: number;
  readonly startType: SegmentStartType;
  readonly start: number;
  readonly endType: SegmentEndType;
  readonly end: number;
  readonly curveType: CurveType | null;
  readonly comment: string;
  readonly startFeature: EdgeFeature | null;
  readonly endFeature: EdgeFeature | null;
}

export type LatheLine = PartingLine | StraightLine | CurvedLine;

export interface LatheEntry {
  readonly comments: CommentList;
  readonly line: LatheLine;
}

export interface InsideBlock {
  readonly comments: CommentList;
  readonly directive: InsideDirective;
  readonly entries: readonly LatheEntry[];
}

export interface ParserData {
  readonly leadingComments: CommentList;
  readonly units: UnitsDirective | null;
  readonly afterUnitsComments: CommentList;
  readonly stock: StockDirective | null;
  readonly afterStockComments: CommentList;
  readonly tool: ToolDirective | null;
  readonly afterToolComments: CommentList;
  readonly depth: DepthDirective | null;
  readonly afterDepthComments: CommentList;
  readonly feed: FeedDirective | null;
  readonly afterFeedComments: CommentList;
  readonly mode: ModeDirective | null;
  readonly afterModeComments: CommentList;
  readonly axes: AxesDirective | null;
  readonly outside: readonly LatheEntry[];
  readonly inside: InsideBlock | null;
  readonly trailingComments: CommentList;
}

export class LatheCodeSyntaxError extends Error {
  constructor(message: string, readonly line: number, readonly column: number) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'LatheCodeSyntaxError';
  }
}

export function parseLatheCode(input: string): ParserData {
  return new LatheCodeParser(input).parse();
}

class LatheCodeParser {
  private readonly lines: string[];
  private lineIndex = 0;

  constructor(input: string) {
    this.lines = splitLines(input);
  }

  parse(): ParserData {
    const leadingComments = this.takeComments();
    const units = this.takeOptionalDirective('UNITS', parseUnits);
    const afterUnitsComments = this.takeComments();
    const stock = this.takeOptionalDirective('STOCK', parseStock);
    const afterStockComments = this.takeComments();
    const tool = this.takeOptionalDirective('TOOL', parseTool);
    const afterToolComments = this.takeComments();
    const depth = this.takeOptionalDirective('DEPTH', parseDepth);
    const afterDepthComments = this.takeComments();
    const feed = this.takeOptionalDirective('FEED', parseFeed);
    const afterFeedComments = this.takeComments();
    const mode = this.takeOptionalDirective('MODE', parseMode);
    const afterModeComments = this.takeComments();
    const axes = this.takeOptionalDirective('AXES', parseAxes);
    const outside = this.takeLatheEntries();
    const inside = this.takeInsideBlock();
    const trailingComments = this.takeComments();

    if (!this.isDone()) {
      this.fail(`Unexpected line "${this.lines[this.lineIndex]}"`);
    }

    return {
      leadingComments,
      units,
      afterUnitsComments,
      stock,
      afterStockComments,
      tool,
      afterToolComments,
      depth,
      afterDepthComments,
      feed,
      afterFeedComments,
      mode,
      afterModeComments,
      axes,
      outside,
      inside,
      trailingComments,
    };
  }

  private takeOptionalDirective<T>(keyword: string, parseDirective: (line: string, lineNumber: number) => T): T | null {
    if (this.isDone() || !this.lines[this.lineIndex].startsWith(keyword)) return null;
    const result = parseDirective(this.lines[this.lineIndex], this.lineIndex + 1);
    this.lineIndex++;
    return result;
  }

  private takeLatheEntries(): LatheEntry[] {
    const entries: LatheEntry[] = [];
    while (!this.isDone()) {
      const startIndex = this.lineIndex;
      const comments = this.takeComments();
      if (this.isDone() || !this.lines[this.lineIndex].startsWith('L')) {
        this.lineIndex = startIndex;
        break;
      }
      entries.push({comments, line: parseLathe(this.lines[this.lineIndex], this.lineIndex + 1)});
      this.lineIndex++;
    }
    return entries;
  }

  private takeInsideBlock(): InsideBlock | null {
    const startIndex = this.lineIndex;
    const comments = this.takeComments();
    if (this.isDone() || !this.lines[this.lineIndex].startsWith('INSIDE')) {
      this.lineIndex = startIndex;
      return null;
    }

    const inside = parseInside(this.lines[this.lineIndex], this.lineIndex + 1);
    this.lineIndex++;
    const entries = this.takeLatheEntries();
    if (!entries.length) {
      this.fail('Expected lathe line after INSIDE');
    }
    return {comments, directive: inside, entries};
  }

  private takeComments(): CommentList {
    const comments: string[] = [];
    while (!this.isDone() && isCommentLine(this.lines[this.lineIndex])) {
      comments.push(commentText(this.lines[this.lineIndex]));
      this.lineIndex++;
    }
    return comments;
  }

  private isDone(): boolean {
    return this.lineIndex >= this.lines.length;
  }

  private fail(message: string): never {
    throw new LatheCodeSyntaxError(message, this.lineIndex + 1, 1);
  }
}

class LineCursor {
  private position = 0;

  constructor(private readonly line: string, private readonly lineNumber: number) {}

  literal<T extends string>(literal: T): T {
    if (!this.line.startsWith(literal, this.position)) this.fail(`Expected "${literal}"`);
    this.position += literal.length;
    return literal;
  }

  oneOf<T extends string>(literals: readonly T[]): T {
    for (const literal of literals) {
      if (this.line.startsWith(literal, this.position)) {
        this.position += literal.length;
        return literal;
      }
    }
    this.fail(`Expected ${literals.map(literal => `"${literal}"`).join(' or ')}`);
  }

  spaces(): null {
    while (this.line[this.position] === ' ') this.position++;
    return null;
  }

  float(): number {
    const start = this.position;
    this.takeDigits();
    if (this.line[this.position] === '.' && isDigit(this.line[this.position + 1])) {
      this.position++;
      this.takeDigits();
    }
    const value = Number.parseFloat(this.line.substring(start, this.position));
    this.spaces();
    return value;
  }

  maybeParam<Name extends string>(name: Name): NumericParam<Name> | null {
    if (!this.line.startsWith(name, this.position)) return null;
    this.literal(name);
    return {name, value: this.float()};
  }

  maybeCurveType(): CurveType | null {
    if (!this.line.startsWith('CONV', this.position) && !this.line.startsWith('CONC', this.position)) return null;
    return this.oneOf(['CONV', 'CONC'] as const);
  }

  maybeEdgeFeature(): EdgeFeature | null {
    if (!this.line.startsWith('CH', this.position) && !this.line.startsWith('FI', this.position)) return null;
    const type = this.oneOf(['CH', 'FI'] as const);
    return {name: type, value: this.float()};
  }

  lineStartsWith(text: string): boolean {
    return this.line.startsWith(text, this.position);
  }

  comment(): string {
    const rest = this.line.substring(this.position);
    if (!isCommentRest(rest)) this.fail('Expected comment or end of line');
    this.position = this.line.length;
    return commentText(rest);
  }

  private takeDigits(): void {
    const start = this.position;
    while (isDigit(this.line[this.position])) this.position++;
    if (this.position === start) this.fail('Expected digit');
  }

  private fail(message: string): never {
    throw new LatheCodeSyntaxError(message, this.lineNumber, this.position + 1);
  }
}

function parseUnits(line: string, lineNumber: number): UnitsDirective {
  const cursor = new LineCursor(line, lineNumber);
  cursor.literal('UNITS');
  cursor.spaces();
  return {
    keyword: 'UNITS',
    unit: cursor.oneOf(['MM', 'CM', 'M', 'FT', 'IN'] as const),
    comment: cursor.comment(),
  };
}

function parseStock(line: string, lineNumber: number): StockDirective {
  const cursor = new LineCursor(line, lineNumber);
  cursor.literal('STOCK');
  cursor.spaces();
  const sizeType = cursor.oneOf(['R', 'D'] as const);
  const size = cursor.float();
  const hole = cursor.lineStartsWith('ID') || cursor.lineStartsWith('IR')
    ? {name: cursor.oneOf(['ID', 'IR'] as const), value: cursor.float()} as NumericParam<StockHoleType>
    : null;
  const allowance = cursor.maybeParam('A');
  return {
    keyword: 'STOCK',
    sizeType,
    size,
    hole,
    allowance,
    comment: cursor.comment(),
  };
}

function parseTool(line: string, lineNumber: number): ToolDirective {
  const cursor = new LineCursor(line, lineNumber);
  cursor.literal('TOOL');
  cursor.spaces();
  const type = cursor.oneOf(['RECT', 'ROUND', 'ANG'] as const);
  cursor.spaces();
  return {
    keyword: 'TOOL',
    type,
    radius: cursor.maybeParam('R'),
    length: cursor.maybeParam('L'),
    height: cursor.maybeParam('H'),
    angle: cursor.maybeParam('A'),
    noseAngle: cursor.maybeParam('NA'),
    comment: cursor.comment(),
  };
}

function parseDepth(line: string, lineNumber: number): DepthDirective {
  const cursor = new LineCursor(line, lineNumber);
  cursor.literal('DEPTH');
  cursor.spaces();
  return {
    keyword: 'DEPTH',
    cut: cursor.maybeParam('CUT'),
    finish: cursor.maybeParam('FINISH'),
    comment: cursor.comment(),
  };
}

function parseFeed(line: string, lineNumber: number): FeedDirective {
  const cursor = new LineCursor(line, lineNumber);
  cursor.literal('FEED');
  cursor.spaces();
  return {
    keyword: 'FEED',
    move: cursor.maybeParam('MOVE'),
    pass: cursor.maybeParam('PASS'),
    part: cursor.maybeParam('PART'),
    comment: cursor.comment(),
  };
}

function parseMode(line: string, lineNumber: number): ModeDirective {
  const cursor = new LineCursor(line, lineNumber);
  cursor.literal('MODE');
  cursor.spaces();
  return {
    keyword: 'MODE',
    mode: cursor.oneOf(['FACE', 'TURN'] as const),
    comment: cursor.comment(),
  };
}

function parseAxes(line: string, lineNumber: number): AxesDirective {
  const cursor = new LineCursor(line, lineNumber);
  cursor.literal('AXES');
  cursor.spaces();
  const zDirection = cursor.oneOf(['LEFT', 'RIGHT'] as const);
  cursor.spaces();
  return {
    keyword: 'AXES',
    zDirection,
    xDirection: cursor.oneOf(['UP', 'DOWN'] as const),
    comment: cursor.comment(),
  };
}

function parseInside(line: string, lineNumber: number): InsideDirective {
  const cursor = new LineCursor(line, lineNumber);
  cursor.literal('INSIDE');
  return {
    keyword: 'INSIDE',
    comment: cursor.comment(),
  };
}

function parseLathe(line: string, lineNumber: number): LatheLine {
  return tryParseLatheVariant(line, lineNumber, parsePartingLine)
    ?? tryParseLatheVariant(line, lineNumber, parseStraightLine)
    ?? tryParseLatheVariant(line, lineNumber, parseCurvedLine)
    ?? failLine(lineNumber, 'Invalid lathe line');
}

function parsePartingLine(cursor: LineCursor): PartingLine {
  cursor.literal('L');
  return {
    kind: 'parting',
    length: cursor.float(),
    comment: cursor.comment(),
  };
}

function parseStraightLine(cursor: LineCursor): StraightLine {
  cursor.literal('L');
  const length = cursor.float();
  const sizeType = cursor.oneOf(['D', 'R'] as const);
  const size = cursor.float();
  const feature = cursor.maybeEdgeFeature();
  return {
    kind: 'straight',
    length,
    sizeType,
    size,
    comment: cursor.comment(),
    startFeature: feature,
    endFeature: feature,
  };
}

function parseCurvedLine(cursor: LineCursor): CurvedLine {
  cursor.literal('L');
  const length = cursor.float();
  const startType = cursor.oneOf(['DS', 'RS'] as const);
  const start = cursor.float();
  const startFeature = cursor.maybeEdgeFeature();
  const endType = cursor.oneOf(['DE', 'RE'] as const);
  const end = cursor.float();
  const endFeature = cursor.maybeEdgeFeature();
  const curveType = cursor.maybeCurveType();
  return {
    kind: 'curved',
    length,
    startType,
    start,
    endType,
    end,
    curveType,
    comment: cursor.comment(),
    startFeature,
    endFeature,
  };
}

function tryParseLatheVariant<T extends LatheLine>(line: string, lineNumber: number, parseVariant: (cursor: LineCursor) => T): T | null {
  try {
    return parseVariant(new LineCursor(line, lineNumber));
  } catch (error) {
    if (error instanceof LatheCodeSyntaxError) return null;
    throw error;
  }
}

function splitLines(input: string): string[] {
  const lines: string[] = [];
  let position = 0;
  while (position < input.length) {
    const newline = input.indexOf('\n', position);
    if (newline === -1) {
      throw new LatheCodeSyntaxError('Expected end of line', lines.length + 1, input.length - position + 1);
    }
    const lineEnd = input[newline - 1] === '\r' ? newline - 1 : newline;
    lines.push(input.substring(position, lineEnd));
    position = newline + 1;
  }
  return lines;
}

function isCommentLine(line: string): boolean {
  return isCommentRest(line);
}

function isCommentRest(rest: string): boolean {
  return /^ *(?:;.*)?$/.test(rest);
}

function commentText(text: string): string {
  return text.substring(1).trim();
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9';
}

function failLine(lineNumber: number, message: string): never {
  throw new LatheCodeSyntaxError(message, lineNumber, 1);
}
