import { beforeEach, describe, expect, it } from 'vitest';
import { Editor } from './editor';

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

  it('keeps GCode planning unavailable for mixed profiles', () => {
    const container = createEditorContainer('STOCK D10\nL2 R4\nINSIDE\nL2 R3');

    new Editor(container);

    expect(container.querySelector<HTMLButtonElement>('.planButton')!.style.display).toBe('none');
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
