import { createFullScreenDialog } from '../common/dialog.ts';
import { openSettingsDialog } from './settingsdialog.ts';
import { createLatheCodePreview, preloadLatheCodePreviews } from './preview.ts';

type SampleDefinition = {
  id: string;
  title: string;
  description: string;
  meta: string;
  text: string;
};

const START_SAMPLE_DEFINITIONS: readonly SampleDefinition[] = [
  {
    id: 'taper',
    title: 'Tapered form',
    description: 'Simple outside taper kept as a minimal reference shape.',
    meta: 'Outside turning',
    text: `; Tapered form

STOCK D20
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT1 FINISH0.1

L4 D8
L20 DS8 DE18
L3`,
  },
  {
    id: 'bearing-shoulder-shaft',
    title: 'Bearing shoulder shaft',
    description: 'Pilot, bearing seat, relief, and a larger chuck-side shoulder.',
    meta: 'Bearing fit',
    text: `; Bearing shoulder shaft

STOCK D22
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.6 FINISH0.1

L4 D10
L8 D12
L1 D10
L5 D18
L6 D20
L2`,
  },
  {
    id: 'flanged-bushing',
    title: 'Flanged bushing',
    description: 'A practical outside flange with a stepped through bore.',
    meta: 'Mixed ID/OD',
    text: `; Flanged bushing

STOCK D28 ID8
TOOL ANG R0.15 L2.5 A120 NA55
DEPTH CUT0.6 FINISH0.1

L5 D14
L9 D18
L4 DS18 DE26
L6 D26

INSIDE
L7 D12
L11 D10
L6 D10`,
  },
  {
    id: 'wheel-spacer',
    title: 'Wheel spacer',
    description: 'Spacer sleeve with a through bore and chuck-side register.',
    meta: 'Spacer',
    text: `; Wheel spacer

STOCK D22 ID8
TOOL ANG R0.15 L2.5 A120 NA55
DEPTH CUT0.6 FINISH0.1

L4 D16
L10 D18
L4 D22
L4 D22

INSIDE
L6 D14
L8 D10
L8 D10`,
  },
  {
    id: 'v-belt-pulley',
    title: 'V-belt pulley blank',
    description: 'Raised lips and a rounded belt groove for a small pulley.',
    meta: 'Pulley',
    text: `; V-belt pulley blank

STOCK D30
TOOL ROUND R1.5
DEPTH CUT0.7 FINISH0.1

L4 D22
L7 DS22 DE14 CONC
L7 DS14 DE26 CONC
L5 D26
L2`,
  },
  {
    id: 'control-knob',
    title: 'Control knob',
    description: 'Rounded knob with a small nose and a broad chuck-side hub.',
    meta: 'Knob',
    text: `; Control knob

STOCK D32
TOOL ROUND R1.2
DEPTH CUT0.8 FINISH0.1

L4 D12
L5 DS12 DE24 CONV
L7 D24
L6 DS24 DE30 CONC
L4 D30`,
  },
  {
    id: 'hose-barb',
    title: 'Hose barb',
    description: 'Three retention barbs leading into a stronger chuck-side shank.',
    meta: 'Barbed fitting',
    text: `; Hose barb

STOCK D20
TOOL ANG R0.2 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH0.05

L4 D8
L2 DS8 DE13
L2 D10
L2 DS10 DE15
L2 D12
L2 DS12 DE17
L5 D18
L2`,
  },
  {
    id: 'bobbin-spool',
    title: 'Bobbin spool',
    description: 'Two flanges with a reduced middle for winding line or wire.',
    meta: 'Spool',
    text: `; Bobbin spool

STOCK D26
TOOL ROUND R1
DEPTH CUT0.6 FINISH0.1

L4 D22
L3 DS22 DE14 CONC
L9 D14
L3 DS14 DE24 CONC
L5 D24
L2`,
  },
  {
    id: 'counterbored-spacer',
    title: 'Counterbored spacer',
    description: 'Inside-only sample with a counterbore and smaller through bore.',
    meta: 'Boring',
    text: `; Counterbored spacer

STOCK D24 ID8
TOOL ANG R0.15 L2.5 A120 NA55
DEPTH CUT0.5 FINISH0.1

INSIDE
L5 D16
L2 DS16 DE10
L13 D10
L4 D10`,
  },
  {
    id: 'shaft-collar',
    title: 'Shaft collar blank',
    description: 'Collar with a central groove and full-diameter chuck-side stock.',
    meta: 'Collar',
    text: `; Shaft collar blank

STOCK D24
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.5 FINISH0.1

L4 D14
L2 D22
L2 D16
L2 D22
L8 D22
L4 D24
L2`,
  },
  {
    id: 'pipe-reducer',
    title: 'Pipe reducer adapter',
    description: 'Stepped outside adapter with an internal tapered bore.',
    meta: 'Adapter',
    text: `; Pipe reducer adapter

STOCK D30 ID10
TOOL ANG R0.15 L3 A120 NA55
DEPTH CUT0.7 FINISH0.1

L5 D18
L8 DS18 DE24
L5 D26
L6 D28

INSIDE
L8 D16
L8 DS16 DE12
L8 D12`,
  },
  {
    id: 'lamp-finial',
    title: 'Lamp finial',
    description: 'Small decorative acorn profile with rounded transitions.',
    meta: 'Decorative',
    text: `; Lamp finial

STOCK D22
TOOL ROUND R0.8
DEPTH CUT0.5 FINISH0.08

L3 D8
L4 DS8 DE16 CONV
L5 DS16 DE14 CONC
L5 D20
L4 DS20 DE22 CONV
L2`,
  },
  {
    id: 'thread-relief-stub',
    title: 'Thread relief stub',
    description: 'Shaft end with a narrow relief groove before a larger shoulder.',
    meta: 'Thread prep',
    text: `; Thread relief stub

STOCK D18
TOOL RECT R0.15 L1.5 H4
DEPTH CUT0.4 FINISH0.05

L4 D10
L5 D12
L1 D9
L7 D16
L3 D18
L2`,
  },
  {
    id: 'imperial-spacer',
    title: 'Imperial spacer',
    description: 'Inch-unit sleeve with a stepped bore and mounting shoulder.',
    meta: 'Inch units',
    text: `; Imperial spacer

UNITS IN
STOCK D1 ID0.25
TOOL ANG R0.01 L0.08 A120 NA55
DEPTH CUT0.03 FINISH0.005

L0.15 D0.55
L0.45 D0.65
L0.15 D0.9
L0.15 D0.9

INSIDE
L0.3 D0.4
L0.6 D0.3`,
  },
] as const;

function getStartSampleDefinitions(starterText: string): SampleDefinition[] {
  return [
    {
      id: 'starter',
      title: 'Starter sample',
      description: 'Default stock, tool, depth, and a stepped outside profile.',
      meta: 'First part',
      text: starterText,
    },
    ...START_SAMPLE_DEFINITIONS,
  ];
}

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

  constructor(container: HTMLElement, private starterText: string) {
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
        this.preloadSamples();
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
    this.preloadSamples();
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
    const container = document.createElement('div');
    container.className = 'sampleDialog';

    const grid = document.createElement('div');
    grid.className = 'sampleDialogGrid';
    container.appendChild(grid);

    let dialog: HTMLDivElement;
    for (const sample of getStartSampleDefinitions(this.starterText)) {
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

      const meta = document.createElement('small');
      meta.textContent = sample.meta;
      button.appendChild(meta);

      button.addEventListener('click', () => {
        dialog.remove();
        this.dispatchEvent(new StartLatheCodeEvent(sample.text));
      });
      grid.appendChild(button);
    }

    dialog = createFullScreenDialog(container, 'Samples');
  }

  private preloadSamples() {
    preloadLatheCodePreviews(getStartSampleDefinitions(this.starterText).map(sample => sample.text));
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
