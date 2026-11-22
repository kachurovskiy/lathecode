import {fetchBillingJson, formatCost, nonNegativeNumber, type CostEstimate} from './pricing.ts';
import type {OpenRouterResponse} from './openrouterresponse.ts';

const PREFIX = 'lathecode.llm.usage.v1.';
const EPOCH_KEY = 'lathecode.llm.usageEpoch';
const activeOperations = new Set<string>();
const recoveryAttempts = new Set<string>();
let idSequence = 0;
export const USAGE_CHANGED = 'lathecode:llm-usage';
export type LlmAction = 'prompt' | 'drawing' | 'modify';
export const ACTION_LABELS: Record<LlmAction, string> = {prompt: 'From prompt', drawing: 'From drawing', modify: 'Modification'};
export type RequestUsage = {
  estimate: CostEstimate;
  generationId?: string;
  model: string;
  cost: number | null;
  billing: 'pending' | 'known' | 'unavailable';
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  cachedTokens: number | null;
  byok: boolean;
};
export type UsageRecord = {
  id: string;
  action: LlmAction;
  model: string;
  startedAt: number;
  finishedAt: number | null;
  outcome: 'running' | 'succeeded' | 'failed';
  estimate: CostEstimate;
  requests: RequestUsage[];
};

function epoch(): string {
  try { return localStorage.getItem(EPOCH_KEY) ?? ''; } catch { return ''; }
}

function createUsageId(): string {
  const browserCrypto: Partial<Crypto> | undefined = globalThis.crypto;
  if (typeof browserCrypto?.randomUUID === 'function') return browserCrypto.randomUUID();
  if (typeof browserCrypto?.getRandomValues === 'function') return Array.from(browserCrypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join('-');
  // History IDs are identifiers, not credentials. Support ordinary HTTP origins too.
  return `${Date.now().toString(36)}-${++idSequence}-${Math.random().toString(36).slice(2)}`;
}

function readEstimate(value: any): CostEstimate {
  if (!value || nonNegativeNumber(value.low) === null || nonNegativeNumber(value.high) === null
    || value.high < value.low || typeof value.model !== 'string' || nonNegativeNumber(value.images) === null) return null;
  return {low: value.low, high: value.high, model: value.model, images: value.images};
}

export function loadUsage(): UsageRecord[] {
  const records: UsageRecord[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)!;
      if (!key.startsWith(PREFIX)) continue;
      try {
        const record = JSON.parse(localStorage.getItem(key)!);
        if (!record || typeof record.id !== 'string' || key !== PREFIX + record.id
          || !['prompt', 'drawing', 'modify'].includes(record.action) || typeof record.model !== 'string'
          || nonNegativeNumber(record.startedAt) === null || !['running', 'succeeded', 'failed'].includes(record.outcome)
          || (record.finishedAt !== null && nonNegativeNumber(record.finishedAt) === null)
          || !Array.isArray(record.requests)) continue;
        const requests: RequestUsage[] = record.requests.map((request: any) => ({
          estimate: readEstimate(request?.estimate),
          generationId: typeof request?.generationId === 'string' ? request.generationId : undefined,
          model: typeof request?.model === 'string' ? request.model : record.model,
          cost: nonNegativeNumber(request?.cost),
          billing: nonNegativeNumber(request?.cost) !== null ? 'known'
            : request?.billing === 'pending' && Date.now() - (record.finishedAt ?? record.startedAt) < (record.finishedAt === null ? 3600000 : 60000) ? 'pending' : 'unavailable',
          inputTokens: nonNegativeNumber(request?.inputTokens), outputTokens: nonNegativeNumber(request?.outputTokens),
          reasoningTokens: nonNegativeNumber(request?.reasoningTokens), cachedTokens: nonNegativeNumber(request?.cachedTokens),
          byok: request?.byok === true,
        }));
        records.push({id: record.id, action: record.action, model: record.model, startedAt: record.startedAt,
          finishedAt: record.finishedAt, outcome: record.outcome, estimate: readEstimate(record.estimate), requests});
      } catch { /* Ignore corrupt or unrelated local data. */ }
    }
  } catch { /* Storage can be disabled. */ }
  return records.sort((a, b) => b.startedAt - a.startedAt);
}

export function clearUsage(): void {
  // In-flight requests may update their notifications, but must not resurrect cleared history.
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)!;
    if (key.startsWith(PREFIX)) keys.push(key);
  }
  const nextEpoch = createUsageId();
  try { localStorage.setItem(EPOCH_KEY, nextEpoch); }
  catch {
    // Free history space before retrying the marker when storage is already full.
    keys.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(EPOCH_KEY, nextEpoch);
  }
  keys.forEach(key => localStorage.removeItem(key));
  window.dispatchEvent(new Event(USAGE_CHANGED));
}

export function usageTotal(records: readonly UsageRecord[]) {
  const requests = records.flatMap(record => record.requests);
  return {
    cost: requests.reduce((total, request) => total + (request.cost ?? 0), 0),
    known: requests.filter(request => request.cost !== null).length,
    pending: requests.filter(request => request.cost === null && request.billing === 'pending').length,
    unavailable: requests.filter(request => request.cost === null && request.billing !== 'pending').length,
    requests: requests.length,
  };
}

export function formatUsageCost(records: readonly UsageRecord[]): string {
  const total = usageTotal(records);
  const suffix = total.pending ? 'cost pending' : total.unavailable ? 'cost unavailable' : '';
  if (!suffix) return formatCost(total.cost);
  return total.known ? `${formatCost(total.cost)} recorded · ${suffix}` : suffix[0].toUpperCase() + suffix.slice(1);
}

export class UsageOperation {
  readonly record: UsageRecord;
  onChange: (() => void) | null = null;
  stored = true;
  private readonly storageEpoch = epoch();

  constructor(action: LlmAction, model: string, estimate: CostEstimate) {
    this.record = {id: createUsageId(), action, model, estimate, startedAt: Date.now(), finishedAt: null, outcome: 'running', requests: []};
    activeOperations.add(this.record.id);
    this.save();
  }

  startRequest(estimate = this.record.estimate): RequestUsage {
    const request: RequestUsage = {estimate, model: this.record.model, cost: null, billing: 'pending', inputTokens: null,
      outputTokens: null, reasoningTokens: null, cachedTokens: null, byok: false};
    this.record.requests.push(request);
    this.save();
    return request;
  }

  response(request: RequestUsage, data: OpenRouterResponse, apiKey: string): void {
    const usage = data.usage;
    request.generationId = typeof data.id === 'string' && data.id ? data.id : undefined;
    if (typeof data.model === 'string') request.model = data.model;
    request.cost = nonNegativeNumber(usage?.cost);
    request.inputTokens = nonNegativeNumber(usage?.prompt_tokens);
    request.outputTokens = nonNegativeNumber(usage?.completion_tokens);
    request.reasoningTokens = nonNegativeNumber(usage?.completion_tokens_details?.reasoning_tokens);
    request.cachedTokens = nonNegativeNumber(usage?.prompt_tokens_details?.cached_tokens);
    request.byok = usage?.is_byok === true;
    request.billing = request.cost !== null ? 'known' : request.generationId ? 'pending' : 'unavailable';
    this.save();
    if (request.billing === 'pending') void this.reconcile(request, apiKey);
  }

  unavailable(request: RequestUsage): void {
    request.billing = 'unavailable';
    this.save();
  }

  finish(outcome: 'succeeded' | 'failed'): void {
    this.record.outcome = outcome;
    this.record.finishedAt = Date.now();
    this.save();
  }

  private async reconcile(request: RequestUsage, apiKey: string): Promise<void> {
    await reconcileRequest(request, apiKey);
    this.save();
  }

  private save(): void {
    if (this.record.outcome !== 'running' && !this.record.requests.some(request => request.billing === 'pending')) activeOperations.delete(this.record.id);
    try {
      if (epoch() === this.storageEpoch) localStorage.setItem(PREFIX + this.record.id, JSON.stringify(this.record));
    } catch { this.stored = false; }
    this.onChange?.();
    window.dispatchEvent(new Event(USAGE_CHANGED));
  }
}

async function reconcileRequest(request: RequestUsage, apiKey: string): Promise<void> {
  for (const delay of [0, 1000, 3000]) {
    if (delay) await new Promise(resolve => window.setTimeout(resolve, delay));
    const result = await fetchBillingJson(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(request.generationId!)}`,
      {Authorization: `Bearer ${apiKey}`});
    const data = result?.data;
    const cost = nonNegativeNumber(data?.total_cost);
    if (cost === null) continue;
    request.cost = cost;
    request.billing = 'known';
    request.inputTokens ??= nonNegativeNumber(data.native_tokens_prompt);
    request.outputTokens ??= nonNegativeNumber(data.native_tokens_completion);
    request.reasoningTokens ??= nonNegativeNumber(data.native_tokens_reasoning);
    request.cachedTokens ??= nonNegativeNumber(data.native_tokens_cached);
    request.byok ||= data.is_byok === true;
    if (typeof data.model === 'string') request.model = data.model;
    return;
  }
  request.billing = 'unavailable';
}

export async function resumePendingUsage(apiKey: string): Promise<void> {
  if (!apiKey.trim()) return;
  const storageEpoch = epoch();
  for (const record of loadUsage()) {
    if (activeOperations.has(record.id)) continue;
    const unresolved = record.requests.filter(request => request.cost === null && request.generationId);
    for (const request of unresolved) {
      const key = `${record.id}/${request.generationId}/${apiKey}`;
      if (recoveryAttempts.has(key)) continue;
      recoveryAttempts.add(key);
      await reconcileRequest(request, apiKey);
      if (epoch() !== storageEpoch) return;
      // Merge into current storage so concurrent recoveries and cleared history stay intact.
      const current = loadUsage().find(candidate => candidate.id === record.id);
      const target = current?.requests.find(candidate => candidate.generationId === request.generationId);
      if (!current || !target || target.cost !== null) continue;
      Object.assign(target, request);
      try { localStorage.setItem(PREFIX + current.id, JSON.stringify(current)); } catch { /* Keep existing history if storage is unavailable. */ }
      window.dispatchEvent(new Event(USAGE_CHANGED));
    }
  }
}
