import { LatheCode } from './common/lathecode.ts';

export class Editor extends EventTarget {
  private errorContainer: HTMLDivElement;
  private latheCodeInput: HTMLTextAreaElement;
  private latheCode: LatheCode | null = null;

  constructor(container: HTMLElement) {
    super();

    this.errorContainer = container.querySelector('.errorContainer')!;
    this.latheCodeInput = container.querySelector<HTMLTextAreaElement>('.latheCodeInput')!;
    this.latheCodeInput.addEventListener('input', () => this.update());
    this.latheCodeInput.value = localStorage.getItem('latheCode') || this.latheCodeInput.value;
    this.update();

    container.querySelector<HTMLButtonElement>('.stlButton')!.addEventListener('click', () => {
      this.dispatchEvent(new Event('stl'));
    });

    container.querySelector<HTMLButtonElement>('.planButton')!.addEventListener('click', () => {
      this.dispatchEvent(new Event('plan'));
    });
  }

  getLatheCode() {
    return this.latheCode;
  }

  private update() {
    try {
      localStorage.setItem('latheCode', this.latheCodeInput.value);
      this.latheCode = new LatheCode(this.latheCodeInput.value + '\n');
      this.errorContainer.textContent = '';
    } catch (error: any) {
      this.latheCode = null;
      this.errorContainer.textContent = error.message;
    }
    this.dispatchEvent(new Event('change'));
  }
}
