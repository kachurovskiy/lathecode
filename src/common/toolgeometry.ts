import { Tool } from './lathecode';
import { type AppSettings, DEFAULT_APP_SETTINGS, normalizeAppSettings } from './settings';
import {
  geometryBounds,
  horizontalSpansAtY,
  minkowskiSumPath,
  polygonFromPoints,
  unionGeometryClipper,
  unionGeometry,
  type VectorGeometry,
  type VectorPath,
  type VectorPoint,
} from './polygon';

export type ToolRadialDirection = -1 | 1;

let CIRCLE_STEPS = DEFAULT_APP_SETTINGS.toolGeometryCircleSteps;
let BOUNDARY_TOLERANCE_MM = DEFAULT_APP_SETTINGS.toolGeometryBoundaryToleranceMm;
let OVERTRAVEL_SCAN_STEPS = DEFAULT_APP_SETTINGS.toolGeometryOvertravelScanSteps;
let OVERTRAVEL_SEARCH_ITERATIONS = DEFAULT_APP_SETTINGS.toolGeometryOvertravelBinarySearchIterations;

export function configureToolGeometrySettings(settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS): AppSettings {
  const normalizedSettings = normalizeAppSettings(settings);
  CIRCLE_STEPS = normalizedSettings.toolGeometryCircleSteps;
  BOUNDARY_TOLERANCE_MM = normalizedSettings.toolGeometryBoundaryToleranceMm;
  OVERTRAVEL_SCAN_STEPS = normalizedSettings.toolGeometryOvertravelScanSteps;
  OVERTRAVEL_SEARCH_ITERATIONS = normalizedSettings.toolGeometryOvertravelBinarySearchIterations;
  return normalizedSettings;
}

export function createToolFootprintGeometry(tool: Tool, radialDirection: ToolRadialDirection): VectorGeometry {
  if (tool.type === 'RECT' || tool.type === 'ROUND') {
    const minY = radialDirection > 0 ? -tool.heightMm : 0;
    const maxY = radialDirection > 0 ? 0 : tool.heightMm;
    return polygonFromPoints(roundedRectanglePoints(-tool.widthMm, minY, 0, maxY, tool.cornerRadiusMm));
  }

  if (tool.type === 'ANG') {
    return normalizeAngledToolGeometry(createRawAngledToolGeometry(tool), radialDirection);
  }

  throw new Error(`tool of type ${tool.type} not implemented`);
}

export function createSweptToolGeometry(tool: Tool, radialDirection: ToolRadialDirection, anchorX: number, startY: number, endY: number): VectorGeometry {
  return createLinearSweptToolGeometry(tool, radialDirection, anchorX, startY, anchorX, endY);
}

export function createToolKeepoutGeometry(tool: Tool, radialDirection: ToolRadialDirection, protectedGeometry: VectorGeometry): VectorGeometry {
  const reflectedToolPaths = outerPaths(createToolFootprintGeometry(tool, radialDirection))
    .map(reflectPath);
  const protectedPaths = outerPaths(protectedGeometry);
  const pieces: VectorGeometry[] = [];

  for (const reflectedToolPath of reflectedToolPaths) {
    for (const protectedPath of protectedPaths) {
      pieces.push(minkowskiSumPath(reflectedToolPath, protectedPath, true));
    }
  }

  return unionGeometryClipper(...pieces);
}

export function createLinearSweptToolGeometry(
  tool: Tool,
  radialDirection: ToolRadialDirection,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): VectorGeometry {
  return createToolPathSweptGeometry(tool, radialDirection, [
    {x: startX, y: startY},
    {x: endX, y: endY},
  ]);
}

export function createToolPathSweptGeometry(tool: Tool, radialDirection: ToolRadialDirection, toolPath: VectorPath): VectorGeometry {
  const footprintPaths = outerPaths(createToolFootprintGeometry(tool, radialDirection));
  return unionGeometryClipper(...footprintPaths.map(footprintPath =>
    minkowskiSumPath(footprintPath, toolPath, false)));
}

export function getToolRadialBoundaryOvertravel(tool: Tool, radialDirection: ToolRadialDirection): number {
  const footprint = createToolFootprintGeometry(tool, radialDirection);
  const bounds = geometryBounds(footprint);
  if (!bounds) return 0;

  const radialSpan = bounds.maxY - bounds.minY;
  if (radialSpan <= 0) return 0;

  const coversFullToolWidthAt = (overtravel: number): boolean => {
    const sampleY = radialDirection > 0
      ? bounds.maxY - overtravel
      : bounds.minY + overtravel;
    return horizontalSpansAtY(footprint, sampleY).some(span =>
      span.minX <= bounds.minX + BOUNDARY_TOLERANCE_MM &&
      span.maxX >= bounds.maxX - BOUNDARY_TOLERANCE_MM);
  };

  if (coversFullToolWidthAt(0)) return 0;

  let low = 0;
  let high: number | undefined;
  for (let i = 1; i <= OVERTRAVEL_SCAN_STEPS; i++) {
    const overtravel = radialSpan * i / OVERTRAVEL_SCAN_STEPS;
    if (coversFullToolWidthAt(overtravel)) {
      high = overtravel;
      break;
    }
    low = overtravel;
  }
  if (high === undefined) return 0;

  for (let i = 0; i < OVERTRAVEL_SEARCH_ITERATIONS; i++) {
    const mid: number = (low + high) / 2;
    if (coversFullToolWidthAt(mid)) high = mid;
    else low = mid;
  }

  return high;
}

function createRawAngledToolGeometry(tool: Tool): VectorGeometry {
  const radius = tool.cornerRadiusMm;
  const edgeLength = tool.widthMm;
  const noseAngleDeg = tool.noseAngleDeg ?? 0;
  const rotation = tool.angleDeg ?? 0;
  const leftArmStart = polarToCartesian(radius, 180 - noseAngleDeg / 2 + rotation);
  const leftArmEnd = translatePoint(polarToCartesian(edgeLength, 270 - noseAngleDeg / 2 + rotation), leftArmStart);
  const rightArmStart = polarToCartesian(radius, noseAngleDeg / 2 + rotation);
  const rightArmEnd = translatePoint(polarToCartesian(edgeLength, 270 + noseAngleDeg / 2 + rotation), rightArmStart);
  const armGeometry = polygonFromPoints([leftArmStart, leftArmEnd, rightArmEnd, rightArmStart]);
  const noseGeometry = polygonFromPoints(circlePoints({x: 0, y: 0}, radius));
  return unionGeometry(armGeometry, noseGeometry);
}

function normalizeAngledToolGeometry(geometry: VectorGeometry, radialDirection: ToolRadialDirection): VectorGeometry {
  const bounds = geometryBounds(geometry);
  if (!bounds) return [];
  const anchorX = bounds.maxX;
  const anchorY = radialDirection > 0 ? bounds.maxY : bounds.minY;
  return translateGeometry(geometry, -anchorX, -anchorY);
}

function roundedRectanglePoints(minX: number, minY: number, maxX: number, maxY: number, radius: number): VectorPoint[] {
  const r = Math.max(0, Math.min(radius, (maxX - minX) / 2, (maxY - minY) / 2));
  if (r === 0) {
    return [
      {x: minX, y: minY},
      {x: maxX, y: minY},
      {x: maxX, y: maxY},
      {x: minX, y: maxY},
    ];
  }

  return [
    ...arcPoints({x: maxX - r, y: maxY - r}, r, 0, Math.PI / 2),
    ...arcPoints({x: minX + r, y: maxY - r}, r, Math.PI / 2, Math.PI),
    ...arcPoints({x: minX + r, y: minY + r}, r, Math.PI, Math.PI * 3 / 2),
    ...arcPoints({x: maxX - r, y: minY + r}, r, Math.PI * 3 / 2, Math.PI * 2),
  ];
}

function arcPoints(center: VectorPoint, radius: number, startAngle: number, endAngle: number): VectorPoint[] {
  const steps = Math.max(2, Math.ceil(CIRCLE_STEPS * Math.abs(endAngle - startAngle) / (Math.PI * 2)));
  const points: VectorPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * i / steps;
    points.push({x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle)});
  }
  return points;
}

function circlePoints(center: VectorPoint, radius: number): VectorPoint[] {
  if (radius <= 0) return [];
  const points: VectorPoint[] = [];
  for (let i = 0; i < CIRCLE_STEPS; i++) {
    const angle = Math.PI * 2 * i / CIRCLE_STEPS;
    points.push({x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle)});
  }
  return points;
}

function polarToCartesian(radius: number, angleInDegrees: number): VectorPoint {
  const angle = angleInDegrees * Math.PI / 180;
  return {x: radius * Math.cos(angle), y: -radius * Math.sin(angle)};
}

function translatePoint(point: VectorPoint, by: VectorPoint): VectorPoint {
  return {x: point.x + by.x, y: point.y + by.y};
}

function translateGeometry(geometry: VectorGeometry, xDelta: number, yDelta: number): VectorGeometry {
  return geometry.map(polygon =>
    polygon.map(ring =>
      ring.map(([x, y]) => [x + xDelta, y + yDelta] as [number, number])));
}

function outerPaths(geometry: VectorGeometry): VectorPath[] {
  return geometry.flatMap(polygon => {
    const outer = polygon[0];
    return outer && outer.length >= 3
      ? [outer.map(([x, y]) => ({x, y}))]
      : [];
  });
}

function reflectPath(path: VectorPath): VectorPath {
  return path.map(point => ({x: -point.x, y: -point.y}));
}
