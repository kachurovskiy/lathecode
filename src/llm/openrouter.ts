import {
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_OPENROUTER_VISION_MODEL,
  loadAppSettings,
  type AppSettings,
} from '../common/settings.ts';
import {
  formatInvalidGeneratedLatheCodeError,
  normalizeGeneratedLatheCode,
  stripLatheCode,
  validateOrRepairGeneratedLatheCode,
} from './generatedlathecode.ts';
import {
  extractAssistantText,
  formatNoOpenRouterContentError,
  type OpenRouterResponse,
} from './openrouterresponse.ts';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_REPAIR_REQUESTS = 2;
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
- Use CH and FI only at endpoints with an actual radial shoulder where the neighboring profile radius changes. Do not add FI or CH to every segment in a polyline curve approximation.
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
  const current = splitInitialCommentPrefix(currentLatheCode);
  const latheCodeForPrompt = current.body.trim() || currentLatheCode.trim();
  const generated = await generateValidLatheCode(settings, model, [
    {role: 'system', content: LATHECODE_SYSTEM_PROMPT},
    {
      role: 'user',
      content: `Modify the current lathecode according to the user request. Return the full updated lathecode, not a patch.

Preserve existing setup directives, comments, units, stock intent, tool choice, inside/outside structure, and machining-safe dimensions unless the request explicitly changes them.

User request:
${modification.trim()}

Current lathecode:
${latheCodeForPrompt}`,
    },
  ]);
  return prependInitialCommentPrefix(current.prefix, generated);
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

function splitInitialCommentPrefix(text: string): {prefix: string, body: string} {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let bodyStart = 0;
  while (bodyStart < lines.length && isInitialCommentPrefixLine(lines[bodyStart])) {
    bodyStart++;
  }
  return {
    prefix: lines.slice(0, bodyStart).join('\n').trimEnd(),
    body: lines.slice(bodyStart).join('\n'),
  };
}

function isInitialCommentPrefixLine(line: string): boolean {
  return !line.trim() || /^\s*;/.test(line);
}

function prependInitialCommentPrefix(prefix: string, text: string): string {
  const trimmedPrefix = prefix.trimEnd();
  if (!trimmedPrefix) return text;
  return `${trimmedPrefix}\n\n${text.trim()}`;
}

async function generateValidLatheCode(
  settings: AppSettings,
  model: string,
  messages: readonly OpenRouterMessage[],
): Promise<string> {
  let repairMessages = [...messages];
  let lastError: Error | null = null;
  let lastText = '';

  for (let attempt = 0; attempt <= MAX_REPAIR_REQUESTS; attempt++) {
    lastText = normalizeGeneratedLatheCode(stripLatheCode(await sendOpenRouterChatCompletion(settings.openRouterApiKey, model, repairMessages)));
    try {
      return validateOrRepairGeneratedLatheCode(lastText);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      repairMessages = [
        ...repairMessages,
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
- Use CH/FI only at real radial shoulders. Remove endpoint CH/FI when the neighboring line starts or ends at the same radius or diameter.
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

  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  const text = extractAssistantText(content);
  if (!text.trim()) throw new Error(formatNoOpenRouterContentError(choice));
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
