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
    reader.onload = async () => {
      let image = reader.result as ArrayBuffer;
      if (this.worker) {
        this.worker.onmessage = null;
        this.worker.terminate();
      }
      const imageHeight = await getImageHeight(image);
      const initialLengthMm = imageHeight / PX_PER_MM;
      const lengthMm = Number(prompt('How long should the part be in mm?', initialLengthMm.toFixed(2)));
      if (isNaN(lengthMm) || lengthMm <= 0) return;
      image = await scaleImage(image, lengthMm / initialLengthMm);
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
      const smoothEpsilon = Number(prompt('How smooth should it be? Use values between 1 and 10:', '1'));
      if (isNaN(smoothEpsilon) || smoothEpsilon < 0) return;
      const toWorker: ToEditorWorkerMessage = {image, pxPerMm: 100, smoothEpsilon};
      this.worker.postMessage(toWorker);
    };
    reader.readAsArrayBuffer(image);
  }

  private setLatheCodeFromPixelMoves(moves: PixelMove[]) {
    const lines = moves.map(m => {
      return m.toMove(PX_PER_MM).toLatheCode();
    }).filter(line => !!line);
    this.latheCodeInput.value = lines.join('\n');
    this.update();
  }
}

function getImageHeight(arrayBuffer: ArrayBuffer): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const blob = new Blob([arrayBuffer]);
    const img = new Image();
    img.onload = () => resolve(img.height);
    img.onerror = () => reject(new Error('Failed to load the image.'));
    img.src = URL.createObjectURL(blob);
  });
}

function scaleImage(arrayBuffer: ArrayBuffer, scaleFactor: number): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const blob = new Blob([arrayBuffer]);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = img.width * scaleFactor;
      const height = img.height * scaleFactor;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Failed to read the scaled image data.'));
        reader.readAsArrayBuffer(blob!);
      }, 'image/png', 1);
    };
    img.onerror = () => reject(new Error('Failed to load the image.'));
    img.src = URL.createObjectURL(blob);
  });
}
