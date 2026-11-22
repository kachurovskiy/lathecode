import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createLatheCodeFromDrawing, createLatheCodeFromPrompt, estimateDrawingCost, estimateModificationCost, estimatePromptCost} from './openrouter';
import {estimateCost, formatCost} from './pricing';
import {clearUsage, formatUsageCost, loadUsage, resumePendingUsage, UsageOperation, usageTotal, type UsageRecord} from './usage';
import {createCostEstimateControl, createUsageNotification, createUsageSection} from './usageui';
import {openSettingsDialog} from '../start/settingsdialog';

const MODEL = 'test/model';
const VALID = 'UNITS MM\nSTOCK D10\nL5 D8';
const prices = [{id: MODEL, pricing: {prompt: '0.000002', completion: '0.00001', request: '0.001', image: '0.002'}}];
const response = (data: unknown, ok = true) => ({ok, status: ok ? 200 : 500, statusText: ok ? 'OK' : 'Error', json: async () => data});
const completion = (cost: number | null, content = VALID) => ({
  model: MODEL, choices: [{message: {content}}],
  usage: {cost, prompt_tokens: 1000, completion_tokens: 400, completion_tokens_details: {reasoning_tokens: 200}, prompt_tokens_details: {cached_tokens: 500}},
});

function mockNetwork(completions: unknown[], generations: unknown[] = []) {
  let index = 0;
  let generation = 0;
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith('/models')) return response({data: prices});
    if (url.includes('/generation?')) return response(generations[Math.min(generation++, generations.length - 1)] ?? {});
    if (url.endsWith('/chat/completions')) return response(completions[Math.min(index++, completions.length - 1)]);
    throw new Error(`Unexpected URL: ${url}`);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.innerHTML = '';
  localStorage.setItem('openRouterApiKey', 'sk-test-secret');
  localStorage.setItem('openRouterModel', MODEL);
  localStorage.setItem('openRouterVisionModel', MODEL);
});

afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll<HTMLButtonElement>('[aria-label="Dismiss cost notification"]').forEach(button => button.click());
});

describe('cost estimates', () => {
  it('uses live prices, includes system/source text and images, caches rates, and never sends prompt contents for estimates', async () => {
    const fetch = mockNetwork([]);
    const [short, long, drawing, modify] = await Promise.all([
      estimatePromptCost('shaft'), estimatePromptCost('shaft '.repeat(1000)),
      estimateDrawingCost([{name: 'drawing.png'}], 'secret notes'), estimateModificationCost(VALID, 'secret modification'),
    ]);
    expect(short!.low).toBeGreaterThan(0.005);
    expect(long!.low).toBeGreaterThan(short!.low);
    expect(drawing!.high).toBeGreaterThan(short!.high);
    expect(modify!.low).toBeGreaterThan(short!.low);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/models');
    expect(JSON.stringify(fetch.mock.calls)).not.toContain('secret');
    await estimatePromptCost('another request');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes expired prices and handles free, unknown, variant and dynamic prices honestly', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => response({data: [...prices,
      {id: MODEL + ':free', pricing: {prompt: '0', completion: '0'}},
      {id: 'dynamic', pricing: {prompt: '-1', completion: '0.01'}},
    ]}));
    vi.stubGlobal('fetch', fetch);
    const input = {model: MODEL, textCharacters: 100, images: 0, maxOutputTokens: 4096, reasoning: false};
    expect(await estimateCost({...input, model: MODEL + ':free'})).toMatchObject({low: 0, high: 0});
    expect(await estimateCost({...input, model: MODEL + ':nitro'})).toBeNull();
    expect(await estimateCost({...input, model: 'dynamic'})).toBeNull();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    await estimateCost(input);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(formatCost(0.0000001)).toBe('<$0.000001');
    expect(formatCost(0.000123)).toBe('$0.000123');
  });

  it('times out unavailable pricing without blocking generation or inventing an estimate', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => url.endsWith('/models')
      ? new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))))
      : Promise.resolve(response(completion(0.02)))));
    const result = createLatheCodeFromPrompt('shaft');
    await vi.advanceTimersByTimeAsync(5000);
    expect(await result).toBe(VALID);
    expect(loadUsage()[0]).toMatchObject({estimate: null, outcome: 'succeeded'});
    expect(usageTotal(loadUsage()).cost).toBe(0.02);
  });

  it('ignores outdated estimates and stops updates after the dialog closes', async () => {
    let resolveFirst!: (value: null) => void;
    const first = new Promise<null>(resolve => {resolveFirst = resolve;});
    const getEstimate = vi.fn().mockReturnValueOnce(first).mockResolvedValue({low: 0.01, high: 0.02, model: MODEL, images: 0});
    const control = createCostEstimateControl(getEstimate);
    await control.refresh();
    resolveFirst(null);
    await first;
    expect(control.element.textContent).toContain('$0.01–$0.02');
    control.dispose();
  });
});

describe('operation accounting', () => {
  it.each([true, false])('supports browsers without randomUUID (crypto available: %s)', async hasCrypto => {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal('crypto', hasCrypto ? {getRandomValues} : undefined);
    const fetch = mockNetwork([completion(0.01)]);
    expect(await createLatheCodeFromPrompt('shaft')).toBe(VALID);
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/chat/completions'))).toHaveLength(1);
    expect(loadUsage()).toHaveLength(1);
    expect(() => clearUsage()).not.toThrow();
  });

  it('recovers a persisted charge after reload, even if its pending status has expired', async () => {
    const record = savePendingRecord();
    const fetch = mockNetwork([], [{data: {total_cost: 0.027, native_tokens_prompt: 1000}}]);
    await resumePendingUsage('sk-test-secret');
    expect(fetch.mock.calls.filter(([url]) => url.includes('/generation?'))).toHaveLength(1);
    expect(loadUsage()[0]).toMatchObject({id: record.id, outcome: 'succeeded'});
    expect(usageTotal(loadUsage())).toMatchObject({cost: 0.027, known: 1, requests: 1});
    await resumePendingUsage('sk-test-secret');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not resurrect cleared history when a resumed lookup finishes', async () => {
    savePendingRecord();
    let finish!: (value: ReturnType<typeof response>) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => {finish = resolve;})));
    const recovery = resumePendingUsage('sk-test-secret');
    clearUsage();
    finish(response({data: {total_cost: 0.05}}));
    await recovery;
    expect(loadUsage()).toEqual([]);
  });

  it('clears usage history when the actual localStorage quota is exhausted', () => {
    const operation = new UsageOperation('prompt', MODEL, null);
    operation.response(operation.startRequest(), completion(0.01), 'secret');
    operation.finish('succeeded');
    let low = 0;
    let high = 5_000_000;
    while (low < high) {
      const size = Math.ceil((low + high) / 2);
      try { localStorage.setItem('quota-padding', 'x'.repeat(size)); low = size; }
      catch { high = size - 1; }
    }
    expect(() => localStorage.setItem('lathecode.llm.usageEpoch', 'new-epoch')).toThrow();
    expect(() => clearUsage()).not.toThrow();
    expect(loadUsage()).toEqual([]);
    expect(localStorage.getItem('openRouterApiKey')).toBe('sk-test-secret');
    expect(localStorage.getItem('quota-padding')!.length).toBe(low);
    operation.finish('succeeded');
    expect(loadUsage()).toEqual([]);
  });

  it('sums repair attempts and records usage before validation without storing prompts, images or keys', async () => {
    mockNetwork([completion(0.01, 'not lathecode'), completion(0.02)]);
    expect(await createLatheCodeFromDrawing([{name: 'private drawing', dataUrl: 'data:image/png;base64,PRIVATE'}], 'private notes')).toBe(VALID);
    const records = loadUsage();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({action: 'drawing', outcome: 'succeeded'});
    expect(records[0].requests).toHaveLength(2);
    expect(records[0].requests[1].estimate!.high).toBeGreaterThan(records[0].requests[0].estimate!.high);
    expect(usageTotal(records)).toMatchObject({cost: 0.03, known: 2, pending: 0, unavailable: 0});
    expect(records[0].requests[0]).toMatchObject({inputTokens: 1000, outputTokens: 400, reasoningTokens: 200, cachedTokens: 500});
    expect(JSON.stringify(records)).not.toMatch(/PRIVATE|private notes|private drawing|sk-test-secret/);
    expect(document.querySelectorAll('.llmNotification')).toHaveLength(1);
    expect(document.querySelector('.llmNotification')!.textContent).toContain('$0.03 · 2 requests');
  });

  it('keeps charges for exhausted repairs and truncated responses', async () => {
    mockNetwork([completion(0.01, 'invalid')]);
    await expect(createLatheCodeFromPrompt('shaft')).rejects.toThrow();
    expect(loadUsage()[0]).toMatchObject({outcome: 'failed'});
    expect(usageTotal(loadUsage())).toMatchObject({cost: 0.03, requests: 3});
    clearUsage();
    mockNetwork([{...completion(0.04), choices: [{finish_reason: 'length', message: {content: VALID}}]}]);
    await expect(createLatheCodeFromPrompt('shaft')).rejects.toThrow('incomplete');
    expect(usageTotal(loadUsage())).toMatchObject({cost: 0.04, requests: 1});
    expect(loadUsage()[0].outcome).toBe('failed');
  });

  it('distinguishes missing charges and known subtotals from zero', async () => {
    mockNetwork([completion(0.01, 'invalid'), completion(null)]);
    await createLatheCodeFromPrompt('shaft');
    expect(formatUsageCost(loadUsage())).toBe('$0.01 recorded · cost unavailable');
    clearUsage();
    mockNetwork([completion(0)]);
    await createLatheCodeFromPrompt('shaft');
    expect(formatUsageCost(loadUsage())).toBe('$0.00');
  });

  it('reconciles a pending generation without delaying acceptance or double-counting cost', async () => {
    vi.useFakeTimers();
    const fetch = mockNetwork([{...completion(null), id: 'gen/id'}], [{}, {data: {total_cost: 0.025, native_tokens_prompt: 1200}}]);
    expect(await createLatheCodeFromPrompt('shaft')).toBe(VALID);
    expect(loadUsage()[0].outcome).toBe('succeeded');
    expect(formatUsageCost(loadUsage())).toBe('Cost pending');
    await vi.advanceTimersByTimeAsync(1000);
    expect(usageTotal(loadUsage())).toMatchObject({cost: 0.025, known: 1, requests: 1});
    expect(fetch.mock.calls.filter(([url]) => url.includes('gen%2Fid'))).toHaveLength(2);
    expect(document.querySelector('.llmNotification')!.textContent).toContain('$0.025');
  });

  it('marks unresolved billing unavailable after bounded retries', async () => {
    vi.useFakeTimers();
    mockNetwork([{...completion(null), id: 'gen-missing'}]);
    await createLatheCodeFromPrompt('shaft');
    await vi.advanceTimersByTimeAsync(4000);
    expect(formatUsageCost(loadUsage())).toBe('Cost unavailable');
  });

  it('records network failures as unknown cost', async () => {
    await estimatePromptCostWithPrices();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));
    await expect(createLatheCodeFromPrompt('shaft')).rejects.toThrow('network failed');
    expect(loadUsage()[0].outcome).toBe('failed');
    expect(formatUsageCost(loadUsage())).toBe('Cost unavailable');
  });

  it('keeps concurrent operations separate and does not restore cleared history on late responses', () => {
    const a = new UsageOperation('prompt', MODEL, null);
    const b = new UsageOperation('modify', MODEL, null);
    const requestA = a.startRequest();
    const requestB = b.startRequest();
    a.response(requestA, completion(0.01), 'secret');
    b.response(requestB, completion(0.02), 'secret');
    a.finish('succeeded');
    b.finish('succeeded');
    expect(usageTotal(loadUsage()).cost).toBe(0.03);
    clearUsage();
    a.response(requestA, completion(0.03), 'secret');
    expect(loadUsage()).toEqual([]);
    expect(localStorage.getItem('openRouterApiKey')).toBe('sk-test-secret');
  });

  it('does not break generation if usage storage is full', async () => {
    await estimatePromptCostWithPrices();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {throw new Error('quota');});
    mockNetwork([completion(0.01)]);
    expect(await createLatheCodeFromPrompt('shaft')).toBe(VALID);
    expect(document.querySelector('.llmNotification')!.textContent).toContain('History could not be saved');
  });
});

async function estimatePromptCostWithPrices() {
  mockNetwork([]);
  await estimatePromptCost('shaft');
}

describe('usage UI', () => {
  it('refreshes expired pending status while the usage section stays open', async () => {
    vi.useFakeTimers();
    localStorage.removeItem('openRouterApiKey');
    savePendingRecord(Date.now());
    const section = createUsageSection();
    expect(section.element.textContent).toContain('Cost pending');
    await vi.advanceTimersByTimeAsync(90000);
    expect(section.element.textContent).toContain('Cost unavailable');
    expect(section.element.textContent).not.toContain('Cost pending');
    section.dispose();
  });

  it('keeps active notifications, pauses dismissal on hover/focus, and permits manual dismissal', async () => {
    vi.useFakeTimers();
    const operation = new UsageOperation('prompt', MODEL, null);
    createUsageNotification(operation);
    const notification = document.querySelector<HTMLElement>('.llmNotification')!;
    await vi.advanceTimersByTimeAsync(20000);
    expect(notification.isConnected).toBe(true);
    const request = operation.startRequest();
    operation.response(request, completion(0.01), 'secret');
    operation.finish('succeeded');
    notification.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.advanceTimersByTimeAsync(20000);
    expect(notification.isConnected).toBe(true);
    const view = notification.querySelector<HTMLButtonElement>('button')!;
    view.focus();
    notification.dispatchEvent(new MouseEvent('mouseleave'));
    await vi.advanceTimersByTimeAsync(20000);
    expect(notification.isConnected).toBe(true);
    view.blur();
    await vi.advanceTimersByTimeAsync(10000);
    expect(notification.isConnected).toBe(false);
    createUsageNotification(operation);
    document.querySelector<HTMLButtonElement>('[aria-label="Dismiss cost notification"]')!.click();
    operation.finish('succeeded');
    expect(document.querySelector('.llmNotification')).toBeNull();
  });

  it('updates Settings totals and exports metadata without leaking credentials', async () => {
    const operation = new UsageOperation('drawing', MODEL, null);
    const request = operation.startRequest();
    openSettingsDialog();
    expect(document.querySelector('.llmUsage')!.textContent).toContain('Cost pending');
    operation.response(request, completion(0.035), 'secret');
    operation.finish('succeeded');
    expect(document.querySelector('.llmUsageSummary')!.textContent).toContain('Total recorded: $0.035');
    expect(document.querySelector('.llmUsage')!.textContent).toContain('1000 / 400');
    vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:usage'), revokeObjectURL: vi.fn()});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    Array.from(document.querySelectorAll<HTMLButtonElement>('.llmUsage button')).find(button => button.textContent === 'Export usage')!.click();
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    const exported = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(JSON.parse(exported).operations[0].requests[0].cost).toBe(0.035);
    expect(exported).not.toContain('secret');
    await new Promise(resolve => window.setTimeout(resolve, 0));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:usage');
    Array.from(document.querySelectorAll<HTMLButtonElement>('.llmUsage button')).find(button => button.textContent === 'Clear usage history')!.click();
    expect(document.querySelector('.llmUsage')!.textContent).toContain('No LLM operations');
    expect(localStorage.getItem('openRouterApiKey')).toBe('sk-test-secret');
    document.querySelector<HTMLButtonElement>('.dialogCloseButton')!.click();
  });

  it('ignores corrupted usage records', () => {
    localStorage.setItem('lathecode.llm.usage.v1.bad', '{invalid');
    localStorage.setItem('lathecode.llm.usage.v1.wrong', JSON.stringify({id: 'wrong', action: 'unknown'}));
    const section = createUsageSection();
    expect(section.element.textContent).toContain('No LLM operations');
    section.dispose();
  });
});

let persistedSequence = 0;
function savePendingRecord(finishedAt = Date.now() - 120000): UsageRecord {
  const id = `reloaded-${++persistedSequence}`;
  const record: UsageRecord = {id, action: 'drawing', model: MODEL, startedAt: finishedAt - 1000, finishedAt,
    outcome: 'succeeded', estimate: null, requests: [{generationId: `gen-${id}`, model: MODEL, cost: null,
      billing: 'pending', estimate: null, inputTokens: null, outputTokens: null, reasoningTokens: null, cachedTokens: null, byok: false}]};
  localStorage.setItem('lathecode.llm.usage.v1.' + id, JSON.stringify(record));
  return record;
}
