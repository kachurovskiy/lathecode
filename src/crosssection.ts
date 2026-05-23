import { LatheCode, Point, Segment, Stock } from './common/lathecode.ts';
import { approximateSegments } from './common/lathegeometry.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_WIDTH = 500;
const VIEW_HEIGHT = 500;
const VIEW_PADDING = 0;

type SvgPoint = {
  x: number,
  y: number,
};

type DisplayExtents = {
  minH: number,
  maxH: number,
  minRadius: number,
  maxRadius: number,
};

type CrossSectionMapper = {
  map: (point: Point) => SvgPoint,
};

export class CrossSection {
  private dimensionsElement: HTMLParagraphElement;
  private svg: SVGSVGElement;

  constructor(readonly container: HTMLElement) {
    this.dimensionsElement = document.createElement('p');
    this.dimensionsElement.className = 'crossSectionDimensions';
    container.appendChild(this.dimensionsElement);

    this.svg = createSvgElement('svg');
    this.svg.classList.add('crossSectionSvg');
    this.svg.setAttribute('viewBox', `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'Lathe part 2D cross-section');
    container.appendChild(this.svg);
  }

  setLatheCode(latheCode: LatheCode | null) {
    this.svg.replaceChildren();
    this.dimensionsElement.textContent = '';
    if (!latheCode) return;

    const stock = latheCode.getStock();
    if (!stock) return;

    const mapper = createCrossSectionMapper(stock);
    this.dimensionsElement.textContent = formatDimensions(latheCode, stock);
    drawAxis(this.svg, stock, mapper);
    drawStock(this.svg, stock, mapper);
    drawPart(this.svg, latheCode, mapper);
    drawProfileLines(this.svg, latheCode, mapper);
  }
}

function createCrossSectionMapper(stock: Stock): CrossSectionMapper {
  const extents = getDisplayExtents(stock);
  const availableWidth = VIEW_WIDTH - VIEW_PADDING * 2;
  const availableHeight = VIEW_HEIGHT - VIEW_PADDING * 2;
  const extentWidth = Math.max(extents.maxH - extents.minH, 0.001);
  const extentHeight = Math.max(extents.maxRadius - extents.minRadius, 0.001);
  const scale = Math.min(
    availableWidth / extentWidth,
    availableHeight / extentHeight,
  );
  const drawWidth = extentWidth * scale;
  const drawHeight = extentHeight * scale;
  const originX = VIEW_PADDING + (availableWidth - drawWidth) / 2 - extents.minH * scale;
  const originY = VIEW_PADDING + (availableHeight - drawHeight) / 2 + extents.maxRadius * scale;

  return {
    map: point => mapDisplayPoint({h: stock.length - point.z, radius: point.x}, originX, originY, scale),
  };
}

function mapDisplayPoint(point: {h: number, radius: number}, originX: number, originY: number, scale: number): SvgPoint {
  return {
    x: originX + point.h * scale,
    y: originY - point.radius * scale,
  };
}

function getDisplayExtents(stock: Stock): DisplayExtents {
  const extents: DisplayExtents = {
    minH: 0,
    maxH: stock.length,
    minRadius: -stock.radius,
    maxRadius: stock.radius,
  };
  return extents;
}

function drawAxis(svg: SVGSVGElement, stock: Stock, mapper: CrossSectionMapper) {
  appendLine(
    svg,
    mapper.map(new Point(0, 0)),
    mapper.map(new Point(0, stock.length)),
    'crossSectionAxis');
}

function drawStock(svg: SVGSVGElement, stock: Stock, mapper: CrossSectionMapper) {
  for (const points of mirrorLoops([segmentsToPoints(stock.getSegments())])) {
    appendPath(svg, pointsToPath(points.map(mapper.map), true), 'crossSectionStock');
  }
}

function drawPart(svg: SVGSVGElement, latheCode: LatheCode, mapper: CrossSectionMapper) {
  for (const points of mirrorLoops(getPartLoops(latheCode))) {
    appendPath(svg, pointsToPath(points.map(mapper.map), true), 'crossSectionPart');
  }
}

function drawProfileLines(svg: SVGSVGElement, latheCode: LatheCode, mapper: CrossSectionMapper) {
  const outside = segmentsToPoints(latheCode.getOutsideProfileSegments());
  if (outside.length) {
    appendProfilePath(svg, outside, mapper, 'crossSectionOutsideProfile');
  }

  const inside = segmentsToPoints(latheCode.getInsideProfileSegments());
  if (inside.length) {
    appendProfilePath(svg, inside, mapper, 'crossSectionInsideProfile');
  }
}

function appendProfilePath(
    svg: SVGSVGElement,
    points: Point[],
    mapper: CrossSectionMapper,
    className: string) {
  appendPath(svg, pointsToPath(points.map(mapper.map), false), className);
  appendPath(svg, pointsToPath(points.map(mirrorPoint).map(mapper.map), false), className);
}

function getPartLoops(latheCode: LatheCode): Point[][] {
  const outside = segmentsToPoints(latheCode.getOutsideProfileSegments());
  const inside = segmentsToPoints(latheCode.getInsideProfileSegments());
  if (outside.length >= 2 && inside.length >= 2) {
    return [removeConsecutivePointDuplicates([
      inside[0],
      outside[0],
      ...outside.slice(1),
      inside.at(-1)!,
      ...inside.slice(0, -1).reverse(),
      inside[0],
    ])];
  }

  const profile = latheCode.getSingleProfile();
  return profile ? [segmentsToPoints(profile.segments)] : [];
}

function mirrorLoops(loops: Point[][]): Point[][] {
  return loops.flatMap(points => [
    points,
    points.map(mirrorPoint),
  ]);
}

function segmentsToPoints(segments: Segment[]): Point[] {
  return approximateSegments(segments);
}

function pointsToPath(points: SvgPoint[], closePath: boolean): string {
  if (!points.length) return '';
  const [first, ...rest] = points;
  const commands = [`M ${formatSvgNumber(first.x)} ${formatSvgNumber(first.y)}`];
  commands.push(...rest.map(point => `L ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`));
  if (closePath) commands.push('Z');
  return commands.join(' ');
}

function mirrorPoint(point: Point): Point {
  return new Point(-point.x, point.z);
}

function removeConsecutivePointDuplicates(points: Point[]): Point[] {
  return points.filter((point, index) => index === 0 || !point.isEqual(points[index - 1]));
}

function formatDimensions(latheCode: LatheCode, stock: Stock): string {
  const partPoints = getPartLoops(latheCode).flat();
  if (!partPoints.length) return `Stock ${formatStockDimensions(stock)}`;
  const maxRadius = Math.max(...partPoints.map(point => Math.abs(point.x)));
  const minZ = Math.min(...partPoints.map(point => point.z));
  const maxZ = Math.max(...partPoints.map(point => point.z));
  return `Part \u2300${formatDimension(maxRadius * 2)} L${formatDimension(maxZ - minZ)}mm, stock ${formatStockDimensions(stock)}`;
}

function formatStockDimensions(stock: Stock): string {
  const innerDiameter = stock.innerDiameter > 0 ? ` ID${formatDimension(stock.innerDiameter)}` : '';
  return `\u2300${formatDimension(stock.diameter)}${innerDiameter} L${formatDimension(stock.length)} mm`;
}

function formatDimension(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function appendPath(svg: SVGSVGElement, d: string, className: string) {
  if (!d) return;
  const path = createSvgElement('path');
  path.classList.add(className);
  path.setAttribute('d', d);
  svg.appendChild(path);
}

function appendLine(svg: SVGSVGElement, start: SvgPoint, end: SvgPoint, className: string) {
  const line = createSvgElement('line');
  line.classList.add(className);
  line.setAttribute('x1', formatSvgNumber(start.x));
  line.setAttribute('y1', formatSvgNumber(start.y));
  line.setAttribute('x2', formatSvgNumber(end.x));
  line.setAttribute('y2', formatSvgNumber(end.y));
  svg.appendChild(line);
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tagName);
}

function formatSvgNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}
