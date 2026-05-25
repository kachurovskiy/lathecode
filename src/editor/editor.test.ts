import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor, PlanEvent, wrapStlText } from './editor';
import { DEFAULT_APP_SETTINGS, DEFAULT_OPENROUTER_MODEL } from '../common/settings';

describe('Editor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it('undoes and redoes valid lathecode texts seen in the editor session', () => {
    const container = createEditorContainer('STOCK D10\nL2 R3');

    new Editor(container);
    const input = container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!;
    const historyToolbarGroup = container.querySelector<HTMLElement>('.historyToolbarGroup')!;
    const undoButton = container.querySelector<HTMLButtonElement>('.undoButton')!;
    const redoButton = container.querySelector<HTMLButtonElement>('.redoButton')!;

    expect(historyToolbarGroup.hidden).toBe(true);
    expect(undoButton.hidden).toBe(true);
    expect(redoButton.hidden).toBe(true);

    setInputValue('.latheCodeInput', 'STOCK D10\nL2 R4');
    expect(historyToolbarGroup.hidden).toBe(false);
    expect(undoButton.hidden).toBe(false);
    expect(redoButton.hidden).toBe(true);

    setInputValue('.latheCodeInput', 'STOCK D10\nBROKEN');
    expect(container.querySelector('.errorContainer')!.textContent).toContain('Unexpected line');
    expect(undoButton.hidden).toBe(false);

    undoButton.click();
    expect(input.value).toBe('STOCK D10\nL2 R4');
    expect(container.querySelector('.errorContainer')!.textContent).toBe('');

    undoButton.click();
    expect(input.value).toBe('STOCK D10\nL2 R3');
    expect(undoButton.hidden).toBe(true);
    expect(redoButton.hidden).toBe(false);

    redoButton.click();
    expect(input.value).toBe('STOCK D10\nL2 R4');
  });

  it('clears redo history after a new valid edit from an undone state', () => {
    const container = createEditorContainer('STOCK D10\nL2 R3');

    new Editor(container);
    const input = container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!;
    const undoButton = container.querySelector<HTMLButtonElement>('.undoButton')!;
    const redoButton = container.querySelector<HTMLButtonElement>('.redoButton')!;

    setInputValue('.latheCodeInput', 'STOCK D10\nL2 R4');
    undoButton.click();
    expect(input.value).toBe('STOCK D10\nL2 R3');
    expect(redoButton.hidden).toBe(false);

    setInputValue('.latheCodeInput', 'STOCK D10\nL2 R5');

    expect(input.value).toBe('STOCK D10\nL2 R5');
    expect(redoButton.hidden).toBe(true);
    undoButton.click();
    expect(input.value).toBe('STOCK D10\nL2 R3');
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
    const stockDiameterFields = document.querySelector<HTMLElement>('.stockDiameterFields')!;
    expect(stockDiameterFields.querySelector<HTMLInputElement>('input[name="stockDiameter"]')).not.toBeNull();
    expect(stockDiameterFields.querySelector<HTMLInputElement>('input[name="stockInnerDiameter"]')).not.toBeNull();
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
    expect(document.querySelector<HTMLElement>('.feedScaleRuler')!.textContent).toContain('25.4 mm / 1 in');
    expect(document.querySelectorAll('.feedAnimationRow').length).toBe(3);
    expect(document.querySelector<HTMLElement>('.feedAnimationValue')!.textContent).toBe('7.874016 in/min');
    const track = document.querySelector<HTMLElement>('.feedAnimationTrack')!;
    expect(parseFloat(track.style.getPropertyValue('--feed-preview-travel'))).toBeGreaterThan(100);
    expect(track.style.getPropertyValue('--feed-preview-duration'))
      .toMatch(/ms$/);
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
      'L0.07874 R0.11811');
  });

  it('converts lathecode values from the units dialog', () => {
    const container = createEditorContainer(
      'UNITS MM\n' +
      'STOCK D25.4 ID2.54\n' +
      'TOOL RECT R0.254 L2.54\n' +
      'DEPTH CUT0.254 FINISH0.127\n' +
      'FEED MOVE25.4 PASS12.7 PART2.54\n' +
      'L25.4 R12.7\n' +
      'L2.54');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.unitsButton')!.click();
    document.querySelector<HTMLButtonElement>('.setupChoiceButton[data-unit="IN"]')!.click();
    clickDialogButton('Use units');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value).toBe(
      'UNITS IN\n' +
      'STOCK D1 ID0.1\n' +
      'TOOL RECT R0.01 L0.1\n' +
      'DEPTH CUT0.01 FINISH0.005\n' +
      'FEED MOVE1 PASS0.5 PART0.1\n' +
      'L1 R0.5\n' +
      'L0.1');
  });

  it('keeps feed preview speed proportional for slow feeds', () => {
    const container = createEditorContainer('UNITS MM\nFEED MOVE8 PASS36 PART1\nSTOCK D10\nL2 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.feedButton')!.click();

    const tracks = Array.from(document.querySelectorAll<HTMLElement>('.feedAnimationTrack'));
    const moveDuration = parseFloat(tracks[0].style.getPropertyValue('--feed-preview-duration'));
    const passDuration = parseFloat(tracks[1].style.getPropertyValue('--feed-preview-duration'));

    expect(moveDuration).toBeGreaterThan(60000);
    expect(moveDuration / passDuration).toBeCloseTo(36 / 8, 1);
  });

  it('resets feed values to lathecode defaults in the current units', () => {
    const container = createEditorContainer('UNITS IN\nFEED MOVE1 PASS1 PART1\nSTOCK D10\nL2 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.feedButton')!.click();
    clickDialogButton('Reset defaults');

    expect(document.querySelector<HTMLInputElement>('input[name="feedMove"]')!.value).toBe('7.874016');
    expect(document.querySelector<HTMLInputElement>('input[name="feedPass"]')!.value).toBe('1.968504');
    expect(document.querySelector<HTMLInputElement>('input[name="feedPart"]')!.value).toBe('0.393701');

    clickDialogButton('Use feed');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toContain('FEED MOVE7.874016 PASS1.968504 PART0.393701');
  });

  it('scales lathecode by a factor', () => {
    const container = createEditorContainer('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.scaleButton')!.click();
    setInputValue('input[name="scaleFactor"]', '2');
    clickDialogButton('Scale lathecode');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D16\nTOOL RECT R0.2 L2\nL10 R8');
  });

  it('scales lathecode to target diameter and length', () => {
    const container = createEditorContainer('STOCK D10\nL5 R4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.scaleButton')!.click();
    expect(document.querySelector<HTMLFormElement>('.scaleDialog')!.textContent).toContain('Target diameter');
    setInputValue('input[name="targetDiameter"]', '30');
    setInputValue('input[name="targetLength"]', '20');
    clickDialogButton('Scale lathecode');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D30\nL20 R15');
  });

  it('scales uniformly to one target dimension', () => {
    const container = createEditorContainer('STOCK D10\nL5 R4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.scaleButton')!.click();
    setInputValue('input[name="targetLength"]', '20');
    clickDialogButton('Scale lathecode');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D32\nL20 R16');
  });

  it('flips inside-only profiles', () => {
    const container = createEditorContainer('STOCK D10\nINSIDE\nL2 R2\nL3 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.flipButton')!.click();

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value).toBe('STOCK D10\nINSIDE\nL3 R3\nL2 R2');
  });

  it('adds and removes a rectangular-tool parting line', () => {
    const container = createEditorContainer('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4');

    new Editor(container);
    const partingButton = container.querySelector<HTMLButtonElement>('.partingButton')!;
    expect(partingButton.hidden).toBe(false);
    expect(partingButton.textContent).toBe('Add parting');

    partingButton.click();
    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4\nL2');
    expect(partingButton.textContent).toBe('Remove parting');

    partingButton.click();
    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4');
    expect(partingButton.textContent).toBe('Add parting');
  });

  it('adds and removes outside parting before an inside profile', async () => {
    const container = createEditorContainer('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4\nINSIDE\nL5 R2');
    const editor = new Editor(container);
    const planned: string[] = [];
    editor.addEventListener('plan', event => {
      planned.push((event as PlanEvent).latheCode.getText());
    });

    const partingButton = container.querySelector<HTMLButtonElement>('.partingButton')!;
    partingButton.click();

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4\nL2\nINSIDE\nL5 R2');
    expect(partingButton.textContent).toBe('Remove parting');

    container.querySelector<HTMLButtonElement>('.insidePlanButton')!.click();
    container.querySelector<HTMLButtonElement>('.outsidePlanButton')!.click();
    await waitForAsyncClick();
    expect(planned).toEqual([
      'STOCK D10\nTOOL RECT R0.2 L2\nINSIDE\nL5 R2',
      'STOCK D10\nTOOL RECT R0.2 L2\nL5 R4\nL2',
    ]);

    partingButton.click();
    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4\nINSIDE\nL5 R2');
    expect(partingButton.textContent).toBe('Add parting');
  });

  it('uses current units for the parting line length', () => {
    const container = createEditorContainer('UNITS IN\nSTOCK D1\nTOOL RECT R0.008 L0.125\nL0.5 R0.4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.partingButton')!.click();

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('UNITS IN\nSTOCK D1\nTOOL RECT R0.008 L0.125\nL0.5 R0.4\nL0.125');
  });

  it('hides the parting button for non-rectangular tools', () => {
    const roundContainer = createEditorContainer('STOCK D10\nTOOL ROUND R4\nL2 R3');
    new Editor(roundContainer);
    expect(roundContainer.querySelector<HTMLButtonElement>('.partingButton')!.hidden).toBe(true);

    const angledContainer = createEditorContainer('STOCK D10\nTOOL ANG R0.4 L7.8 A32.5 NA55\nL2 R3');
    new Editor(angledContainer);
    expect(angledContainer.querySelector<HTMLButtonElement>('.partingButton')!.hidden).toBe(true);
  });

  it('modifies the current lathecode through OpenRouter', async () => {
    localStorage.setItem('openRouterApiKey', 'sk-or-test');
    const container = createEditorContainer('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4');
    const fetchMock = mockOpenRouterLatheCodeResponse('STOCK D12\nTOOL RECT R0.2 L2\nL5 R5');
    vi.stubGlobal('fetch', fetchMock);

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.llmModifyButton')!.click();
    expect(document.querySelector<HTMLElement>('.llmDialog .privacyDisclosure')!.textContent)
      .toContain('current editor lathecode');
    document.querySelector<HTMLTextAreaElement>('.llmTextArea')!.value = 'increase the outside diameter to 10 mm';
    clickDialogButton('Modify lathecode');
    await waitForAsyncWork();

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D12\nTOOL RECT R0.2 L2\nL5 R5');
    const request = getOpenRouterRequest(fetchMock);
    expect(request.model).toBe(DEFAULT_OPENROUTER_MODEL);
    expect(request.messages[1].content).toContain('increase the outside diameter to 10 mm');
    expect(request.messages[1].content).toContain('STOCK D10');
  });

  it('asks for an OpenRouter key before showing the LLM modification prompt', () => {
    const container = createEditorContainer('STOCK D10\nTOOL RECT R0.2 L2\nL5 R4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.llmModifyButton')!.click();

    expect(document.querySelector('.openRouterKeyDialog')).not.toBeNull();
    expect(document.querySelector('.llmTextArea')).toBeNull();

    setInputValue('input[name="openRouterApiKey"]', 'sk-or-test');
    clickDialogButton('Save key');

    expect(localStorage.getItem('openRouterApiKey')).toBe('sk-or-test');
    expect(document.querySelector('.openRouterKeyDialog')).toBeNull();
    expect(document.querySelector('.llmTextArea')).not.toBeNull();
  });

  it('replaces the tool line from the tool dialog', () => {
    const container = createEditorContainer('STOCK D10\nTOOL RECT R0.2 L2\nL2 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.toolButton')!.click();
    expect(document.querySelector<HTMLDetailsElement>('.manualToolDetails')!.open).toBe(false);
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

  it('inserts known tool dimensions in the current units', () => {
    const container = createEditorContainer('UNITS IN\nSTOCK D1\nL0.5 R0.4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.toolButton')!.click();
    const insertCard = document.querySelector<HTMLButtonElement>('.toolPresetCard[data-insert="DCGT070204-AK"]')!;
    expect(insertCard.textContent).toContain('0.307087 in');
    insertCard.click();
    clickDialogButton('Use selected insert');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('UNITS IN\nSTOCK D1\nTOOL ANG R0.015748 L0.307087 A32.5 NA55\nL0.5 R0.4');

    container.querySelector<HTMLButtonElement>('.toolButton')!.click();
    expect(document.querySelector<HTMLButtonElement>('.toolPresetCard[data-insert="DCGT070204-AK"]')!.classList.contains('selected'))
      .toBe(true);
  });

  it('keeps manual tool definition available as a secondary option', () => {
    const container = createEditorContainer('STOCK D10\nL2 R3');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.toolButton')!.click();
    document.querySelector<HTMLDetailsElement>('.manualToolDetails')!.open = true;
    expect(getComputedStyle(document.querySelector<HTMLDetailsElement>('.manualToolDetails')!).marginBottom).not.toBe('0px');
    document.querySelector<HTMLButtonElement>('.manualToolTypeButton[data-type="ROUND"]')!.click();
    setInputValue('.manualParamInput[data-param="R"]', '4');
    clickDialogButton('Use manual definition');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('STOCK D10\nTOOL ROUND R4\nL2 R3');
  });

  it('uses current units for manual tool defaults', () => {
    const container = createEditorContainer('UNITS IN\nSTOCK D1\nL0.5 R0.4');

    new Editor(container);
    container.querySelector<HTMLButtonElement>('.toolButton')!.click();
    document.querySelector<HTMLDetailsElement>('.manualToolDetails')!.open = true;

    expect(document.querySelector<HTMLInputElement>('.manualParamInput[data-param="R"]')!.placeholder)
      .toBe('Default 0.007874 in');
    clickDialogButton('Use manual definition');

    expect(container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value)
      .toBe('UNITS IN\nSTOCK D1\nTOOL RECT R0.007874 L0.07874\nL0.5 R0.4');
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
    <div class="editorToolbarGroup historyToolbarGroup">
      <button class="undoButton"></button>
      <button class="redoButton"></button>
    </div>
    <button class="flipButton"></button>
    <button class="stlButton"></button>
    <button class="planButton"></button>
    <button class="outsidePlanButton"></button>
    <button class="insidePlanButton"></button>
    <button class="saveButton"></button>
    <button class="scaleButton"></button>
    <button class="partingButton"></button>
    <button class="llmModifyButton"></button>
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

type FetchMock = ReturnType<typeof vi.fn>;

function mockOpenRouterLatheCodeResponse(latheCode: string): FetchMock {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      choices: [{message: {content: latheCode}}],
    }),
  });
}

function getOpenRouterRequest(fetchMock: FetchMock): any {
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(init.body as string);
}

async function waitForAsyncWork() {
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
}
