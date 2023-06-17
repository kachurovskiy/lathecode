import { LatheCode } from './lathecode';
import InlineWorker from './gcodeworker?worker&inline';
import { FromWorkerMessage } from './gcodeworker';
import { Sender } from './sender';

export class GCode {
  private latheCode: LatheCode | null = null;
  private gcodeCanvasContainer: HTMLDivElement | null = null;
  private generationProgress: HTMLProgressElement | null = null;
  private runTextarea: HTMLTextAreaElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private tool: HTMLCanvasElement | null = null;
  private worker: Worker | null = null;
  private runContainer: HTMLDivElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private stopButton: HTMLButtonElement | null = null;
  private whatLink: HTMLAnchorElement | null = null;
  private senderError: HTMLDivElement | null = null;
  private runProgress: HTMLProgressElement | null = null;
  private sender: Sender | null = null;

  constructor(private container: HTMLElement) { }

  setLatheCode(value: LatheCode | null) {
    if (this.latheCode) {
      if (this.worker) {
        this.worker.onmessage = null;
        this.worker.terminate();
        this.worker = null;
      }
      if (this.runContainer) {
        this.runContainer.remove();
        this.runContainer = null;
      }
      this.container.replaceChildren();
      this.generationProgress = null;
      this.runTextarea = null;
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
      this.generationProgress?.remove();
      if (!this.runTextarea) {
        this.runContainer = document.createElement('div');
        this.runContainer.className = 'textareaContainer';
        this.container.parentNode!.appendChild(this.runContainer);
        this.runContainer.innerHTML = '<h2>GCode</h2>';
        this.runTextarea = document.createElement('textarea');
        this.runContainer.appendChild(this.runTextarea);

        this.senderError = document.createElement('div');
        this.senderError.className = 'senderError';
        this.senderError.style.display = 'none';
        this.runContainer.appendChild(this.senderError);

        this.runProgress = document.createElement('progress');
        this.runProgress.max = 1;
        this.runProgress.style.display = 'none';
        this.runContainer.appendChild(this.runProgress);

        this.sendButton = document.createElement('button');
        this.sendButton.innerText = 'Send to NanoEls H4';
        this.sendButton.addEventListener('click', () => {
          if (!this.sender) this.sender = new Sender(() => this.senderStatusChange());
          this.sender.start(this.runTextarea!.value);
        });
        this.runContainer.appendChild(this.sendButton);

        this.stopButton = document.createElement('button');
        this.stopButton.innerText = 'Stop';
        this.stopButton.addEventListener('click', () => this.sender!.stop());
        this.stopButton.style.display = 'none';
        this.runContainer.appendChild(this.stopButton);

        this.whatLink = document.createElement('a');
        this.whatLink.className = 'whatLink';
        this.whatLink.href = 'https://github.com/kachurovskiy/nanoels/tree/main/h4';
        this.whatLink.setAttribute('target', '_blank');
        this.whatLink.innerText = 'What is NanoEls H4?';
        this.runContainer.appendChild(this.whatLink);
      }
      this.runTextarea.value = data.gcode;
      this.runTextarea.scrollIntoView({ behavior: "smooth" });
    }
    if ((data.canvas || data.tool) && !this.gcodeCanvasContainer) {
      this.container.insertAdjacentHTML('beforeend', '<h2>2D profile</h2>');
      this.gcodeCanvasContainer = document.createElement('div');
      this.gcodeCanvasContainer.className = 'gcodeCanvasContainer';
      this.container.appendChild(this.gcodeCanvasContainer);
      const spacer = document.createElement('div');
      spacer.innerHTML = '&nbsp;';
      spacer.style.height = `${this.gcodeCanvasContainer.getBoundingClientRect().height}px`;
      this.container.appendChild(spacer);
      spacer.scrollIntoView({ behavior: "smooth" });
    }
    if (data.canvas) {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'part';
        this.canvas.width = data.canvas.width;
        this.canvas.height = data.canvas.height;
        this.gcodeCanvasContainer!.appendChild(this.canvas);
        this.gcodeCanvasContainer!.style.transform = `scale(${Math.min(1, 500 / data.canvas.width)})`;
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
      if (!this.generationProgress) {
        this.generationProgress = document.createElement('progress');
        this.generationProgress.max = 1;
        this.container.appendChild(this.generationProgress);
      }
      this.generationProgress.value = data.progress;
    }
  }

  private senderStatusChange() {
    if (!this.sender) return;
    const status = this.sender.getStatus();
    const isRun = status.condition === 'run';
    if (this.runProgress) {
      this.runProgress.value = status.progress;
      this.runProgress.style.display = isRun ? 'block' : 'none';
    }
    if (status.condition !== 'disconnected' && this.whatLink) {
      this.whatLink.remove();
      this.whatLink = null;
    }
    if (this.stopButton) this.stopButton.style.display = isRun ? 'inline-block' : 'none';
    if (this.sendButton) this.sendButton.style.display = isRun ? 'none' : 'inline-block';
    if (this.senderError) {
      this.senderError.style.display = status.error ? 'block' : 'none';
      this.senderError.innerText = status.error || '';
    }
  }
}
