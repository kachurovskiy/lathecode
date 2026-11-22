import {beforeEach, describe, expect, it, vi} from 'vitest';
import {SourceDrawingPanel} from './sourcedrawing';

const source = {name: 'Technical drawing.png', dataUrl: 'data:image/png;base64,AA=='};

beforeEach(() => {document.body.replaceChildren(); vi.restoreAllMocks();});

function setup() {
  const container = document.createElement('section');
  document.body.appendChild(container);
  const panel = new SourceDrawingPanel(container);
  panel.setImages([source]);
  const frame = container.querySelector<HTMLElement>('.sourceDrawingFrame')!;
  const image = container.querySelector<HTMLImageElement>('.sourceDrawingImage')!;
  Object.defineProperty(image, 'naturalWidth', {value: 2000, configurable: true});
  vi.spyOn(image, 'getBoundingClientRect').mockReturnValue({left: 100, top: 200, width: 500, height: 250} as DOMRect);
  return {container, panel, frame, image, lens: container.querySelector<HTMLElement>('.sourceDrawingLens')!};
}

function pointer(frame: HTMLElement, type: string, x: number, y: number, pointerType = 'mouse') {
  const event = new Event(type);
  Object.assign(event, {clientX: x, clientY: y, pointerType, pointerId: 1});
  frame.dispatchEvent(event);
}

describe('source drawing inspection', () => {
  it('shows every source image and clears old references when replaced', () => {
    const {container, panel} = setup();
    panel.setImages([source, {...source, name: '<detail crop>.png'}]);
    expect(container.hidden).toBe(false);
    expect(container.querySelector('h2')!.textContent).toBe('Source drawings');
    expect(Array.from(container.querySelectorAll<HTMLImageElement>('.sourceDrawingImage')).map(image => image.src)).toEqual([source.dataUrl, source.dataUrl]);
    expect(container.querySelectorAll('figcaption')[1].textContent).toBe('<detail crop>.png');
    panel.setImages([]);
    expect(container.hidden).toBe(true);
    expect(container.querySelector('img')).toBeNull();
  });

  it('magnifies the exact pointer location at original resolution and keeps the lens within the image edges', () => {
    const {frame, lens} = setup();
    pointer(frame, 'pointermove', 350, 325);
    expect(lens.hidden).toBe(false);
    expect(lens.style.left).toBe('160px');
    expect(lens.style.top).toBe('35px');
    expect(lens.querySelector('img')!.style.width).toBe('2000px');
    expect(lens.querySelector('img')!.style.transform).toBe('translate(-910px, -410px)');
    pointer(frame, 'pointermove', 600, 450);
    expect(lens.style.left).toBe('320px');
    expect(lens.style.top).toBe('70px');
    expect(lens.querySelector('img')!.style.transform).toBe('translate(-1910px, -910px)');
    pointer(frame, 'pointerleave', 601, 451);
    expect(lens.hidden).toBe(true);
  });

  it('supports keyboard inspection and pinning a touch lens without closing it after a drag', () => {
    const {frame, lens} = setup();
    frame.focus();
    frame.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', cancelable: true}));
    expect(frame.getAttribute('aria-pressed')).toBe('true');
    const center = lens.querySelector('img')!.style.transform;
    frame.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', cancelable: true}));
    expect(lens.querySelector('img')!.style.transform).not.toBe(center);
    pointer(frame, 'pointerdown', 350, 325, 'touch');
    pointer(frame, 'pointermove', 400, 350, 'touch');
    pointer(frame, 'pointerup', 400, 350, 'touch');
    frame.dispatchEvent(new MouseEvent('click', {clientX: 400, clientY: 350, detail: 1}));
    expect(frame.getAttribute('aria-pressed')).toBe('true');
    pointer(frame, 'pointerleave', 700, 500, 'touch');
    expect(lens.hidden).toBe(false);
    frame.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}));
    expect(lens.hidden).toBe(true);
    expect(frame.style.touchAction).toBe('pan-y');
  });

  it('waits for image dimensions and recalculates pinned zoom on resize', () => {
    const {frame, image, lens, panel} = setup();
    Object.defineProperty(image, 'naturalWidth', {value: 0, configurable: true});
    pointer(frame, 'pointermove', 350, 325);
    expect(lens.hidden).toBe(true);
    Object.defineProperty(image, 'naturalWidth', {value: 2000, configurable: true});
    frame.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    vi.mocked(image.getBoundingClientRect).mockReturnValue({left: 0, top: 0, width: 250, height: 125} as DOMRect);
    window.dispatchEvent(new Event('resize'));
    expect(lens.querySelector('img')!.style.width).toBe('2000px');
    expect(lens.style.left).toBe('35px');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    panel.setImages([]);
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
