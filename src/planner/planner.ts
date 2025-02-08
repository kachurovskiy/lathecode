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
  private generationProgressMessage: HTMLDivElement | null = null;
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
      this.handleMessage({progressMessage: 'Initializing worker...'});
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
      this.generationProgressMessage?.remove();
      this.generationProgressMessage = null;
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
    }
    if (data.canvas) {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'part';
        this.canvas.width = data.canvas.width;
        this.canvas.height = data.canvas.height;
        this.canvasContainer!.appendChild(this.canvas);
        this.canvasContainer!.style.transform = `scale(${Math.min(1, 500 / data.canvas.width, 500 / data.canvas.height / 2)})`;
        const spacer = document.createElement('div');
        spacer.innerHTML = '&nbsp;';
        spacer.style.height = `${this.canvasContainer!.getBoundingClientRect().height}px`;
        spacer.scrollIntoView({ behavior: "smooth" });
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
    if (data.progressMessage) {
      if (!this.generationProgressMessage) {
        this.generationProgressMessage = document.createElement('div');
        this.generationProgressMessage.className = 'generationProgressMessage';
        this.container.appendChild(this.generationProgressMessage);
      }
      this.generationProgressMessage.innerText = data.progressMessage;
    }
  }

  private drawMoves(moves: Move[]): void {
    this.container.insertAdjacentHTML('beforeend', '<h3>Toolpath</h3>');
    this.container.appendChild(createMovesCanvas(moves, CANVAS_SIZE, CANVAS_SIZE / 2));
    const button = document.createElement('button');
    button.innerText = 'Zoom in';
    button.addEventListener('click', () => {
      createFullScreenDialog(createMovesCanvas(moves, window.visualViewport!.width - 100, window.visualViewport!.height - 200), 'Toolpath');
    });
    this.container.appendChild(button);
  }
}

function createMovesCanvas(moves: Move[], width: number, height: number): HTMLCanvasElement {
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
  const coeff = Math.min(width / (maxXMm - minXMm), height / (maxYMm - minYMm));
  const xToPx = (xMm: number): number => { return (maxXMm - xMm) * coeff; };
  const yToPx = (yMm: number): number => { return (maxYMm - yMm) * coeff; };

  const canvas = document.createElement('canvas');
  canvas.className = 'moves';
  canvas.width = width;
  canvas.height = Math.ceil(coeff * (maxYMm - minYMm));

  const context = canvas.getContext('2d')!;
  context.lineWidth = 1;
  const drawMove = (move: Move) => {
    context.beginPath();
    context.strokeStyle = move.cutAreaMmSq ? 'red' : 'green';
    const xOffset = move.cutAreaMmSq ? 0 : 1;
    context.moveTo(xToPx(move.xStartMm) + xOffset, yToPx(move.yStartMm));
    context.lineTo(xToPx(move.xStartMm + move.xDeltaMm) + xOffset, yToPx(move.yStartMm + move.yDeltaMm));
    context.stroke();
  }
  const timeMs = getMoveTimeout();
  const runDrawMoveWithDelay = (moves: Move[], index: number) => {
    if (index < moves.length) {
        drawMove(moves[index]);
        const next = () => runDrawMoveWithDelay(moves, index + 1);
        if (timeMs) setTimeout(next, timeMs);
        else next();
    }
  }
  runDrawMoveWithDelay(moves, 0);

  return canvas;
}

function getMoveTimeout() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('moveTimeout');
  if (value) return Number(value);
  return 50;
}

function createFullScreenDialog(element: HTMLElement, title: string) {
  const dialogContainer = document.createElement('div');
  dialogContainer.style.position = 'fixed';
  dialogContainer.style.top = '0';
  dialogContainer.style.left = '0';
  dialogContainer.style.width = '100%';
  dialogContainer.style.height = '100%';
  dialogContainer.style.backgroundColor = 'white';
  dialogContainer.style.padding = '12px';

  const dialogTitle = document.createElement('h2');
  dialogTitle.textContent = title;
  dialogContainer.appendChild(dialogTitle);

  dialogContainer.appendChild(element);
  element.style.margin = '12px';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.display = 'block';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(dialogContainer);
  });
  dialogContainer.appendChild(closeButton);
  document.body.appendChild(dialogContainer);
}
