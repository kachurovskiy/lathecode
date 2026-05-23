import { createFullScreenDialog } from '../common/dialog.ts';
import { openSettingsDialog } from './settingsdialog.ts';
import { beginLatheCodePreviewSession, createLatheCodePreview, prioritizeVisibleLatheCodePreviews } from './preview.ts';
import { getStartSampleSections } from './samples.ts';

const INITIAL_SAMPLE_CARD_COUNT = 7;

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
    this.loadButton = container.querySelector<HTMLButtonElement>('.loadButton')!;
    this.loadSelect = container.querySelector<HTMLSelectElement>('.loadSelect')!;
    this.deleteButton = container.querySelector<HTMLButtonElement>('.deleteButton')!;
    this.importInput = container.querySelector<HTMLInputElement>('#importFile')!;
    this.startStlButton = container.querySelector<HTMLButtonElement>('.startStlButton')!;
    this.overflowButton = container.querySelector<HTMLButtonElement>('.overflowButton')!;
    this.overflowMenu = container.querySelector<HTMLElement>('.overflowMenu')!;
    this.settingsButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.settingsButton'));
    this.exportButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.exportButton'));

    this.sampleCatalogButton.addEventListener('click', () => this.openSampleDialog());
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
