export const EDGE_FEATURE_EPSILON = 1e-9;

export type SegmentFeatureEndpoint = 'start' | 'end';
export type EdgeFeatureKind = 'chamfer' | 'fillet';

export type EdgeFeature = {
  kind: EdgeFeatureKind;
  size: number;
};

export type EdgeFeaturePair = Record<SegmentFeatureEndpoint, EdgeFeature | null>;

export type EdgeFeaturePoint = {
  radius: number;
  z: number;
};

export type EdgeFeatureSegmentType = 'line' | 'curve' | 'spline' | 'parting';

export type EdgeFeatureSegment = {
  type: EdgeFeatureSegmentType;
  start: EdgeFeaturePoint;
  end: EdgeFeaturePoint;
};

export type EndpointFeatureContext =
  | {
      kind: 'invalid';
      reason: 'no-edge' | 'unsupported-segment' | 'unsupported-neighbor' | 'corner-angle';
      edgePoint: EdgeFeaturePoint;
      segmentDirection: Vector;
    }
  | {
      kind: 'connector';
      edgePoint: EdgeFeaturePoint;
      direction: Vector;
      segmentDirection: Vector;
      trimLimit: number;
      angle: number;
    }
  | {
      kind: 'continuous';
      edgePoint: EdgeFeaturePoint;
      direction: Vector;
      segmentDirection: Vector;
      trimLimit: number;
      angle: number;
      neighborIndex: number;
      neighborEndpoint: SegmentFeatureEndpoint;
      neighborSegment: EdgeFeatureSegment;
    };

type Vector = {
  radius: number;
  z: number;
};

export function createEmptyEdgeFeaturePair(): EdgeFeaturePair {
  return {start: null, end: null};
}

export function getEndpointFeatureContext(
  segments: readonly EdgeFeatureSegment[],
  index: number,
  endpoint: SegmentFeatureEndpoint,
  closureRadius: number,
): EndpointFeatureContext {
  const segment = segments[index];
  if (!segment) return invalidContext({radius: closureRadius, z: 0}, {radius: 0, z: 0}, 'no-edge');

  const edgePoint = endpointPoint(segment, endpoint);
  const segmentDirection = getEndpointDirection(segment, endpoint);
  if (segment.type !== 'line' || vectorLength(segmentDirection) <= EDGE_FEATURE_EPSILON) {
    return invalidContext(edgePoint, segmentDirection, 'unsupported-segment');
  }

  const neighborIndex = endpoint === 'start' ? index - 1 : index + 1;
  const neighbor = segments[neighborIndex];
  if (!neighbor) {
    const radialDelta = closureRadius - edgePoint.radius;
    if (Math.abs(radialDelta) <= EDGE_FEATURE_EPSILON) {
      return invalidContext(edgePoint, segmentDirection, 'no-edge');
    }
    return connectorContext(edgePoint, {radius: Math.sign(radialDelta), z: 0}, Math.abs(radialDelta), segmentDirection);
  }

  const neighborEndpoint = endpoint === 'start' ? neighbor.end : neighbor.start;
  const connector = pointDelta(edgePoint, neighborEndpoint);
  const connectorLength = vectorLength(connector);
  if (connectorLength > EDGE_FEATURE_EPSILON) {
    return connectorContext(edgePoint, normalizeVector(connector), connectorLength, segmentDirection);
  }

  const radialConnector = endpoint === 'start'
    ? pointDelta(edgePoint, neighbor.start)
    : pointDelta(edgePoint, neighbor.end);
  const radialConnectorLength = vectorLength(radialConnector);
  if (neighbor.type === 'line' && horizontalSpan(neighbor) <= EDGE_FEATURE_EPSILON && radialConnectorLength > EDGE_FEATURE_EPSILON) {
    return connectorContext(edgePoint, normalizeVector(radialConnector), radialConnectorLength, segmentDirection);
  }

  if (neighbor.type !== 'line') {
    return invalidContext(edgePoint, segmentDirection, 'unsupported-neighbor');
  }

  const neighborDirection = radialConnector;
  if (vectorLength(neighborDirection) <= EDGE_FEATURE_EPSILON) {
    return invalidContext(edgePoint, segmentDirection, 'corner-angle');
  }

  const normalizedNeighborDirection = normalizeVector(neighborDirection);
  const angle = angleBetween(normalizedNeighborDirection, segmentDirection);
  if (angle <= EDGE_FEATURE_EPSILON || Math.PI - angle <= EDGE_FEATURE_EPSILON) {
    return invalidContext(edgePoint, segmentDirection, 'corner-angle');
  }

  return {
    kind: 'continuous',
    edgePoint,
    direction: normalizedNeighborDirection,
    segmentDirection,
    trimLimit: vectorLength(neighborDirection),
    angle,
    neighborIndex,
    neighborEndpoint: endpoint === 'start' ? 'end' : 'start',
    neighborSegment: neighbor,
  };
}

export function getEndpointFeatureSizeLimit(
  segment: EdgeFeatureSegment,
  context: EndpointFeatureContext,
  featureKind: EdgeFeatureKind,
): number {
  if (context.kind === 'invalid') return 0;

  const ownHorizontalComponent = getSegmentHorizontalComponent(segment);
  if (context.kind === 'connector') {
    return featureKind === 'chamfer'
      ? context.trimLimit
      : context.trimLimit * ownHorizontalComponent;
  }

  if (featureKind === 'chamfer') return horizontalSpan(context.neighborSegment);

  const neighborHorizontalComponent = getSegmentHorizontalComponent(context.neighborSegment);
  if (ownHorizontalComponent <= EDGE_FEATURE_EPSILON || neighborHorizontalComponent <= EDGE_FEATURE_EPSILON) return 0;
  return horizontalSpan(context.neighborSegment) * ownHorizontalComponent / neighborHorizontalComponent;
}

export function getEndpointFeatureConnectorTrimDistance(
  segment: EdgeFeatureSegment,
  context: EndpointFeatureContext,
  feature: EdgeFeature,
): number {
  if (context.kind !== 'connector') return 0;
  if (feature.kind === 'chamfer') return feature.size;
  const ownHorizontalComponent = getSegmentHorizontalComponent(segment);
  return ownHorizontalComponent > EDGE_FEATURE_EPSILON ? feature.size / ownHorizontalComponent : 0;
}

export function getEndpointFeatureNeighborTrimDistance(
  segment: EdgeFeatureSegment,
  context: EndpointFeatureContext,
  feature: EdgeFeature,
): number {
  if (context.kind !== 'continuous') return 0;
  if (feature.kind === 'chamfer') return feature.size;
  const ownHorizontalComponent = getSegmentHorizontalComponent(segment);
  const neighborHorizontalComponent = getSegmentHorizontalComponent(context.neighborSegment);
  return ownHorizontalComponent > EDGE_FEATURE_EPSILON
    ? feature.size / ownHorizontalComponent * neighborHorizontalComponent
    : 0;
}

export function getEndpointFeatureSegmentPoint(
  segment: EdgeFeatureSegment,
  endpoint: SegmentFeatureEndpoint,
  feature: EdgeFeature,
): EdgeFeaturePoint {
  return pointAtHorizontalTrim(segment, endpoint, feature.size);
}

export function getEndpointFeatureNeighborPoint(
  segment: EdgeFeatureSegment,
  context: EndpointFeatureContext,
  feature: EdgeFeature,
): EdgeFeaturePoint | null {
  if (context.kind === 'invalid') return null;
  if (context.kind === 'continuous' && feature.kind === 'chamfer') {
    return pointAtHorizontalTrim(context.neighborSegment, context.neighborEndpoint, feature.size);
  }

  const tangentDistance = getEndpointFeatureTangentDistance(segment, feature);
  const distance = feature.kind === 'chamfer' ? feature.size : tangentDistance;
  return addVector(context.edgePoint, scaleVector(context.direction, distance));
}

export function getEndpointFilletGeometry(
  segment: EdgeFeatureSegment,
  context: EndpointFeatureContext,
  endpoint: SegmentFeatureEndpoint,
  feature: EdgeFeature,
): {center: EdgeFeaturePoint, radius: number, neighborPoint: EdgeFeaturePoint, segmentPoint: EdgeFeaturePoint} | null {
  if (feature.kind !== 'fillet' || context.kind === 'invalid') return null;
  const tangentDistance = getEndpointFeatureTangentDistance(segment, feature);
  if (tangentDistance <= EDGE_FEATURE_EPSILON) return null;
  const radius = tangentDistance * Math.tan(context.angle / 2);
  const neighborPoint = getEndpointFeatureNeighborPoint(segment, context, feature);
  if (!neighborPoint) return null;
  const segmentPoint = getEndpointFeatureSegmentPoint(segment, endpoint, feature);
  const bisector = normalizeVector(addVectors(context.direction, context.segmentDirection));
  return {
    center: addVector(context.edgePoint, scaleVector(bisector, radius / Math.sin(context.angle / 2))),
    radius,
    neighborPoint,
    segmentPoint,
  };
}

export function getEndpointFeatureTangentDistance(segment: EdgeFeatureSegment, feature: EdgeFeature): number {
  const horizontalComponent = getSegmentHorizontalComponent(segment);
  if (horizontalComponent <= EDGE_FEATURE_EPSILON) return Number.POSITIVE_INFINITY;
  return feature.size / horizontalComponent;
}

export function fitEdgeFeaturesForSegments(
  segments: readonly EdgeFeatureSegment[],
  featurePairs: readonly EdgeFeaturePair[],
  closureRadius: number,
): EdgeFeaturePair[] {
  const fitted = segments.map((segment, index) => fitSegmentFeatures(segments, index, segment, featurePairs[index] ?? createEmptyEdgeFeaturePair(), closureRadius));
  fitConnectorFeaturePairs(segments, fitted, closureRadius);
  fitRadialConnectorSegmentFeaturePairs(segments, fitted, closureRadius);
  fitContinuousCornerFeatureOwnership(segments, fitted, closureRadius);
  fitLineSegmentFeatureTrimBudgets(segments, fitted, closureRadius);
  return fitted;
}

export function fitFeaturePairToLimit(
  features: EdgeFeaturePair,
  limit: number,
  measure: (feature: EdgeFeature, endpoint: SegmentFeatureEndpoint) => number,
): boolean {
  const startAmount = features.start ? measure(features.start, 'start') : 0;
  const endAmount = features.end ? measure(features.end, 'end') : 0;
  const total = startAmount + endAmount;
  if (total <= limit + EDGE_FEATURE_EPSILON || total <= EDGE_FEATURE_EPSILON) return false;
  const scale = limit > EDGE_FEATURE_EPSILON ? limit / total : 0;
  features.start = scaleEdgeFeature(features.start, scale);
  features.end = scaleEdgeFeature(features.end, scale);
  return true;
}

export function scaleEdgeFeature(feature: EdgeFeature | null, scale: number): EdgeFeature | null {
  if (!feature) return null;
  const size = feature.size * scale;
  return size > EDGE_FEATURE_EPSILON ? {...feature, size} : null;
}

export function isContinuousLineCorner(
  segments: readonly EdgeFeatureSegment[],
  index: number,
  endpoint: SegmentFeatureEndpoint,
): boolean {
  return getEndpointFeatureContext(segments, index, endpoint, 0).kind === 'continuous';
}

export function getSegmentHorizontalComponent(segment: EdgeFeatureSegment): number {
  const length = distance(segment.start, segment.end);
  return length > EDGE_FEATURE_EPSILON ? Math.abs(segment.end.z - segment.start.z) / length : 0;
}

export function getEndpointDirection(segment: EdgeFeatureSegment, endpoint: SegmentFeatureEndpoint): Vector {
  const vector = pointDelta(segment.start, segment.end);
  return endpoint === 'start' ? normalizeVector(vector) : scaleVector(normalizeVector(vector), -1);
}

export function horizontalSpan(segment: EdgeFeatureSegment): number {
  return Math.abs(segment.end.z - segment.start.z);
}

function fitSegmentFeatures(
  segments: readonly EdgeFeatureSegment[],
  index: number,
  segment: EdgeFeatureSegment,
  features: EdgeFeaturePair,
  closureRadius: number,
): EdgeFeaturePair {
  if (segment.type !== 'line' || horizontalSpan(segment) <= EDGE_FEATURE_EPSILON) {
    return createEmptyEdgeFeaturePair();
  }

  const fitted: EdgeFeaturePair = {
    start: fitEndpointFeature(segments, index, 'start', features.start, closureRadius),
    end: fitEndpointFeature(segments, index, 'end', features.end, closureRadius),
  };
  fitFeaturePairToLimit(fitted, horizontalSpan(segment), feature => feature.size);
  return fitted;
}

function fitEndpointFeature(
  segments: readonly EdgeFeatureSegment[],
  index: number,
  endpoint: SegmentFeatureEndpoint,
  feature: EdgeFeature | null,
  closureRadius: number,
): EdgeFeature | null {
  if (!feature || feature.size <= EDGE_FEATURE_EPSILON || !Number.isFinite(feature.size)) return null;
  const segment = segments[index];
  const context = getEndpointFeatureContext(segments, index, endpoint, closureRadius);
  const limit = getEndpointFeatureSizeLimit(segment, context, feature.kind);
  const size = Math.min(feature.size, horizontalSpan(segment), limit);
  return size > EDGE_FEATURE_EPSILON ? {...feature, size} : null;
}

function fitConnectorFeaturePairs(
  segments: readonly EdgeFeatureSegment[],
  fitted: EdgeFeaturePair[],
  closureRadius: number,
): void {
  for (let index = 0; index < segments.length - 1; index++) {
    const leftContext = getEndpointFeatureContext(segments, index, 'end', closureRadius);
    const rightContext = getEndpointFeatureContext(segments, index + 1, 'start', closureRadius);
    if (leftContext.kind !== 'connector' || rightContext.kind !== 'connector') continue;

    const features: EdgeFeaturePair = {
      start: fitted[index].end,
      end: fitted[index + 1].start,
    };
    const changed = fitFeaturePairToLimit(features, leftContext.trimLimit, (feature, endpoint) => {
      const segmentIndex = endpoint === 'start' ? index : index + 1;
      const context = endpoint === 'start' ? leftContext : rightContext;
      return getEndpointFeatureConnectorTrimDistance(segments[segmentIndex], context, feature);
    });
    if (!changed) continue;
    fitted[index].end = features.start;
    fitted[index + 1].start = features.end;
  }
}

function fitRadialConnectorSegmentFeaturePairs(
  segments: readonly EdgeFeatureSegment[],
  fitted: EdgeFeaturePair[],
  closureRadius: number,
): void {
  for (let index = 1; index < segments.length - 1; index++) {
    const connector = segments[index];
    if (connector.type !== 'line' || horizontalSpan(connector) > EDGE_FEATURE_EPSILON) continue;
    const trimLimit = distance(connector.start, connector.end);
    if (trimLimit <= EDGE_FEATURE_EPSILON) continue;

    const previousIndex = index - 1;
    const nextIndex = index + 1;
    const leftContext = getEndpointFeatureContext(segments, previousIndex, 'end', closureRadius);
    const rightContext = getEndpointFeatureContext(segments, nextIndex, 'start', closureRadius);
    if (leftContext.kind !== 'connector' || rightContext.kind !== 'connector') continue;

    const features: EdgeFeaturePair = {
      start: fitted[previousIndex].end,
      end: fitted[nextIndex].start,
    };
    const changed = fitFeaturePairToLimit(features, trimLimit, (feature, endpoint) => {
      const segmentIndex = endpoint === 'start' ? previousIndex : nextIndex;
      const context = endpoint === 'start' ? leftContext : rightContext;
      return getEndpointFeatureConnectorTrimDistance(segments[segmentIndex], context, feature);
    });
    if (!changed) continue;
    fitted[previousIndex].end = features.start;
    fitted[nextIndex].start = features.end;
  }
}

function fitContinuousCornerFeatureOwnership(
  segments: readonly EdgeFeatureSegment[],
  fitted: EdgeFeaturePair[],
  closureRadius: number,
): void {
  for (let index = 0; index < segments.length - 1; index++) {
    const leftContext = getEndpointFeatureContext(segments, index, 'end', closureRadius);
    const rightContext = getEndpointFeatureContext(segments, index + 1, 'start', closureRadius);
    if (leftContext.kind !== 'continuous' || rightContext.kind !== 'continuous') continue;
    if (fitted[index].end && fitted[index + 1].start) fitted[index + 1].start = null;
  }
}

function fitLineSegmentFeatureTrimBudgets(
  segments: readonly EdgeFeatureSegment[],
  fitted: EdgeFeaturePair[],
  closureRadius: number,
): void {
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (segment.type !== 'line' || horizontalSpan(segment) <= EDGE_FEATURE_EPSILON) continue;

    const trims: {index: number, endpoint: SegmentFeatureEndpoint, amount: number}[] = [];
    const startFeature = fitted[index].start;
    const endFeature = fitted[index].end;
    if (startFeature) trims.push({index, endpoint: 'start', amount: startFeature.size});
    if (endFeature) trims.push({index, endpoint: 'end', amount: endFeature.size});

    const previousFeature = fitted[index - 1]?.end ?? null;
    if (previousFeature) {
      const previousContext = getEndpointFeatureContext(segments, index - 1, 'end', closureRadius);
      if (previousContext.kind === 'continuous' && previousContext.neighborIndex === index) {
        trims.push({index: index - 1, endpoint: 'end', amount: getEndpointFeatureNeighborTrimDistance(segments[index - 1], previousContext, previousFeature)});
      }
    }

    const nextFeature = fitted[index + 1]?.start ?? null;
    if (nextFeature) {
      const nextContext = getEndpointFeatureContext(segments, index + 1, 'start', closureRadius);
      if (nextContext.kind === 'continuous' && nextContext.neighborIndex === index) {
        trims.push({index: index + 1, endpoint: 'start', amount: getEndpointFeatureNeighborTrimDistance(segments[index + 1], nextContext, nextFeature)});
      }
    }

    const total = trims.reduce((sum, trim) => sum + trim.amount, 0);
    const limit = horizontalSpan(segment);
    if (total <= limit + EDGE_FEATURE_EPSILON || total <= EDGE_FEATURE_EPSILON) continue;
    const scale = limit / total;
    for (const trim of trims) {
      fitted[trim.index][trim.endpoint] = scaleEdgeFeature(fitted[trim.index][trim.endpoint], scale);
    }
  }
}

function connectorContext(
  edgePoint: EdgeFeaturePoint,
  direction: Vector,
  trimLimit: number,
  segmentDirection: Vector,
): EndpointFeatureContext {
  const angle = angleBetween(direction, segmentDirection);
  if (angle <= EDGE_FEATURE_EPSILON || Math.PI - angle <= EDGE_FEATURE_EPSILON) {
    return invalidContext(edgePoint, segmentDirection, 'corner-angle');
  }
  return {
    kind: 'connector',
    edgePoint,
    direction,
    segmentDirection,
    trimLimit,
    angle,
  };
}

function invalidContext(
  edgePoint: EdgeFeaturePoint,
  segmentDirection: Vector,
  reason: Extract<EndpointFeatureContext, {kind: 'invalid'}>['reason'],
): EndpointFeatureContext {
  return {kind: 'invalid', reason, edgePoint, segmentDirection};
}

function pointAtHorizontalTrim(segment: EdgeFeatureSegment, endpoint: SegmentFeatureEndpoint, trimDistance: number): EdgeFeaturePoint {
  const span = horizontalSpan(segment);
  const ratio = span > EDGE_FEATURE_EPSILON ? trimDistance / span : 0;
  const vector = pointDelta(segment.start, segment.end);
  return endpoint === 'start'
    ? {radius: segment.start.radius + vector.radius * ratio, z: segment.start.z + vector.z * ratio}
    : {radius: segment.end.radius - vector.radius * ratio, z: segment.end.z - vector.z * ratio};
}

function endpointPoint(segment: EdgeFeatureSegment, endpoint: SegmentFeatureEndpoint): EdgeFeaturePoint {
  return endpoint === 'start' ? segment.start : segment.end;
}

function addVector(point: EdgeFeaturePoint, vector: Vector): EdgeFeaturePoint {
  return {radius: point.radius + vector.radius, z: point.z + vector.z};
}

function addVectors(a: Vector, b: Vector): Vector {
  return {radius: a.radius + b.radius, z: a.z + b.z};
}

function scaleVector(vector: Vector, scale: number): Vector {
  return {radius: vector.radius * scale, z: vector.z * scale};
}

function pointDelta(a: EdgeFeaturePoint, b: EdgeFeaturePoint): Vector {
  return {radius: b.radius - a.radius, z: b.z - a.z};
}

function normalizeVector(vector: Vector): Vector {
  const length = vectorLength(vector);
  if (length <= EDGE_FEATURE_EPSILON) return {radius: 0, z: 0};
  return {radius: vector.radius / length, z: vector.z / length};
}

function vectorLength(vector: Vector): number {
  return Math.hypot(vector.radius, vector.z);
}

function distance(a: EdgeFeaturePoint, b: EdgeFeaturePoint): number {
  return vectorLength(pointDelta(a, b));
}

function angleBetween(a: Vector, b: Vector): number {
  const aLength = vectorLength(a);
  const bLength = vectorLength(b);
  if (aLength <= EDGE_FEATURE_EPSILON || bLength <= EDGE_FEATURE_EPSILON) return 0;
  return Math.acos(clamp((a.radius * b.radius + a.z * b.z) / (aLength * bLength), -1, 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
