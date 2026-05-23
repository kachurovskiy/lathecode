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
export type CommentList = string[];
export type NumericParam<Name extends string> = [Name, number];

export type UnitsDirective = ['UNITS', null, UnitType, string];
export type StockDirective = ['STOCK', null, [RadiusDiameterType, number, NumericParam<StockHoleType> | null, NumericParam<'A'> | null], string];
export type ToolDirective = ['TOOL', null, ToolType, null, [
  NumericParam<'R'> | null,
  NumericParam<'L'> | null,
  NumericParam<'H'> | null,
  NumericParam<'A'> | null,
  NumericParam<'NA'> | null,
], string];
export type DepthDirective = ['DEPTH', null, [
  NumericParam<'CUT'> | null,
  NumericParam<'FINISH'> | null,
], string];
export type FeedDirective = ['FEED', null, [
  NumericParam<'MOVE'> | null,
  NumericParam<'PASS'> | null,
  NumericParam<'PART'> | null,
], string];
export type ModeDirective = ['MODE', null, ModeType, string];
export type AxesDirective = ['AXES', null, [ZDirection, null, XDirection], string];

export type PartingLine = ['L', number, string];
export type StraightLine = ['L', number, RadiusDiameterType, number, string];
export type CurvedLine = ['L', number, SegmentStartType, number, SegmentEndType, number, CurveType | null, string];
export type LatheLine = PartingLine | StraightLine | CurvedLine;
export type LatheEntry = [CommentList, LatheLine];
export type InsideBlock = [CommentList, ['INSIDE', string], LatheEntry[]];

export type ParserData = [
  CommentList,
  UnitsDirective | null,
  CommentList,
  StockDirective | null,
  CommentList,
  ToolDirective | null,
  CommentList,
  DepthDirective | null,
  CommentList,
  FeedDirective | null,
  CommentList,
  ModeDirective | null,
  CommentList,
  AxesDirective | null,
  LatheEntry[],
  InsideBlock | null,
  CommentList,
];

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

    return [
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
    ];
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
      entries.push([comments, parseLathe(this.lines[this.lineIndex], this.lineIndex + 1)]);
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
    return [comments, inside, entries];
  }

  private takeComments(): CommentList {
    const comments: CommentList = [];
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
    return [name, this.float()];
  }

  maybeCurveType(): CurveType | null {
    if (!this.line.startsWith('CONV', this.position) && !this.line.startsWith('CONC', this.position)) return null;
    return this.oneOf(['CONV', 'CONC'] as const);
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
  return [
    cursor.literal('UNITS'),
    cursor.spaces(),
    cursor.oneOf(['MM', 'CM', 'M', 'FT', 'IN'] as const),
    cursor.comment(),
  ];
}

function parseStock(line: string, lineNumber: number): StockDirective {
  const cursor = new LineCursor(line, lineNumber);
  cursor.literal('STOCK');
  const spaces = cursor.spaces();
  const sizeType = cursor.oneOf(['R', 'D'] as const);
  const size = cursor.float();
  const hole = cursor.lineStartsWith('ID') || cursor.lineStartsWith('IR')
    ? [cursor.oneOf(['ID', 'IR'] as const), cursor.float()] as NumericParam<StockHoleType>
    : null;
  const allowance = cursor.maybeParam('A');
  return ['STOCK', spaces, [sizeType, size, hole, allowance], cursor.comment()];
}

function parseTool(line: string, lineNumber: number): ToolDirective {
  const cursor = new LineCursor(line, lineNumber);
  return [
    cursor.literal('TOOL'),
    cursor.spaces(),
    cursor.oneOf(['RECT', 'ROUND', 'ANG'] as const),
    cursor.spaces(),
    [
      cursor.maybeParam('R'),
      cursor.maybeParam('L'),
      cursor.maybeParam('H'),
      cursor.maybeParam('A'),
      cursor.maybeParam('NA'),
    ],
    cursor.comment(),
  ];
}

function parseDepth(line: string, lineNumber: number): DepthDirective {
  const cursor = new LineCursor(line, lineNumber);
  return [
    cursor.literal('DEPTH'),
    cursor.spaces(),
    [
      cursor.maybeParam('CUT'),
      cursor.maybeParam('FINISH'),
    ],
    cursor.comment(),
  ];
}

function parseFeed(line: string, lineNumber: number): FeedDirective {
  const cursor = new LineCursor(line, lineNumber);
  return [
    cursor.literal('FEED'),
    cursor.spaces(),
    [
      cursor.maybeParam('MOVE'),
      cursor.maybeParam('PASS'),
      cursor.maybeParam('PART'),
    ],
    cursor.comment(),
  ];
}

function parseMode(line: string, lineNumber: number): ModeDirective {
  const cursor = new LineCursor(line, lineNumber);
  return [
    cursor.literal('MODE'),
    cursor.spaces(),
    cursor.oneOf(['FACE', 'TURN'] as const),
    cursor.comment(),
  ];
}

function parseAxes(line: string, lineNumber: number): AxesDirective {
  const cursor = new LineCursor(line, lineNumber);
  return [
    cursor.literal('AXES'),
    cursor.spaces(),
    [
      cursor.oneOf(['LEFT', 'RIGHT'] as const),
      cursor.spaces(),
      cursor.oneOf(['UP', 'DOWN'] as const),
    ],
    cursor.comment(),
  ];
}

function parseInside(line: string, lineNumber: number): ['INSIDE', string] {
  const cursor = new LineCursor(line, lineNumber);
  return [cursor.literal('INSIDE'), cursor.comment()];
}

function parseLathe(line: string, lineNumber: number): LatheLine {
  return tryParseLatheVariant(line, lineNumber, parsePartingLine)
    ?? tryParseLatheVariant(line, lineNumber, parseStraightLine)
    ?? tryParseLatheVariant(line, lineNumber, parseCurvedLine)
    ?? failLine(lineNumber, 'Invalid lathe line');
}

function parsePartingLine(cursor: LineCursor): PartingLine {
  return [cursor.literal('L'), cursor.float(), cursor.comment()];
}

function parseStraightLine(cursor: LineCursor): StraightLine {
  return [
    cursor.literal('L'),
    cursor.float(),
    cursor.oneOf(['D', 'R'] as const),
    cursor.float(),
    cursor.comment(),
  ];
}

function parseCurvedLine(cursor: LineCursor): CurvedLine {
  return [
    cursor.literal('L'),
    cursor.float(),
    cursor.oneOf(['DS', 'RS'] as const),
    cursor.float(),
    cursor.oneOf(['DE', 'RE'] as const),
    cursor.float(),
    cursor.maybeCurveType(),
    cursor.comment(),
  ];
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
