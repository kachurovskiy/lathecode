import { createFullScreenDialog } from '../common/dialog.ts';
import { LatheCode } from '../common/lathecode.ts';
import { beginLatheCodePreviewSession, createAutoRotatingLatheCodePreview, prioritizeVisibleLatheCodePreviews, } from '../start/preview.ts';
import { POINT_HIT_RADIUS_PX, PLOT_CLICK_TOLERANCE_PX, PREVIEW_UPDATE_DELAY_MS, PROFILE_SIDES, SEGMENT_FEATURE_ENDPOINTS, SEGMENT_HIT_RADIUS_PX, SIZE_HINT_FONT_PX, SIZE_HINT_TEXT_STROKE_PX, VIEW_HEIGHT, VIEW_WIDTH, type ContextMenuSection, GEOMETRY_EPSILON, type DrawingHistory, type DrawingState, type DrawingTool, type FieldControl, type FreehandCandidate, type PointSelection, type ProfilePoint, type ProfileSide, type SegmentEdgeFeatureTool, type SegmentFeatureEndpoint, type SegmentSelection, type SegmentTool, } from './types.ts';
import { capitalize, clampNumber, createButton, createNumberField, createSegmentedGroup, createSegmentFeatureIcon, createToolCursorIcon, formatNumber, svgElement, getToolShortcut, isEditableEventTarget, isRedoShortcut, isUndoShortcut, readFiniteNumber, readNonNegativeNumber, readPositiveNumber, } from './dom.ts';
import { findNearestPointSelection, findNearestSegmentSelection, getDrawingViewBox, getPreviewRenderSize, getPreviewRenderSizeKey, getSvgPoint, getSvgScreenMetrics, hasSegmentLength, isSvgPointInsidePlot, screenToProfilePoint, shouldPlacePreviewBelowEditor, svgViewBoxToString, } from './geometry.ts';
import { canAddPointNextToPoint, canRemoveSelectedPoint, canSelectedSegmentEndpointHaveFeature, canSplitSegmentAtProfilePoint, cloneDrawingState, cloneProfileDraft, createInitialState, ensureProfileEnabled, getDefaultSegmentFeatureSize, getProfileSideLabel, getSelectedPoint, getSelectedSegmentFeature, getSelectedSegmentFeatureSize, getSelectedSegmentTool, insertPoint, isInternalSplineControlPoint, midpointProfilePoint, recordUndoState, recordUndoStateIfChanged, redoDrawingState, removeSelectedPoint, resetDrawingState, resizeDrawing, selectDefaultPoint, setSelectedSegmentFeature, setSelectedSegmentTool, undoDrawingState, updatePointPosition, } from './state.ts';
import { appendFreehandStrokePoint, createFreehandCandidates, createFreehandPartPreview, createFreehandProfilePreview, } from './freehand.ts';
import { renderDrawing } from './render.ts';
import { buildLatheCodeFromDrawing, buildOutgoingLatheCodeFromDrawing } from './serialization.ts';
export function openProfileDrawingDialog(onAccept: (text: string) => void, initialText?: string | null): void {
  const state = createInitialState(initialText);
  const history: DrawingHistory = { undoStack: [], redoStack: [], };
  let dragState: PointSelection = null;
  let dragStartState: DrawingState | null = null;
  let dragHistoryRecorded = false;
  let freehandStroke: ProfilePoint[] | null = null;
  let freehandChooserDialog: HTMLDivElement | null = null;
  let contextMenu: HTMLDivElement | null = null;
  let previewUpdateTimer: number | null = null;
  let previewText = '';
  let previewRenderSizeKey = '';
  let forceImmediatePreviewUpdate = false;
  let updatingPointFields = false;
  const previousDocumentTitle = document.title;
  document.title = 'Profile Designer';
  const disposePreviewSession = beginLatheCodePreviewSession();
  const form = document.createElement('form');
  form.className = 'profileDrawingDialog settingsDialog';
  const controls = document.createElement('div');
  controls.className = 'profileDrawingControls';
  form.appendChild(controls);
  const diameterField = createNumberField('Diameter', 'drawingDiameter', state.diameterMm);
  const lengthField = createNumberField('Length', 'drawingLength', state.lengthMm);
  const snapField = createNumberField('Snap', 'drawingSnap', state.snapMm, { min: 0, step: 0.1 });
  const gridField = createNumberField('Grid', 'drawingGrid', state.gridMm, { min: 0.1, step: 0.1 });
  controls.append(diameterField.field, lengthField.field, snapField.field, gridField.field);
  const profileBar = createSegmentedGroup('profileDrawingProfileTools', 'Profile side');
  controls.appendChild(profileBar);
  const profileButtons = new Map<ProfileSide, HTMLButtonElement>();
  for (const side of PROFILE_SIDES) {
    const button = createButton(side === 'outside' ? 'Outside' : 'Inside', 'setupSegmentButton profileDrawingProfileButton', { title: side === 'outside' ? 'Edit the outside profile' : 'Edit the inside profile', });
    button.addEventListener('click', () => {
      clearFreehandWork();
      state.activeSide = side;
      ensureProfileEnabled(state, side);
      selectDefaultPoint(state, side);
      render();
    });
    profileButtons.set(side, button);
    profileBar.appendChild(button);
  }
  const toolBar = createSegmentedGroup('profileDrawingTools', 'Profile drawing tools');
  controls.appendChild(toolBar);
  const toolButtons = new Map<DrawingTool, HTMLButtonElement>();
  for (const tool of [{ value: 'select' as const, label: 'Select', title: 'Select and drag profile points' }, { value: 'line' as const, label: 'Line', title: 'Place straight profile segments' }, { value: 'convex' as const, label: 'Convex', title: 'Place CONV profile segments' }, { value: 'concave' as const, label: 'Concave', title: 'Place CONC profile segments' }, { value: 'spline' as const, label: 'Spline', title: 'Place BSPLINE control points' }, { value: 'free' as const, label: 'Free', title: 'Draw a freehand profile stroke' },]) {
    const button = createButton(tool.label, 'setupSegmentButton profileDrawingToolButton', { title: tool.title });
    button.addEventListener('click', () => {
      setActiveTool(tool.value);
    });
    toolButtons.set(tool.value, button);
    toolBar.appendChild(button);
  }
  const actions = document.createElement('div');
  actions.className = 'profileDrawingActions';
  const historyActions = createSegmentedGroup('profileDrawingActionGroup profileDrawingHistoryActions', 'History actions');
  const undoButton = createButton('Undo', 'setupSegmentButton profileDrawingUndoButton', { title: 'Undo drawing change (Ctrl+Z)', });
  const redoButton = createButton('Redo', 'setupSegmentButton profileDrawingRedoButton', { title: 'Redo drawing change (Ctrl+Y)', });
  historyActions.append(undoButton, redoButton);
  const dialogActions = createSegmentedGroup('settingsActions profileDrawingActionGroup profileDrawingDialogActions', 'Dialog actions');
  const resetButton = createButton('Reset', 'setupSegmentButton profileDrawingResetButton');
  const acceptButton = createButton('Use lathecode', 'setupSegmentButton profileDrawingAcceptButton', { type: 'submit', });
  dialogActions.append(resetButton, acceptButton);
  actions.append(historyActions, dialogActions);
  controls.appendChild(actions);
  const selectionControls = document.createElement('div');
  selectionControls.className = 'profileDrawingSelectionControls';
  selectionControls.classList.add('empty');
  selectionControls.setAttribute('aria-hidden', 'true');
  form.appendChild(selectionControls);
  const workspace = document.createElement('div');
  workspace.className = 'profileDrawingWorkspace';
  form.appendChild(workspace);
  const canvasPanel = document.createElement('div');
  canvasPanel.className = 'profileDrawingCanvasPanel';
  workspace.appendChild(canvasPanel);
  const drawingFrame = document.createElement('div');
  drawingFrame.className = 'profileDrawingFrame';
  canvasPanel.appendChild(drawingFrame);
  const svg = svgElement('svg');
  svg.classList.add('profileDrawingSvg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Editable lathe profile top half');
  drawingFrame.appendChild(svg);
  const toolCursor = document.createElement('div');
  toolCursor.className = 'profileDrawingToolCursor';
  toolCursor.hidden = true;
  toolCursor.setAttribute('aria-hidden', 'true');
  form.appendChild(toolCursor);
  let lastToolCursorEvent: MouseEvent | null = null;
  let drawingResizeRenderFrame: number | null = null;
  const drawingResizeObserver = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(() => {
    if (drawingResizeRenderFrame !== null)
      return;
    drawingResizeRenderFrame = window.requestAnimationFrame(() => {
      drawingResizeRenderFrame = null;
      updateWorkspaceLayout();
      renderDrawing(svg, state, freehandStroke ?? []);
    });
  }) : null;
  drawingResizeObserver?.observe(drawingFrame);
  const pointEditor = document.createElement('div');
  pointEditor.className = 'profileDrawingPointEditor';
  const pointFields = document.createElement('div');
  pointFields.className = 'profileDrawingPointFields';
  const pointZField = createNumberField('Z', 'drawingPointZ', 0, { min: 0, step: 0.001 });
  const pointDiameterField = createNumberField('Diameter', 'drawingPointDiameter', 0, { min: 0, step: 0.001 });
  pointFields.append(pointZField.field, pointDiameterField.field);
  pointEditor.appendChild(pointFields);
  const deletePointButton = createButton('Delete point', 'setupSegmentButton profileDrawingDeletePointButton');
  pointEditor.appendChild(deletePointButton);
  selectionControls.appendChild(pointEditor);
  const segmentEditor = document.createElement('div');
  segmentEditor.className = 'profileDrawingSegmentEditor';
  const segmentTypeBar = createSegmentedGroup('profileDrawingSegmentTypeTools', 'Selected segment type');
  const segmentTypeButtons = new Map<SegmentTool, HTMLButtonElement>();
  for (const tool of [{ value: 'line' as const, label: 'Line' }, { value: 'convex' as const, label: 'Convex' }, { value: 'concave' as const, label: 'Concave' }, { value: 'spline' as const, label: 'Spline' },]) {
    const button = createButton(tool.label, 'setupSegmentButton profileDrawingSegmentTypeButton');
    button.dataset.tool = tool.value;
    button.addEventListener('click', () => {
      const before = cloneDrawingState(state);
      if (!setSelectedSegmentTool(state, tool.value))
        return;
      clearFreehandWork();
      recordUndoStateIfChanged(history, before, state);
      render();
    });
    segmentTypeButtons.set(tool.value, button);
    segmentTypeBar.appendChild(button);
  }
  segmentEditor.appendChild(segmentTypeBar);
  const segmentFeatureRows = new Map<SegmentFeatureEndpoint, HTMLElement>();
  const segmentFeatureButtons = new Map<SegmentFeatureEndpoint, Map<SegmentEdgeFeatureTool, HTMLButtonElement>>();
  const segmentFeatureSizeFields = new Map<SegmentFeatureEndpoint, FieldControl>();
  const segmentFeatureGrid = document.createElement('div');
  segmentFeatureGrid.className = 'profileDrawingSegmentFeatureGrid';
  for (const endpoint of SEGMENT_FEATURE_ENDPOINTS) {
    const row = document.createElement('div');
    row.className = 'profileDrawingSegmentFeatureRow';
    row.dataset.endpoint = endpoint;
    const label = document.createElement('strong');
    label.textContent = endpoint === 'start' ? 'Left edge' : 'Right edge';
    row.appendChild(label);
    const featureBar = createSegmentedGroup('profileDrawingSegmentFeatureTools', `${label.textContent} feature`);
    const endpointButtons = new Map<SegmentEdgeFeatureTool, HTMLButtonElement>();
    for (const feature of [{ value: 'none' as const, label: 'None' }, { value: 'chamfer' as const, label: 'Chamfer' }, { value: 'fillet' as const, label: 'Fillet' },]) {
      const button = createButton('', 'setupSegmentButton profileDrawingSegmentFeatureButton', { title: feature.label });
      button.dataset.endpoint = endpoint;
      button.dataset.feature = feature.value;
      button.setAttribute('aria-label', feature.label);
      button.appendChild(createSegmentFeatureIcon(feature.value));
      button.addEventListener('click', () => {
        const before = cloneDrawingState(state);
        const nextFeature = feature.value === 'none' ? null : { kind: feature.value, size: getSelectedSegmentFeatureSize(state, endpoint) ?? readNonNegativeNumber(segmentFeatureSizeFields.get(endpoint)!.input, getDefaultSegmentFeatureSize(state, endpoint)), };
        if (!setSelectedSegmentFeature(state, endpoint, nextFeature))
          return;
        clearFreehandWork();
        recordUndoStateIfChanged(history, before, state);
        render();
      });
      endpointButtons.set(feature.value, button);
      featureBar.appendChild(button);
    }
    row.appendChild(featureBar);
    const sizeField = createNumberField('Size', `drawingSegment${capitalize(endpoint)}FeatureSize`, 1, { min: 0, step: 0.1 });
    sizeField.input.addEventListener('input', () => {
      const current = getSelectedSegmentFeature(state, endpoint);
      if (!current)
        return;
      const before = cloneDrawingState(state);
      const size = readNonNegativeNumber(sizeField.input, current.size);
      if (!setSelectedSegmentFeature(state, endpoint, { ...current, size }))
        return;
      clearFreehandWork();
      recordUndoStateIfChanged(history, before, state);
      render();
    });
    row.appendChild(sizeField.field);
    segmentFeatureRows.set(endpoint, row);
    segmentFeatureButtons.set(endpoint, endpointButtons);
    segmentFeatureSizeFields.set(endpoint, sizeField);
    segmentFeatureGrid.appendChild(row);
  }
  segmentEditor.appendChild(segmentFeatureGrid);
  selectionControls.appendChild(segmentEditor);
  const preview3d = document.createElement('div');
  preview3d.className = 'profileDrawingPreview3d';
  workspace.appendChild(preview3d);
  const autoPreview3d = createAutoRotatingLatheCodePreview(preview3d);
  const previewResizeObserver = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(() => {
    if (!previewText)
      return;
    const sizeKey = getPreviewRenderSizeKey(getPreviewRenderSize(preview3d));
    if (sizeKey !== previewRenderSizeKey)
      schedulePreviewUpdate(previewText, true);
  }) : null;
  previewResizeObserver?.observe(preview3d);
  const error = document.createElement('div');
  error.className = 'toolDialogError';
  form.appendChild(error);
  const handleDimensionInput = () => {
    const before = cloneDrawingState(state);
    const nextDiameter = readPositiveNumber(diameterField.input, state.diameterMm);
    const nextLength = readPositiveNumber(lengthField.input, state.lengthMm);
    const dimensionsChanged = Math.abs(nextDiameter - state.diameterMm) > GEOMETRY_EPSILON || Math.abs(nextLength - state.lengthMm) > GEOMETRY_EPSILON;
    state.snapMm = readNonNegativeNumber(snapField.input, state.snapMm);
    state.gridMm = readPositiveNumber(gridField.input, state.gridMm);
    resizeDrawing(state, nextDiameter, nextLength);
    forceImmediatePreviewUpdate = forceImmediatePreviewUpdate || dimensionsChanged;
    clearFreehandWork();
    recordUndoStateIfChanged(history, before, state);
    render();
  };
  diameterField.input.addEventListener('input', handleDimensionInput);
  lengthField.input.addEventListener('input', handleDimensionInput);
  snapField.input.addEventListener('input', handleDimensionInput);
  gridField.input.addEventListener('input', handleDimensionInput);
  const handlePointInput = () => {
    if (updatingPointFields || !state.selection)
      return;
    const point = getSelectedPoint(state);
    if (!point)
      return;
    const before = cloneDrawingState(state);
    const z = readFiniteNumber(pointZField.input, point.z);
    const diameter = readFiniteNumber(pointDiameterField.input, point.radius * 2);
    updatePointPosition(state, state.selection, { z, radius: diameter / 2 }, false);
    clearFreehandWork();
    recordUndoStateIfChanged(history, before, state);
    render();
  };
  pointZField.input.addEventListener('input', handlePointInput);
  pointDiameterField.input.addEventListener('input', handlePointInput);
  deletePointButton.addEventListener('click', () => {
    const before = cloneDrawingState(state);
    if (removeSelectedPoint(state)) {
      clearFreehandWork();
      recordUndoState(history, before);
      render();
    }
  });
  undoButton.addEventListener('click', () => {
    performUndo();
  });
  redoButton.addEventListener('click', () => {
    performRedo();
  });
  resetButton.addEventListener('click', () => {
    const before = cloneDrawingState(state);
    closeContextMenu();
    resetDrawingState(state);
    dragState = null;
    dragStartState = null;
    dragHistoryRecorded = false;
    clearFreehandWork();
    recordUndoStateIfChanged(history, before, state);
    syncDimensionInputs();
    render();
  });
  svg.addEventListener('mousedown', event => {
    if (event.button !== 0)
      return;
    event.preventDefault();
    closeContextMenu();
    updateToolCursor(event);
    const svgPoint = getSvgPoint(svg, event);
    updateSegmentHoverCursor(svgPoint);
    const svgMetrics = getSvgScreenMetrics(svg);
    const insidePlot = isSvgPointInsidePlot(state, svgPoint, svgMetrics.px(PLOT_CLICK_TOLERANCE_PX));
    if (state.activeTool === 'free') {
      if (!insidePlot)
        return;
      freehandStroke = [screenToProfilePoint(state, svgPoint)];
      closeFreehandChooser();
      dragState = null;
      render();
      return;
    }
    clearFreehandWork();
    const hitSelection = findNearestPointSelection(state, svgPoint, svgMetrics.px(POINT_HIT_RADIUS_PX));
    if (hitSelection) {
      dragStartState = cloneDrawingState(state);
      dragHistoryRecorded = false;
      state.activeSide = hitSelection.side;
      state.activeTool = 'select';
      state.selection = hitSelection;
      state.segmentSelection = null;
      dragState = hitSelection;
      render();
      return;
    }
    if (!insidePlot)
      return;
    if (state.activeTool === 'select') {
      const hitSegmentSelection = findNearestSegmentSelection(state, svgPoint, svgMetrics.px(SEGMENT_HIT_RADIUS_PX));
      state.selection = null;
      state.segmentSelection = hitSegmentSelection;
      if (hitSegmentSelection)
        state.activeSide = hitSegmentSelection.side;
      render();
      return;
    }
    recordUndoState(history, cloneDrawingState(state));
    ensureProfileEnabled(state, state.activeSide);
    insertPoint(state, state.activeSide, screenToProfilePoint(state, svgPoint), state.activeTool);
    dragState = state.selection;
    dragStartState = null;
    dragHistoryRecorded = true;
    render();
  });
  svg.addEventListener('contextmenu', event => {
    openProfileContextMenu(event);
  });
  svg.addEventListener('mousemove', event => {
    updateToolCursor(event);
    updateSegmentHoverCursor(getSvgPoint(svg, event));
  });
  svg.addEventListener('mouseleave', () => {
    hideToolCursor();
    updateSegmentHoverCursor(null);
  });
  const handleMouseMove = (event: MouseEvent) => {
    if (freehandStroke) {
      updateToolCursor(event);
      updateSegmentHoverCursor(null);
      appendFreehandStrokePoint(state, freehandStroke, screenToProfilePoint(state, getSvgPoint(svg, event)));
      render();
      return;
    }
    if (!dragState)
      return;
    updateToolCursor(event);
    updateSegmentHoverCursor(null);
    if (dragStartState && !dragHistoryRecorded) {
      recordUndoState(history, dragStartState);
      dragHistoryRecorded = true;
    }
    updatePointPosition(state, dragState, screenToProfilePoint(state, getSvgPoint(svg, event)), true);
    render();
  };
  const handleMouseUp = (event: MouseEvent) => {
    if (freehandStroke) {
      appendFreehandStrokePoint(state, freehandStroke, screenToProfilePoint(state, getSvgPoint(svg, event)));
      const candidates = createFreehandCandidates(state, freehandStroke);
      freehandStroke = null;
      render();
      if (candidates.length)
        openFreehandChooser(candidates);
      return;
    }
    dragState = null;
    dragStartState = null;
    dragHistoryRecorded = false;
  };
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  form.addEventListener('submit', event => {
    event.preventDefault();
    let text: string;
    try {
      text = buildOutgoingLatheCodeFromDrawing(state);
      new LatheCode(text);
    }
    catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : String(caught);
      return;
    }
    closeDialog();
    dialog.remove();
    onAccept(text);
  });
  const closeDialog = () => {
    closeContextMenu();
    closeFreehandChooser();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    if (previewUpdateTimer !== null) {
      window.clearTimeout(previewUpdateTimer);
      previewUpdateTimer = null;
    }
    if (drawingResizeRenderFrame !== null) {
      window.cancelAnimationFrame(drawingResizeRenderFrame);
      drawingResizeRenderFrame = null;
    }
    drawingResizeObserver?.disconnect();
    previewResizeObserver?.disconnect();
    autoPreview3d.dispose();
    disposePreviewSession();
    document.title = previousDocumentTitle;
  };
  const dialog = createFullScreenDialog(form, '', closeDialog);
  dialog.classList.add('profileDrawingDialogContainer');
  dialog.querySelector<HTMLButtonElement>('.dialogCloseButton')!.classList.add('setupSegmentButton');
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' && contextMenu) {
      event.preventDefault();
      event.stopPropagation();
      closeContextMenu();
      return;
    }
    if (isUndoShortcut(event)) {
      if (performUndo()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (isRedoShortcut(event)) {
      if (performRedo()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (event.key === 'Escape' && state.activeTool !== 'select') {
      event.preventDefault();
      event.stopPropagation();
      clearFreehandWork();
      state.activeTool = 'select';
      render();
      return;
    }
    const shortcutTool = getToolShortcut(event, state.activeTool);
    if (shortcutTool && !isEditableEventTarget(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      setActiveTool(shortcutTool);
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && !isEditableEventTarget(event.target)) {
      const before = cloneDrawingState(state);
      if (removeSelectedPoint(state)) {
        recordUndoState(history, before);
        event.preventDefault();
        render();
      }
    }
  }, { capture: true });
  dialog.tabIndex = -1;
  dialog.focus();
  function render() {
    updateWorkspaceLayout();
    renderDrawing(svg, state, freehandStroke ?? []);
    const text = buildLatheCodeFromDrawing(state);
    updatePointEditor();
    updateSegmentEditor();
    const hasSelectionControls = !pointEditor.hidden || !segmentEditor.hidden;
    selectionControls.classList.toggle('empty', !hasSelectionControls);
    selectionControls.setAttribute('aria-hidden', String(!hasSelectionControls));
    error.textContent = '';
    for (const [side, button] of profileButtons) {
      button.classList.toggle('selected', state.activeSide === side);
      button.setAttribute('aria-pressed', String(state.activeSide === side));
    }
    for (const [tool, button] of toolButtons) {
      button.classList.toggle('selected', state.activeTool === tool);
      button.setAttribute('aria-pressed', String(state.activeTool === tool));
    }
    updateToolCursor();
    undoButton.disabled = !history.undoStack.length;
    redoButton.disabled = !history.redoStack.length;
    if (state.activeTool !== 'select' || dragState || freehandStroke) {
      updateSegmentHoverCursor(null);
    }
    const forcePreviewUpdate = forceImmediatePreviewUpdate;
    forceImmediatePreviewUpdate = false;
    schedulePreviewUpdate(text, forcePreviewUpdate);
  }
  function updateSegmentHoverCursor(svgPoint: {
    x: number;
    y: number;
  } | null) {
    const svgMetrics = getSvgScreenMetrics(svg);
    const canSelectSegment = !!svgPoint && !dragState && !freehandStroke && state.activeTool === 'select' && isSvgPointInsidePlot(state, svgPoint, svgMetrics.px(PLOT_CLICK_TOLERANCE_PX)) && !findNearestPointSelection(state, svgPoint, svgMetrics.px(POINT_HIT_RADIUS_PX)) && !!findNearestSegmentSelection(state, svgPoint, svgMetrics.px(SEGMENT_HIT_RADIUS_PX));
    svg.classList.toggle('profileDrawingSegmentHover', canSelectSegment);
  }
  function updateWorkspaceLayout() {
    workspace.classList.toggle('longPart', shouldPlacePreviewBelowEditor(state));
    const viewBox = getDrawingViewBox(state);
    svg.setAttribute('viewBox', svgViewBoxToString(viewBox));
    drawingFrame.style.setProperty('--profileDrawingFrameAspect', formatNumber(viewBox.width / viewBox.height));
    const metrics = getSvgScreenMetrics(svg);
    svg.style.setProperty('--profileDrawingSizeHintFontSize', `${formatNumber(metrics.px(SIZE_HINT_FONT_PX))}px`);
    svg.style.setProperty('--profileDrawingSizeHintStrokeWidth', `${formatNumber(metrics.px(SIZE_HINT_TEXT_STROKE_PX))}px`);
  }
  function performUndo(): boolean {
    if (!undoDrawingState(state, history))
      return false;
    closeContextMenu();
    dragState = null;
    dragStartState = null;
    dragHistoryRecorded = false;
    clearFreehandWork();
    syncDimensionInputs();
    render();
    return true;
  }
  function performRedo(): boolean {
    if (!redoDrawingState(state, history))
      return false;
    closeContextMenu();
    dragState = null;
    dragStartState = null;
    dragHistoryRecorded = false;
    clearFreehandWork();
    syncDimensionInputs();
    render();
    return true;
  }
  function setActiveTool(tool: DrawingTool) {
    closeContextMenu();
    if (tool !== 'free')
      clearFreehandWork();
    if (tool !== 'select')
      state.segmentSelection = null;
    state.activeTool = tool;
    render();
  }
  function clearFreehandWork() {
    freehandStroke = null;
    closeFreehandChooser();
  }
  function updatePointEditor() {
    const point = getSelectedPoint(state);
    pointEditor.hidden = !point || !state.selection;
    if (!point || !state.selection)
      return;
    const profile = state.profiles[state.selection.side];
    const zLocked = isInternalSplineControlPoint(profile, state.selection.index);
    updatingPointFields = true;
    pointZField.input.max = formatNumber(state.lengthMm);
    pointZField.input.disabled = zLocked;
    pointZField.input.title = zLocked ? 'Spline control Z is set by the spline span' : '';
    pointDiameterField.input.max = formatNumber(state.diameterMm);
    pointZField.input.value = formatNumber(point.z);
    pointDiameterField.input.value = formatNumber(point.radius * 2);
    updatingPointFields = false;
    deletePointButton.disabled = !canRemoveSelectedPoint(state);
  }
  function updateSegmentEditor() {
    const segmentTool = getSelectedSegmentTool(state);
    segmentEditor.hidden = !segmentTool || !state.segmentSelection;
    if (!segmentTool || !state.segmentSelection)
      return;
    for (const [tool, button] of segmentTypeButtons) {
      button.classList.toggle('selected', segmentTool === tool);
      button.setAttribute('aria-pressed', String(segmentTool === tool));
    }
    for (const endpoint of SEGMENT_FEATURE_ENDPOINTS) {
      const feature = getSelectedSegmentFeature(state, endpoint);
      const activeFeature = feature?.kind ?? 'none';
      const endpointCanHaveFeature = canSelectedSegmentEndpointHaveFeature(state, endpoint);
      segmentFeatureRows.get(endpoint)!.classList.toggle('disabled', !endpointCanHaveFeature);
      for (const [featureTool, button] of segmentFeatureButtons.get(endpoint)!) {
        button.disabled = !endpointCanHaveFeature;
        button.classList.toggle('selected', activeFeature === featureTool);
        button.setAttribute('aria-pressed', String(activeFeature === featureTool));
      }
      const sizeField = segmentFeatureSizeFields.get(endpoint)!;
      sizeField.input.disabled = !endpointCanHaveFeature || !feature;
      sizeField.input.value = formatNumber(feature?.size ?? getDefaultSegmentFeatureSize(state, endpoint));
    }
  }
  function applyFreehandCandidate(candidate: FreehandCandidate) {
    const before = cloneDrawingState(state);
    closeFreehandChooser();
    state.profiles[state.activeSide] = cloneProfileDraft(candidate.draft);
    state.profiles[state.activeSide].enabled = true;
    selectDefaultPoint(state, state.activeSide);
    recordUndoStateIfChanged(history, before, state);
    render();
  }
  function openFreehandChooser(candidates: FreehandCandidate[]) {
    closeFreehandChooser();
    const chooser = document.createElement('div');
    chooser.className = 'profileDrawingFreehandDialog settingsDialog';
    const grid = document.createElement('div');
    grid.className = 'profileDrawingFreehandOptionGrid';
    chooser.appendChild(grid);
    for (const candidate of candidates) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'profileDrawingFreehandOption';
      option.dataset.candidate = candidate.id;
      option.dataset.toolset = candidate.toolset;
      option.setAttribute('aria-label', `${candidate.label}: ${candidate.description}, ${candidate.draft.points.length} points`);
      option.addEventListener('click', () => {
        applyFreehandCandidate(candidate);
      });
      const title = document.createElement('strong');
      title.textContent = candidate.label;
      option.appendChild(title);
      const detail = document.createElement('span');
      detail.textContent = `${candidate.description} - ${candidate.draft.points.length} points`;
      option.appendChild(detail);
      const previews = document.createElement('div');
      previews.className = 'profileDrawingFreehandOptionPreviews';
      previews.appendChild(createFreehandProfilePreview(state, candidate));
      previews.appendChild(createFreehandPartPreview(state, candidate));
      option.appendChild(previews);
      grid.appendChild(option);
    }
    const chooserDialog = createFullScreenDialog(chooser, 'Choose Freehand Profile', () => {
      if (freehandChooserDialog === chooserDialog)
        freehandChooserDialog = null;
    });
    chooserDialog.classList.add('profileDrawingFreehandDialogContainer');
    const chooserCloseButton = chooserDialog.querySelector<HTMLButtonElement>('.dialogCloseButton')!;
    chooserCloseButton.textContent = 'Cancel';
    chooserCloseButton.classList.add('setupSegmentButton');
    chooserDialog.querySelector<HTMLElement>('.settingsActions')?.classList.add('setupSegmented', 'profileDrawingActionGroup');
    freehandChooserDialog = chooserDialog;
    prioritizeVisibleLatheCodePreviews();
  }
  function closeFreehandChooser() {
    if (!freehandChooserDialog)
      return;
    const dialogToClose = freehandChooserDialog;
    freehandChooserDialog = null;
    dialogToClose.remove();
  }
  function openProfileContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    hideToolCursor();
    const svgPoint = getSvgPoint(svg, event);
    const svgMetrics = getSvgScreenMetrics(svg);
    if (!isSvgPointInsidePlot(state, svgPoint, svgMetrics.px(PLOT_CLICK_TOLERANCE_PX))) {
      closeContextMenu();
      return;
    }
    const pointSelection = findNearestPointSelection(state, svgPoint, svgMetrics.px(POINT_HIT_RADIUS_PX));
    if (pointSelection) {
      openPointContextMenu(pointSelection, event.clientX, event.clientY);
      return;
    }
    const segmentSelection = findNearestSegmentSelection(state, svgPoint, svgMetrics.px(SEGMENT_HIT_RADIUS_PX));
    if (segmentSelection) {
      openSegmentContextMenu(segmentSelection, screenToProfilePoint(state, svgPoint), event.clientX, event.clientY);
      return;
    }
    closeContextMenu();
  }
  function openPointContextMenu(selection: Exclude<PointSelection, null>, clientX: number, clientY: number) {
    clearFreehandWork();
    selectContextPoint(selection);
    render();
    const profile = state.profiles[selection.side];
    const point = profile.points[selection.index];
    const title = `${getProfileSideLabel(selection.side)} point ${selection.index + 1}`;
    const sections: ContextMenuSection[] = [{
      title, items: [{
        label: 'Select point', action: 'select-point', selected: true, onSelect: () => {
          selectContextPoint(selection);
          render();
        },
      }, { label: 'Add point left', action: 'add-point-left', disabled: !point || !canAddPointNextToPoint(profile, selection.index, -1), onSelect: () => addPointNextToPoint(selection, -1), }, { label: 'Add point right', action: 'add-point-right', disabled: !point || !canAddPointNextToPoint(profile, selection.index, 1), onSelect: () => addPointNextToPoint(selection, 1), }, { label: 'Delete point', action: 'delete-point', disabled: !canRemoveSelectedPoint(state), onSelect: () => deletePointFromContext(selection), },],
    }];
    openContextMenu(title, sections, clientX, clientY);
  }
  function openSegmentContextMenu(selection: Exclude<SegmentSelection, null>, profilePoint: ProfilePoint, clientX: number, clientY: number) {
    clearFreehandWork();
    selectContextSegment(selection);
    render();
    const title = `${getProfileSideLabel(selection.side)} segment ${selection.index + 1}`;
    const segmentTool = getSelectedSegmentTool(state);
    const sections: ContextMenuSection[] = [{
      title, items: [{
        label: 'Select segment', action: 'select-segment', selected: true, onSelect: () => {
          selectContextSegment(selection);
          render();
        },
      }, { label: 'Add point here', action: 'add-point-here', disabled: !canSplitSegmentAtProfilePoint(state.profiles[selection.side], selection.index, profilePoint), onSelect: () => addPointToSegment(selection, profilePoint), },],
    }, { title: 'Type', items: ([['line', 'Line'], ['convex', 'Convex'], ['concave', 'Concave'], ['spline', 'Spline'],] as const).map(([tool, label]) => ({ label, action: `segment-tool-${tool}`, selected: segmentTool === tool, onSelect: () => applySegmentToolFromContext(selection, tool), })), },];
    for (const endpoint of SEGMENT_FEATURE_ENDPOINTS) {
      if (!canSelectedSegmentEndpointHaveFeature(state, endpoint) && !getSelectedSegmentFeature(state, endpoint)) {
        continue;
      }
      const endpointFeature = getSelectedSegmentFeature(state, endpoint);
      const endpointLabel = endpoint === 'start' ? 'Left edge' : 'Right edge';
      sections.push({ title: endpointLabel, items: ([['none', 'None'], ['chamfer', 'Chamfer'], ['fillet', 'Fillet'],] as const).map(([feature, label]) => ({ label, action: `segment-${endpoint}-${feature}`, selected: (endpointFeature?.kind ?? 'none') === feature, disabled: feature !== 'none' && !canSelectedSegmentEndpointHaveFeature(state, endpoint), onSelect: () => applySegmentFeatureFromContext(selection, endpoint, feature), })), });
    }
    openContextMenu(title, sections, clientX, clientY);
  }
  function openContextMenu(title: string, sections: ContextMenuSection[], clientX: number, clientY: number) {
    closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'profileDrawingContextMenu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', title);
    for (const section of sections) {
      const sectionElement = document.createElement('div');
      sectionElement.className = 'profileDrawingContextMenuSection';
      if (section.title) {
        const titleElement = document.createElement('div');
        titleElement.className = 'profileDrawingContextMenuTitle';
        titleElement.textContent = section.title;
        sectionElement.appendChild(titleElement);
      }
      for (const item of section.items) {
        const button = createButton(item.label, 'profileDrawingContextMenuButton', { title: item.label });
        button.dataset.action = item.action;
        button.disabled = !!item.disabled;
        button.classList.toggle('selected', !!item.selected);
        button.setAttribute('role', 'menuitem');
        button.setAttribute('aria-pressed', String(!!item.selected));
        button.addEventListener('click', () => {
          if (item.disabled)
            return;
          closeContextMenu();
          item.onSelect();
        });
        sectionElement.appendChild(button);
      }
      menu.appendChild(sectionElement);
    }
    form.appendChild(menu);
    contextMenu = menu;
    positionContextMenu(menu, clientX, clientY);
    window.addEventListener('mousedown', closeContextMenuFromOutside, true);
    window.addEventListener('resize', closeContextMenu);
    window.addEventListener('blur', closeContextMenu);
  }
  function closeContextMenuFromOutside(event: MouseEvent) {
    const target = event.target;
    if (contextMenu && target instanceof Node && contextMenu.contains(target))
      return;
    closeContextMenu();
  }
  function closeContextMenu() {
    if (!contextMenu)
      return;
    contextMenu.remove();
    contextMenu = null;
    window.removeEventListener('mousedown', closeContextMenuFromOutside, true);
    window.removeEventListener('resize', closeContextMenu);
    window.removeEventListener('blur', closeContextMenu);
  }
  function positionContextMenu(menu: HTMLElement, clientX: number, clientY: number) {
    const margin = 8;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 768;
    const rect = menu.getBoundingClientRect();
    const width = rect.width || menu.offsetWidth || 220;
    const height = rect.height || menu.offsetHeight || 240;
    const left = clampNumber(clientX, margin, Math.max(margin, viewportWidth - width - margin));
    const top = clampNumber(clientY, margin, Math.max(margin, viewportHeight - height - margin));
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  }
  function updateToolCursor(event: MouseEvent | null = lastToolCursorEvent) {
    if (event)
      lastToolCursorEvent = event;
    if (!lastToolCursorEvent || state.activeTool === 'select' || contextMenu || freehandChooserDialog) {
      hideToolCursor();
      return;
    }
    if (toolCursor.dataset.tool !== state.activeTool) {
      toolCursor.dataset.tool = state.activeTool;
      toolCursor.replaceChildren(createToolCursorIcon(state.activeTool));
    }
    toolCursor.style.left = `${Math.round(lastToolCursorEvent.clientX + 14)}px`;
    toolCursor.style.top = `${Math.round(lastToolCursorEvent.clientY + 14)}px`;
    toolCursor.hidden = false;
  }
  function hideToolCursor() {
    lastToolCursorEvent = null;
    toolCursor.hidden = true;
  }
  function selectContextPoint(selection: Exclude<PointSelection, null>) {
    state.activeSide = selection.side;
    state.selection = { ...selection };
    state.segmentSelection = null;
  }
  function selectContextSegment(selection: Exclude<SegmentSelection, null>) {
    state.activeSide = selection.side;
    state.selection = null;
    state.segmentSelection = { ...selection };
  }
  function addPointNextToPoint(selection: Exclude<PointSelection, null>, direction: -1 | 1) {
    const before = cloneDrawingState(state);
    selectContextPoint(selection);
    const profile = state.profiles[selection.side];
    const point = profile.points[selection.index];
    const neighborIndex = selection.index + direction;
    const neighbor = profile.points[neighborIndex];
    if (!point || !neighbor || !hasSegmentLength(point, neighbor))
      return;
    const segmentIndex = direction < 0 ? neighborIndex : selection.index;
    insertPoint(state, selection.side, midpointProfilePoint(point, neighbor), profile.segmentTools[segmentIndex] ?? 'line');
    recordUndoStateIfChanged(history, before, state);
    render();
  }
  function deletePointFromContext(selection: Exclude<PointSelection, null>) {
    const before = cloneDrawingState(state);
    selectContextPoint(selection);
    if (!removeSelectedPoint(state))
      return;
    recordUndoState(history, before);
    render();
  }
  function addPointToSegment(selection: Exclude<SegmentSelection, null>, point: ProfilePoint) {
    const before = cloneDrawingState(state);
    selectContextSegment(selection);
    const profile = state.profiles[selection.side];
    if (!canSplitSegmentAtProfilePoint(profile, selection.index, point))
      return;
    insertPoint(state, selection.side, point, profile.segmentTools[selection.index] ?? 'line');
    recordUndoStateIfChanged(history, before, state);
    render();
  }
  function applySegmentToolFromContext(selection: Exclude<SegmentSelection, null>, tool: SegmentTool) {
    const before = cloneDrawingState(state);
    selectContextSegment(selection);
    if (!setSelectedSegmentTool(state, tool))
      return;
    recordUndoStateIfChanged(history, before, state);
    render();
  }
  function applySegmentFeatureFromContext(selection: Exclude<SegmentSelection, null>, endpoint: SegmentFeatureEndpoint, feature: SegmentEdgeFeatureTool) {
    const before = cloneDrawingState(state);
    selectContextSegment(selection);
    const nextFeature = feature === 'none' ? null : { kind: feature, size: getSelectedSegmentFeatureSize(state, endpoint) ?? getDefaultSegmentFeatureSize(state, endpoint), };
    if (!setSelectedSegmentFeature(state, endpoint, nextFeature))
      return;
    recordUndoStateIfChanged(history, before, state);
    render();
  }
  function syncDimensionInputs() {
    diameterField.input.value = formatNumber(state.diameterMm);
    lengthField.input.value = formatNumber(state.lengthMm);
    snapField.input.value = formatNumber(state.snapMm);
    gridField.input.value = formatNumber(state.gridMm);
  }
  function schedulePreviewUpdate(text: string, force = false) {
    if (force) {
      if (previewUpdateTimer !== null) {
        window.clearTimeout(previewUpdateTimer);
        previewUpdateTimer = null;
      }
      update3dPreview(text);
      return;
    }
    if (!force && text === previewText && getPreviewRenderSizeKey(getPreviewRenderSize(preview3d)) === previewRenderSizeKey) {
      return;
    }
    if (!previewText) {
      update3dPreview(text);
      return;
    }
    if (previewUpdateTimer !== null)
      window.clearTimeout(previewUpdateTimer);
    previewUpdateTimer = window.setTimeout(() => {
      previewUpdateTimer = null;
      update3dPreview(text);
    }, PREVIEW_UPDATE_DELAY_MS);
  }
  function update3dPreview(text: string) {
    const renderSize = getPreviewRenderSize(preview3d);
    previewText = text;
    previewRenderSizeKey = getPreviewRenderSizeKey(renderSize);
    preview3d.dataset.previewText = text;
    preview3d.dataset.previewSize = previewRenderSizeKey;
    autoPreview3d.resize(renderSize.width, renderSize.height);
    autoPreview3d.setText(text);
  }
  render();
}
