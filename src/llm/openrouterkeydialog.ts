import { createFullScreenDialog } from '../common/dialog.ts';
import { loadAppSettings, saveAppSettings } from '../common/settings.ts';

export function hasOpenRouterApiKey(): boolean {
  return loadAppSettings().openRouterApiKey.trim().length > 0;
}

export function openOpenRouterKeyDialog(onSave: () => void) {
  const form = document.createElement('form');
  form.className = 'openRouterKeyDialog settingsDialog';

  const intro = document.createElement('p');
  intro.className = 'setupIntro';
  intro.textContent = 'LLM features use your own OpenRouter API key. The key is saved locally in this browser and is sent only to OpenRouter when you use an LLM action.';
  form.appendChild(intro);

  const link = document.createElement('a');
  link.href = 'https://openrouter.ai/keys';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Create or copy an OpenRouter key';
  form.appendChild(link);

  const grid = document.createElement('div');
  grid.className = 'settingsGrid';
  form.appendChild(grid);

  const field = document.createElement('label');
  field.className = 'settingField';
  const heading = document.createElement('span');
  heading.className = 'settingHeading';
  heading.textContent = 'OpenRouter API key';
  field.appendChild(heading);

  const input = document.createElement('input');
  input.type = 'password';
  input.name = 'openRouterApiKey';
  input.className = 'settingInput';
  input.placeholder = 'sk-or-...';
  input.autocomplete = 'off';
  field.appendChild(input);

  const guide = document.createElement('span');
  guide.className = 'settingGuide';
  guide.textContent = 'You can change or remove this later in Settings.';
  field.appendChild(guide);
  grid.appendChild(field);

  const error = document.createElement('div');
  error.className = 'toolDialogError';
  form.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'settingsActions';
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = 'Save key';
  actions.appendChild(saveButton);
  form.appendChild(actions);

  let dialog: HTMLDivElement;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const openRouterApiKey = input.value.trim();
    if (!openRouterApiKey) {
      error.textContent = 'Enter an OpenRouter API key to continue';
      return;
    }
    saveAppSettings({...loadAppSettings(), openRouterApiKey});
    dialog.remove();
    onSave();
  });

  dialog = createFullScreenDialog(form, 'OpenRouter setup');
  input.focus();
}
