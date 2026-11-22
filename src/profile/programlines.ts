import { createEmptySegmentFeatures } from './state.ts';
import { GEOMETRY_EPSILON, type ProfilePoint, type SegmentEdgeFeature, type SegmentEdgeFeatures, type SegmentTool } from './types.ts';

export function segmentLineToLatheCode(length: number, startRadius: number, endRadius: number, tool: SegmentTool, features: SegmentEdgeFeatures = createEmptySegmentFeatures()): string {
  const startDiameter = startRadius * 2;
  const endDiameter = endRadius * 2;
  const effectiveTool = Math.abs(length) <= GEOMETRY_EPSILON ? 'line' : tool;
  assertFeaturesSupported(effectiveTool, features);
  const effectiveFeatures = effectiveTool === 'line' ? features : createEmptySegmentFeatures();
  if (effectiveTool === 'line' && Math.abs(startDiameter - endDiameter) <= GEOMETRY_EPSILON && edgeFeaturesEqual(effectiveFeatures.start, effectiveFeatures.end)) {
    return `L${formatNumber(length)} D${formatNumber(startDiameter)}${edgeFeatureToLatheCode(effectiveFeatures.start)}`;
  }
  const curveType = effectiveTool === 'convex' ? ' CONV' : effectiveTool === 'concave' ? ' CONC' : '';
  return [`L${formatNumber(length)}`, `DS${formatNumber(startDiameter)}${edgeFeatureToLatheCode(effectiveFeatures.start)}`, `DE${formatNumber(endDiameter)}${edgeFeatureToLatheCode(effectiveFeatures.end)}${curveType}`,].join(' ');
}
export function assertFeaturesSupported(tool: SegmentTool, features: SegmentEdgeFeatures | undefined): void {
  if (tool !== 'line' && (features?.start || features?.end)) {
    throw new Error('Chamfers and fillets cannot be represented on an arc or spline. Select the segment and explicitly remove its endpoint features or change it back to a line.');
  }
}
export function formatProgramNumber(value: number): string {
  const formatted = value.toFixed(12).replace(/\.?0+$/, '') || '0';
  return formatted === '-0' ? '0' : formatted;
}
const formatNumber = formatProgramNumber;
export function edgeFeatureToLatheCode(feature: SegmentEdgeFeature | null): string {
  if (!feature || feature.size <= GEOMETRY_EPSILON)
    return '';
  return `${feature.kind === 'chamfer' ? ' CH' : ' FI'}${formatNumber(feature.size)}`;
}
export function edgeFeaturesEqual(a: SegmentEdgeFeature | null, b: SegmentEdgeFeature | null): boolean {
  if (!a || a.size <= GEOMETRY_EPSILON)
    return !b || b.size <= GEOMETRY_EPSILON;
  if (!b || b.size <= GEOMETRY_EPSILON)
    return false;
  return a.kind === b.kind && Math.abs(a.size - b.size) <= GEOMETRY_EPSILON;
}
export function splineLineToLatheCode(points: ProfilePoint[]): string {
  const start = points[0];
  const end = points.at(-1)!;
  if (Math.abs(end.z - start.z) <= GEOMETRY_EPSILON) {
    return segmentLineToLatheCode(0, start.radius, end.radius, 'line');
  }
  const controls = points.slice(1, -1).map(point => point.radius * 2);
  if (!controls.length)
    controls.push((start.radius + end.radius));
  return [`L${formatNumber(end.z - start.z)}`, `DS${formatNumber(start.radius * 2)}`, `DE${formatNumber(end.radius * 2)}`, 'BSPLINE', ...controls.map(diameter => `D${formatNumber(diameter)}`),
  ].join(' ');
}
