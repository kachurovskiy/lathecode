import { LatheCode, } from './lathecode';
import InlineWorker from './gcodeworker?worker&inline';
import { FromWorkerMessage } from './gcodeworker';

export class GCode {
  private latheCode: LatheCode | null = null;
  private gcodeCanvasContainer: HTMLDivElement | null = null;
  private progress: HTMLProgressElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private tool: HTMLCanvasElement | null = null;
  private worker: Worker | null = null;

  constructor(private container: HTMLElement) { }

  setLatheCode(value: LatheCode | null) {
    if (this.latheCode) {
      this.container.replaceChildren();
      this.progress = null;
      this.textarea = null;
      this.gcodeCanvasContainer = null;
      this.canvas = null;
      this.tool = null;
    }
    this.latheCode = value;
    if (this.latheCode) {
      this.worker = new InlineWorker();
      this.worker.onmessage = (event: MessageEvent<any>) => {
        this.handleMessage(event.data as FromWorkerMessage);
      };
      this.worker.postMessage({latheCode: this.latheCode});
    }
  }

  private handleMessage(data: FromWorkerMessage) {
    if (data.error) {
      this.container.innerText = data.error;
    }
    if (data.gcode) {
      this.progress?.remove();
      if (!this.textarea) {
        this.container.insertAdjacentHTML('beforeend', '<h2>GCode</h2>');
        this.textarea = document.createElement('textarea');
        this.container.appendChild(this.textarea);
      }
      this.textarea.value = data.gcode;
    }
    if ((data.canvas || data.tool) && !this.gcodeCanvasContainer) {
      this.container.insertAdjacentHTML('beforeend', '<h2>Profile</h2>');
      this.gcodeCanvasContainer = document.createElement('div');
      this.gcodeCanvasContainer.className = 'gcodeCanvasContainer';
      this.container.appendChild(this.gcodeCanvasContainer);
      const spacer = document.createElement('div');
      spacer.innerHTML = '&nbsp;';
      spacer.style.height = `${this.gcodeCanvasContainer.getBoundingClientRect().height}px`;
      this.container.appendChild(spacer);
    }
    if (data.canvas) {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'part';
        this.canvas.width = data.canvas.width;
        this.canvas.height = data.canvas.height;
        this.gcodeCanvasContainer!.appendChild(this.canvas);
        this.gcodeCanvasContainer!.style.transform = `scale(${Math.min(1, 726 / data.canvas.width)})`;
        const spacer = document.createElement('div');
        spacer.innerHTML = '&nbsp;';
        spacer.style.height = `${this.gcodeCanvasContainer!.getBoundingClientRect().height}px`;
        this.container.appendChild(spacer);
      }
      this.canvas.getContext('2d')!.putImageData(new ImageData(data.canvas.data, data.canvas.width), 0, 0);
    }
    if (data.tool) {
      if (!this.tool) {
        this.tool = document.createElement('canvas');
        this.tool.className = 'tool';
        this.tool.width = data.tool.width;
        this.tool.height = data.tool.height;
        this.gcodeCanvasContainer?.appendChild(this.tool);
      }
      this.tool.getContext('2d')!.putImageData(new ImageData(data.tool.data, data.tool.width), 0, 0);
      this.tool.style.left = `${data.tool.x}px`;
      this.tool.style.top = `${data.tool.y}px`;
    }
    if (data.progress) {
      if (!this.progress) {
        this.progress = document.createElement('progress');
        this.progress.max = 1;
        this.container.appendChild(this.progress);
      }
      this.progress.value = data.progress;
    }
  }
}
