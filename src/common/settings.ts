export const PX_PER_MM_OPTIONS = [10, 50, 100, 250, 500, 750, 1000] as const;
export const PX_PER_MM_STORAGE_KEY = 'pxPerMm';

export type AppSettings = {
  pxPerMm: number,
  cuttingEdgeThicknessPx: number,
  optimizeEpsilonDegrees: number,
  smoothingEpsilonPx: number,
  plannerCanvasSizePx: number,
  moveTimeoutMs: number,
  stlDebugCanvasSizePx: number,
};

export type AppSettingKey = keyof AppSettings;

export type AppSettingDefinition = {
  key: AppSettingKey,
  label: string,
  storageKey: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  reasonableValues: string,
  guidance: string,
  integer?: boolean,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  pxPerMm: 100,
  cuttingEdgeThicknessPx: 2,
  optimizeEpsilonDegrees: 0.05,
  smoothingEpsilonPx: 0.9,
  plannerCanvasSizePx: 500,
  moveTimeoutMs: 50,
  stlDebugCanvasSizePx: 500,
};

export const DEFAULT_PX_PER_MM = DEFAULT_APP_SETTINGS.pxPerMm;
export const CUTTING_EDGE_THICKNESS_PX = DEFAULT_APP_SETTINGS.cuttingEdgeThicknessPx;
export const OPTIMIZE_EPSILON_DEGREES = DEFAULT_APP_SETTINGS.optimizeEpsilonDegrees;
export const SMOOTHING_EPSILON_PX = DEFAULT_APP_SETTINGS.smoothingEpsilonPx;
export const PLANNER_CANVAS_SIZE_PX = DEFAULT_APP_SETTINGS.plannerCanvasSizePx;
export const DEFAULT_MOVE_TIMEOUT_MS = DEFAULT_APP_SETTINGS.moveTimeoutMs;
export const STL_DEBUG_CANVAS_SIZE_PX = DEFAULT_APP_SETTINGS.stlDebugCanvasSizePx;

export const APP_SETTING_DEFINITIONS: readonly AppSettingDefinition[] = [
  {
    key: 'pxPerMm',
    label: 'Pixels per mm',
    storageKey: PX_PER_MM_STORAGE_KEY,
    defaultValue: DEFAULT_APP_SETTINGS.pxPerMm,
    min: 10,
    max: 1000,
    step: 1,
    unit: 'px/mm',
    reasonableValues: PX_PER_MM_OPTIONS.join(', '),
    guidance: 'Raster resolution for planning and STL import. Higher values preserve more detail but make planning slower and memory-heavy.',
    integer: true,
  },
  {
    key: 'cuttingEdgeThicknessPx',
    label: 'Cutting edge thickness',
    storageKey: 'cuttingEdgeThicknessPx',
    defaultValue: DEFAULT_APP_SETTINGS.cuttingEdgeThicknessPx,
    min: 1,
    max: 10,
    step: 1,
    unit: 'px',
    reasonableValues: '1 to 5',
    guidance: 'Number of tool-color pixels treated as the active cutting edge. Increase only if tool outlines are too thin or fragmented.',
    integer: true,
  },
  {
    key: 'optimizeEpsilonDegrees',
    label: 'Cone optimization angle tolerance',
    storageKey: 'optimizeEpsilonDegrees',
    defaultValue: DEFAULT_APP_SETTINGS.optimizeEpsilonDegrees,
    min: 0,
    max: 1,
    step: 0.01,
    unit: 'degrees',
    reasonableValues: '0.01 to 0.2',
    guidance: 'Maximum angle difference for merging repeating cone-like move patterns. Higher values reduce moves but can alter geometry.',
  },
  {
    key: 'smoothingEpsilonPx',
    label: 'Move smoothing tolerance',
    storageKey: 'smoothingEpsilonPx',
    defaultValue: DEFAULT_APP_SETTINGS.smoothingEpsilonPx,
    min: 0,
    max: 5,
    step: 0.05,
    unit: 'px',
    reasonableValues: '0.2 to 1.5',
    guidance: 'Maximum pixel deviation allowed when smoothing adjacent moves. Higher values produce shorter GCode with less pixel-level fidelity.',
  },
  {
    key: 'plannerCanvasSizePx',
    label: 'Planner preview size',
    storageKey: 'plannerCanvasSizePx',
    defaultValue: DEFAULT_APP_SETTINGS.plannerCanvasSizePx,
    min: 100,
    max: 2000,
    step: 50,
    unit: 'px',
    reasonableValues: '300 to 1000',
    guidance: 'Target size for planner and toolpath previews. This affects display size, not generated machine coordinates.',
    integer: true,
  },
  {
    key: 'moveTimeoutMs',
    label: 'Toolpath draw delay',
    storageKey: 'moveTimeoutMs',
    defaultValue: DEFAULT_APP_SETTINGS.moveTimeoutMs,
    min: 0,
    max: 1000,
    step: 1,
    unit: 'ms',
    reasonableValues: '0 to 100',
    guidance: 'Delay between drawn toolpath moves. Use 0 for immediate rendering; URL parameter moveTimeout still overrides this value.',
    integer: true,
  },
  {
    key: 'stlDebugCanvasSizePx',
    label: 'STL debug preview size',
    storageKey: 'stlDebugCanvasSizePx',
    defaultValue: DEFAULT_APP_SETTINGS.stlDebugCanvasSizePx,
    min: 100,
    max: 2000,
    step: 50,
    unit: 'px',
    reasonableValues: '300 to 1000',
    guidance: 'Canvas size for STL projection debug views. This affects debug display only.',
    integer: true,
  },
];

export function parsePxPerMm(value: number | string | null | undefined): number {
  return parseAppSetting('pxPerMm', value);
}

export function normalizeAppSettings(values: Partial<Record<AppSettingKey, number | string | null | undefined>> = {}): AppSettings {
  const settings = {...DEFAULT_APP_SETTINGS};
  for (const definition of APP_SETTING_DEFINITIONS) {
    settings[definition.key] = parseAppSetting(definition.key, values[definition.key]);
  }
  return settings;
}

export function loadAppSettings(storage: Storage = localStorage): AppSettings {
  const values: Partial<Record<AppSettingKey, string | null>> = {};
  for (const definition of APP_SETTING_DEFINITIONS) {
    values[definition.key] = storage.getItem(definition.storageKey);
  }
  return normalizeAppSettings(values);
}

export function saveAppSettings(settings: Partial<AppSettings>, storage: Storage = localStorage): AppSettings {
  const normalized = normalizeAppSettings(settings);
  for (const definition of APP_SETTING_DEFINITIONS) {
    storage.setItem(definition.storageKey, String(normalized[definition.key]));
  }
  return normalized;
}

function parseAppSetting(key: AppSettingKey, value: number | string | null | undefined): number {
  const definition = APP_SETTING_DEFINITIONS.find(d => d.key === key);
  if (!definition) throw new Error(`Unknown app setting: ${key}`);
  if (value === null || value === undefined || value === '') return definition.defaultValue;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return definition.defaultValue;
  const rounded = definition.integer ? Math.round(numberValue) : numberValue;
  return Math.min(definition.max, Math.max(definition.min, rounded));
}
