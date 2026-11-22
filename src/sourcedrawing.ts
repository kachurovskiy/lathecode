import type {TechnicalDrawingImage} from './llm/openrouter.ts';

export class SourceDrawingPanel {
  private readonly heading = document.createElement('h2');
  private readonly images = document.createElement('div');
  private disposeImages: (() => void)[] = [];
  private sourceImages: readonly TechnicalDrawingImage[] | null = null;

  constructor(private readonly container: HTMLElement) {
    const guide = document.createElement('p');
    guide.className = 'sourceDrawingGuide';
    guide.textContent = 'Hover to magnify, or click/tap to keep the lens open. Use arrow keys to inspect details and Escape to close the lens.';
    container.replaceChildren(this.heading, guide, this.images);
    container.hidden = true;
  }

  setImages(images: readonly TechnicalDrawingImage[]): void {
    // Text edits reuse their drawing references; keep any pinned lens in place.
    if (images === this.sourceImages) return;
    this.sourceImages = images;
    this.disposeImages.forEach(dispose => dispose());
    this.disposeImages = [];
    this.images.replaceChildren();
    this.heading.textContent = images.length > 1 ? 'Source drawings' : 'Source drawing';
    this.container.hidden = !images.length;
    for (const image of images) {
      const drawing = createMagnifiedDrawing(image);
      this.images.appendChild(drawing.element);
      this.disposeImages.push(drawing.dispose);
    }
  }
}

function createMagnifiedDrawing(source: TechnicalDrawingImage) {
  const element = document.createElement('figure');
  element.className = 'sourceDrawing';
  const caption = document.createElement('figcaption');
  caption.textContent = source.name;
  const frame = document.createElement('div');
  frame.className = 'sourceDrawingFrame';
  frame.tabIndex = 0;
  frame.setAttribute('role', 'button');
  frame.setAttribute('aria-label', `Magnify ${source.name}`);
  frame.setAttribute('aria-pressed', 'false');
  const image = document.createElement('img');
  image.className = 'sourceDrawingImage';
  image.alt = source.name;
  image.draggable = false;
  const lens = document.createElement('div');
  lens.className = 'sourceDrawingLens';
  lens.hidden = true;
  lens.setAttribute('aria-hidden', 'true');
  const enlarged = document.createElement('img');
  enlarged.alt = '';
  enlarged.draggable = false;
  lens.appendChild(enlarged);
  frame.append(image, lens);
  element.append(caption, frame);
  let position = {x: 0.5, y: 0.5};
  let pinned = false;
  let pressStart: {x: number; y: number} | null = null;
  let dragged = false;
  const hide = () => {lens.hidden = true;};
  const setPinned = (value: boolean) => {
    pinned = value;
    frame.setAttribute('aria-pressed', String(value));
    frame.style.touchAction = value ? 'none' : 'pan-y';
  };
  const render = () => {
    const bounds = image.getBoundingClientRect();
    if (!image.naturalWidth || bounds.width <= 0 || bounds.height <= 0) {hide(); return;}
    const size = Math.min(180, bounds.width);
    const half = size / 2;
    const x = position.x * bounds.width;
    const y = position.y * bounds.height;
    // Show at least original resolution so dense full-sheet drawings remain legible.
    const zoom = Math.max(3, image.naturalWidth / bounds.width);
    lens.style.width = lens.style.height = `${size}px`;
    lens.style.left = `${clamp(x - half, 0, Math.max(0, bounds.width - size))}px`;
    lens.style.top = `${clamp(y - half, 0, Math.max(0, bounds.height - size))}px`;
    enlarged.style.width = `${bounds.width * zoom}px`;
    enlarged.style.height = `${bounds.height * zoom}px`;
    enlarged.style.transform = `translate(${half - x * zoom}px, ${half - y * zoom}px)`;
    lens.hidden = false;
  };
  const move = (event: {clientX: number; clientY: number}) => {
    const bounds = image.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    position = {x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1), y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1)};
    render();
  };
  frame.addEventListener('pointermove', event => {
    if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 6) dragged = true;
    if (event.pointerType !== 'touch' || pinned) move(event);
  });
  frame.addEventListener('pointerdown', event => {
    pressStart = {x: event.clientX, y: event.clientY};
    dragged = false;
    if (event.pointerType === 'touch' && pinned) {
      frame.setPointerCapture?.(event.pointerId);
      move(event);
    }
  });
  frame.addEventListener('pointerup', () => {pressStart = null;});
  frame.addEventListener('pointerleave', () => {if (!pinned) hide();});
  frame.addEventListener('pointercancel', () => {pressStart = null; dragged = false; setPinned(false); hide();});
  frame.addEventListener('click', event => {
    if (dragged) {dragged = false; return;}
    setPinned(!pinned);
    frame.focus({preventScroll: true});
    if (pinned) {if (event.detail) move(event); else render();}
    else hide();
  });
  frame.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setPinned(false);
      hide();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setPinned(!pinned);
      if (pinned) render(); else hide();
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const step = event.shiftKey ? 0.1 : 0.02;
      position.x = clamp(position.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), 0, 1);
      position.y = clamp(position.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0), 0, 1);
      setPinned(true);
      render();
    }
  });
  frame.addEventListener('blur', () => {if (!pinned) hide();});
  image.addEventListener('load', () => {if (pinned) render();});
  image.addEventListener('error', () => {
    setPinned(false);
    hide();
    frame.removeAttribute('tabindex');
    frame.setAttribute('aria-disabled', 'true');
    image.alt = `Preview unavailable for ${source.name}`;
  });
  const resize = () => {if (pinned) render(); else hide();};
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(frame);
  window.addEventListener('resize', resize);
  image.src = enlarged.src = source.dataUrl;
  return {element, dispose: () => {observer?.disconnect(); window.removeEventListener('resize', resize);}};
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
