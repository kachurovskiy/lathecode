import { Point, Segment } from '../common/lathecode.ts';
import { approximateSegments } from '../common/lathegeometry.ts';
import { formatSvgNumber } from './dom.ts';
import { DEFAULT_GRID_MM, DRAWING_VIEWBOX_MARGIN_BOTTOM, DRAWING_VIEWBOX_MARGIN_TOP, DRAWING_VIEWBOX_MARGIN_X, DRAWING_VIEWBOX_MIN_HEIGHT, DRAWING_VIEWBOX_MIN_WIDTH, GEOMETRY_EPSILON, LONG_PREVIEW_ASPECT_RATIO, PADDING_BOTTOM, PADDING_LEFT, PADDING_RIGHT, PADDING_TOP, PLOT_CLICK_TOLERANCE_PX, POINT_HIT_RADIUS_PX, PROFILE_SIDES, PROFILE_3D_PREVIEW_FALLBACK_RENDER_SIZE, PROFILE_3D_PREVIEW_MAX_RENDER_SIZE, PROFILE_3D_PREVIEW_MIN_RENDER_SIZE, PROFILE_PREVIEW_MAX_CHORD_MM, SEGMENT_HIT_RADIUS_PX, VIEW_HEIGHT, VIEW_WIDTH, type DrawingState, type PlotBounds, type PointSelection, type ProfileDraft, type ProfilePoint, type SegmentRange, type SegmentSelection, type SvgScreenMetrics, type SvgViewBox, } from './types.ts';
export function getGridTicks(limit: number, step: number): number[] {
  if (!Number.isFinite(limit) || !Number.isFinite(step) || limit <= 0 || step <= GEOMETRY_EPSILON)
    return [];
  const ticks: number[] = [];
  for (let value = step;
    value < limit - GEOMETRY_EPSILON;
    value += step) {
    ticks.push(roundGridTick(value));
  }
  return ticks;
}
export function roundGridTick(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}
export function getDefaultGridMm(lengthMm: number, diameterMm: number): number {
  const span = Math.max(lengthMm, diameterMm / 2, DEFAULT_GRID_MM);
  return getReasonableGridStep(span / 10);
}
export function getReasonableGridStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough || 1));
  const scaled = rough / power;
  if (scaled <= 1)
    return power;
  if (scaled <= 2)
    return 2 * power;
  if (scaled <= 5)
    return 5 * power;
  return 10 * power;
}
export function getProfileSamplePoints(profile: ProfileDraft): ProfilePoint[] {
  const result: ProfilePoint[] = [];
  for (const range of getSelectableSegmentRanges(profile)) {
    if (!result.length) {
      result.push(...range.points);
    }
    else {
      result.push(...range.points.slice(1));
    }
  }
  return result;
}
export function getSelectableSegmentRanges(profile: ProfileDraft): SegmentRange[] {
  const ranges: SegmentRange[] = [];
  for (let index = 0;
    index < profile.segmentTools.length;
  ) {
    const tool = profile.segmentTools[index];
    if (tool === 'spline') {
      let endIndex = index + 1;
      while (endIndex < profile.segmentTools.length && profile.segmentTools[endIndex] === 'spline')
        endIndex++;
      ranges.push({
        startIndex: index,
        endIndex,
        tool,
        points: getSplineSamplePoints(profile.points.slice(index, endIndex + 1)),
      });
      index = endIndex;
      continue;
    }
    ranges.push({
      startIndex: index,
      endIndex: index + 1,
      tool,
      points: getSingleSegmentSamplePoints(profile, index),
    });
    index++;
  }
  return ranges;
}
export function getSingleSegmentSamplePoints(profile: ProfileDraft, index: number): ProfilePoint[] {
  const start = profile.points[index];
  const end = profile.points[index + 1];
  const tool = profile.segmentTools[index];
  if (tool === 'line' || tool === 'spline')
    return [start, end];
  const convex = tool === 'convex';
  const asc = end.radius > start.radius;
  const center = asc === convex
    ? { radius: start.radius, z: end.z }
    : { radius: end.radius, z: start.z };
  const radiusZ = Math.abs(end.z - start.z);
  const radiusR = Math.abs(end.radius - start.radius);
  const angles = getCurveAngles(convex, asc);
  const steps = Math.max(4, Math.ceil(Math.max(radiusZ, radiusR) / 2));
  const result: ProfilePoint[] = [start];
  for (let step = 1;
    step <= steps;
    step++) {
    const angle = angles.start + angles.delta * step / steps;
    result.push({
      radius: center.radius + radiusR * Math.sin(angle),
      z: center.z - radiusZ * Math.cos(angle),
    });
  }
  result[result.length - 1] = end;
  return result;
}
export function getSplineSamplePoints(points: readonly ProfilePoint[]): ProfilePoint[] {
  if (points.length <= 2)
    return points.map(point => ({ ...point }));
  const controls = getEvenlySpacedSplineControlPoints(points);
  const segment = new Segment('BSPLINE', profilePointToLathePoint(controls[0]), profilePointToLathePoint(controls.at(-1)!), controls.map(profilePointToLathePoint));
  return approximateSegments([segment], PROFILE_PREVIEW_MAX_CHORD_MM).map(lathePointToProfilePoint);
}
export function getEvenlySpacedSplineControlPoints(points: readonly ProfilePoint[]): ProfilePoint[] {
  if (points.length <= 2)
    return points.map(point => ({ ...point }));
  const start = points[0];
  const end = points.at(-1)!;
  const span = end.z - start.z;
  const lastIndex = points.length - 1;
  return points.map((point, index) => ({
    radius: point.radius,
    z: index === 0 || index === lastIndex
      ? point.z
      : start.z + span * index / lastIndex,
  }));
}
export function profilePointToLathePoint(point: ProfilePoint): Point {
  return new Point(point.radius, point.z);
}
export function lathePointToProfilePoint(point: Point): ProfilePoint {
  return { z: point.z, radius: point.x };
}
export function getCurveAngles(convex: boolean, asc: boolean): {
  start: number;
  delta: number;
} {
  let start = 0;
  let end = 0;
  let counterclockwise = false;
  if (asc && convex) {
    start = 0;
    end = Math.PI / 2;
  }
  else if (asc && !convex) {
    start = Math.PI * 3 / 2;
    end = Math.PI;
    counterclockwise = true;
  }
  else if (!asc && convex) {
    start = Math.PI / 2;
    end = Math.PI;
  }
  else {
    start = Math.PI * 2;
    end = Math.PI * 3 / 2;
    counterclockwise = true;
  }
  let delta = end - start;
  if (!counterclockwise && delta < 0)
    delta += Math.PI * 2;
  if (counterclockwise && delta > 0)
    delta -= Math.PI * 2;
  return { start, delta };
}
export function pointsToPath(points: readonly {
  x: number;
  y: number;
}[]): string {
  if (!points.length)
    return '';
  const [first, ...rest] = points;
  return [
    `M ${formatSvgNumber(first.x)} ${formatSvgNumber(first.y)}`,
    ...rest.map(point => `L ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`),
  ].join(' ');
}
export function getSvgPoint(svg: SVGSVGElement, event: MouseEvent): {
  x: number;
  y: number;
} {
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }
  const viewBox = getCurrentSvgViewBox(svg);
  const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
  const renderedWidth = viewBox.width * scale;
  const renderedHeight = viewBox.height * scale;
  const left = rect.left + (rect.width - renderedWidth) / 2;
  const top = rect.top + (rect.height - renderedHeight) / 2;
  return {
    x: viewBox.x + (event.clientX - left) / scale,
    y: viewBox.y + (event.clientY - top) / scale,
  };
}
export function getCurrentSvgViewBox(svg: SVGSVGElement): SvgViewBox {
  const attributeViewBox = parseSvgViewBox(svg.getAttribute('viewBox'));
  if (attributeViewBox)
    return attributeViewBox;
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox.width > 0 && viewBox.height > 0) {
    return {
      x: viewBox.x,
      y: viewBox.y,
      width: viewBox.width,
      height: viewBox.height,
    };
  }
  return { x: 0, y: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT };
}
export function parseSvgViewBox(value: string | null): SvgViewBox | null {
  if (!value)
    return null;
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isFinite(part)))
    return null;
  if (parts[2] <= 0 || parts[3] <= 0)
    return null;
  return {
    x: parts[0],
    y: parts[1],
    width: parts[2],
    height: parts[3],
  };
}
export function isSvgPointInsidePlot(state: DrawingState, point: {
  x: number;
  y: number;
}, tolerance = PLOT_CLICK_TOLERANCE_PX): boolean {
  const plot = getPlotBounds(state);
  return point.x >= plot.left - tolerance
    && point.x <= plot.right + tolerance
    && point.y >= plot.top - tolerance
    && point.y <= plot.axisY + tolerance;
}
function isVisibleProfile(state: DrawingState, side: typeof PROFILE_SIDES[number]): boolean {
  return side === 'outside' || state.profiles[side].enabled || state.activeSide === side;
}
export function findNearestPointSelection(state: DrawingState, screenPoint: {
  x: number;
  y: number;
}, hitRadius = POINT_HIT_RADIUS_PX): PointSelection {
  let bestSelection: PointSelection = null;
  let bestDistance = hitRadius;
  for (const side of PROFILE_SIDES) {
    if (!isVisibleProfile(state, side))
      continue;
    state.profiles[side].points.forEach((point, index) => {
      const screen = profileToScreen(state, point);
      const distance = Math.hypot(screen.x - screenPoint.x, screen.y - screenPoint.y);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestSelection = { side, index };
      }
    });
  }
  return bestSelection;
}
export function findNearestSegmentSelection(state: DrawingState, screenPoint: {
  x: number;
  y: number;
}, hitRadius = SEGMENT_HIT_RADIUS_PX): SegmentSelection {
  let bestSelection: SegmentSelection = null;
  let bestDistance = hitRadius;
  for (const side of PROFILE_SIDES) {
    if (!isVisibleProfile(state, side))
      continue;
    for (const range of getSelectableSegmentRanges(state.profiles[side])) {
      const screenPoints = range.points.map(point => profileToScreen(state, point));
      const distance = distanceToScreenPolyline(screenPoint, screenPoints);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestSelection = { side, index: range.startIndex };
      }
    }
  }
  return bestSelection;
}
export function distanceToScreenPolyline(point: {
  x: number;
  y: number;
}, polyline: readonly {
  x: number;
  y: number;
}[]): number {
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0;
    index < polyline.length - 1;
    index++) {
    bestDistance = Math.min(bestDistance, distanceToScreenSegment(point, polyline[index], polyline[index + 1]));
  }
  return bestDistance;
}
export function distanceToScreenSegment(point: {
  x: number;
  y: number;
}, start: {
  x: number;
  y: number;
}, end: {
  x: number;
  y: number;
}): number {
  const xDelta = end.x - start.x;
  const yDelta = end.y - start.y;
  const lengthSquared = xDelta * xDelta + yDelta * yDelta;
  if (lengthSquared <= GEOMETRY_EPSILON)
    return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * xDelta
    + (point.y - start.y) * yDelta) / lengthSquared));
  return Math.hypot(point.x - (start.x + xDelta * ratio), point.y - (start.y + yDelta * ratio));
}
export function screenToProfilePoint(state: DrawingState, screenPoint: {
  x: number;
  y: number;
}): ProfilePoint {
  const plot = getPlotBounds(state);
  return {
    z: Math.max(0, Math.min(state.lengthMm, (screenPoint.x - plot.left) / plot.width * state.lengthMm)),
    radius: Math.max(0, Math.min(state.diameterMm / 2, (plot.axisY - screenPoint.y) / plot.height * (state.diameterMm / 2))),
  };
}
export function profileToScreen(state: DrawingState, point: ProfilePoint): {
  x: number;
  y: number;
} {
  const plot = getPlotBounds(state);
  return {
    x: plot.left + point.z / state.lengthMm * plot.width,
    y: plot.axisY - point.radius / (state.diameterMm / 2) * plot.height,
  };
}
export function getPlotBounds(state: Pick<DrawingState, 'diameterMm' | 'lengthMm'>): PlotBounds {
  const availableLeft = PADDING_LEFT;
  const availableTop = PADDING_TOP;
  const availableWidth = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const availableHeight = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const lengthMm = Math.max(state.lengthMm, GEOMETRY_EPSILON);
  const radiusMm = Math.max(state.diameterMm / 2, GEOMETRY_EPSILON);
  const scale = Math.min(availableWidth / lengthMm, availableHeight / radiusMm);
  const width = lengthMm * scale;
  const height = radiusMm * scale;
  const left = availableLeft + (availableWidth - width) / 2;
  const top = availableTop + (availableHeight - height) / 2;
  const right = left + width;
  const axisY = top + height;
  return {
    left,
    right,
    top,
    axisY,
    width,
    height,
  };
}
export function getDrawingViewBox(state: Pick<DrawingState, 'diameterMm' | 'lengthMm'>): SvgViewBox {
  const plot = getPlotBounds(state);
  const horizontal = expandViewBoxSpan(Math.max(0, plot.left - DRAWING_VIEWBOX_MARGIN_X), Math.min(VIEW_WIDTH, plot.right + DRAWING_VIEWBOX_MARGIN_X), DRAWING_VIEWBOX_MIN_WIDTH, 0, VIEW_WIDTH);
  const vertical = expandViewBoxSpan(Math.max(0, plot.top - DRAWING_VIEWBOX_MARGIN_TOP), Math.min(VIEW_HEIGHT, plot.axisY + DRAWING_VIEWBOX_MARGIN_BOTTOM), DRAWING_VIEWBOX_MIN_HEIGHT, 0, VIEW_HEIGHT);
  return {
    x: horizontal.start,
    y: vertical.start,
    width: horizontal.end - horizontal.start,
    height: vertical.end - vertical.start,
  };
}
export function expandViewBoxSpan(start: number, end: number, minimumSize: number, limitStart: number, limitEnd: number): {
  start: number;
  end: number;
} {
  if (end - start >= minimumSize)
    return { start, end };
  const center = (start + end) / 2;
  let nextStart = center - minimumSize / 2;
  let nextEnd = center + minimumSize / 2;
  if (nextStart < limitStart) {
    nextEnd += limitStart - nextStart;
    nextStart = limitStart;
  }
  if (nextEnd > limitEnd) {
    nextStart -= nextEnd - limitEnd;
    nextEnd = limitEnd;
  }
  return {
    start: Math.max(limitStart, nextStart),
    end: Math.min(limitEnd, nextEnd),
  };
}
export function svgViewBoxToString(viewBox: SvgViewBox): string {
  return [
    formatSvgNumber(viewBox.x),
    formatSvgNumber(viewBox.y),
    formatSvgNumber(viewBox.width),
    formatSvgNumber(viewBox.height),
  ].join(' ');
}
export function getSvgScreenMetrics(svg: SVGSVGElement): SvgScreenMetrics {
  const viewBox = getCurrentSvgViewBox(svg);
  const rect = svg.getBoundingClientRect();
  const scale = rect.width > 0 && rect.height > 0
    ? Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
    : VIEW_WIDTH / viewBox.width;
  const cssPixelToSvgUnit = scale > GEOMETRY_EPSILON ? 1 / scale : viewBox.width / VIEW_WIDTH;
  return {
    viewBox,
    px: value => value * cssPixelToSvgUnit,
  };
}
export function shouldPlacePreviewBelowEditor(state: Pick<DrawingState, 'diameterMm' | 'lengthMm'>): boolean {
  return state.lengthMm / Math.max(state.diameterMm, GEOMETRY_EPSILON) >= LONG_PREVIEW_ASPECT_RATIO;
}
export function getPreviewRenderSize(element: HTMLElement): {
  width: number;
  height: number;
} {
  const rect = element.getBoundingClientRect();
  const width = rect.width || element.clientWidth || PROFILE_3D_PREVIEW_FALLBACK_RENDER_SIZE;
  const height = rect.height || element.clientHeight || PROFILE_3D_PREVIEW_FALLBACK_RENDER_SIZE;
  return fitPreviewRenderSize(width, height);
}
export function fitPreviewRenderSize(width: number, height: number): {
  width: number;
  height: number;
} {
  const sourceMax = Math.max(width, height);
  const targetMax = Math.max(PROFILE_3D_PREVIEW_MIN_RENDER_SIZE, Math.min(PROFILE_3D_PREVIEW_MAX_RENDER_SIZE, Math.ceil(sourceMax / 16) * 16));
  const scale = targetMax / sourceMax;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
export function getPreviewRenderSizeKey(size: {
  width: number;
  height: number;
}): string {
  return `${size.width}x${size.height}`;
}
export function hasSegmentLength(start: ProfilePoint, end: ProfilePoint): boolean {
  return Math.abs(end.z - start.z) > GEOMETRY_EPSILON;
}
export function normalizeSegmentLength(length: number): number {
  return Math.abs(length) <= GEOMETRY_EPSILON ? 0 : length;
}
export function isSameZ(start: ProfilePoint, end: ProfilePoint): boolean {
  return Math.abs(start.z - end.z) <= GEOMETRY_EPSILON;
}
export function isSameRadius(start: ProfilePoint, end: ProfilePoint): boolean {
  return Math.abs(start.radius - end.radius) <= GEOMETRY_EPSILON;
}
