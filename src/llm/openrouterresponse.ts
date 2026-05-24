import { truncateText } from './generatedlathecode.ts';

const OPENROUTER_RESPONSE_EXCERPT_LENGTH = 800;

export type OpenRouterResponse = {
  choices?: OpenRouterChoice[],
  error?: {
    message?: string,
  },
};

export type OpenRouterChoice = {
  finish_reason?: string | null,
  native_finish_reason?: string | null,
  message?: {
    content?: unknown,
    reasoning?: unknown,
    reasoning_details?: unknown,
    refusal?: unknown,
  },
};

export function extractAssistantText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map(part => {
    if (typeof part === 'string') return part;
    if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') return part.text;
    return '';
  }).join('');
}

export function formatNoOpenRouterContentError(choice: OpenRouterChoice | undefined): string {
  if (!choice) return 'OpenRouter returned no choices';
  const finishReason = choice.finish_reason ?? choice.native_finish_reason ?? '';
  const fields = ['OpenRouter returned no lathecode content.'];
  if (finishReason) fields.push(`Finish reason: ${finishReason}.`);
  if (hasOpenRouterReasoning(choice.message)) {
    fields.push('The provider returned reasoning text, but message.content was empty, so there was no lathecode to parse.');
  }
  if (finishReason === 'length') {
    fields.push('The response hit the completion token limit before producing final lathecode. Try again or choose a model/settings combination that emits final text with less reasoning.');
  }
  const refusal = extractRefusalText(choice.message?.refusal);
  if (refusal) fields.push(`Refusal: ${truncateText(refusal, 240)}`);

  const excerpt = extractOpenRouterChoiceExcerpt(choice);
  if (excerpt) fields.push('', 'Model response excerpt:', truncateText(excerpt, OPENROUTER_RESPONSE_EXCERPT_LENGTH));
  return fields.join('\n');
}

function hasOpenRouterReasoning(message: OpenRouterChoice['message']): boolean {
  const reasoning = message?.reasoning;
  const reasoningDetails = message?.reasoning_details;
  return (typeof reasoning === 'string' && reasoning.trim().length > 0)
    || (Array.isArray(reasoningDetails) && reasoningDetails.length > 0);
}

function extractRefusalText(refusal: unknown): string {
  if (typeof refusal === 'string') return refusal.trim();
  if (!refusal || typeof refusal !== 'object') return '';
  if ('reason' in refusal && typeof refusal.reason === 'string') return refusal.reason.trim();
  if ('message' in refusal && typeof refusal.message === 'string') return refusal.message.trim();
  return '';
}

function extractOpenRouterChoiceExcerpt(choice: OpenRouterChoice): string {
  const message = choice.message;
  const parts = [
    extractAssistantText(message?.content),
    extractUnknownText(message?.reasoning),
    extractUnknownText(message?.reasoning_details),
    extractUnknownText(message?.refusal),
  ];
  return normalizeExcerptText(parts.filter(Boolean).join('\n'));
}

function extractUnknownText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractUnknownText).filter(Boolean).join('\n');
  if (!value || typeof value !== 'object') return '';
  if ('text' in value && typeof value.text === 'string') return value.text;
  if ('content' in value && typeof value.content === 'string') return value.content;
  if ('message' in value && typeof value.message === 'string') return value.message;
  if ('reason' in value && typeof value.reason === 'string') return value.reason;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function normalizeExcerptText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
