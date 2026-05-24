import { LatheCode } from '../common/lathecode.ts';
import { LatheCodeSyntaxError } from '../common/latheparser.ts';
import {
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_OPENROUTER_VISION_MODEL,
  loadAppSettings,
  type AppSettings,
} from '../common/settings.ts';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_REPAIR_ATTEMPTS = 3;
const OPENROUTER_PROVIDER_PRIVACY = {
  data_collection: 'deny',
  zdr: true,
} as const;

export type TechnicalDrawingImage = {
  name: string,
  dataUrl: string,
};

type OpenRouterContentPart =
  | {type: 'text', text: string}
  | {type: 'image_url', image_url: {url: string}};

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant',
  content: string | OpenRouterContentPart[],
};

type OpenRouterResponse = {
  choices?: {
    message?: {
      content?: unknown,
    },
  }[],
  error?: {
    message?: string,
  },
};

const LATHECODE_SYSTEM_PROMPT = `You generate lathecode for a browser lathe CAM tool. Return only complete raw lathecode text, with no markdown, prose, JSON, or G-code.

Lathecode syntax:
- Comment lines start with ";".
- Optional setup directives come before profile lines and must not be commented out: UNITS MM|CM|M|FT|IN, STOCK D<number>|R<number> with optional ID<number>|IR<number>, TOOL RECT|ROUND|ANG, DEPTH CUT<number> FINISH<number>, FEED MOVE<number> PASS<number> PART<number>, MODE FACE|TURN.
- Do not add AXES directives; axis direction is configured outside LLM-generated lathecode. When modifying existing lathecode, preserve an existing AXES line only if it is already present.
- Use MM unless the request clearly asks for another unit.
- For typical external turning, include STOCK, TOOL, DEPTH, and outside profile lines.
- Lathecode pieces are assembled right-to-left: profile lines start at the right/free/end of the part and proceed left toward the chuck side.
- Straight profile line: L<length> R<radius> or L<length> D<diameter>. Add CH<size> for chamfers or FI<size> for fillets on both ends, for example L6 D19.6 CH0.5 or L20 D10 FI0.5.
- Tapered or endpoint-specific profile line: L<length> RS<startRadius> RE<endRadius>, or use DS/DE for diameters. Endpoint features can follow start/end values, for example L20 DS10 FI0.5 DE10 CH1. Do not use DS or RS unless the same line also has matching DE or RE.
- CH and FI sizes are measured along the segment's horizontal L distance, so their combined endpoint sizes must not exceed that line's L length.
- Curved profile lines add CONV or CONC after DS/DE or RS/RE. Do not use CH or FI on CONV/CONC lines.
- Complex silhouettes may be approximated with many short L lines. Dozens of short straight segments are acceptable when a part has freeform, compound, or drawing-derived curves.
- Numeric parameter names and values are joined with no space: write CUT1, FINISH0.2, MOVE100, R5, L10, DS5, RE10, CH0.5, FI0.5. Do not write CUT 1, MOVE 100, R 5, CH 0.5, or L 10.
- A bare L<length> line is a parting or cutoff-width line.
- INSIDE begins an internal/bore profile. Inside profile radii must stay inside the outside profile and stock.
- Keep all lengths positive. Keep outside radii at or below stock radius. Make stock large enough for the whole part.
- Choose realistic default tooling when unspecified, for example TOOL RECT R0.2 L2 for simple stepped/tapered work or TOOL ROUND R3 for outside concave forms.
- Prefer concise assumption comments when source dimensions are incomplete.`;

export async function createLatheCodeFromPrompt(description: string): Promise<string> {
  const settings = ensureOpenRouterSettings();
  const model = settings.openRouterModel || DEFAULT_OPENROUTER_MODEL;
  return generateValidLatheCode(settings, model, [
    {role: 'system', content: LATHECODE_SYSTEM_PROMPT},
    {
      role: 'user',
      content: `Create a complete lathecode part from this request.

Request:
${description.trim()}`,
    },
  ]);
}

export async function createLatheCodeFromDrawing(images: readonly TechnicalDrawingImage[], notes: string): Promise<string> {
  if (!images.length) throw new Error('Select at least one drawing image');
  const settings = ensureOpenRouterSettings();
  const model = settings.openRouterVisionModel || DEFAULT_OPENROUTER_VISION_MODEL;
  const imageSummary = images.map(image => `- ${image.name}`).join('\n');
  const content: OpenRouterContentPart[] = [
    {
      type: 'text',
      text: `Analyze the uploaded technical drawing image files and create a complete lathecode part.

Use visible dimensions as authoritative. If dimensions or units are missing, infer a practical turned profile, use MM, and add concise ; ASSUMPTION comments. Convert the final part profile to lathecode, not G-code.

Files:
${imageSummary}

Additional notes:
${notes.trim() || '(none)'}`,
    },
    ...images.map(image => ({
      type: 'image_url' as const,
      image_url: {url: image.dataUrl},
    })),
  ];

  return generateValidLatheCode(settings, model, [
    {role: 'system', content: LATHECODE_SYSTEM_PROMPT},
    {role: 'user', content},
  ]);
}

export async function modifyLatheCodeWithPrompt(currentLatheCode: string, modification: string): Promise<string> {
  const settings = ensureOpenRouterSettings();
  const model = settings.openRouterModel || DEFAULT_OPENROUTER_MODEL;
  return generateValidLatheCode(settings, model, [
    {role: 'system', content: LATHECODE_SYSTEM_PROMPT},
    {
      role: 'user',
      content: `Modify the current lathecode according to the user request. Return the full updated lathecode, not a patch.

Preserve existing setup directives, comments, units, stock intent, tool choice, inside/outside structure, and machining-safe dimensions unless the request explicitly changes them.

User request:
${modification.trim()}

Current lathecode:
${currentLatheCode.trim()}`,
    },
  ]);
}

export function readImageFileAsDataUrl(file: File): Promise<TechnicalDrawingImage> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image file`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error(`Could not read ${file.name}`));
        return;
      }
      resolve({name: file.name, dataUrl: result});
    };
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function ensureOpenRouterSettings(): AppSettings {
  const settings = loadAppSettings();
  if (settings.openRouterApiKey.trim()) return settings;
  throw new Error('OpenRouter API key is required');
}

async function generateValidLatheCode(
  settings: AppSettings,
  model: string,
  messages: readonly OpenRouterMessage[],
): Promise<string> {
  let repairMessages = [...messages];
  let lastError: Error | null = null;
  let lastText = '';

  for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS; attempt++) {
    lastText = normalizeGeneratedLatheCode(stripLatheCode(await sendOpenRouterChatCompletion(settings.openRouterApiKey, model, repairMessages)));
    try {
      validateGeneratedLatheCode(lastText);
      return lastText;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      repairMessages = [
        ...messages,
        {role: 'assistant', content: lastText},
        {
          role: 'user',
          content: `The returned lathecode is invalid.

Error:
${lastError.message}

Common syntax fixes:
- Use DEPTH CUT1 FINISH0.2, not DEPTH CUT 1 FINISH 0.2.
- Use FEED MOVE100 PASS50 PART30, not FEED MOVE 100 PASS 50 PART 30.
- Use L5 R5 and L10 RS5 RE10 CONC, not L 5 R 5.
- Use L2 D24 for a straight diameter segment. Use DS24 only when the line also has DE, for example L10 DS24 DE30.
- Use CH0.5 and FI0.5 for chamfers and fillets, not CH 0.5 or FI 0.5. Use them only on straight or tapered lines, not on CONV or CONC lines.
- Keep each CH/FI value within the segment's horizontal L length.
- Do not introduce AXES directives.
- Do not prefix real setup or profile lines with ";". Comments are fine, but ;STOCK D64 is only a comment and does not define stock.

Return a corrected complete lathecode only.`,
        },
      ];
    }
  }

  throw new Error(formatInvalidGeneratedLatheCodeError(lastError?.message ?? 'unknown error', lastText));
}

async function sendOpenRouterChatCompletion(
  apiKey: string,
  model: string,
  messages: readonly OpenRouterMessage[],
): Promise<string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-Title': 'lathecode',
  };
  const referer = getOpenRouterReferer();
  if (referer) headers['HTTP-Referer'] = referer;

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      provider: OPENROUTER_PROVIDER_PRIVACY,
      temperature: 0.2,
      max_completion_tokens: 4096,
      stream: false,
    }),
  });

  const data = await readOpenRouterResponse(response);
  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status}): ${data.error?.message ?? response.statusText}`);
  }

  const content = data.choices?.[0]?.message?.content;
  const text = extractAssistantText(content);
  if (!text.trim()) throw new Error('OpenRouter returned an empty response');
  return text;
}

function getOpenRouterReferer(): string | undefined {
  const origin = window.location.origin;
  return origin && origin !== 'null' ? origin : undefined;
}

async function readOpenRouterResponse(response: Response): Promise<OpenRouterResponse> {
  try {
    return await response.json() as OpenRouterResponse;
  } catch {
    return {};
  }
}

function extractAssistantText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map(part => {
    if (typeof part === 'string') return part;
    if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') return part.text;
    return '';
  }).join('');
}

function stripLatheCode(text: string): string {
  const trimmed = text.trim();
  const jsonLatheCode = tryReadJsonLatheCode(trimmed);
  if (jsonLatheCode) return jsonLatheCode.trim();

  const fenced = trimmed.match(/```(?:lathecode|text|txt)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function normalizeGeneratedLatheCode(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(normalizeGeneratedLatheCodeLine)
    .join('\n')
    .trim();
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
    return error instanceof Error ? error.message : String(error);
  }

  const line = text.split(/\n/)[error.line - 1] ?? '';
  const hint = getSyntaxHint(error.message, line);
  return `${error.message}
Line ${error.line}: ${line || '(empty)'}${hint ? `\nHint: ${hint}` : ''}`;
}

function getSyntaxHint(message: string, line: string): string {
  if (message.includes('Expected digit') && /\b(CUT|FINISH|MOVE|PASS|PART|ID|IR|DS|DE|RS|RE|CH|FI|NA|R|D|L|H|A)\s+[0-9.]/.test(line)) {
    return 'lathecode numeric parameters have no space between the name and value, for example CUT1, MOVE100, L5, R5, DS5, RE10, CH0.5, or FI0.5.';
  }
  if (message.includes('Invalid lathe line') && /\b[DR]S[0-9.]+\s*$/.test(line)) {
    return 'DS and RS are start values for curved or tapered lines and need matching DE or RE. Use D or R for a straight segment, for example L2 D24.';
  }
  if (message.includes('Unexpected line')) {
    return 'only setup directives, L profile lines, INSIDE, and comment lines are allowed in generated lathecode.';
  }
  return '';
}

function formatInvalidGeneratedLatheCodeError(errorMessage: string, returnedText: string): string {
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

function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;
}
