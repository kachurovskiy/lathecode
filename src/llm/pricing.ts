const MODEL_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_KEY = 'lathecode.llm.prices.v1';
const CACHE_AGE_MS = 24 * 60 * 60 * 1000;
let pendingCatalog: Promise<PriceCatalog | null> | null = null;

type ModelPrice = {id: string; prompt: number; completion: number; request: number; image: number};
type PriceCatalog = {fetchedAt: number; models: ModelPrice[]; unavailable?: boolean};
export type CostEstimate = {low: number; high: number; model: string; images: number} | null;
export type EstimateInput = {
  model: string;
  textCharacters: number;
  images: number;
  maxOutputTokens: number;
  reasoning: boolean;
};

export function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function priceNumber(value: unknown): number | null {
  if (typeof value === 'string' && value.trim()) return nonNegativeNumber(Number(value));
  return nonNegativeNumber(value);
}

function readPrice(value: any): ModelPrice | null {
  if (!value || typeof value.id !== 'string') return null;
  const pricing = value.pricing ?? value;
  const prompt = priceNumber(pricing.prompt);
  const completion = priceNumber(pricing.completion);
  const request = priceNumber(pricing.request ?? 0);
  const image = priceNumber(pricing.image ?? 0);
  if (prompt === null || completion === null || request === null || image === null) return null;
  return {id: value.id, prompt, completion, request, image};
}

function cachedCatalog(): PriceCatalog | null {
  try {
    const data = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    const age = Date.now() - data?.fetchedAt;
    if (!Number.isFinite(age) || age < 0 || age >= (data.unavailable ? 60000 : CACHE_AGE_MS) || !Array.isArray(data.models)) return null;
    return {fetchedAt: data.fetchedAt, models: data.models.map(readPrice).filter((price: ModelPrice | null) => price !== null)};
  } catch { return null; }
}

export async function fetchBillingJson(url: string, headers?: Record<string, string>): Promise<any> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {headers, signal: controller.signal});
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
  finally { window.clearTimeout(timeout); }
}

async function getCatalog(): Promise<PriceCatalog | null> {
  const cached = cachedCatalog();
  if (cached) return cached;
  if (!pendingCatalog) {
    pendingCatalog = (async () => {
      const data = await fetchBillingJson(MODEL_URL);
      const models = Array.isArray(data?.data) ? data.data.map(readPrice).filter((price: ModelPrice | null) => price !== null) : [];
      const catalog = {fetchedAt: Date.now(), models, unavailable: !Array.isArray(data?.data)};
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(catalog)); } catch { /* Pricing still works without storage. */ }
      return catalog;
    })().finally(() => { pendingCatalog = null; });
  }
  return pendingCatalog;
}

export async function estimateCost(input: EstimateInput): Promise<CostEstimate> {
  const catalog = await getCatalog();
  // Prefer exact variants, including :free. Never price an unknown variant as its base model.
  const price = catalog?.models.find(price => price.id === input.model);
  if (!price) return null;
  // Heuristics, not a quote or spending cap. Count only text, never base64 image bytes.
  // Image tokenization and reasoning vary by provider, so use a broad allowance.
  const lowInput = input.textCharacters / 5 + 32 + input.images * 256;
  const highInput = input.textCharacters / 2 + 64 + input.images * 8192;
  const lowOutput = Math.min(input.reasoning ? 2048 : 512, input.maxOutputTokens);
  const fixed = price.request + price.image * input.images;
  const low = fixed + lowInput * price.prompt + lowOutput * price.completion;
  const high = fixed + highInput * price.prompt + input.maxOutputTokens * price.completion;
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return {low, high, model: input.model, images: input.images};
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.000001) return '<$0.000001';
  return `$${cost.toFixed(cost < 0.01 ? 6 : cost < 1 ? 4 : 2).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')}`;
}

export function formatEstimate(estimate: CostEstimate): string {
  if (!estimate) return 'Estimate unavailable';
  const low = formatCost(Number(estimate.low.toPrecision(2)));
  const high = formatCost(Number(estimate.high.toPrecision(2)));
  return low === high ? 'Estimated cost: ' + low : 'Estimated cost: ' + low + '\u2013' + high;
}
