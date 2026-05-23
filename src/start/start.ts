import { createFullScreenDialog } from '../common/dialog.ts';
import { createLatheCodeFromDrawing, createLatheCodeFromPrompt, readImageFileAsDataUrl } from '../llm/openrouter.ts';
import { hasOpenRouterApiKey, openOpenRouterKeyDialog } from '../llm/openrouterkeydialog.ts';
import { createPrivacyDisclosure, openRouterActionPrivacyText } from '../llm/privacy.ts';
import { openSettingsDialog } from './settingsdialog.ts';
import { beginLatheCodePreviewSession, createLatheCodePreview, prioritizeVisibleLatheCodePreviews } from './preview.ts';
import { getStartSampleSections } from './samples.ts';

const INITIAL_SAMPLE_CARD_COUNT = 7;
const BACKUP_PRIVACY_DISCLOSURE =
  'Backup JSON is handled locally. Exports may include saved lathecodes, settings, and any OpenRouter API key stored in this browser.';

export class StartLatheCodeEvent extends Event {
  constructor(readonly text: string) {
    super('start');
  }
}

export class StartStlEvent extends Event {
  constructor(readonly file: File) {
    super('stlfile');
  }
}

export class StartPanel extends EventTarget {
  private savedPanel: HTMLElement;
  private sampleCatalogButton: HTMLButtonElement;
  private startPromptButton: HTMLButtonElement;
  private startDrawingButton: HTMLButtonElement;
  private loadButton: HTMLButtonElement;
  private loadSelect: HTMLSelectElement;
  private deleteButton: HTMLButtonElement;
  private importInput: HTMLInputElement;
  private startStlButton: HTMLButtonElement;
  private overflowButton: HTMLButtonElement;
  private overflowMenu: HTMLElement;
  private settingsButtons: HTMLButtonElement[];
  private exportButtons: HTMLButtonElement[];

  constructor(container: HTMLElement) {
    super();

    this.savedPanel = container.querySelector<HTMLElement>('.startPanel')!;
    this.sampleCatalogButton = container.querySelector<HTMLButtonElement>('.sampleCatalogButton')!;
    this.startPromptButton = container.querySelector<HTMLButtonElement>('.startPromptButton')!;
    this.startDrawingButton = container.querySelector<HTMLButtonElement>('.startDrawingButton')!;
    this.loadButton = container.querySelector<HTMLButtonElement>('.loadButton')!;
    this.loadSelect = container.querySelector<HTMLSelectElement>('.loadSelect')!;
    this.deleteButton = container.querySelector<HTMLButtonElement>('.deleteButton')!;
    this.importInput = container.querySelector<HTMLInputElement>('#importFile')!;
    this.startStlButton = container.querySelector<HTMLButtonElement>('.startStlButton')!;
    this.overflowButton = container.querySelector<HTMLButtonElement>('.overflowButton')!;
    this.overflowMenu = container.querySelector<HTMLElement>('.overflowMenu')!;
    this.settingsButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.settingsButton'));
    this.exportButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.exportButton'));

    this.addBackupPrivacyDisclosure();

    this.sampleCatalogButton.addEventListener('click', () => this.openSampleDialog());
    this.startPromptButton.addEventListener('click', () => this.openLlmEntryDialog(() => this.openPromptDialog()));
    this.startDrawingButton.addEventListener('click', () => this.openLlmEntryDialog(() => this.openDrawingDialog()));
    this.loadButton.addEventListener('click', () => this.loadLatheCode());
    this.deleteButton.addEventListener('click', () => this.deleteLatheCode());
    this.startStlButton.addEventListener('click', () => this.openStlFilePicker());
    this.overflowButton.addEventListener('click', () => this.toggleOverflowMenu());
    this.settingsButtons.forEach(button => button.addEventListener('click', () => {
      openSettingsDialog(() => {
        this.dispatchEvent(new Event('settingschange'));
      });
    }));
    this.exportButtons.forEach(button => button.addEventListener('click', () => {
      this.exportLocalStorage();
      this.closeOverflowMenu();
    }));
    this.importInput.addEventListener('change', event => {
      this.handleImportInputChange(event);
      this.closeOverflowMenu();
    });

    this.updateSavedLatheCodes();
  }

  private openLlmEntryDialog(openDialog: () => void) {
    if (hasOpenRouterApiKey()) {
      openDialog();
      return;
    }
    openOpenRouterKeyDialog(() => {
      this.dispatchEvent(new Event('settingschange'));
      this.updateSavedLatheCodes();
      openDialog();
    });
  }

  private openPromptDialog() {
    const form = document.createElement('form');
    form.className = 'llmDialog settingsDialog';

    const grid = document.createElement('div');
    grid.className = 'settingsGrid';
    form.appendChild(grid);

    const promptInput = createTextAreaField(
      'Part prompt',
      'Describe the turned part, dimensions, material shape, tooling preference, and units.',
      'Example: 20 mm long brass knob, 18 mm max diameter, rounded dome front, 6 mm stem...');
    grid.appendChild(promptInput.field);
    form.appendChild(createPrivacyDisclosure(openRouterActionPrivacyText(
      'This sends your part prompt from this browser to OpenRouter.')));

    const error = createLlmError();
    form.appendChild(error);

    const actions = document.createElement('div');
    actions.className = 'settingsActions';
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Create lathecode';
    actions.appendChild(submitButton);
    form.appendChild(actions);

    let dialog: HTMLDivElement;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const description = promptInput.input.value.trim();
      if (!description) {
        error.textContent = 'Enter a part prompt';
        return;
      }
      runLlmDialogAction(submitButton, 'Creating...', error, async () => {
        const text = await createLatheCodeFromPrompt(description);
        dialog.remove();
        this.dispatchEvent(new StartLatheCodeEvent(text));
      });
    });

    dialog = createFullScreenDialog(form, 'From prompt');
    promptInput.input.focus();
  }

  private openDrawingDialog() {
    const form = document.createElement('form');
    form.className = 'llmDialog settingsDialog';
    let files: File[] = [];

    const grid = document.createElement('div');
    grid.className = 'settingsGrid';
    form.appendChild(grid);

    const fileField = document.createElement('label');
    fileField.className = 'settingField';
    const fileHeading = document.createElement('span');
    fileHeading.className = 'settingHeading';
    fileHeading.textContent = 'Drawing images';
    fileField.appendChild(fileHeading);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/webp,image/gif';
    fileInput.multiple = true;
    fileInput.className = 'settingInput';
    fileField.appendChild(fileInput);

    const pasteTarget = document.createElement('div');
    pasteTarget.className = 'llmPasteTarget';
    pasteTarget.tabIndex = 0;
    pasteTarget.textContent = 'Paste drawing images here';
    fileField.appendChild(pasteTarget);

    const selectedFiles = document.createElement('div');
    selectedFiles.className = 'llmSelectedFiles';
    fileField.appendChild(selectedFiles);

    const fileGuide = document.createElement('span');
    fileGuide.className = 'settingGuide';
    fileGuide.textContent = 'Upload or paste local PNG, JPEG, WebP, or GIF technical drawing images.';
    fileField.appendChild(fileGuide);
    grid.appendChild(fileField);

    const notesInput = createTextAreaField(
      'Drawing notes',
      'Add missing scale, units, dimensions, or details that are not clear in the drawing.',
      'Example: all dimensions are mm; central bore is 8 mm through...');
    grid.appendChild(notesInput.field);
    form.appendChild(createPrivacyDisclosure(openRouterActionPrivacyText(
      'This sends selected drawing images and notes from this browser to OpenRouter.')));

    const error = createLlmError();
    form.appendChild(error);

    const actions = document.createElement('div');
    actions.className = 'settingsActions';
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Create lathecode';
    actions.appendChild(submitButton);
    form.appendChild(actions);

    const updateSelectedFiles = () => {
      selectedFiles.textContent = files.length
        ? `Selected: ${files.map(file => file.name).join(', ')}`
        : 'No images selected';
    };
    const addFiles = (incomingFiles: readonly File[]) => {
      const imageFiles = incomingFiles.filter(file => file.type.startsWith('image/'));
      files = mergeImageFiles(files, imageFiles);
      updateSelectedFiles();
    };
    const handlePaste = (event: ClipboardEvent) => {
      const pastedFiles = getClipboardImageFiles(event.clipboardData);
      if (!pastedFiles.length) return;
      event.preventDefault();
      addFiles(pastedFiles);
      error.textContent = '';
      pasteTarget.focus();
    };

    fileInput.addEventListener('change', () => addFiles(Array.from(fileInput.files ?? [])));
    pasteTarget.addEventListener('paste', handlePaste);
    form.addEventListener('paste', handlePaste);
    updateSelectedFiles();

    let dialog: HTMLDivElement;
    form.addEventListener('submit', event => {
      event.preventDefault();
      addFiles(Array.from(fileInput.files ?? []));
      if (!files.length) {
        error.textContent = 'Select at least one drawing image';
        return;
      }
      runLlmDialogAction(submitButton, 'Reading...', error, async () => {
        const images = await Promise.all(files.map(readImageFileAsDataUrl));
        submitButton.textContent = 'Creating...';
        const text = await createLatheCodeFromDrawing(images, notesInput.input.value);
        dialog.remove();
        this.dispatchEvent(new StartLatheCodeEvent(text));
      });
    });

    dialog = createFullScreenDialog(form, 'From technical drawing');
    fileInput.focus();
  }

  updateSavedLatheCodes() {
    this.loadSelect.innerHTML = '';

    const savedNames = this.getSavedLatheCodeNames();
    this.savedPanel.hidden = !savedNames.length;
    const hasExportData = Object.keys(this.getExportData()).length > 0;
    this.exportButtons.forEach(button => {
      button.hidden = !hasExportData;
    });
    if (!savedNames.length) {
      const placeholderOption = document.createElement('option');
      placeholderOption.textContent = 'No items saved';
      placeholderOption.disabled = true;
      this.loadSelect.appendChild(placeholderOption);
    } else {
      for (const name of savedNames) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        this.loadSelect.appendChild(option);
      }
    }

    this.loadButton.disabled = !savedNames.length;
    this.deleteButton.disabled = !savedNames.length;
  }

  private openSampleDialog() {
    const stopPreviewSession = beginLatheCodePreviewSession();
    const container = document.createElement('div');
    container.className = 'sampleDialog';
    const sections = getStartSampleSections();
    const expandControls: SampleExpandControl[] = [];

    const nav = document.createElement('nav');
    nav.className = 'sampleDialogNav';
    nav.setAttribute('aria-label', 'Sample sections');
    container.appendChild(nav);

    for (const section of sections) {
      const link = document.createElement('a');
      link.href = `#sample-section-${section.id}`;
      link.textContent = section.title;
      nav.appendChild(link);
    }

    let dialog: HTMLDivElement;
    for (const section of sections) {
      const sectionElement = document.createElement('section');
      sectionElement.className = 'sampleDialogSection collapsed';
      sectionElement.dataset.sampleSection = section.id;
      sectionElement.id = `sample-section-${section.id}`;
      container.appendChild(sectionElement);

      const sectionTitle = document.createElement('h2');
      sectionTitle.className = 'sampleDialogSectionTitle';
      sectionTitle.textContent = section.title;
      sectionElement.appendChild(sectionTitle);

      const sectionDescription = document.createElement('p');
      sectionDescription.className = 'sampleDialogSectionDescription';
      sectionDescription.textContent = section.description;
      sectionElement.appendChild(sectionDescription);

      const grid = document.createElement('div');
      grid.className = 'sampleDialogGrid';
      sectionElement.appendChild(grid);

      const sampleCards: HTMLButtonElement[] = [];
      for (const sample of section.samples) {
        const button = document.createElement('button');
        button.className = 'sampleDialogCard sampleButton';
        button.dataset.sample = sample.id;
        button.type = 'button';
        button.appendChild(createLatheCodePreview(sample.text));

        const title = document.createElement('strong');
        title.textContent = sample.title;
        button.appendChild(title);

        const description = document.createElement('span');
        description.textContent = sample.description;
        button.appendChild(description);

        button.addEventListener('click', () => {
          dialog.remove();
          this.dispatchEvent(new StartLatheCodeEvent(sample.text));
        });
        grid.appendChild(button);
        sampleCards.push(button);
      }

      const showMoreCard = document.createElement('button');
      showMoreCard.className = 'sampleDialogMoreCard';
      showMoreCard.type = 'button';
      showMoreCard.textContent = `Show ${Math.max(section.samples.length - INITIAL_SAMPLE_CARD_COUNT, 0)} more`;
      showMoreCard.setAttribute('aria-expanded', 'false');
      showMoreCard.addEventListener('click', () => {
        sectionElement.classList.add('expanded');
        sectionElement.classList.remove('collapsed');
        updateExpandButtons();
      });
      grid.appendChild(showMoreCard);
      expandControls.push({ sectionElement, sampleCards, showMoreCard });
    }

    const updateExpandButtons = () => {
      updateSampleExpandButtons(expandControls);
      prioritizeVisibleLatheCodePreviews();
    };
    let viewportWatcherDisposed = false;
    const prioritizeViewportPreviews = () => prioritizeVisibleLatheCodePreviews();
    const disposeViewportWatcher = () => {
      if (viewportWatcherDisposed) return;
      viewportWatcherDisposed = true;
      stopPreviewSession();
      dialog.removeEventListener('scroll', prioritizeViewportPreviews);
      window.removeEventListener('resize', prioritizeViewportPreviews);
    };
    dialog = createFullScreenDialog(container, 'Samples', disposeViewportWatcher);
    const removeDialog = dialog.remove.bind(dialog);
    dialog.remove = () => {
      disposeViewportWatcher();
      removeDialog();
    };
    dialog.addEventListener('scroll', prioritizeViewportPreviews, {passive: true});
    window.addEventListener('resize', prioritizeViewportPreviews);
    updateExpandButtons();
    window.setTimeout(prioritizeViewportPreviews, 0);
  }

  private loadLatheCode() {
    const selectedName = this.loadSelect.value;
    const latheCode = localStorage.getItem(selectedName);
    if (latheCode) this.dispatchEvent(new StartLatheCodeEvent(latheCode));
  }

  private deleteLatheCode() {
    const selectedName = this.loadSelect.value;
    if (!selectedName) return;
    localStorage.removeItem(selectedName);
    this.updateSavedLatheCodes();
  }

  private openStlFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.stl';
    input.addEventListener('change', () => {
      const selectedFile = input.files?.[0];
      if (selectedFile) this.dispatchEvent(new StartStlEvent(selectedFile));
    });
    input.click();
  }

  private toggleOverflowMenu() {
    this.overflowMenu.hidden = !this.overflowMenu.hidden;
  }

  private closeOverflowMenu() {
    this.overflowMenu.hidden = true;
  }

  private addBackupPrivacyDisclosure() {
    if (this.overflowMenu.querySelector('.backupPrivacyDisclosure')) return;
    const disclosure = document.createElement('p');
    disclosure.className = 'backupPrivacyDisclosure';
    disclosure.textContent = BACKUP_PRIVACY_DISCLOSURE;
    this.overflowMenu.prepend(disclosure);
  }

  private exportLocalStorage() {
    const data = this.getExportData();
    if (!Object.keys(data).length) {
      this.updateSavedLatheCodes();
      return;
    }
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'localStorageBackup.json';
    link.click();
    URL.revokeObjectURL(href);
  }

  private getExportData(): { [key: string]: string } {
    const data: { [key: string]: string } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) ?? '';
    }
    return data;
  }

  private handleImportInputChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.importLocalStorage(file);
  }

  private importLocalStorage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            localStorage.setItem(key, data[key]);
          }
        }
        this.updateSavedLatheCodes();
        const importedDraft = localStorage.getItem('latheCode');
        if (importedDraft?.trim()) this.dispatchEvent(new StartLatheCodeEvent(importedDraft));
      } catch (e) {
        console.error('Failed to import data: ', e);
      }
    };
    reader.readAsText(file);
  }

  private getSavedLatheCodeNames(): string[] {
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== 'latheCode' && this.isRelevantLocalStorageKey(key)) names.push(key);
    }
    return names.sort((a, b) => a.localeCompare(b));
  }

  private isRelevantLocalStorageKey(key: string): boolean {
    const value = localStorage.getItem(key);
    return !!value && value.indexOf('\n') >= 0;
  }
}

type SampleExpandControl = {
  sectionElement: HTMLElement;
  sampleCards: HTMLButtonElement[];
  showMoreCard: HTMLButtonElement;
};

function updateSampleExpandButtons(controls: readonly SampleExpandControl[]) {
  for (const control of controls) {
    const isExpanded = control.sectionElement.classList.contains('expanded');
    const hiddenSampleCount = Math.max(control.sampleCards.length - INITIAL_SAMPLE_CARD_COUNT, 0);

    control.showMoreCard.hidden = hiddenSampleCount === 0 || isExpanded;
    control.showMoreCard.textContent = `Show ${hiddenSampleCount} more`;
    control.showMoreCard.setAttribute('aria-expanded', String(isExpanded));
    control.sampleCards.forEach((card, index) => {
      card.hidden = !isExpanded && index >= INITIAL_SAMPLE_CARD_COUNT;
    });
  }
}

function createTextAreaField(labelText: string, guideText: string, placeholder: string): {field: HTMLLabelElement, input: HTMLTextAreaElement} {
  const field = document.createElement('label');
  field.className = 'settingField llmTextAreaField';

  const heading = document.createElement('span');
  heading.className = 'settingHeading';
  heading.textContent = labelText;
  field.appendChild(heading);

  const input = document.createElement('textarea');
  input.className = 'settingInput llmTextArea';
  input.placeholder = placeholder;
  field.appendChild(input);

  const guide = document.createElement('span');
  guide.className = 'settingGuide';
  guide.textContent = guideText;
  field.appendChild(guide);

  return {field, input};
}

function createLlmError(): HTMLDivElement {
  const error = document.createElement('div');
  error.className = 'toolDialogError';
  return error;
}

function getClipboardImageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files: File[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  for (const file of Array.from(data.files ?? [])) {
    if (file.type.startsWith('image/')) files.push(file);
  }
  return files;
}

function mergeImageFiles(existingFiles: readonly File[], incomingFiles: readonly File[]): File[] {
  const files = existingFiles.concat();
  const keys = new Set(files.map(getFileKey));
  for (const file of incomingFiles) {
    const key = getFileKey(file);
    if (keys.has(key)) continue;
    keys.add(key);
    files.push(file);
  }
  return files;
}

function getFileKey(file: File): string {
  return `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
}

async function runLlmDialogAction(
  button: HTMLButtonElement,
  pendingText: string,
  error: HTMLElement,
  action: () => Promise<void>,
) {
  const originalText = button.textContent || '';
  error.textContent = '';
  button.disabled = true;
  button.textContent = pendingText;
  document.body.style.cursor = 'wait';
  try {
    await action();
  } catch (e) {
    error.textContent = e instanceof Error ? e.message : String(e);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    document.body.style.cursor = 'default';
  }
}
