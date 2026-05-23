import { beforeEach, describe, expect, it } from 'vitest';
import { Editor, PlanEvent, wrapStlText } from './editor';
import { DEFAULT_APP_SETTINGS } from '../common/settings';

describe('Editor', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('shows GCode planning for inside-only profiles', () => {
    const container = createEditorContainer('STOCK D10\nINSIDE\nL2 R3');

    new Editor(container);

    expect(container.querySelector<HTMLButtonElement>('.planButton')!.hidden).toBe(false);
    expect(container.querySelector<HTMLButtonElement>('.outsidePlanButton')!.hidden).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('.insidePlanButton')!.hidden).toBe(true);
  });

  it('shows separate GCode planning buttons for mixed profiles', () => {
    const container = createEditorContainer('STOCK D10\nL2 R4\nINSIDE\nL2 R3');

    new Editor(container);

    expect(container.querySelector<HTMLButtonElement>('.planButton')!.hidden).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('.outsidePlanButton')!.hidden).toBe(false);
    expect(container.querySelector<HTMLButtonElement>('.insidePlanButton')!.hidden).toBe(false);
  });

  it('plans mixed profiles directly from the profile GCode buttons', async () => {
    const container = createEditorContainer('STOCK D10\nL2 R4\nINSIDE\nL2 R3');
    const editor = new Editor(container);
    const planned: string[] = [];
    editor.addEventListener('plan', event => {
      planned.push((event as PlanEvent).latheCode.getText());
    });

    container.querySelector<HTMLButtonElement>('.insidePlanButton')!.click();
    container.querySelector<HTMLButtonElement>('.outsidePlanButton')!.click();
    await waitForAsyncClick();

    expect(document.querySelector('.fullScreenDialog')).toBeNull();
    expect(planned).toEqual([
      'STOCK D10\nINSIDE\nL2 R3',
      'STOCK D10\nL2 R4',
    ]);
  });

  it('sends stored settings with plan events', async () => {
    localStorage.setItem('pxPerMm', '750');
    localStorage.setItem('plannerEngine', 'vector');
    localStorage.setItem('smoothingEpsilonPx', '1.25');
    localStorage.setItem('vectorMinimumRoughChipAreaMm2', '0.02');
    const container = createEditorContainer('STOCK D10\nL2 R3');
    const editor = new Editor(container);
    const plannedSettings: PlanEvent['settings'][] = [];
    editor.addEventListener('plan', event => {
      plannedSettings.push((event as PlanEvent).settings);
    });

    container.querySelector<HTMLButtonElement>('.planButton')!.click();
    await waitForAsyncClick();

    expect(localStorage.getItem('pxPerMm')).toBe('750');
    expect(localStorage.getItem('plannerEngine')).toBe('vector');
    expect(localStorage.getItem('smoothingEpsilonPx')).toBe('1.25');
    expect(localStorage.getItem('vectorMinimumRoughChipAreaMm2')).toBe('0.02');
    expect(plannedSettings).toEqual([{
      ...DEFAULT_APP_SETTINGS,
      pxPerMm: 750,
      plannerEngine: 'vector',
      smoothingEpsilonPx: 1.25,
      vectorMinimumRoughChipAreaMm2: 0.02,
    }]);
  });

  it('can defer the initial update until main selects a start source', () => {
    const container = createEditorContainer('STOCK D10\nL2 R3');

    new Editor(container, {deferInitialUpdate: true});

    expect(localStorage.getItem('latheCode')).toBeNull();
    expect(container.querySelector<HTMLButtonElement>('.planButton')!.hidden).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('.outsidePlanButton')!.hidden).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('.insidePlanButton')!.hidden).toBe(true);
  });

  it('updates setup directives from dedicated editor dialogs', () => {
    const container = createEditorContainer('STOCK D10\nL2 R3');

    new Editor(container);

    container.querySelector<HTMLButtonElement>('.unitsButton')!.click();
    expect(document.querySelector('.unitsVisual')).not.toBeNull();
    expect(document.querySelector('.unitsVisual')!.textContent).toContain('1 in = 25.4 mm');
    expect(document.querySelector<HTMLButtonElement>('.setupChoiceButton[data-unit="MM"]')!.classList.contains('selected'))
      .toBe(true);
    document.querySelector<HTMLButtonElement>('.setupChoiceButton[data-unit="IN"]')!.click();
    clickDialogButton('Use units');

    container.querySelector<HTMLButtonElement>('.stockButton')!.click();
    expect(document.querySelector('.stockVisual')).not.toBeNull();
    expect(document.querySelector('input[name="stockAllowance"]')).toBeNull();
    setInputValue('input[name="stockDiameter"]', '20');
    setInputValue('input[name="stockInnerDiameter"]', '4');
    clickDialogButton('Use stock');

    container.querySelector<HTMLButtonElement>('.depthButton')!.click();
    expect(document.querySelector('.depthVisual')).toBeNull();
    expect(document.querySelector<HTMLButtonElement>('.dialogCloseButton')!.parentElement?.classList.contains('settingsActions'))
      .toBe(true);
    setInputValue('input[name="depthCut"]', '0.03');
    setInputValue('input[name="depthFinish"]', '0.005');
    clickDialogButton('Use depth');

    container.querySelector<HTMLButtonElement>('.feedButton')!.click();
    expect(document.querySelector('.feedVisual')).toBeNull();
    expect(document.querySelector<HTMLFormElement>('.setupFeedDialog')!.textContent).toContain('in/min');
    setInputValue('input[name="feedMove"]', '8');
    setInputValue('input[name="feedPass"]', '2');
    setInputValue('input[name="feedPart"]', '0.5');
    clickDialogButton('Use feed');

    container.querySelector<HTMLButtonElement>('.modeButton')!.click();
    expect(document.querySelector('.modeVisual')).toBeNull();
    document.querySelector<HTMLButtonElement>('.setupChoiceButton[data-mode="TURN"]')!.click();
    clickDialogButton('Use mode');

    container.querySelector<HTMLButtonElement>('.axesButton')!.click();
    expect(document.querySelector('.axesVisual')).toBeNull();
    document.querySelector<HTMLButtonElement>('.setupChoiceButton[data-z="RIGHT"]')!.click();
    document.querySelector<HTMLButtonElement>('.setupChoiceButton[data-x="DOWN"]')!.click();
    clickDialogButton('Reset');
    expect(document.querySelector<HTMLButtonElement>('.setupChoiceButton[data-z="LEFT"]')!.classList.contains('selected'))
      .toBe(true);
    expect(document.querySelector<HTMLButtonElement>('.setupChoiceButton[data-x="UP"]')!.classList.contains('selected'))
      .toBe(true);
    clickDialogButton('Use axes');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value).toBe(
      'UNITS IN\n' +
      'STOCK D20 ID4\n' +
      'DEPTH CUT0.03 FINISH0.005\n' +
      'FEED MOVE8 PASS2 PART0.5\n' +
      'MODE TURN\n' +
      'AXES LEFT UP\n' +
      'L2 R3');
  });

  it('scales lathecode by a factor', () => {
    const container = createEditorContainer('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.scaleButton')!.click();
    setInputValue('input[name="scaleFactor"]', '2');
    clickDialogButton('Scale lathecode');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D20\nTOOL RECT R0.2 L2\nL10 R8');
  });

  it('scales lathecode to target width and length', () => {
    const container = createEditorContainer('STOCK D10\nL5 R4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.scaleButton')!.click();
    setInputValue('input[name="targetWidth"]', '30');
    setInputValue('input[name="targetLength"]', '20');
    clickDialogButton('Scale lathecode');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D30\nL20 R12');
  });

  it('scales uniformly to one target dimension', () => {
    const container = createEditorContainer('STOCK D10\nL5 R4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.scaleButton')!.click();
    setInputValue('input[name="targetLength"]', '20');
    clickDialogButton('Scale lathecode');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D40\nL20 R16');
  });

  it('flips inside-only profiles', () => {
    const container = createEditorContainer('STOCK D10\nINSIDE\nL2 R2\nL3 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.flipButton')!.click();

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value).toBe('STOCK D10\nINSIDE\nL3 R3\nL2 R2');
  });

  it('replaces the tool line from the tool dialog', () => {
    const container = createEditorContainer('STOCK D10\nTOOL RECT R0.2 L2\nL2 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.toolButton')!.click();
    document.querySelector<HTMLButtonElement>('.toolPresetCard[data-insert="DCGT070204-AK"]')!.click();
    expect(document.querySelector('.presetParamInput[data-param="R"]')).toBeNull();
    setInputValue('.presetParamInput[data-param="A"]', '15');
    clickDialogButton('Use selected insert');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D10\nTOOL ANG R0.4 L7.8 A15 NA55\nL2 R3');
  });

  it('inserts a tool line after stock from the tool dialog', () => {
    const container = createEditorContainer('STOCK D10\nL2 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.toolButton')!.click();
    document.querySelector<HTMLButtonElement>('.toolPresetCard[data-insert="DCGT070204-AK"]')!.click();
    clickDialogButton('Use selected insert');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D10\nTOOL ANG R0.4 L7.8 A32.5 NA55\nL2 R3');
  });

  it('keeps manual tool definition available as a secondary option', () => {
    const container = createEditorContainer('STOCK D10\nL2 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.toolButton')!.click();
    document.querySelector<HTMLDetailsElement>('.manualToolDetails')!.open = true;
    document.querySelector<HTMLButtonElement>('.manualToolTypeButton[data-type="ROUND"]')!.click();
    setInputValue('.manualParamInput[data-param="R"]', '4');
    clickDialogButton('Use manual definition');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D10\nTOOL ROUND R4\nL2 R3');
  });

  it('hides manual tool inputs that do not apply to the selected shape', () => {
    const container = createEditorContainer('STOCK D10\nL2 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.toolButton')!.click();
    document.querySelector<HTMLDetailsElement>('.manualToolDetails')!.open = true;

    expectManualParamVisibility(['R', 'L', 'H']);

    document.querySelector<HTMLButtonElement>('.manualToolTypeButton[data-type="ROUND"]')!.click();
    expectManualParamVisibility(['R']);

    document.querySelector<HTMLButtonElement>('.manualToolTypeButton[data-type="ANG"]')!.click();
    expectManualParamVisibility(['R', 'L', 'A', 'NA']);
  });

  it('keeps the existing tool when wrapping imported STL lathecode without stock', () => {
    const text = wrapStlText(
      'part.stl',
      'L10 R3',
      'STOCK D20\nTOOL ROUND R4\nL1 R1');

    expect(text).toContain('\nTOOL ROUND R4\nL10 R3');
  });

  it('keeps the existing tool after imported STL stock when stock is generated', () => {
    const text = wrapStlText(
      'part.stl',
      'STOCK D8 ID2\nL10 R4',
      'STOCK D20\nTOOL ANG R0.4 L7.8 A32.5 NA55\nL1 R1');

    expect(text).toContain('\nSTOCK D8 ID2\nTOOL ANG R0.4 L7.8 A32.5 NA55\nL10 R4');
  });
});

function createEditorContainer(value: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="inputContainer">
      <textarea class="latheCodeInput"></textarea>
      <div class="statusContainer"></div>
      <div class="errorContainer"></div>
    </div>
    <button class="unitsButton"></button>
    <button class="stockButton"></button>
    <button class="depthButton"></button>
    <button class="feedButton"></button>
    <button class="modeButton"></button>
    <button class="axesButton"></button>
    <button class="toolButton"></button>
    <button class="flipButton"></button>
    <button class="stlButton"></button>
    <button class="planButton"></button>
    <button class="outsidePlanButton"></button>
    <button class="insidePlanButton"></button>
    <button class="saveButton"></button>
    <button class="scaleButton"></button>
  `;
  container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value = value;
  document.body.appendChild(container);
  return container;
}

function clickDialogButton(text: string) {
  const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent === text);
  if (!button) throw new Error(`Button not found: ${text}`);
  button.click();
}

function setInputValue(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!input) throw new Error(`Input not found: ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', {bubbles: true}));
  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function expectManualParamVisibility(visibleParams: string[]) {
  const visible = new Set(visibleParams);
  for (const param of ['R', 'L', 'H', 'A', 'NA']) {
    const input = document.querySelector<HTMLInputElement>(`.manualParamInput[data-param="${param}"]`);
    if (!input) throw new Error(`Manual param not found: ${param}`);
    const hidden = !visible.has(param);
    expect(input.disabled).toBe(hidden);
    expect(input.closest<HTMLElement>('.toolField')!.hidden).toBe(hidden);
  }
}

function waitForAsyncClick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
