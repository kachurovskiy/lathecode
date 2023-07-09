import { LatheCode } from '../common/lathecode.ts';
import InlineWorker from './editorworker?worker&inline';
import { PixelMove } from '../planner/pixel.ts';
import { FromEditorWorkerMessage, ToEditorWorkerMessage } from './editorworker.ts';

const PX_PER_MM = 100;

export class Editor extends EventTarget {
  private errorContainer: HTMLDivElement;
  private latheCodeInput: HTMLTextAreaElement;
  private latheCode: LatheCode | null = null;
  private worker: Worker | null = null;

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

    container.querySelector<HTMLButtonElement>('.imageButton')!.addEventListener('click', () => {
      this.errorContainer.textContent = '';
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', () => {
        const selectedFile = input.files?.[0];
        if (selectedFile) this.recognize(selectedFile);
      });
      input.click();
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

  private recognize(image: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const image = reader.result as ArrayBuffer;
      if (this.worker) {
        this.worker.onmessage = null;
        this.worker.terminate();
      }
      this.worker = new InlineWorker();
      this.worker.onmessage = (event: MessageEvent<any>) => {
        const m = event.data as FromEditorWorkerMessage;
        if (m.moves && m.moves.length) {
          this.setLatheCodeFromPixelMoves(m.moves.map(m => {
            Object.setPrototypeOf(m, PixelMove.prototype);
            return m;
          }));
        } else if (m.error) {
          this.errorContainer.textContent = m.error;
        }
      };
      const toWorker: ToEditorWorkerMessage = {image, pxPerMm: 100};
      this.worker.postMessage(toWorker);
    };
    reader.readAsArrayBuffer(image);
  }

  private setLatheCodeFromPixelMoves(moves: PixelMove[]) {
    const maxX = getLengthPx(moves);
    const lengthMm = Number(prompt('How long should the part be in mm?', (maxX / PX_PER_MM).toFixed(2)));
    if (isNaN(lengthMm) || lengthMm <= 0) return;
    const lines = moves.map(m => {
      return m.toMove(Math.round(maxX / lengthMm)).toLatheCode();
    }).filter(line => !!line);
    this.latheCodeInput.value = lines.join('\n');
    this.update();
  }
}

function getLengthPx(moves: PixelMove[]) {
  let maxX = 0;
  for (let m of moves) {
    if (m.xStart > maxX) {
      maxX = m.xStart;
    }
    if (m.xStart + m.xDelta > maxX) {
      maxX = m.xStart + m.xDelta;
    }
  }
  return maxX;
}
