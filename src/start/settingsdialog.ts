import { createFullScreenDialog } from '../common/dialog.ts';
import {
  APP_SETTING_DEFINITIONS,
  APP_SETTING_SECTIONS,
  AppSettingDefinition,
  AppSettingKey,
  AppSettings,
  AppSettingSectionDefinition,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  normalizeAppSettings,
  saveAppSettings,
} from '../common/settings.ts';

export function openSettingsDialog(onSave?: () => void) {
  const currentSettings = loadAppSettings();
  const form = document.createElement('form');
  form.className = 'settingsDialog';

  for (const sectionDefinition of APP_SETTING_SECTIONS) {
    const section = document.createElement('section');
    section.className = 'settingsSection';
    section.dataset.settingSectionId = sectionDefinition.id;

    const title = document.createElement('h3');
    title.className = 'settingsSectionTitle';
    title.textContent = sectionDefinition.label;
    section.appendChild(title);

    const guidance = document.createElement('p');
    guidance.className = 'settingsSectionGuide';
    guidance.textContent = sectionDefinition.guidance;
    section.appendChild(guidance);

    const grid = document.createElement('div');
    grid.className = 'settingsGrid';
    section.appendChild(grid);

    for (const definition of sectionDefinition.definitions) {
      grid.appendChild(createSettingsField(definition, currentSettings));
    }

    form.appendChild(section);
  }

  const actions = document.createElement('div');
  actions.className = 'settingsActions';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save settings';
  actions.appendChild(saveButton);

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.textContent = 'Reset defaults';
  actions.appendChild(resetButton);

  form.appendChild(actions);

  const dialog = createFullScreenDialog(form, 'Settings');
  const updateSectionVisibility = () => updateSettingsSectionVisibility(form);
  const saveSettings = () => {
    const settings = readSettingsForm(form);
    saveAppSettings(settings);
    dialog.remove();
    onSave?.();
  };
  updateSectionVisibility();
  form.addEventListener('input', updateSectionVisibility);
  form.addEventListener('change', updateSectionVisibility);
  saveButton.addEventListener('click', saveSettings);
  resetButton.addEventListener('click', () => {
    fillSettingsForm(form, DEFAULT_APP_SETTINGS);
    updateSectionVisibility();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    saveSettings();
  });
}

function readSettingsForm(form: HTMLFormElement): AppSettings {
  const raw: Partial<Record<AppSettingKey, string | boolean>> = {};
  for (const definition of APP_SETTING_DEFINITIONS) {
    const input = form.elements.namedItem(definition.key) as HTMLInputElement | HTMLSelectElement | null;
    raw[definition.key] = input instanceof HTMLInputElement && input.type === 'checkbox'
      ? input.checked
      : input?.value ?? '';
  }
  return normalizeAppSettings(raw);
}

function updateSettingsSectionVisibility(form: HTMLFormElement) {
  const settings = readSettingsForm(form);
  for (const sectionDefinition of APP_SETTING_SECTIONS) {
    const section = form.querySelector<HTMLElement>(`.settingsSection[data-setting-section-id="${sectionDefinition.id}"]`);
    if (section) section.hidden = !settingsSectionApplies(sectionDefinition, settings);
  }
}

function settingsSectionApplies(sectionDefinition: AppSettingSectionDefinition, settings: AppSettings): boolean {
  return !sectionDefinition.plannerEngines || sectionDefinition.plannerEngines.includes(settings.plannerEngine);
}

function createSettingsField(definition: AppSettingDefinition, currentSettings: AppSettings): HTMLLabelElement {
  const field = document.createElement('label');
  field.className = 'settingField';

  const heading = document.createElement('span');
  heading.className = 'settingHeading';
  heading.textContent = definition.label;
  field.appendChild(heading);

  let input: HTMLInputElement | HTMLSelectElement;
  if (definition.type === 'select') {
    const select = document.createElement('select');
    for (const optionDefinition of definition.options) {
      const option = document.createElement('option');
      option.value = optionDefinition.value;
      option.textContent = optionDefinition.label;
      select.appendChild(option);
    }
    input = select;
  } else if (definition.type === 'boolean') {
    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.checked = Boolean(currentSettings[definition.key]);
    input = checkboxInput;
  } else if (definition.type === 'text') {
    const textInput = document.createElement('input');
    textInput.type = definition.inputType ?? 'text';
    textInput.placeholder = definition.placeholder ?? '';
    input = textInput;
  } else {
    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.min = String(definition.min);
    numberInput.max = String(definition.max);
    numberInput.step = String(definition.step);
    input = numberInput;
  }
  input.className = 'settingInput';
  input.name = definition.key;
  if (!(input instanceof HTMLInputElement && input.type === 'checkbox')) {
    input.value = String(currentSettings[definition.key]);
  }
  field.appendChild(input);

  const guide = document.createElement('span');
  guide.className = 'settingGuide';
  if (definition.type === 'select') {
    guide.textContent = `${definition.guidance} Default: ${definition.options.find(option => option.value === definition.defaultValue)?.label ?? definition.defaultValue}.`;
  } else if (definition.type === 'boolean') {
    guide.textContent = `${definition.guidance} Default: ${definition.defaultValue ? 'on' : 'off'}.`;
  } else if (definition.type === 'text') {
    guide.textContent = definition.defaultValue
      ? `${definition.guidance} Default: ${definition.defaultValue}.`
      : definition.guidance;
  } else {
    guide.textContent = `${definition.guidance} Reasonable values: ${definition.reasonableValues} ${definition.unit}. Default: ${definition.defaultValue} ${definition.unit}.`;
  }
  field.appendChild(guide);

  return field;
}

function fillSettingsForm(form: HTMLFormElement, settings: AppSettings) {
  for (const definition of APP_SETTING_DEFINITIONS) {
    const input = form.elements.namedItem(definition.key) as HTMLInputElement | HTMLSelectElement | null;
    if (input instanceof HTMLInputElement && input.type === 'checkbox') {
      input.checked = Boolean(settings[definition.key]);
    } else if (input) {
      input.value = String(settings[definition.key]);
    }
  }
}
