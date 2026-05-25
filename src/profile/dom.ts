import { SVG_NS, type DrawingTool, type FieldControl, type NumberFieldOptions, type SegmentEdgeFeatureTool, } from './types.ts';
export function createButton(text: string, className: string, options: {
  type?: 'button' | 'submit';
  title?: string;
} = {}): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = options.type ?? 'button';
  button.className = className;
  button.textContent = text;
  if (options.title)
    button.title = options.title;
  return button;
}
export function createSegmentFeatureIcon(feature: SegmentEdgeFeatureTool): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.className = `profileDrawingSegmentFeatureIcon ${feature}`;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}
export function createToolCursorIcon(tool: DrawingTool): SVGSVGElement {
  const icon = svgElement('svg');
  icon.classList.add('profileDrawingToolCursorIcon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  if (tool === 'select') {
    appendSvg(icon, 'path', {
      d: 'M5 3 L18 14 L12 15 L15 21 L12 22 L9 16 L5 20 Z',
      class: 'profileDrawingToolCursorFill',
    });
    return icon;
  }
  if (tool === 'line') {
    appendSvg(icon, 'line', { x1: 4, y1: 19, x2: 20, y2: 5 });
    return icon;
  }
  if (tool === 'convex') {
    appendSvg(icon, 'path', { d: 'M4 18 Q12 4 20 18' });
    return icon;
  }
  if (tool === 'concave') {
    appendSvg(icon, 'path', { d: 'M4 6 Q12 20 20 6' });
    return icon;
  }
  if (tool === 'spline') {
    appendSvg(icon, 'path', { d: 'M4 17 C8 5 16 21 20 7' });
    return icon;
  }
  appendSvg(icon, 'path', { d: 'M4 15 C7 7 10 20 14 12 S18 4 21 10' });
  return icon;
}
export function createSegmentedGroup(className: string, ariaLabel: string): HTMLDivElement {
  const group = document.createElement('div');
  group.className = `${className} setupSegmented`;
  group.setAttribute('aria-label', ariaLabel);
  return group;
}
export function createNumberField(labelText: string, name: string, value: number, options: NumberFieldOptions = {}): FieldControl {
  const field = document.createElement('label');
  field.className = 'settingField profileDrawingDimensionField';
  const heading = document.createElement('span');
  heading.className = 'settingHeading';
  heading.textContent = labelText;
  field.appendChild(heading);
  const input = document.createElement('input');
  input.type = 'number';
  input.name = name;
  input.min = String(options.min ?? 0.1);
  input.step = String(options.step ?? 0.1);
  input.value = formatNumber(value);
  input.className = 'settingInput';
  field.appendChild(input);
  return { field, input };
}
export function readPositiveNumber(input: HTMLInputElement, fallback: number): number {
  const value = Number(input.value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
export function readNonNegativeNumber(input: HTMLInputElement, fallback: number): number {
  const value = Number(input.value);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
export function readFiniteNumber(input: HTMLInputElement, fallback: number): number {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}
export function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement))
    return false;
  if (target.isContentEditable)
    return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}
export function getToolShortcut(event: KeyboardEvent, activeTool: DrawingTool): DrawingTool | null {
  if (event.ctrlKey || event.metaKey || event.altKey)
    return null;
  switch (event.key.toLowerCase()) {
    case 'a':
      return 'select';
    case 'l':
      return 'line';
    case 'c':
      return activeTool === 'convex' ? 'concave' : 'convex';
    case 's':
      return 'spline';
    case 'f':
      return 'free';
    default:
      return null;
  }
}
export function isUndoShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey)
    && !event.altKey
    && !event.shiftKey
    && event.key.toLowerCase() === 'z';
}
export function isRedoShortcut(event: KeyboardEvent): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey)
    return false;
  const key = event.key.toLowerCase();
  return key === 'y' || (event.shiftKey && key === 'z');
}
export function svgElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tagName);
}
export function appendSvg<K extends keyof SVGElementTagNameMap>(parent: SVGElement, tagName: K, attributes: Record<string, string | number>): SVGElementTagNameMap[K] {
  const element = svgElement(tagName);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  parent.appendChild(element);
  return element;
}
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (Number.isInteger(rounded))
    return rounded.toFixed(0);
  return rounded.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
export function formatSvgNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}
export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
