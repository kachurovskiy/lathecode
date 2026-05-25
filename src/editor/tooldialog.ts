import { createFullScreenDialog } from '../common/dialog.ts';
import { LatheCode } from '../common/lathecode.ts';
import {KNOWN_INSERT_OPTIONS, insertOptionToToolLine, type KnownInsertOption} from '../common/toolpresets.ts';
import { Rasterizer } from '../planner/rasterizer.ts';

type ToolType = 'RECT' | 'ROUND' | 'ANG';
type ToolParamName = 'R' | 'L' | 'H' | 'A' | 'NA';
type UnitOption = 'MM' | 'CM' | 'M' | 'FT' | 'IN';

const TOOL_PARAM_NAMES: readonly ToolParamName[] = ['R', 'L', 'H', 'A', 'NA'];
const PRESET_PARAM_NAMES: readonly ToolParamName[] = ['A'];
const LINEAR_TOOL_PARAM_NAMES: readonly ToolParamName[] = ['R', 'L', 'H'];
const TOOL_PARAMS_BY_TYPE: Record<ToolType, readonly ToolParamName[]> = {
  RECT: ['R', 'L', 'H'],
  ROUND: ['R'],
  ANG: ['R', 'L', 'A', 'NA'],
};
const UNIT_MULTIPLIERS: Record<UnitOption, number> = {
  MM: 1,
  CM: 10,
  M: 1000,
  FT: 304.8,
  IN: 25.4,
};
const UNIT_LABELS: Record<UnitOption, string> = {
  MM: 'mm',
  CM: 'cm',
  M: 'm',
  FT: 'ft',
  IN: 'in',
};
const PARAM_LABELS: Record<ToolParamName, string> = {
  R: 'Corner radius',
  L: 'Cut width or edge length',
  H: 'Tool height',
  A: 'Rotation angle',
  NA: 'Nose angle',
};
const MANUAL_TOOL_TYPES: readonly {type: ToolType, label: string}[] = [
  {type: 'RECT', label: 'Rectangular or cut-off tool'},
  {type: 'ROUND', label: 'Round insert'},
  {type: 'ANG', label: 'Angled insert'},
];
const MANUAL_DEFAULTS_MM: Record<ToolType, Partial<Record<ToolParamName, number>>> = {
  RECT: {R: 0.2, L: 2},
  ROUND: {R: 5},
  ANG: {R: 0.2, L: 7.75, A: 30, NA: 55},
};

export function openToolDialog(getText: () => string, applyText: (text: string) => void) {
  const currentUnits = parseCurrentUnits(getText());
  const currentUnitMultiplier = UNIT_MULTIPLIERS[currentUnits];
  const currentTool = parseCurrentToolLine(getText(), currentUnitMultiplier);
  const container = document.createElement('div');
  container.className = 'toolDialog';

  let selectedInsertName = currentTool.insertName || KNOWN_INSERT_OPTIONS[0].name;
  const presetParams = createParamInputs(currentTool.insertName ? currentTool.params : new Map(), 'presetParamInput');
  const presetGallery = document.createElement('div');
  presetGallery.className = 'toolPresetGallery';
  container.appendChild(presetGallery);

  const selectInsert = (insertName: string) => {
    selectedInsertName = insertName;
    const insert = KNOWN_INSERT_OPTIONS.find(option => option.name === selectedInsertName)!;
    for (const card of presetGallery.querySelectorAll<HTMLButtonElement>('.toolPresetCard')) {
      const selected = card.dataset.insert === selectedInsertName;
      card.classList.toggle('selected', selected);
      card.setAttribute('aria-pressed', String(selected));
    }
    updateParamInputs(presetParams, insert.type === 'ANG' ? ['A'] : []);
    updatePresetPlaceholders(presetParams, insert, currentUnitMultiplier, currentUnits);
  };

  for (const option of KNOWN_INSERT_OPTIONS) {
    const card = createInsertCard(option, currentUnits);
    card.addEventListener('click', () => selectInsert(option.name));
    presetGallery.appendChild(card);
  }
  selectInsert(selectedInsertName);

  const presetOverrides = document.createElement('div');
  presetOverrides.className = 'toolSecondaryGrid';
  for (const name of PRESET_PARAM_NAMES) {
    presetOverrides.appendChild(createField(PARAM_LABELS[name], presetParams.get(name)!));
  }
  container.appendChild(presetOverrides);

  const applyPresetButton = document.createElement('button');
  applyPresetButton.type = 'button';
  applyPresetButton.className = 'toolApplyButton';
  applyPresetButton.textContent = 'Use selected insert';
  container.appendChild(applyPresetButton);

  let dialog: HTMLDivElement;
  const applyLine = (line: string) => {
    applyText(upsertToolLine(getText(), line));
    dialog.remove();
  };
  applyPresetButton.addEventListener('click', () => {
    const insert = KNOWN_INSERT_OPTIONS.find(option => option.name === selectedInsertName)!;
    applyLine(buildPresetToolLine(insert, presetParams, currentUnitMultiplier));
  });

  const manualDetails = document.createElement('details');
  manualDetails.className = 'manualToolDetails';
  const manualSummary = document.createElement('summary');
  manualSummary.textContent = 'Define tool manually';
  manualDetails.appendChild(manualSummary);

  let selectedManualType = currentTool.toolType || 'RECT';
  const manualTypeBar = createManualTypeBar(selectedManualType, type => {
    selectedManualType = type;
    updateManualInputs();
  });
  manualDetails.appendChild(createFieldGroup('Tool shape', manualTypeBar));

  const manualParams = createParamInputs(currentTool.insertName ? new Map() : currentTool.params, 'manualParamInput');
  const manualParamGrid = document.createElement('div');
  manualParamGrid.className = 'toolSecondaryGrid';
  for (const name of TOOL_PARAM_NAMES) {
    manualParamGrid.appendChild(createField(PARAM_LABELS[name], manualParams.get(name)!));
  }
  manualDetails.appendChild(manualParamGrid);

  const applyManualButton = document.createElement('button');
  applyManualButton.type = 'button';
  applyManualButton.className = 'manualToolApplyButton';
  applyManualButton.textContent = 'Use manual definition';
  manualDetails.appendChild(applyManualButton);
  container.appendChild(manualDetails);

  const updateManualInputs = () => {
    applyManualDefaults(manualParams, selectedManualType, currentUnitMultiplier, currentUnits);
    updateParamInputs(manualParams, TOOL_PARAMS_BY_TYPE[selectedManualType], {hideDisabled: true});
  };
  updateManualInputs();

  applyManualButton.addEventListener('click', () => {
    applyLine(buildManualToolLine(selectedManualType, manualParams, currentUnitMultiplier));
  });

  dialog = createFullScreenDialog(container, 'Tool');
}

function createField(labelText: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'toolField';
  const span = document.createElement('span');
  span.textContent = labelText;
  label.appendChild(span);
  label.appendChild(control);
  return label;
}

function createFieldGroup(labelText: string, control: HTMLElement): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'toolField';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', labelText);
  const span = document.createElement('span');
  span.textContent = labelText;
  group.appendChild(span);
  group.appendChild(control);
  return group;
}

function createNumberInput(param: ToolParamName): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = 'any';
  input.min = '0';
  input.className = 'toolParamInput';
  input.dataset.param = param;
  input.setAttribute('aria-label', PARAM_LABELS[param]);
  return input;
}

function createManualTypeBar(selectedType: ToolType, onChange: (type: ToolType) => void): HTMLDivElement {
  const bar = document.createElement('div');
  bar.className = 'manualToolTypeBar';

  const updateSelected = (type: ToolType) => {
    for (const button of bar.querySelectorAll<HTMLButtonElement>('.manualToolTypeButton')) {
      const selected = button.dataset.type === type;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  };

  for (const option of MANUAL_TOOL_TYPES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'manualToolTypeButton';
    button.dataset.type = option.type;
    button.textContent = option.label;
    button.addEventListener('click', () => {
      updateSelected(option.type);
      onChange(option.type);
    });
    bar.appendChild(button);
  }

  updateSelected(selectedType);
  return bar;
}

function createParamInputs(
    values: Map<ToolParamName, string>,
    className: string): Map<ToolParamName, HTMLInputElement> {
  const params = new Map<ToolParamName, HTMLInputElement>();
  for (const name of TOOL_PARAM_NAMES) {
    const input = createNumberInput(name);
    input.classList.add(className);
    input.value = values.get(name) || '';
    params.set(name, input);
  }
  return params;
}

function updateParamInputs(
    params: Map<ToolParamName, HTMLInputElement>,
    enabled: readonly ToolParamName[],
    options: {hideDisabled?: boolean} = {}) {
  for (const [name, input] of params) {
    input.disabled = !enabled.includes(name);
    if (input.disabled) input.value = '';
    if (options.hideDisabled) input.closest<HTMLElement>('.toolField')!.hidden = input.disabled;
  }
}

function applyManualDefaults(
    params: Map<ToolParamName, HTMLInputElement>,
    type: ToolType,
    unitMultiplier: number,
    units: UnitOption) {
  const defaults = MANUAL_DEFAULTS_MM[type];
  for (const [name, input] of params) {
    const value = defaults[name];
    input.placeholder = value !== undefined ? `Default ${formatParamValue(name, value, unitMultiplier, units)}` : 'Optional';
  }
}

function updatePresetPlaceholders(
    params: Map<ToolParamName, HTMLInputElement>,
    insert: KnownInsertOption,
    unitMultiplier: number,
    units: UnitOption) {
  for (const [name, input] of params) {
    if (name === 'A' && insert.type !== 'ANG') {
      input.placeholder = 'Not used for this insert';
      continue;
    }
    const value = insert.params[name];
    input.placeholder = value === undefined ? 'Optional rotation' : `Preset ${formatParamValue(name, value, unitMultiplier, units)}`;
  }
}

function createInsertCard(option: KnownInsertOption, units: UnitOption): HTMLButtonElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'toolPresetCard';
  card.dataset.insert = option.name;

  card.appendChild(createInsertPreview(option));

  const name = document.createElement('strong');
  name.textContent = option.name;
  card.appendChild(name);

  const summary = document.createElement('span');
  summary.textContent = formatInsertSummary(option, units);
  card.appendChild(summary);
  return card;
}

function buildPresetToolLine(
    insert: KnownInsertOption,
    params: Map<ToolParamName, HTMLInputElement>,
    unitMultiplier: number): string {
  const angle = params.get('A')?.disabled ? '' : params.get('A')?.value;
  return insertOptionToToolLine(convertKnownInsertToUnits(insert, unitMultiplier), angle);
}

function buildManualToolLine(
    type: ToolType,
    params: Map<ToolParamName, HTMLInputElement>,
    unitMultiplier: number): string {
  const parts = ['TOOL'];
  parts.push(type);
  const defaults = MANUAL_DEFAULTS_MM[type];
  for (const name of TOOL_PARAMS_BY_TYPE[type]) {
    const input = params.get(name)!;
    const value = input.value.trim() || formatToolParamForUnits(name, defaults[name], unitMultiplier);
    if (value) parts.push(`${name}${value}`);
  }
  return parts.join(' ');
}

function upsertToolLine(text: string, toolLine: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const existingToolIndex = lines.findIndex(line => line.trimStart().startsWith('TOOL '));
  if (existingToolIndex >= 0) {
    lines[existingToolIndex] = toolLine;
    return lines.join('\n');
  }

  const insertAfter = Math.max(
    lines.findIndex(line => line.trimStart().startsWith('UNITS ')),
    lines.findIndex(line => line.trimStart().startsWith('STOCK ')));
  lines.splice(insertAfter >= 0 ? insertAfter + 1 : 0, 0, toolLine);
  return lines.join('\n');
}

function parseCurrentToolLine(text: string, unitMultiplier: number): {
  toolType?: ToolType,
  insertName?: string,
  params: Map<ToolParamName, string>,
} {
  const line = text.split(/\r?\n/).find(line => line.trimStart().startsWith('TOOL ')) || '';
  const params = new Map<ToolParamName, string>();
  const tokens = line.trim().split(/\s+/);

  for (const token of tokens) {
    const param = /^(NA|R|L|H|A)([0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/i.exec(token);
    if (param) params.set(param[1].toUpperCase() as ToolParamName, param[2]);
  }

  const toolType = tokens.map(token => token.toUpperCase()).find(isToolType);
  return {
    toolType,
    insertName: findCurrentInsertName(toolType, params, unitMultiplier),
    params,
  };
}

function isToolType(token: string): token is ToolType {
  return token === 'RECT' || token === 'ROUND' || token === 'ANG';
}

function findCurrentInsertName(
    toolType: ToolType | undefined,
    params: Map<ToolParamName, string>,
    unitMultiplier: number): string | undefined {
  if (!toolType) return undefined;
  return KNOWN_INSERT_OPTIONS.find(option => option.type === toolType && geometryParamsMatch(option, params, unitMultiplier))?.name;
}

function geometryParamsMatch(
    option: KnownInsertOption,
    params: Map<ToolParamName, string>,
    unitMultiplier: number): boolean {
  for (const name of ['R', 'L', 'H', 'NA'] as const) {
    const presetValue = option.params[name];
    const currentValue = params.get(name);
    if (presetValue === undefined && currentValue !== undefined) return false;
    if (presetValue !== undefined && !numbersMatch(presetValue, currentValue, isLinearToolParam(name) ? unitMultiplier : 1)) return false;
  }
  return true;
}

function numbersMatch(expected: number, actual: string | undefined, unitMultiplier: number): boolean {
  return actual !== undefined && Math.abs(expected - Number(actual) * unitMultiplier) < 0.0001;
}

function formatInsertSummary(option: KnownInsertOption, units: UnitOption = 'MM'): string {
  const unitMultiplier = UNIT_MULTIPLIERS[units];
  const unitLabel = UNIT_LABELS[units];
  if (option.type === 'ROUND') return `Round, radius ${formatNumber(option.params.R! / unitMultiplier)} ${unitLabel}`;
  if (option.type === 'RECT') {
    return `Cut width ${formatNumber(option.params.L! / unitMultiplier)} ${unitLabel}, corner radius ${formatNumber(option.params.R! / unitMultiplier)} ${unitLabel}`;
  }
  return `Nose ${option.params.NA} deg, edge ${formatNumber(option.params.L! / unitMultiplier)} ${unitLabel}, corner radius ${formatNumber(option.params.R! / unitMultiplier)} ${unitLabel}`;
}

function createInsertPreview(option: KnownInsertOption): HTMLElement {
  const preview = document.createElement('div');
  preview.className = 'toolPresetPreview';

  if (typeof ImageData === 'undefined') {
    preview.textContent = option.type;
    return preview;
  }

  try {
    const toolBitmap = new Rasterizer(new LatheCode(`${insertOptionToToolLine(option)}\nL1 R1`), 18).createToolBitmap();
    const canvas = document.createElement('canvas');
    canvas.width = toolBitmap.width;
    canvas.height = toolBitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.putImageData(new ImageData(toolBitmap.toImageDataArray(true), toolBitmap.width), 0, 0);
    preview.appendChild(canvas);
  } catch {
    preview.textContent = option.type;
  }

  return preview;
}

function convertKnownInsertToUnits(insert: KnownInsertOption, unitMultiplier: number): KnownInsertOption {
  const params = {...insert.params};
  for (const name of LINEAR_TOOL_PARAM_NAMES) {
    const value = params[name];
    if (value !== undefined) params[name] = Number(formatNumber(value / unitMultiplier));
  }
  return {...insert, params};
}

function formatToolParamForUnits(
    name: ToolParamName,
    value: number | undefined,
    unitMultiplier: number): string {
  if (value === undefined) return '';
  return formatNumber(isLinearToolParam(name) ? value / unitMultiplier : value);
}

function formatParamValue(
    name: ToolParamName,
    value: number,
    unitMultiplier: number,
    units: UnitOption): string {
  const suffix = isLinearToolParam(name) ? UNIT_LABELS[units] : 'deg';
  return `${formatToolParamForUnits(name, value, unitMultiplier)} ${suffix}`;
}

function parseCurrentUnits(text: string): UnitOption {
  const line = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .find(line => line.trimStart().startsWith('UNITS '));
  const unit = line?.trim().split(/\s+/)[1]?.toUpperCase();
  return isUnit(unit) ? unit : 'MM';
}

function isUnit(value: string | undefined): value is UnitOption {
  return value === 'MM' || value === 'CM' || value === 'M' || value === 'FT' || value === 'IN';
}

function isLinearToolParam(name: ToolParamName): boolean {
  return LINEAR_TOOL_PARAM_NAMES.includes(name);
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}
