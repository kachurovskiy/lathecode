import { LatheCode } from '../common/lathecode';
import InlineWorker from './plannerworker?worker&inline';
import { FromWorkerMessage, ToWorkerMessage } from './plannerworker';
import { Move } from '../common/move';
import { PixelMove } from './pixel';

const PX_PER_MM = 100;
const CANVAS_SIZE = 500;

export class Planner extends EventTarget {
  private latheCode: LatheCode | null = null;
  private moves: Move[] | null = null;
  private canvasContainer: HTMLDivElement | null = null;
  private generationProgress: HTMLProgressElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private tool: HTMLCanvasElement | null = null;
  private worker: Worker | null = null;

  constructor(private container: HTMLElement) {
    super();

    container.style.display = 'none';
  }

  setLatheCode(value: LatheCode | null) {
    if (this.latheCode) {
      if (this.worker) {
        this.worker.onmessage = null;
        this.worker.terminate();
        this.worker = null;
      }
      this.container.replaceChildren();
      this.generationProgress = null;
      this.canvasContainer = null;
      this.canvas = null;
      this.tool = null;
    }
    this.latheCode = value;
    if (this.latheCode) {
      this.container.insertAdjacentHTML('beforeend', '<h2>Planner</h2>');
      this.worker = new InlineWorker();
      this.worker.onmessage = (event: MessageEvent<any>) => {
        this.handleMessage(event.data as FromWorkerMessage);
      };
      const toWorker: ToWorkerMessage = {latheCode: this.latheCode, pxPerMm: PX_PER_MM};
      this.worker.postMessage(toWorker);
    }
    this.container.style.display = this.latheCode ? 'block' : 'none';
  }

  getMoves(): Move[] | null {
    return this.moves;
  }

  private handleMessage(data: FromWorkerMessage) {
    if (data.error) {
      this.container.innerText = data.error;
    }
    if (data.moves) {
      this.generationProgress?.remove();
      this.moves = data.moves.map(m => {
        Object.setPrototypeOf(m, PixelMove.prototype);
        return m.toMove(PX_PER_MM);
      });
      this.drawMoves(this.moves);
      this.dispatchEvent(new Event('change'));
    }
    if ((data.canvas || data.tool) && !this.canvasContainer) {
      this.canvasContainer = document.createElement('div');
      this.canvasContainer.className = 'canvasContainer';
      this.container.appendChild(this.canvasContainer);
      const spacer = document.createElement('div');
      spacer.innerHTML = '&nbsp;';
      spacer.style.height = `${this.canvasContainer.getBoundingClientRect().height}px`;
      this.container.appendChild(spacer);
      spacer.scrollIntoView({ behavior: "smooth" });
    }
    if (data.canvas) {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'part';
        this.canvas.width = data.canvas.width;
        this.canvas.height = data.canvas.height;
        this.canvasContainer!.appendChild(this.canvas);
        this.canvasContainer!.style.transform = `scale(${Math.min(1, 500 / data.canvas.width)})`;
        const spacer = document.createElement('div');
        spacer.innerHTML = '&nbsp;';
        spacer.style.height = `${this.canvasContainer!.getBoundingClientRect().height}px`;
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
        this.canvasContainer?.appendChild(this.tool);
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

  private drawMoves(moves: Move[]): void {
    let minXMm = Infinity;
    let maxXMm = -Infinity;
    let minYMm = Infinity;
    let maxYMm = -Infinity;
    moves.forEach(move => {
      minXMm = Math.min(move.xStartMm, move.xStartMm + move.xDeltaMm, minXMm);
      maxXMm = Math.max(move.xStartMm, move.xStartMm + move.xDeltaMm, maxXMm);
      minYMm = Math.min(move.yStartMm, move.yStartMm + move.yDeltaMm, minYMm);
      maxYMm = Math.max(move.yStartMm, move.yStartMm + move.yDeltaMm, maxYMm);
    });
    const coeff = CANVAS_SIZE / Math.max(maxXMm - minXMm, maxYMm - minYMm);
    const canvasWidth = CANVAS_SIZE;
    const canvasHeight = Math.ceil(coeff * (maxYMm - minYMm));
    const xToPx = (xMm: number): number => { return canvasWidth - (xMm - minXMm) * coeff; };
    const yToPx = (yMm: number): number => { return canvasHeight - (yMm - minYMm) * coeff; };

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    this.container.insertAdjacentHTML('beforeend', '<h3>Toolpath</h3>');
    this.container.appendChild(canvas);

    context.lineWidth = 1;
    moves.forEach(move => {
      context.beginPath();
      context.strokeStyle = move.cutAreaMmSq ? 'red' : 'green';
      context.moveTo(xToPx(move.xStartMm), yToPx(move.yStartMm));
      context.lineTo(xToPx(move.xStartMm + move.xDeltaMm), yToPx(move.yStartMm + move.yDeltaMm));
      context.stroke();
    });
  }
}
