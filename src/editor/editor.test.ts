import { beforeEach, describe, expect, it } from 'vitest';
import { Editor, PlanEvent, wrapStlText } from './editor';

describe('Editor', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('shows GCode planning for inside-only profiles', () => {
    const container = createEditorContainer('STOCK D10\nINSIDE\nL2 R3');

    new Editor(container);

    expect(container.querySelector<HTMLButtonElement>('.planButton')!.style.display).toBe('inline');
  });

  it('shows GCode planning for mixed profiles', () => {
    const container = createEditorContainer('STOCK D10\nL2 R4\nINSIDE\nL2 R3');

    new Editor(container);

    expect(container.querySelector<HTMLButtonElement>('.planButton')!.style.display).toBe('inline');
  });

  it('lets user pick the mixed profile to plan', async () => {
    const container = createEditorContainer('STOCK D10\nL2 R4\nINSIDE\nL2 R3');
    const editor = new Editor(container);
    const planned: string[] = [];
    editor.addEventListener('plan', event => {
      planned.push((event as PlanEvent).latheCode.getText());
    });

    container.querySelector<HTMLButtonElement>('.planButton')!.click();
    clickDialogButton('Cut inside');
    await waitForAsyncClick();

    expect(planned).toEqual(['STOCK D10\nINSIDE\nL2 R3']);
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
    <button class="imageButton"></button>
    <button class="toolButton"></button>
    <button class="flipButton"></button>
    <button class="stlButton"></button>
    <button class="planButton"></button>
    <button class="saveButton"></button>
    <button class="loadButton"></button>
    <select class="loadSelect"></select>
    <button class="deleteButton"></button>
    <button class="exportButton"></button>
    <input id="importFile" />
    <button class="expandCollapseButton"></button>
    <div id="moreOptions"></div>
  `;
  container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!.value = value;
  document.body.appendChild(container);
  return container;
}

function clickDialogButton(text: string) {
  const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent === text);
  if (!button) throw new Error(`Button not found: ${text}`);
  button.dispatchEvent(new MouseEvent('click', {bubbles: true}));
}

function setInputValue(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Input not found: ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', {bubbles: true}));
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
