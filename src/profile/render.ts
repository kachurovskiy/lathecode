import { appendSvg, clampNumber, formatNumber, formatSvgNumber } from './dom.ts';
import { GEOMETRY_EPSILON, ORIENTATION_ICON_HALF_LENGTH_PX, ORIENTATION_ICON_OFFSET_PX, PADDING_RIGHT, POINT_RADIUS_PX, PROFILE_SIDES, SELECTED_POINT_RADIUS_PX, SIZE_HINT_GUIDE_OFFSET_PX, SIZE_HINT_LABEL_OFFSET_PX, SIZE_HINT_SCREEN_PADDING_PX, SIZE_HINT_VERTICAL_LABEL_GAP_PX, VIEW_WIDTH, type DrawingState, type ProfilePoint, type ProfileSide, type SvgScreenMetrics, } from './types.ts';
import { getGridTicks, getPlotBounds, getProfileSamplePoints, getSelectableSegmentRanges, isSameRadius, isSameZ, profileToScreen, getSvgScreenMetrics, } from './geometry.ts';
import { hasDrawableProfile, isProfileVisible } from './state.ts';
export function renderDrawing(svg: SVGSVGElement, state: DrawingState, freehandStroke: readonly ProfilePoint[] = []): void {
  svg.replaceChildren();
  const metrics = getSvgScreenMetrics(svg);
  const plot = getPlotBounds(state);
  appendSvg(svg, 'rect', {
    x: plot.left,
    y: plot.top,
    width: plot.width,
    height: plot.height,
    class: 'profileDrawingStock',
  });
  appendSvg(svg, 'line', {
    x1: plot.left,
    y1: plot.axisY,
    x2: plot.right,
    y2: plot.axisY,
    class: 'profileDrawingAxis',
  });
  for (const tick of getGridTicks(state.lengthMm, state.gridMm)) {
    const x = profileToScreen(state, { z: tick, radius: 0 }).x;
    appendSvg(svg, 'line', {
      x1: x,
      y1: plot.top,
      x2: x,
      y2: plot.axisY,
      class: 'profileDrawingGridLine',
    });
  }
  for (const tick of getGridTicks(state.diameterMm / 2, state.gridMm)) {
    const y = profileToScreen(state, { z: 0, radius: tick }).y;
    appendSvg(svg, 'line', {
      x1: plot.left,
      y1: y,
      x2: plot.right,
      y2: y,
      class: 'profileDrawingGridLine',
    });
  }
  const outsideSamples = getProfileSamplePoints(state.profiles.outside);
  const outsideFillPoints = [
    profileToScreen(state, { z: state.profiles.outside.points[0].z, radius: 0 }),
    ...outsideSamples.map(point => profileToScreen(state, point)),
    profileToScreen(state, { z: state.profiles.outside.points.at(-1)!.z, radius: 0 }),
  ];
  appendSvg(svg, 'polygon', {
    points: outsideFillPoints.map(point => `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`).join(' '),
    class: 'profileDrawingPart',
  });
  if (hasDrawableProfile(state.profiles.inside)) {
    const insideSamples = getProfileSamplePoints(state.profiles.inside);
    const insideFillPoints = [
      profileToScreen(state, { z: state.profiles.inside.points[0].z, radius: 0 }),
      ...insideSamples.map(point => profileToScreen(state, point)),
      profileToScreen(state, { z: state.profiles.inside.points.at(-1)!.z, radius: 0 }),
    ];
    appendSvg(svg, 'polygon', {
      points: insideFillPoints.map(point => `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`).join(' '),
      class: 'profileDrawingInsideCutout',
    });
  }
  for (const side of PROFILE_SIDES) {
    if (!isProfileVisible(state, side))
      continue;
    const samples = getProfileSamplePoints(state.profiles[side]);
    appendSvg(svg, 'path', {
      d: pointsToPath(samples.map(point => profileToScreen(state, point))),
      class: `profileDrawingPath ${side === state.activeSide ? 'active' : 'inactive'} ${side}`,
    });
    appendSelectedSegmentPath(svg, state, side);
    appendSegmentSizeHints(svg, state, side, metrics);
    appendSegmentOrientationIcons(svg, state, side, metrics);
  }
  if (freehandStroke.length >= 2) {
    appendSvg(svg, 'path', {
      d: pointsToPath(freehandStroke.map(point => profileToScreen(state, point))),
      class: 'profileDrawingFreehandStroke',
    });
  }
  for (const side of PROFILE_SIDES) {
    if (!isProfileVisible(state, side))
      continue;
    state.profiles[side].points.forEach((point, index) => {
      const selected = state.selection?.side === side && state.selection.index === index;
      const screen = profileToScreen(state, point);
      appendSvg(svg, 'circle', {
        cx: screen.x,
        cy: screen.y,
        r: metrics.px(selected ? SELECTED_POINT_RADIUS_PX : POINT_RADIUS_PX),
        class: [
          'profileDrawingPoint',
          side,
          side === state.activeSide ? 'active' : 'inactive',
          selected ? 'selected' : '',
        ].filter(Boolean).join(' '),
        tabindex: '0',
      });
    });
  }
}
export function appendSelectedSegmentPath(svg: SVGSVGElement, state: DrawingState, side: ProfileSide): void {
  const selection = state.segmentSelection;
  if (!selection || selection.side !== side)
    return;
  const range = getSelectableSegmentRanges(state.profiles[side])
    .find(candidate => selection.index >= candidate.startIndex && selection.index < candidate.endIndex);
  if (!range)
    return;
  appendSvg(svg, 'path', {
    d: pointsToPath(range.points.map(point => profileToScreen(state, point))),
    class: `profileDrawingSegmentSelection ${side}`,
  });
}
export function appendSegmentSizeHints(svg: SVGSVGElement, state: DrawingState, side: ProfileSide, metrics: SvgScreenMetrics): void {
  const profile = state.profiles[side];
  for (const range of getSelectableSegmentRanges(profile)) {
    const start = profile.points[range.startIndex];
    const end = profile.points[range.endIndex];
    if (!start || !end)
      continue;
    const zLength = Math.abs(end.z - start.z);
    const radialLength = Math.abs(end.radius - start.radius);
    if (zLength <= GEOMETRY_EPSILON && radialLength <= GEOMETRY_EPSILON)
      continue;
    const startScreen = profileToScreen(state, start);
    const endScreen = profileToScreen(state, end);
    if (radialLength <= GEOMETRY_EPSILON) {
      appendHorizontalSizeHint(svg, startScreen, endScreen, zLength, metrics);
    }
    else if (zLength <= GEOMETRY_EPSILON) {
      const centerX = (startScreen.x + endScreen.x) / 2;
      appendVerticalSizeHint(svg, startScreen, endScreen, radialLength, metrics, getOppositeSide(getVerticalHintSide(centerX)));
    }
    else {
      appendProjectedSizeHints(svg, startScreen, endScreen, zLength, radialLength, getProfilePolylineLength(range.points), metrics, range.tool === 'line');
    }
  }
}
export function appendHorizontalSizeHint(svg: SVGSVGElement, start: {
  x: number;
  y: number;
}, end: {
  x: number;
  y: number;
}, length: number, metrics: SvgScreenMetrics): void {
  appendSizeHintText(svg, {
    x: (start.x + end.x) / 2,
    y: Math.max(start.y, end.y) + metrics.px(SIZE_HINT_LABEL_OFFSET_PX),
  }, length, 'horizontal', 'middle', metrics);
}
export function appendVerticalSizeHint(svg: SVGSVGElement, start: {
  x: number;
  y: number;
}, end: {
  x: number;
  y: number;
}, length: number, metrics: SvgScreenMetrics, preferredSide?: -1 | 1): void {
  const centerX = (start.x + end.x) / 2;
  const side = preferredSide ?? getVerticalHintSide(centerX);
  appendSizeHintText(svg, {
    x: centerX + side * metrics.px(SIZE_HINT_VERTICAL_LABEL_GAP_PX),
    y: (start.y + end.y) / 2,
  }, length, 'vertical', side > 0 ? 'start' : 'end', metrics);
}
export function appendProjectedSizeHints(svg: SVGSVGElement, start: {
  x: number;
  y: number;
}, end: {
  x: number;
  y: number;
}, zLength: number, radialLength: number, segmentLength: number, metrics: SvgScreenMetrics, showDiagonalLength: boolean): void {
  const corner = { x: end.x, y: start.y };
  appendSvg(svg, 'line', {
    x1: formatSvgNumber(start.x),
    y1: formatSvgNumber(start.y),
    x2: formatSvgNumber(corner.x),
    y2: formatSvgNumber(corner.y),
    class: 'profileDrawingSizeGuide horizontal',
  });
  appendSvg(svg, 'line', {
    x1: formatSvgNumber(corner.x),
    y1: formatSvgNumber(corner.y),
    x2: formatSvgNumber(end.x),
    y2: formatSvgNumber(end.y),
    class: 'profileDrawingSizeGuide vertical',
  });
  appendHorizontalSizeHint(svg, start, corner, zLength, metrics);
  appendVerticalSizeHint(svg, corner, end, radialLength, metrics);
  if (showDiagonalLength)
    appendDiagonalSizeHint(svg, start, end, corner, segmentLength, metrics);
}
export function appendDiagonalSizeHint(svg: SVGSVGElement, start: {
  x: number;
  y: number;
}, end: {
  x: number;
  y: number;
}, corner: {
  x: number;
  y: number;
}, length: number, metrics: SvgScreenMetrics): void {
  const center = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const xDelta = end.x - start.x;
  const yDelta = end.y - start.y;
  const screenLength = Math.hypot(xDelta, yDelta);
  if (screenLength <= GEOMETRY_EPSILON)
    return;
  let normal = {
    x: -yDelta / screenLength,
    y: xDelta / screenLength,
  };
  if ((corner.x - center.x) * normal.x + (corner.y - center.y) * normal.y > 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  appendSizeHintText(svg, {
    x: center.x + normal.x * metrics.px(SIZE_HINT_LABEL_OFFSET_PX),
    y: center.y + normal.y * metrics.px(SIZE_HINT_LABEL_OFFSET_PX),
  }, length, 'diagonal', 'middle', metrics);
}
export function appendSizeHintText(svg: SVGSVGElement, point: {
  x: number;
  y: number;
}, length: number, variant: string, textAnchor: 'start' | 'middle' | 'end', metrics: SvgScreenMetrics): void {
  const padding = metrics.px(SIZE_HINT_SCREEN_PADDING_PX);
  const text = appendSvg(svg, 'text', {
    x: formatSvgNumber(clampNumber(point.x, metrics.viewBox.x + padding, metrics.viewBox.x + metrics.viewBox.width - padding)),
    y: formatSvgNumber(clampNumber(point.y, metrics.viewBox.y + padding, metrics.viewBox.y + metrics.viewBox.height - padding)),
    class: `profileDrawingSizeHint ${variant}`,
    'text-anchor': textAnchor,
    'dominant-baseline': 'middle',
  });
  text.textContent = formatNumber(length);
}
export function getProfilePolylineLength(points: readonly ProfilePoint[]): number {
  let length = 0;
  for (let index = 0;
    index < points.length - 1;
    index++) {
    length += Math.hypot(points[index + 1].z - points[index].z, points[index + 1].radius - points[index].radius);
  }
  return length;
}
export function getVerticalHintSide(centerX: number): -1 | 1 {
  return centerX > VIEW_WIDTH - PADDING_RIGHT - 44 ? -1 : 1;
}
export function getOppositeSide(side: -1 | 1): -1 | 1 {
  return side === 1 ? -1 : 1;
}
export function appendSegmentOrientationIcons(svg: SVGSVGElement, state: DrawingState, side: ProfileSide, metrics: SvgScreenMetrics): void {
  const profile = state.profiles[side];
  profile.segmentTools.forEach((tool, index) => {
    if (tool !== 'line')
      return;
    const start = profile.points[index];
    const end = profile.points[index + 1];
    const horizontal = isSameRadius(start, end) && Math.abs(end.z - start.z) > GEOMETRY_EPSILON;
    const vertical = isSameZ(start, end) && Math.abs(end.radius - start.radius) > GEOMETRY_EPSILON;
    if (!horizontal && !vertical)
      return;
    const startScreen = profileToScreen(state, start);
    const endScreen = profileToScreen(state, end);
    const center = {
      x: (startScreen.x + endScreen.x) / 2,
      y: (startScreen.y + endScreen.y) / 2,
    };
    appendOrientationIcon(svg, center, horizontal ? 'horizontal' : 'vertical', metrics);
  });
}
export function appendOrientationIcon(svg: SVGSVGElement, center: {
  x: number;
  y: number;
}, orientation: 'horizontal' | 'vertical', metrics: SvgScreenMetrics): void {
  const halfLength = metrics.px(ORIENTATION_ICON_HALF_LENGTH_PX);
  const offset = metrics.px(ORIENTATION_ICON_OFFSET_PX);
  if (orientation === 'horizontal') {
    appendSvg(svg, 'line', {
      x1: formatSvgNumber(center.x - halfLength),
      y1: formatSvgNumber(center.y - offset),
      x2: formatSvgNumber(center.x + halfLength),
      y2: formatSvgNumber(center.y - offset),
      class: 'profileDrawingSegmentIcon horizontal',
    });
    return;
  }
  const side = getVerticalHintSide(center.x);
  appendSvg(svg, 'line', {
    x1: formatSvgNumber(center.x + side * metrics.px(SIZE_HINT_GUIDE_OFFSET_PX)),
    y1: formatSvgNumber(center.y - halfLength),
    x2: formatSvgNumber(center.x + side * metrics.px(SIZE_HINT_GUIDE_OFFSET_PX)),
    y2: formatSvgNumber(center.y + halfLength),
    class: 'profileDrawingSegmentIcon vertical',
  });
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
