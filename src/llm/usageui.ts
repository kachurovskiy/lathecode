import {createFullScreenDialog} from '../common/dialog.ts';
import {loadAppSettings} from '../common/settings.ts';
import {formatEstimate, type CostEstimate} from './pricing.ts';
import {ACTION_LABELS, clearUsage, formatUsageCost, loadUsage, resumePendingUsage, USAGE_CHANGED, usageTotal, type UsageOperation, type UsageRecord} from './usage.ts';

export function createCostEstimateControl(getEstimate: () => Promise<CostEstimate>) {
  const element = document.createElement('div');
  element.className = 'llmCostEstimate';
  const value = document.createElement('span');
  value.setAttribute('role', 'status');
  const explanation = document.createElement('small');
  explanation.textContent = 'USD · approximate first request, not a spending limit. Images and reasoning vary; up to 2 repairs can add cost.';
  element.append(value, explanation);
  let revision = 0;
  let timer: number | undefined;
  let disposed = false;
  const refresh = async () => {
    window.clearTimeout(timer);
    const current = ++revision;
    value.textContent = 'Estimating cost…';
    let estimate: CostEstimate = null;
    try { estimate = await getEstimate(); } catch { /* A failed estimate must not break the action. */ }
    if (!disposed && current === revision) {
      value.textContent = formatEstimate(estimate);
      value.title = estimate?.model ?? 'Current model pricing is unavailable';
    }
    return estimate;
  };
  const schedule = () => {
    if (disposed) return;
    ++revision;
    value.textContent = 'Estimating cost…';
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void refresh(), 250);
  };
  void refresh();
  return {element, refresh, schedule, dispose: () => {disposed = true; ++revision; window.clearTimeout(timer);}};
}

export function createUsageNotification(operation: UsageOperation): void {
  let container = document.querySelector<HTMLElement>('.llmNotifications');
  if (!container) {
    container = document.createElement('div');
    container.className = 'llmNotifications';
    container.setAttribute('aria-label', 'LLM activity');
    document.body.appendChild(container);
  }
  const notification = document.createElement('div');
  notification.className = 'llmNotification';
  const status = document.createElement('div');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-atomic', 'true');
  const heading = document.createElement('strong');
  const detail = document.createElement('div');
  detail.className = 'llmNotificationDetail';
  status.append(heading, detail);
  const controls = document.createElement('div');
  controls.className = 'llmNotificationActions';
  const view = button('View usage', openUsageDialog);
  const close = button('×', dismiss);
  close.setAttribute('aria-label', 'Dismiss cost notification');
  controls.append(view, close);
  notification.append(status, controls);
  container.appendChild(notification);
  let timer: number | undefined;
  let hovered = false;
  let focused = false;
  let finished = false;
  function dismiss() {
    window.clearTimeout(timer);
    operation.onChange = null;
    notification.remove();
    if (!container!.children.length) container!.remove();
  }
  function scheduleDismiss() {
    window.clearTimeout(timer);
    if (finished && !hovered && !focused) timer = window.setTimeout(dismiss, 10000);
  }
  notification.addEventListener('mouseenter', () => {hovered = true; scheduleDismiss();});
  notification.addEventListener('mouseleave', () => {hovered = false; scheduleDismiss();});
  notification.addEventListener('focusin', () => {focused = true; scheduleDismiss();});
  notification.addEventListener('focusout', event => {focused = notification.contains(event.relatedTarget as Node | null); scheduleDismiss();});
  operation.onChange = () => {
    const record = operation.record;
    const totals = usageTotal([record]);
    const running = record.outcome === 'running';
    heading.textContent = `${ACTION_LABELS[record.action]} · ${running ? record.requests.length > 1 ? 'repairing…' : 'working…' : record.outcome === 'succeeded' ? 'complete' : 'failed'}`;
    const currentEstimate = record.requests.at(-1)?.estimate ?? record.estimate;
    const cost = running ? `${formatEstimate(currentEstimate)}${totals.known ? ` · ${formatUsageCost([record])}` : ''}` : formatUsageCost([record]);
    detail.textContent = `${cost} · ${totals.requests} request${totals.requests === 1 ? '' : 's'}`;
    detail.title = record.model;
    if (!operation.stored) detail.textContent += ' · History could not be saved';
    finished = !running && totals.pending === 0;
    scheduleDismiss();
  };
  operation.onChange();
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const result = document.createElement('button');
  result.type = 'button';
  result.textContent = text;
  result.addEventListener('click', onClick);
  return result;
}

function openUsageDialog(): void {
  const usage = createUsageSection();
  const dialog = createFullScreenDialog(usage.element, 'LLM usage', usage.dispose);
  const remove = dialog.remove.bind(dialog);
  dialog.remove = () => {usage.dispose(); remove();};
}

function appendText(parent: HTMLElement, tag: 'p' | 'h4', text: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function appendTable(parent: HTMLElement, headings: string[], rows: string[][]): void {
  const scroll = document.createElement('div');
  scroll.className = 'llmUsageTableScroll';
  const table = document.createElement('table');
  const header = table.createTHead().insertRow();
  for (const text of headings) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = text;
    header.appendChild(cell);
  }
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    row.forEach(value => {tr.insertCell().textContent = value;});
  }
  scroll.appendChild(table);
  parent.appendChild(scroll);
}

export function createUsageSection() {
  const element = document.createElement('section');
  element.className = 'llmUsage';
  const render = () => {
    element.replaceChildren();
    appendText(element, 'h4', 'Usage · recorded in this browser');
    const records = loadUsage();
    appendText(element, 'p', 'OpenRouter charges in USD, including repair attempts and failed operations. Missing charges are excluded from recorded subtotals. Separate provider charges for BYOK are not included.');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const summary = appendText(element, 'p', `Today: ${formatUsageCost(records.filter(record => record.startedAt >= today))} · This month: ${formatUsageCost(records.filter(record => record.startedAt >= month))} · Total recorded: ${formatUsageCost(records)}`);
    summary.className = 'llmUsageSummary';
    const actions = document.createElement('div');
    actions.className = 'llmUsageActions';
    const exportButton = button('Export usage', () => {
      const data = JSON.stringify({version: 1, currency: 'USD', scope: 'this browser', operations: loadUsage()}, null, 2);
      const url = URL.createObjectURL(new Blob([data], {type: 'application/json'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lathecode-llm-usage.json';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    });
    const clear = button('Clear usage history', () => {
      try { clearUsage(); } catch { appendText(element, 'p', 'Could not clear usage history. Browser storage is unavailable.'); }
    });
    exportButton.disabled = clear.disabled = !records.length;
    actions.append(exportButton, clear);
    element.appendChild(actions);
    if (!records.length) {appendText(element, 'p', 'No LLM operations recorded yet.'); return;}

    const groups = new Map<string, UsageRecord[]>();
    for (const record of records) {
      const key = `${ACTION_LABELS[record.action]} · ${record.model}`;
      groups.set(key, [...groups.get(key) ?? [], record]);
    }
    appendTable(element, ['Action / model', 'Operations', 'Requests', 'Recorded cost'],
      [...groups].map(([label, records]) => [label, String(records.length), String(usageTotal(records).requests), formatUsageCost(records)]));
    appendText(element, 'h4', 'Recent operations (latest 50)');
    appendTable(element, ['Time', 'Action / model', 'Outcome', 'Requests', 'Tokens in / out', 'Reasoning / cached', 'Duration', 'Cost'], records.slice(0, 50).map(record => {
      const tokens = (key: 'inputTokens' | 'outputTokens' | 'reasoningTokens' | 'cachedTokens') => {
        const values = record.requests.map(request => request[key]);
        const known = values.filter((value): value is number => value !== null);
        return known.length ? `${known.reduce((a, b) => a + b, 0)}${known.length < values.length ? '+' : ''}` : '—';
      };
      return [new Date(record.startedAt).toLocaleString(), `${ACTION_LABELS[record.action]} · ${record.model}`,
        record.outcome === 'running' ? 'In progress / interrupted' : record.outcome,
        String(record.requests.length), `${tokens('inputTokens')} / ${tokens('outputTokens')}`,
        `${tokens('reasoningTokens')} / ${tokens('cachedTokens')}`,
        record.finishedAt === null ? '—' : `${((record.finishedAt - record.startedAt) / 1000).toFixed(1)} s`, formatUsageCost([record])];
    }));
  };
  render();
  window.addEventListener(USAGE_CHANGED, render);
  window.addEventListener('storage', render);
  void resumePendingUsage(loadAppSettings().openRouterApiKey);
  const refreshTimer = window.setInterval(render, 30000);
  return {element, dispose: () => {window.clearInterval(refreshTimer); window.removeEventListener(USAGE_CHANGED, render); window.removeEventListener('storage', render);}};
}
