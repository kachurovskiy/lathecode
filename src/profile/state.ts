import { LatheCode, Segment, type ProfileSegmentDefinition } from '../common/lathecode.ts';
import { getProfileEndpointFeatureContext, getProfileEndpointFeatureSizeLimit } from './edgefeatures.ts';
import { DEFAULT_DIAMETER_MM, DEFAULT_GRID_MM, DEFAULT_LENGTH_MM, DEFAULT_SNAP_MM, GEOMETRY_EPSILON, HISTORY_LIMIT, IMPORT_EPSILON, MIN_SEGMENT_LENGTH_MM, PROFILE_SIDES, type DrawingHistory, type DrawingState, type ProfileDraft, type ProfilePoint, type ProfileSide, type SegmentEdgeFeature, type SegmentEdgeFeatures, type SegmentFeatureEndpoint, type SegmentSelection, type SegmentTool, type PointSelection, } from './types.ts';
import { getDefaultGridMm, hasSegmentLength } from './geometry.ts';
export function createInitialState(initialText?: string | null): DrawingState {
  const importedState = initialText?.trim() ? tryCreateStateFromLatheCodeForDrawing(initialText) : null;
  return importedState ?? createDefaultState();
}
export function tryCreateStateFromLatheCodeForDrawing(text: string): DrawingState | null {
  const state = tryCreateStateFromLatheCode(text);
  if (!state)
    return null;
  reverseDrawingStateForEditor(state);
  clampAllPoints(state);
  selectDefaultPoint(state, state.activeSide);
  return state;
}
export function createDefaultState(): DrawingState {
  return {
    diameterMm: DEFAULT_DIAMETER_MM,
    lengthMm: DEFAULT_LENGTH_MM,
    snapMm: DEFAULT_SNAP_MM,
    gridMm: DEFAULT_GRID_MM,
    profiles: {
      outside: createProfileDraft(DEFAULT_DIAMETER_MM / 2, true, DEFAULT_LENGTH_MM),
      inside: createProfileDraft(0, false, DEFAULT_LENGTH_MM),
    },
    activeSide: 'outside',
    activeTool: 'line',
    selection: { side: 'outside', index: 1 },
    segmentSelection: null,
  };
}
export function resetDrawingState(state: DrawingState): void {
  const next = createDefaultState();
  state.diameterMm = next.diameterMm;
  state.lengthMm = next.lengthMm;
  state.snapMm = next.snapMm;
  state.gridMm = next.gridMm;
  state.profiles = next.profiles;
  state.activeSide = next.activeSide;
  state.activeTool = next.activeTool;
  state.selection = next.selection;
  state.segmentSelection = next.segmentSelection;
}
export function cloneDrawingState(state: DrawingState): DrawingState {
  return {
    diameterMm: state.diameterMm,
    lengthMm: state.lengthMm,
    snapMm: state.snapMm,
    gridMm: state.gridMm,
    profiles: {
      outside: cloneProfileDraft(state.profiles.outside),
      inside: cloneProfileDraft(state.profiles.inside),
    },
    activeSide: state.activeSide,
    activeTool: state.activeTool,
    selection: state.selection ? { ...state.selection } : null,
    segmentSelection: state.segmentSelection ? { ...state.segmentSelection } : null,
  };
}
export function cloneProfileDraft(profile: ProfileDraft): ProfileDraft {
  return {
    enabled: profile.enabled,
    points: profile.points.map(point => ({ ...point })),
    segmentTools: profile.segmentTools.concat(),
    segmentFeatures: profile.segmentFeatures.map(cloneSegmentEdgeFeatures),
  };
}
export function cloneSegmentEdgeFeatures(features: SegmentEdgeFeatures): SegmentEdgeFeatures {
  return {
    start: features.start ? { ...features.start } : null,
    end: features.end ? { ...features.end } : null,
  };
}
export function reverseDrawingStateForEditor(state: DrawingState): void {
  for (const side of PROFILE_SIDES)
    reverseProfileDraftZ(state.profiles[side], state.lengthMm);
  state.selection = null;
  state.segmentSelection = null;
}
export function reverseProfileDraftZ(profile: ProfileDraft, lengthMm: number): void {
  const segmentTools = profile.segmentTools.slice().reverse();
  const segmentFeatures = profile.segmentFeatures.slice().reverse().map(reverseSegmentEdgeFeatures);
  profile.points = removeConsecutiveProfileDuplicates(profile.points
    .map(point => ({ z: lengthMm - point.z, radius: point.radius }))
    .reverse());
  profile.segmentTools = segmentTools;
  profile.segmentFeatures = segmentFeatures;
  alignSegmentToolsWithPoints(profile);
  normalizeProfileSplineControlZ(profile);
}
export function reverseSegmentEdgeFeatures(features: SegmentEdgeFeatures): SegmentEdgeFeatures {
  return {
    start: features.end ? { ...features.end } : null,
    end: features.start ? { ...features.start } : null,
  };
}
export function restoreDrawingState(target: DrawingState, source: DrawingState): void {
  const next = cloneDrawingState(source);
  target.diameterMm = next.diameterMm;
  target.lengthMm = next.lengthMm;
  target.snapMm = next.snapMm;
  target.gridMm = next.gridMm;
  target.profiles = next.profiles;
  target.activeSide = next.activeSide;
  target.activeTool = next.activeTool;
  target.selection = next.selection;
  target.segmentSelection = next.segmentSelection;
}
export function recordUndoStateIfChanged(history: DrawingHistory, before: DrawingState, after: DrawingState): void {
  if (drawingStateKey(before) !== drawingStateKey(after))
    recordUndoState(history, before);
}
export function recordUndoState(history: DrawingHistory, before: DrawingState): void {
  const key = drawingStateKey(before);
  if (history.undoStack.length && drawingStateKey(history.undoStack.at(-1)!) === key)
    return;
  history.undoStack.push(cloneDrawingState(before));
  if (history.undoStack.length > HISTORY_LIMIT)
    history.undoStack.shift();
  history.redoStack = [];
}
export function undoDrawingState(state: DrawingState, history: DrawingHistory): boolean {
  const previous = history.undoStack.pop();
  if (!previous)
    return false;
  history.redoStack.push(cloneDrawingState(state));
  if (history.redoStack.length > HISTORY_LIMIT)
    history.redoStack.shift();
  restoreDrawingState(state, previous);
  return true;
}
export function redoDrawingState(state: DrawingState, history: DrawingHistory): boolean {
  const next = history.redoStack.pop();
  if (!next)
    return false;
  history.undoStack.push(cloneDrawingState(state));
  if (history.undoStack.length > HISTORY_LIMIT)
    history.undoStack.shift();
  restoreDrawingState(state, next);
  return true;
}
export function drawingStateKey(state: DrawingState): string {
  return JSON.stringify(state);
}
export function tryCreateStateFromLatheCode(text: string): DrawingState | null {
  try {
    const latheCode = new LatheCode(text);
    const stock = latheCode.getStock();
    if (!stock || stock.diameter <= 0 || stock.length <= 0)
      return null;
    const diameterMm = stock.diameter;
    const lengthMm = stock.length;
    const outsideSegments = latheCode.getOutsidePartProfileSegmentDefinitions();
    const insideSegments = latheCode.getInsidePartProfileSegmentDefinitions();
    const outsideDraft = createProfileDraftFromSegmentDefinitions(outsideSegments, lengthMm)
      ?? createProfileDraft(diameterMm / 2, true, lengthMm);
    const importedInsideDraft = createProfileDraftFromSegmentDefinitions(insideSegments, lengthMm);
    const insideDraft = importedInsideDraft
      ?? createProfileDraft(stock.innerDiameter / 2, stock.innerDiameter > 0, lengthMm);
    insideDraft.enabled = insideDraft.enabled || hasDrawableProfile(insideDraft);
    const activeSide: ProfileSide = outsideSegments.length ? 'outside' : insideDraft.enabled ? 'inside' : 'outside';
    const state: DrawingState = {
      diameterMm,
      lengthMm,
      snapMm: DEFAULT_SNAP_MM,
      gridMm: getDefaultGridMm(lengthMm, diameterMm),
      profiles: {
        outside: outsideDraft,
        inside: insideDraft,
      },
      activeSide,
      activeTool: 'line',
      selection: { side: activeSide, index: 1 },
      segmentSelection: null,
    };
    clampAllPoints(state);
    selectDefaultPoint(state, activeSide);
    return state;
  }
  catch {
    return null;
  }
}
export function createProfileDraftFromSegmentDefinitions(definitions: readonly ProfileSegmentDefinition[], lengthMm: number): ProfileDraft | null {
  if (!definitions.length)
    return null;
  const points: ProfilePoint[] = [];
  const segmentTools: SegmentTool[] = [];
  const segmentFeatures: SegmentEdgeFeatures[] = [];
  for (const definition of definitions) {
    const segment = definition.segment;
    const start = segmentPointToProfilePoint(segment.start);
    if (!points.length) {
      points.push(start);
    }
    else if (!sameProfilePoint(points.at(-1)!, start)) {
      points.push(start);
      segmentTools.push('line');
      segmentFeatures.push(createEmptySegmentFeatures());
    }
    if (segment.type === 'BSPLINE' && segment.controlPoints.length >= 2) {
      const splinePoints = getSplineDrawingPoints(segment);
      for (const point of splinePoints.slice(1)) {
        points.push(point);
        segmentTools.push('spline');
        segmentFeatures.push(createEmptySegmentFeatures());
      }
    }
    else {
      points.push(segmentPointToProfilePoint(segment.end));
      segmentTools.push(segmentTypeToDrawingTool(segment.type));
      segmentFeatures.push(segmentEdgeFeaturesFromDefinition(definition));
    }
  }
  const draft: ProfileDraft = {
    enabled: true,
    points: removeConsecutiveProfileDuplicates(points),
    segmentTools,
    segmentFeatures,
  };
  alignSegmentToolsWithPoints(draft);
  if (draft.points.length < 2)
    return null;
  draft.points[0].z = 0;
  draft.points.at(-1)!.z = Math.max(draft.points.at(-1)!.z, lengthMm);
  normalizeProfileSplineControlZ(draft);
  return draft;
}
export function segmentEdgeFeaturesFromDefinition(definition: ProfileSegmentDefinition): SegmentEdgeFeatures {
  return {
    start: segmentEdgeFeatureFromLatheFeature(definition.startFeature),
    end: segmentEdgeFeatureFromLatheFeature(definition.endFeature),
  };
}
export function segmentEdgeFeatureFromLatheFeature(feature: ProfileSegmentDefinition['startFeature']): SegmentEdgeFeature | null {
  if (!feature || feature.value <= GEOMETRY_EPSILON)
    return null;
  return {
    kind: feature.name === 'CH' ? 'chamfer' : 'fillet',
    size: feature.value,
  };
}
export function getSplineDrawingPoints(segment: Segment): ProfilePoint[] {
  const controls = segment.controlPoints.map(segmentPointToProfilePoint);
  if (!sameProfilePoint(controls[0], segmentPointToProfilePoint(segment.start))) {
    controls.unshift(segmentPointToProfilePoint(segment.start));
  }
  if (!sameProfilePoint(controls.at(-1)!, segmentPointToProfilePoint(segment.end))) {
    controls.push(segmentPointToProfilePoint(segment.end));
  }
  return controls;
}
export function segmentPointToProfilePoint(point: {
  x: number;
  z: number;
}): ProfilePoint {
  return { z: point.z, radius: Math.max(0, point.x) };
}
export function segmentTypeToDrawingTool(type: string): SegmentTool {
  if (type === 'CONV')
    return 'convex';
  if (type === 'CONC')
    return 'concave';
  if (type === 'BSPLINE')
    return 'spline';
  return 'line';
}
export function removeConsecutiveProfileDuplicates(points: ProfilePoint[]): ProfilePoint[] {
  return points.filter((point, index) => index === 0 || !sameProfilePoint(point, points[index - 1]));
}
export function alignSegmentToolsWithPoints(profile: ProfileDraft): void {
  const needed = Math.max(0, profile.points.length - 1);
  profile.segmentTools = profile.segmentTools.slice(0, needed);
  profile.segmentFeatures = profile.segmentFeatures.slice(0, needed);
  while (profile.segmentTools.length < needed)
    profile.segmentTools.push(profile.segmentTools.at(-1) ?? 'line');
  while (profile.segmentFeatures.length < needed)
    profile.segmentFeatures.push(createEmptySegmentFeatures());
}
export function normalizeProfileSplineControlZ(profile: ProfileDraft): void {
  for (let index = 0;
    index < profile.segmentTools.length;
  ) {
    if (profile.segmentTools[index] !== 'spline') {
      index++;
      continue;
    }
    const startIndex = index;
    let endIndex = index + 1;
    while (endIndex < profile.segmentTools.length && profile.segmentTools[endIndex] === 'spline')
      endIndex++;
    normalizeSplineRangeControlZ(profile, startIndex, endIndex);
    index = endIndex;
  }
}
export function normalizeSplineRangeControlZ(profile: ProfileDraft, startIndex: number, endIndex: number): void {
  const start = profile.points[startIndex];
  const end = profile.points[endIndex];
  const segmentCount = endIndex - startIndex;
  if (!start || !end || segmentCount < 2)
    return;
  const span = end.z - start.z;
  for (let index = startIndex + 1;
    index < endIndex;
    index++) {
    profile.points[index].z = start.z + span * (index - startIndex) / segmentCount;
  }
}
export function getSplinePointRange(profile: ProfileDraft, pointIndex: number): {
  startIndex: number;
  endIndex: number;
} | null {
  if (pointIndex < 0 || pointIndex >= profile.points.length)
    return null;
  if (profile.segmentTools[pointIndex] !== 'spline' && profile.segmentTools[pointIndex - 1] !== 'spline')
    return null;
  let startIndex = pointIndex;
  while (startIndex > 0 && profile.segmentTools[startIndex - 1] === 'spline')
    startIndex--;
  let endIndex = pointIndex;
  while (endIndex < profile.segmentTools.length && profile.segmentTools[endIndex] === 'spline')
    endIndex++;
  return endIndex > startIndex ? { startIndex, endIndex } : null;
}
export function isInternalSplineControlPoint(profile: ProfileDraft, pointIndex: number): boolean {
  const range = getSplinePointRange(profile, pointIndex);
  return !!range && pointIndex > range.startIndex && pointIndex < range.endIndex;
}
export function sameProfilePoint(a: ProfilePoint, b: ProfilePoint): boolean {
  return Math.abs(a.z - b.z) <= IMPORT_EPSILON && Math.abs(a.radius - b.radius) <= IMPORT_EPSILON;
}
export function createProfileDraft(radius: number, enabled: boolean, lengthMm: number): ProfileDraft {
  return {
    enabled,
    points: [
      { z: 0, radius },
      { z: lengthMm, radius },
    ],
    segmentTools: ['line'],
    segmentFeatures: [createEmptySegmentFeatures()],
  };
}
export function createEmptySegmentFeatures(): SegmentEdgeFeatures {
  return { start: null, end: null };
}
export function insertPoint(state: DrawingState, side: ProfileSide, point: ProfilePoint, tool: SegmentTool): void {
  const profile = state.profiles[side];
  const sourcePoint = clampProfilePoint(state, point);
  const clamped = snapProfilePoint(state, sourcePoint);
  let insertIndex = profile.points.findIndex(existing => existing.z > clamped.z);
  if (insertIndex <= 0)
    insertIndex = 1;
  if (insertIndex >= profile.points.length)
    insertIndex = profile.points.length - 1;
  const previous = profile.points[insertIndex - 1];
  const next = profile.points[insertIndex];
  snapPointToNeighborPositions(state, clamped, [previous, next], sourcePoint);
  clamped.z = clampZBetweenNeighbors(clamped.z, previous, next);
  clampPointInPlace(state, clamped);
  profile.points.splice(insertIndex, 0, clamped);
  profile.segmentTools.splice(insertIndex - 1, 1, tool, tool);
  profile.segmentFeatures.splice(insertIndex - 1, 1, createEmptySegmentFeatures(), createEmptySegmentFeatures());
  normalizeProfileSplineControlZ(profile);
  state.selection = { side, index: insertIndex };
  state.segmentSelection = null;
}
export function updatePointPosition(state: DrawingState, selection: Exclude<PointSelection, null>, point: ProfilePoint, snap: boolean): void {
  const profile = state.profiles[selection.side];
  const sourcePoint = clampProfilePoint(state, point);
  const clamped = snap ? snapProfilePoint(state, sourcePoint) : sourcePoint;
  const lockedZ = isInternalSplineControlPoint(profile, selection.index)
    ? profile.points[selection.index].z
    : null;
  const isFirstPoint = selection.index === 0;
  const isLastPoint = selection.index === profile.points.length - 1;
  const previous = selection.index > 0 ? profile.points[selection.index - 1] : null;
  const next = selection.index < profile.points.length - 1 ? profile.points[selection.index + 1] : null;
  if (snap)
    snapPointToNeighborPositions(state, clamped, [previous, next], sourcePoint);
  if (lockedZ !== null)
    clamped.z = lockedZ;
  if (isFirstPoint)
    clamped.z = 0;
  if (isLastPoint)
    clamped.z = state.lengthMm;
  clamped.z = clampZBetweenNeighbors(clamped.z, previous, next);
  clampPointInPlace(state, clamped);
  profile.points[selection.index] = clamped;
  normalizeProfileSplineControlZ(profile);
  state.selection = selection;
  state.segmentSelection = null;
}
export function removeSelectedPoint(state: DrawingState): boolean {
  if (!state.selection || !canRemoveSelectedPoint(state))
    return false;
  const { side, index } = state.selection;
  const profile = state.profiles[side];
  const mergedTool = profile.segmentTools[Math.max(0, index - 1)] ?? 'line';
  profile.points.splice(index, 1);
  profile.segmentTools.splice(index - 1, 2, mergedTool);
  profile.segmentFeatures.splice(index - 1, 2, createEmptySegmentFeatures());
  normalizeProfileSplineControlZ(profile);
  state.selection = { side, index: Math.min(index, profile.points.length - 1) };
  state.segmentSelection = null;
  return true;
}
export function canRemoveSelectedPoint(state: DrawingState): boolean {
  if (!state.selection)
    return false;
  const profile = state.profiles[state.selection.side];
  return state.selection.index > 0 && state.selection.index < profile.points.length - 1;
}
export function canAddPointNextToPoint(profile: ProfileDraft, index: number, direction: -1 | 1): boolean {
  const point = profile.points[index];
  const neighbor = profile.points[index + direction];
  return !!point && !!neighbor && hasSegmentLength(point, neighbor);
}
export function canSplitSegmentAtProfilePoint(profile: ProfileDraft, index: number, point: ProfilePoint): boolean {
  const start = profile.points[index];
  const end = profile.points[index + 1];
  if (!start || !end || !hasSegmentLength(start, end))
    return false;
  return point.z > Math.min(start.z, end.z) + MIN_SEGMENT_LENGTH_MM
    && point.z < Math.max(start.z, end.z) - MIN_SEGMENT_LENGTH_MM;
}
export function midpointProfilePoint(a: ProfilePoint, b: ProfilePoint): ProfilePoint {
  return {
    z: (a.z + b.z) / 2,
    radius: (a.radius + b.radius) / 2,
  };
}
export function getProfileSideLabel(side: ProfileSide): string {
  return side === 'outside' ? 'Outside' : 'Inside';
}
export function getSelectedPoint(state: DrawingState): ProfilePoint | null {
  if (!state.selection)
    return null;
  return state.profiles[state.selection.side].points[state.selection.index] ?? null;
}
export function getSelectedSegmentTool(state: DrawingState): SegmentTool | null {
  if (!state.segmentSelection)
    return null;
  return state.profiles[state.segmentSelection.side].segmentTools[state.segmentSelection.index] ?? null;
}
export function setSelectedSegmentTool(state: DrawingState, tool: SegmentTool): boolean {
  const selection = state.segmentSelection;
  if (!selection)
    return false;
  const profile = state.profiles[selection.side];
  if (!profile.segmentTools[selection.index])
    return false;
  const range = getSelectedSegmentToolRange(profile, selection.index);
  let changed = false;
  for (let index = range.startIndex;
    index < range.endIndex;
    index++) {
    if (profile.segmentTools[index] === tool)
      continue;
    profile.segmentTools[index] = tool;
    if (tool !== 'line')
      profile.segmentFeatures[index] = createEmptySegmentFeatures();
    changed = true;
  }
  if (changed)
    normalizeProfileSplineControlZ(profile);
  return changed;
}
export function getSelectedSegmentFeature(state: DrawingState, endpoint: SegmentFeatureEndpoint): SegmentEdgeFeature | null {
  const selection = state.segmentSelection;
  if (!selection)
    return null;
  return state.profiles[selection.side].segmentFeatures[selection.index]?.[endpoint] ?? null;
}
export function getSelectedSegmentFeatureSize(state: DrawingState, endpoint: SegmentFeatureEndpoint): number | null {
  return getSelectedSegmentFeature(state, endpoint)?.size ?? null;
}
export function setSelectedSegmentFeature(state: DrawingState, endpoint: SegmentFeatureEndpoint, feature: SegmentEdgeFeature | null): boolean {
  const selection = state.segmentSelection;
  if (!selection)
    return false;
  if (!canSelectedSegmentEndpointHaveFeature(state, endpoint) && feature)
    return false;
  const profile = state.profiles[selection.side];
  const currentFeatures = profile.segmentFeatures[selection.index] ?? createEmptySegmentFeatures();
  const nextFeatures = cloneSegmentEdgeFeatures(currentFeatures);
  nextFeatures[endpoint] = feature ? { ...feature, size: Math.max(0, feature.size) } : null;
  if (JSON.stringify(currentFeatures) === JSON.stringify(nextFeatures))
    return false;
  profile.segmentFeatures[selection.index] = nextFeatures;
  return true;
}
export function canSelectedSegmentEndpointHaveFeature(state: DrawingState, endpoint: SegmentFeatureEndpoint): boolean {
  const selection = state.segmentSelection;
  if (!selection)
    return false;
  const profile = state.profiles[selection.side];
  if (profile.segmentTools[selection.index] !== 'line')
    return false;
  const start = profile.points[selection.index];
  const end = profile.points[selection.index + 1];
  if (!start || !end || !hasSegmentLength(start, end))
    return false;
  return getSelectedSegmentEndpointFeatureLimit(state, selection, endpoint) > GEOMETRY_EPSILON;
}
export function getSelectedSegmentEndpointFeatureLimit(state: DrawingState, selection: Exclude<SegmentSelection, null>, endpoint: SegmentFeatureEndpoint): number {
  const context = getSelectedSegmentEndpointFeatureContext(state, selection, endpoint);
  if (context.kind === 'invalid')
    return 0;
  if (context.kind === 'connector' && Math.abs(context.direction.z) > GEOMETRY_EPSILON)
    return 0;
  return getProfileEndpointFeatureSizeLimit(
    state.profiles[selection.side],
    selection.index,
    endpoint,
    'chamfer',
    getProfileClosureRadius(state, selection.side),
  );
}
export function getSelectedSegmentEndpointRadialGap(state: DrawingState, selection: Exclude<SegmentSelection, null>, endpoint: SegmentFeatureEndpoint): number {
  const context = getSelectedSegmentEndpointFeatureContext(state, selection, endpoint);
  return context.kind === 'connector' && Math.abs(context.direction.z) <= GEOMETRY_EPSILON
    ? context.trimLimit
    : 0;
}
export function getSelectedSegmentEndpointContinuousCornerLimit(state: DrawingState, selection: Exclude<SegmentSelection, null>, endpoint: SegmentFeatureEndpoint): number {
  const context = getSelectedSegmentEndpointFeatureContext(state, selection, endpoint);
  return context.kind === 'continuous'
    ? getProfileEndpointFeatureSizeLimit(
      state.profiles[selection.side],
      selection.index,
      endpoint,
      'chamfer',
      getProfileClosureRadius(state, selection.side),
    )
    : 0;
}
export function getDefaultSegmentFeatureSize(state: DrawingState, endpoint: SegmentFeatureEndpoint): number {
  const selection = state.segmentSelection;
  if (!selection)
    return 1;
  const profile = state.profiles[selection.side];
  const start = profile.points[selection.index];
  const end = profile.points[selection.index + 1];
  if (!start || !end)
    return 1;
  const segmentLength = Math.abs(end.z - start.z);
  const edgeLimit = getSelectedSegmentEndpointFeatureLimit(state, selection, endpoint);
  const preferred = state.snapMm > 0 ? state.snapMm : 1;
  const limit = Math.min(segmentLength / 4, edgeLimit / 2);
  if (!Number.isFinite(limit) || limit <= GEOMETRY_EPSILON)
    return preferred;
  return Math.max(0.001, Math.min(preferred, limit));
}
export function getSelectedSegmentToolRange(profile: ProfileDraft, index: number): {
  startIndex: number;
  endIndex: number;
} {
  if (profile.segmentTools[index] !== 'spline')
    return { startIndex: index, endIndex: index + 1 };
  let startIndex = index;
  while (startIndex > 0 && profile.segmentTools[startIndex - 1] === 'spline')
    startIndex--;
  let endIndex = index + 1;
  while (endIndex < profile.segmentTools.length && profile.segmentTools[endIndex] === 'spline')
    endIndex++;
  return { startIndex, endIndex };
}

function getSelectedSegmentEndpointFeatureContext(state: DrawingState, selection: Exclude<SegmentSelection, null>, endpoint: SegmentFeatureEndpoint) {
  return getProfileEndpointFeatureContext(
    state.profiles[selection.side],
    selection.index,
    endpoint,
    getProfileClosureRadius(state, selection.side),
  );
}

function getProfileClosureRadius(state: DrawingState, side: ProfileSide): number {
  return side === 'inside' ? state.diameterMm / 2 : 0;
}

export function selectDefaultPoint(state: DrawingState, side: ProfileSide): void {
  const profile = state.profiles[side];
  if (state.selection?.side === side && profile.points[state.selection.index])
    return;
  state.selection = { side, index: profile.points.length - 1 };
  state.segmentSelection = null;
}
export function ensureProfileEnabled(state: DrawingState, side: ProfileSide): void {
  state.profiles[side].enabled = true;
}
export function isProfileVisible(state: DrawingState, side: ProfileSide): boolean {
  return side === 'outside' || state.profiles[side].enabled || state.activeSide === side;
}
export function hasDrawableProfile(profile: ProfileDraft): boolean {
  return profile.points.some(point => point.radius > MIN_SEGMENT_LENGTH_MM)
    && profile.points.at(-1)!.z - profile.points[0].z > MIN_SEGMENT_LENGTH_MM;
}
export function clampAllPoints(state: DrawingState): void {
  for (const profile of Object.values(state.profiles)) {
    profile.points = profile.points.map(point => clampProfilePoint(state, point));
    profile.points[0].z = 0;
    profile.points.at(-1)!.z = state.lengthMm;
    for (let index = 1;
      index < profile.points.length - 1;
      index++) {
      profile.points[index].z = clampZBetweenNeighbors(profile.points[index].z, profile.points[index - 1], profile.points[index + 1]);
    }
    normalizeProfileSplineControlZ(profile);
  }
}
export function clampProfilePoint(state: DrawingState, point: ProfilePoint): ProfilePoint {
  return {
    z: Math.max(0, Math.min(state.lengthMm, point.z)),
    radius: Math.max(0, Math.min(state.diameterMm / 2, point.radius)),
  };
}
export function clampPointInPlace(state: DrawingState, point: ProfilePoint): void {
  const clamped = clampProfilePoint(state, point);
  point.z = clamped.z;
  point.radius = clamped.radius;
}
export function snapProfilePoint(state: DrawingState, point: ProfilePoint): ProfilePoint {
  const clamped = clampProfilePoint(state, point);
  if (state.snapMm <= 0)
    return clamped;
  return clampProfilePoint(state, {
    z: snapNumber(clamped.z, state.snapMm),
    radius: snapNumber(clamped.radius * 2, state.snapMm) / 2,
  });
}
export function snapPointToNeighborPositions(state: DrawingState, point: ProfilePoint, neighbors: readonly (ProfilePoint | null)[], sourcePoint: ProfilePoint = point): void {
  if (state.snapMm <= 0)
    return;
  point.z = snapToNearestAnchoredGrid(sourcePoint.z, neighbors.map(neighbor => neighbor?.z), state.snapMm)
    ?? point.z;
  point.radius = snapToNearestAnchoredGrid(sourcePoint.radius, neighbors.map(neighbor => neighbor?.radius), state.snapMm)
    ?? point.radius;
}
export function snapToNearestAnchoredGrid(value: number, anchors: readonly (number | undefined)[], increment: number): number | null {
  let bestValue: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const anchor of anchors) {
    if (anchor === undefined)
      continue;
    const candidate = anchor + snapNumber(value - anchor, increment);
    const distance = Math.abs(candidate - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestValue = candidate;
    }
  }
  return bestValue;
}
export function clampZBetweenNeighbors(z: number, previous: ProfilePoint | null, next: ProfilePoint | null): number {
  const minZ = previous ? previous.z : 0;
  const maxZ = next ? next.z : Number.POSITIVE_INFINITY;
  return Math.max(minZ, Math.min(maxZ, z));
}
export function snapNumber(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}
export function resizeDrawing(state: DrawingState, nextDiameterMm: number, nextLengthMm: number): void {
  if (nextDiameterMm !== state.diameterMm) {
    scaleRadii(state, nextDiameterMm / state.diameterMm);
    state.diameterMm = nextDiameterMm;
  }
  if (nextLengthMm !== state.lengthMm) {
    scaleZ(state, nextLengthMm / state.lengthMm);
    state.lengthMm = nextLengthMm;
  }
  clampAllPoints(state);
}
export function scaleRadii(state: DrawingState, scale: number): void {
  for (const profile of Object.values(state.profiles)) {
    profile.points = profile.points.map(point => ({
      ...point,
      radius: point.radius * scale,
    }));
  }
}
export function scaleZ(state: DrawingState, scale: number): void {
  for (const profile of Object.values(state.profiles)) {
    profile.points = profile.points.map(point => ({
      ...point,
      z: point.z * scale,
    }));
  }
}
