import { beforeEach, describe, expect, it } from 'vitest';
import { Editor, PlanEvent } from './editor';

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

function waitForAsyncClick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
