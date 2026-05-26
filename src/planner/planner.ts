import { LatheCode } from '../common/lathecode';
import InlineWorker from './plannerworker?worker&inline';
import { FromWorkerMessage, ToWorkerMessage } from './plannerworker';
import { Move } from '../common/move';
import { createFullScreenDialog } from '../common/dialog';
import { AppSettings, DEFAULT_APP_SETTINGS, DEFAULT_MOVE_TIMEOUT_MS, normalizeAppSettings } from '../common/settings';

export class Planner extends EventTarget {
  private latheCode: LatheCode | null = null;
  private moves: Move[] | null = null;
  private canvasContainer: HTMLDivElement | null = null;
  private generationProgressMessage: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private tool: HTMLCanvasElement | null = null;
  private worker: Worker | null = null;
  private moveViewers: MovesViewerElement[] = [];
  private selectedMoveCount: number | null = null;
  private settings: AppSettings = DEFAULT_APP_SETTINGS;

  constructor(private container: HTMLElement) {
    super();

    container.style.display = 'none';
  }

  setLatheCode(value: LatheCode | null, settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS) {
    this.settings = normalizeAppSettings(settings);
    if (this.latheCode) {
      if (this.worker) {
        this.worker.onmessage = null;
        this.worker.terminate();
        this.worker = null;
      }
      this.container.replaceChildren();
      this.canvasContainer = null;
      this.generationProgressMessage = null;
      this.canvas = null;
      this.tool = null;
      this.moveViewers = [];
    }
    this.selectedMoveCount = null;
    this.latheCode = value;
    if (this.latheCode) {
      this.container.insertAdjacentHTML('beforeend', '<h2>Planner</h2>');
      this.worker = new InlineWorker();
      this.worker.onmessage = (event: MessageEvent<any>) => {
        this.handleMessage(event.data as FromWorkerMessage);
      };
      const toWorker: ToWorkerMessage = {latheCode: this.latheCode, settings: this.settings};
      this.worker.postMessage(toWorker);
      this.handleMessage({progressMessage: 'Initializing worker...'});
    }
    this.container.style.display = this.latheCode ? 'block' : 'none';
  }

  getMoves(): Move[] | null {
    return this.moves;
  }

  showMovesThrough(moveCount: number) {
    this.selectedMoveCount = moveCount;
    this.moveViewers = this.moveViewers.filter(viewer => viewer.isConnected);
    for (const viewer of this.moveViewers) {
      viewer.setMoveCount(moveCount);
    }
  }

  private handleMessage(data: FromWorkerMessage) {
    if (data.error) {
      this.container.innerText = data.error;
    }
    if (data.moves) {
      this.generationProgressMessage?.remove();
      this.generationProgressMessage = null;
      this.moves = data.moves.map(m => {
        Object.setPrototypeOf(m, Move.prototype);
        return m;
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
        this.canvasContainer!.style.transform = `scale(${Math.min(1, this.settings.plannerCanvasSizePx / data.canvas.width, this.settings.plannerCanvasSizePx / data.canvas.height / 2)})`;
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
    const viewer = createMovesViewer(moves, this.settings.plannerCanvasSizePx, this.settings.plannerCanvasSizePx / 2, this.settings.moveTimeoutMs);
    this.addMovesViewer(viewer);
    this.container.appendChild(viewer);
    const button = document.createElement('button');
    button.innerText = 'Zoom in';
    button.addEventListener('click', () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const dialogViewer = createMovesViewer(moves, viewportWidth - 100, viewportHeight - 200, this.settings.moveTimeoutMs);
      this.addMovesViewer(dialogViewer);
      createFullScreenDialog(dialogViewer, 'Toolpath');
    });
    this.container.appendChild(button);
  }

  private addMovesViewer(viewer: MovesViewerElement) {
    this.moveViewers.push(viewer);
    if (this.selectedMoveCount !== null) viewer.setMoveCount(this.selectedMoveCount);
  }
}

export function createMovesCanvas(moves: Move[], width: number, height: number, moveTimeoutMs = DEFAULT_MOVE_TIMEOUT_MS): HTMLCanvasElement {
  const renderer = createMovesRenderer(moves, width, height);
  renderer.startAnimation(moveTimeoutMs);
  return renderer.canvas;
}

export interface MovesViewerElement extends HTMLDivElement {
  setMoveCount(moveCount: number): void;
}

export function createMovesViewer(moves: Move[], width: number, height: number, moveTimeoutMs = DEFAULT_MOVE_TIMEOUT_MS): MovesViewerElement {
  const renderer = createMovesRenderer(moves, width, height);
  const viewer = document.createElement('div') as MovesViewerElement;
  viewer.className = 'movesViewer';
  viewer.appendChild(renderer.canvas);

  const scrubber = document.createElement('div');
  scrubber.className = 'movesScrubber';

  const range = document.createElement('input');
  range.type = 'range';
  range.className = 'movesScrubberInput';
  range.min = '0';
  range.max = String(moves.length);
  range.step = '1';
  range.value = String(moves.length);
  range.setAttribute('aria-label', 'Toolpath execution state');
  scrubber.appendChild(range);

  const output = document.createElement('span');
  output.className = 'movesScrubberOutput';
  scrubber.appendChild(output);
  viewer.appendChild(scrubber);

  const updateScrubber = (moveCount: number) => {
    const clampedMoveCount = clampMoveCount(moveCount, moves.length);
    range.value = String(clampedMoveCount);
    output.textContent = `Move ${clampedMoveCount} / ${moves.length}`;
  };

  range.addEventListener('input', () => {
    const moveCount = clampMoveCount(Number(range.value), moves.length);
    viewer.setMoveCount(moveCount);
  });

  viewer.setMoveCount = (moveCount: number) => {
    const clampedMoveCount = clampMoveCount(moveCount, moves.length);
    renderer.stopAnimation();
    renderer.render(clampedMoveCount);
    updateScrubber(clampedMoveCount);
  };

  renderer.startAnimation(moveTimeoutMs, updateScrubber);
  return viewer;
}

function createMovesRenderer(moves: Move[], width: number, height: number): {
  canvas: HTMLCanvasElement,
  render: (moveCount: number) => void,
  startAnimation: (moveTimeoutMs: number, onFrame?: (moveCount: number) => void) => void,
  stopAnimation: () => void,
} {
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
  const xSpanMm = maxXMm - minXMm;
  const ySpanMm = maxYMm - minYMm;
  const xCoeff = xSpanMm > 0 ? width / xSpanMm : Infinity;
  const yCoeff = ySpanMm > 0 ? height / ySpanMm : Infinity;
  const coeff = Number.isFinite(Math.min(xCoeff, yCoeff)) ? Math.min(xCoeff, yCoeff) : 1;
  const xToPx = (xMm: number): number => { return (maxXMm - xMm) * coeff; };
  const yToPx = (yMm: number): number => { return (maxYMm - yMm) * coeff; };

  const canvas = document.createElement('canvas');
  canvas.className = 'moves';
  canvas.width = width;
  canvas.height = Math.max(1, Math.ceil(coeff * ySpanMm));

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

  let animationId = 0;
  const render = (moveCount: number) => {
    const clampedMoveCount = clampMoveCount(moveCount, moves.length);
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < clampedMoveCount; i++) {
      drawMove(moves[i]);
    }
  };

  const stopAnimation = () => {
    animationId++;
  };

  const startAnimation = (moveTimeoutMs: number, onFrame: (moveCount: number) => void = () => {}) => {
    const timeMs = getMoveTimeout(moveTimeoutMs);
    const currentAnimationId = ++animationId;

    if (!timeMs) {
      render(moves.length);
      onFrame(moves.length);
      return;
    }

    const drawFrame = (moveCount: number) => {
      if (currentAnimationId !== animationId) return;
      render(moveCount);
      onFrame(moveCount);
      if (moveCount < moves.length) {
        setTimeout(() => drawFrame(moveCount + 1), timeMs);
      }
    };
    drawFrame(0);
  };

  return {canvas, render, startAnimation, stopAnimation};
}

function getMoveTimeout(defaultMoveTimeoutMs = DEFAULT_MOVE_TIMEOUT_MS) {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('moveTimeout');
  if (value) return Number(value);
  return defaultMoveTimeoutMs;
}

function clampMoveCount(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}
