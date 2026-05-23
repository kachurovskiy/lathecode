import { LatheCode, ProfileSide } from '../common/lathecode.ts';
import { createFullScreenDialog } from '../common/dialog.ts';
import { openToolDialog } from './tooldialog.ts';
import { openSetupDialog, type SetupDialogKind } from './setupdialog.ts';
import StlImportWorker from './stlimportworker?worker&inline';
import { FromStlWorkerMessage } from './stlimportworker.ts';
import { AppSettings, loadAppSettings } from '../common/settings.ts';

export class PlanEvent extends Event {
  constructor(readonly latheCode: LatheCode, readonly settings: AppSettings) {
    super('plan');
  }

  get pxPerMm() {
    return this.settings.pxPerMm;
  }
}

export class Editor extends EventTarget {
  private errorContainer: HTMLDivElement;
  private statusContainer: HTMLDivElement;
  private latheCodeInput: HTMLTextAreaElement;
  private defaultLatheCodeText: string;
  private planButton: HTMLButtonElement;
  private outsidePlanButton: HTMLButtonElement;
  private insidePlanButton: HTMLButtonElement;
  private saveButton: HTMLButtonElement;
  private toolButton: HTMLButtonElement;
  private flipButton: HTMLButtonElement;
  private scaleButton: HTMLButtonElement;
  private latheCode: LatheCode | null = null;
  private worker: Worker | null = null;

  constructor(container: HTMLElement, options: {deferInitialUpdate?: boolean} = {}) {
    super();

    this.planButton = container.querySelector<HTMLButtonElement>('.planButton')!;
    this.outsidePlanButton = container.querySelector<HTMLButtonElement>('.outsidePlanButton')!;
    this.insidePlanButton = container.querySelector<HTMLButtonElement>('.insidePlanButton')!;
    this.errorContainer = container.querySelector('.errorContainer')!;
    this.statusContainer = container.querySelector('.statusContainer')!;
    this.latheCodeInput = container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!;
    this.defaultLatheCodeText = this.latheCodeInput.value;
    this.latheCodeInput.addEventListener('input', () => this.update());

    for (const button of [
      {selector: '.unitsButton', kind: 'units' as const},
      {selector: '.stockButton', kind: 'stock' as const},
      {selector: '.depthButton', kind: 'depth' as const},
      {selector: '.feedButton', kind: 'feed' as const},
      {selector: '.modeButton', kind: 'mode' as const},
      {selector: '.axesButton', kind: 'axes' as const},
    ]) {
      container
        .querySelector<HTMLButtonElement>(button.selector)!
        .addEventListener('click', () => this.openSetupDialog(button.kind));
    }

    container.querySelector<HTMLButtonElement>('.stlButton')!.addEventListener('click', () => {
      this.dispatchEvent(new Event('stl'));
    });

    this.planButton.addEventListener('click', () => this.planLatheCode());
    this.outsidePlanButton.addEventListener('click', () => this.planLatheCode('outside'));
    this.insidePlanButton.addEventListener('click', () => this.planLatheCode('inside'));

    this.toolButton = container.querySelector<HTMLButtonElement>('.toolButton')!;
    this.toolButton.addEventListener('click', () => this.openToolDialog());

    this.flipButton = container.querySelector<HTMLButtonElement>('.flipButton')!;
    this.flipButton.addEventListener('click', () => {
      if (!this.latheCode) return;
      this.latheCodeInput.value = this.latheCode.reverse();
      this.update();
    });

    this.saveButton = container.querySelector<HTMLButtonElement>('.saveButton')!;
    this.scaleButton = container.querySelector<HTMLButtonElement>('.scaleButton')!;

    this.saveButton.addEventListener('click', () => this.saveLatheCode());
    this.scaleButton.addEventListener('click', () => this.openScaleDialog());

    const savedDraft = localStorage.getItem('latheCode');
    if (savedDraft?.trim()) {
      this.latheCodeInput.value = savedDraft;
      this.update();
    } else if (options.deferInitialUpdate) {
      this.updatePlanningButtons(null);
    } else {
      this.update();
    }
  }

  // Save current LatheCode
  saveLatheCode() {
    let saveValue = this.latheCodeInput.value;
    // At least 2 lines required to be recognized in local storage.
    if (saveValue.indexOf('\n') === -1) saveValue += '\n';

    const saveName = prompt('Enter the name for this lathecode file', new Date().toLocaleString());
    if (!saveName) return; // Handle empty name case

    localStorage.setItem(saveName, saveValue);
    this.dispatchEvent(new Event('saved'));
  }

  getLatheCode() {
    return this.latheCode;
  }

  getDefaultText() {
    return this.defaultLatheCodeText;
  }

  setText(text: string) {
    this.latheCodeInput.value = text;
    this.update();
  }

  getPxPerMm() {
    return this.getAppSettings().pxPerMm;
  }

  getAppSettings() {
    return loadAppSettings();
  }

  private update() {
    try {
      localStorage.setItem('latheCode', this.latheCodeInput.value);
      this.latheCode = new LatheCode(this.latheCodeInput.value);
      this.updatePlanningButtons(this.latheCode);
      this.errorContainer.textContent = '';
    } catch (error: any) {
      this.latheCode = null;
      this.updatePlanningButtons(null);
      this.errorContainer.textContent = error.message;
    }
    this.dispatchEvent(new Event('change'));
  }

  private updatePlanningButtons(latheCode: LatheCode | null) {
    const profiles = latheCode?.getProfiles() ?? [];
    const hasMultipleProfiles = profiles.length > 1;
    this.planButton.hidden = !profiles.length || hasMultipleProfiles;
    this.outsidePlanButton.hidden = !hasMultipleProfiles;
    this.insidePlanButton.hidden = !hasMultipleProfiles;
  }

  private planLatheCode(side?: ProfileSide) {
    const latheCode = this.getLatheCodeForPlanning(side);
    if (latheCode) this.dispatchEvent(new PlanEvent(latheCode, this.getAppSettings()));
  }

  private getLatheCodeForPlanning(side?: ProfileSide): LatheCode | null {
    if (!this.latheCode) return null;
    const profiles = this.latheCode.getProfiles();
    if (profiles.length <= 1) return this.latheCode;
    return side ? this.latheCode.getLatheCodeForProfile(side) : null;
  }

  private openToolDialog() {
    openToolDialog(
      () => this.latheCodeInput.value,
      text => {
        this.latheCodeInput.value = text;
        this.update();
      });
  }

  private openSetupDialog(kind: SetupDialogKind) {
    openSetupDialog(
      kind,
      () => this.latheCodeInput.value,
      text => {
        this.latheCodeInput.value = text;
        this.update();
      });
  }

  private openScaleDialog() {
    if (!this.latheCode) return;

    const partDimensions = this.latheCode.getPartDimensions();
    const form = document.createElement('form');
    form.className = 'scaleDialog settingsDialog';

    const grid = document.createElement('div');
    grid.className = 'settingsGrid';
    form.appendChild(grid);

    const factorInput = this.createScaleNumberInput('scaleFactor', '1');
    const targetDiameterInput = this.createScaleNumberInput('targetDiameter', partDimensions ? formatScaleValue(partDimensions.diameter) : '');
    const targetLengthInput = this.createScaleNumberInput('targetLength', partDimensions ? formatScaleValue(partDimensions.length) : '');

    grid.appendChild(this.createScaleField(
      'Scale factor',
      factorInput,
      'Used when target diameter and target length are empty.'));
    grid.appendChild(this.createScaleField(
      'Target diameter',
      targetDiameterInput,
      partDimensions ? `Current part diameter is ${formatScaleValue(partDimensions.diameter)} mm.` : 'Current part diameter is unavailable.'));
    grid.appendChild(this.createScaleField(
      'Target length',
      targetLengthInput,
      partDimensions ? `Current part length is ${formatScaleValue(partDimensions.length)} mm.` : 'Current part length is unavailable.'));

    const error = document.createElement('div');
    error.className = 'toolDialogError';
    form.appendChild(error);

    const actions = document.createElement('div');
    actions.className = 'settingsActions';
    const applyButton = document.createElement('button');
    applyButton.type = 'submit';
    applyButton.textContent = 'Scale lathecode';
    actions.appendChild(applyButton);
    form.appendChild(actions);

    let dialog: HTMLDivElement;
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        const {xScale, zScale} = this.readScaleFactors(factorInput, targetDiameterInput, targetLengthInput);
        if (!this.latheCode) throw new Error('Lathecode is not valid');
        this.latheCodeInput.value = this.latheCode.scale(xScale, zScale);
        this.update();
        dialog.remove();
      } catch (e) {
        error.textContent = e instanceof Error ? e.message : String(e);
      }
    });

    dialog = createFullScreenDialog(form, 'Scale');
    factorInput.focus();
  }

  private createScaleNumberInput(name: string, placeholder: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.min = '0';
    input.name = name;
    input.placeholder = placeholder;
    input.className = 'settingInput';
    return input;
  }

  private createScaleField(labelText: string, input: HTMLInputElement, guideText: string): HTMLLabelElement {
    const field = document.createElement('label');
    field.className = 'settingField';

    const heading = document.createElement('span');
    heading.className = 'settingHeading';
    heading.textContent = labelText;
    field.appendChild(heading);

    field.appendChild(input);

    const guide = document.createElement('span');
    guide.className = 'settingGuide';
    guide.textContent = guideText;
    field.appendChild(guide);

    return field;
  }

  private readScaleFactors(
    factorInput: HTMLInputElement,
    targetDiameterInput: HTMLInputElement,
    targetLengthInput: HTMLInputElement,
  ): {xScale: number, zScale: number} {
    const factor = this.readOptionalPositiveNumber(factorInput, 'Scale factor');
    const targetDiameter = this.readOptionalPositiveNumber(targetDiameterInput, 'Target diameter');
    const targetLength = this.readOptionalPositiveNumber(targetLengthInput, 'Target length');
    const partDimensions = this.latheCode?.getPartDimensions();

    if (targetDiameter === null && targetLength === null) {
      if (factor === null) throw new Error('Enter a scale factor, target diameter, or target length');
      return {xScale: factor, zScale: factor};
    }

    if (targetDiameter !== null && (!partDimensions || partDimensions.diameter <= 0)) throw new Error('Current part diameter is not available');
    if (targetLength !== null && (!partDimensions || partDimensions.length <= 0)) throw new Error('Current part length is not available');

    if (targetDiameter !== null && targetLength !== null) {
      return {xScale: targetDiameter / partDimensions!.diameter, zScale: targetLength / partDimensions!.length};
    }

    const uniformScale = targetDiameter !== null
      ? targetDiameter / partDimensions!.diameter
      : targetLength! / partDimensions!.length;
    return {xScale: uniformScale, zScale: uniformScale};
  }

  private readOptionalPositiveNumber(input: HTMLInputElement, label: string): number | null {
    const rawValue = input.value.trim();
    if (!rawValue) return null;
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive number`);
    return value;
  }

  async importStlFile(file: File) {
    this.errorContainer.textContent = '';
    document.body.style.cursor = 'wait';
    try {
      await this.importStl(file);
    } catch (error) {
      this.errorContainer.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      document.body.style.cursor = 'default';
    }
  }

  private async importStl(file: File) {
    return new Promise<void>((resolve, reject) => {
      const textBeforeImport = this.latheCodeInput.value;
      const reader = new FileReader();
      reader.onload = async () => {
        const stl = reader.result as ArrayBuffer;
        if (this.worker) {
          this.worker.onmessage = null;
          this.worker.terminate();
        }
        this.worker = new StlImportWorker();
        this.worker.onmessage = (event: MessageEvent<any>) => {
          const m = event.data as FromStlWorkerMessage;
          if (m.error) {
            this.errorContainer.textContent = m.error;
            this.statusContainer.textContent = '';
            resolve();
          } else if (m.latheCodeText) {
            this.latheCodeInput.value = wrapStlText(file.name, m.latheCodeText, textBeforeImport);
            this.statusContainer.textContent = '';
            this.update();
            resolve();
          } else if (m.progressMessage) {
            this.statusContainer.textContent = m.progressMessage;
          }
        };
        this.worker.postMessage({ stl, settings: this.getAppSettings() });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}

export function wrapStlText(name:string, stlText: string, previousText = '') {
  const preservedToolLine = findToolLine(previousText);
  return `; ${name}

; Uncomment and modify lines below as needed
; STOCK D5
; TOOL RECT R0.2 L2
; DEPTH CUT1 FINISH0.1
; FEED MOVE200 PASS50 PART10 ; speeds mm/min
; MODE TURN ; for classic style of material removal
; AXES RIGHT DOWN ; for non-NanoEls controllers

` + insertToolLine(stlText, preservedToolLine);
}

function findToolLine(text: string): string | undefined {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .find(line => line.trimStart().startsWith('TOOL '))
    ?.trim();
}

function insertToolLine(stlText: string, toolLine: string | undefined): string {
  if (!toolLine) return stlText;

  const lines = stlText.replace(/\r\n/g, '\n').split('\n');
  const existingToolIndex = lines.findIndex(line => line.trimStart().startsWith('TOOL '));
  if (existingToolIndex >= 0) {
    lines[existingToolIndex] = toolLine;
    return lines.join('\n');
  }

  const stockIndex = lines.findIndex(line => line.trimStart().startsWith('STOCK '));
  if (stockIndex >= 0) {
    lines.splice(stockIndex + 1, 0, toolLine);
    return lines.join('\n');
  }

  const unitsIndex = lines.findIndex(line => line.trimStart().startsWith('UNITS '));
  if (unitsIndex >= 0) {
    lines.splice(unitsIndex + 1, 0, toolLine);
    return lines.join('\n');
  }

  const firstCodeIndex = lines.findIndex(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith(';');
  });
  lines.splice(firstCodeIndex >= 0 ? firstCodeIndex : lines.length, 0, toolLine);
  return lines.join('\n');
}

function formatScaleValue(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}
