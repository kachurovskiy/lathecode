export const SVG_NS = 'http://www.w3.org/2000/svg';
export const DEFAULT_DIAMETER_MM = 30;
export const DEFAULT_LENGTH_MM = 50;
export const DEFAULT_SNAP_MM = 1;
export const DEFAULT_GRID_MM = 5;
export const PROFILE_3D_PREVIEW_FALLBACK_RENDER_SIZE = 512;
export const PROFILE_3D_PREVIEW_MIN_RENDER_SIZE = 256;
export const PROFILE_3D_PREVIEW_MAX_RENDER_SIZE = 2048;
export const FREEHAND_PART_PREVIEW_RENDER_SIZE = 180;
export const VIEW_WIDTH = 720;
export const VIEW_HEIGHT = 360;
export const PADDING_LEFT = 46;
export const PADDING_RIGHT = 18;
export const PADDING_TOP = 22;
export const PADDING_BOTTOM = 42;
export const MIN_SEGMENT_LENGTH_MM = 0.001;
export const PROFILE_PREVIEW_MAX_CHORD_MM = 0.25;
export const POINT_HIT_RADIUS_PX = 14;
export const SEGMENT_HIT_RADIUS_PX = 10;
export const PREVIEW_UPDATE_DELAY_MS = 100;
export const SIZE_HINT_LABEL_OFFSET_PX = 15;
export const SIZE_HINT_GUIDE_OFFSET_PX = 9;
export const SIZE_HINT_VERTICAL_LABEL_GAP_PX = 7;
export const SIZE_HINT_FONT_PX = 16;
export const SIZE_HINT_TEXT_STROKE_PX = 3;
export const SIZE_HINT_SCREEN_PADDING_PX = 10;
export const POINT_RADIUS_PX = 5;
export const SELECTED_POINT_RADIUS_PX = 6;
export const ORIENTATION_ICON_HALF_LENGTH_PX = 7;
export const ORIENTATION_ICON_OFFSET_PX = 9;
export const PLOT_CLICK_TOLERANCE_PX = 2;
export const LONG_PREVIEW_ASPECT_RATIO = 1.5;
export const DRAWING_VIEWBOX_MARGIN_X = 56;
export const DRAWING_VIEWBOX_MARGIN_TOP = 28;
export const DRAWING_VIEWBOX_MARGIN_BOTTOM = 36;
export const DRAWING_VIEWBOX_MIN_WIDTH = 320;
export const DRAWING_VIEWBOX_MIN_HEIGHT = 150;
export const IMPORT_EPSILON = 1e-6;
export const HISTORY_LIMIT = 100;
export const GEOMETRY_EPSILON = 1e-9;
export const PROFILE_SIDES = ['outside', 'inside'] as const;
export const SEGMENT_FEATURE_ENDPOINTS = ['start', 'end'] as const;
export type ProfileSide = typeof PROFILE_SIDES[number];
export type SegmentTool = 'line' | 'convex' | 'concave' | 'spline';
export type DrawingTool = SegmentTool | 'select' | 'free';
export type SegmentFeatureEndpoint = typeof SEGMENT_FEATURE_ENDPOINTS[number];
export type SegmentEdgeFeatureKind = 'chamfer' | 'fillet';
export type SegmentEdgeFeatureTool = 'none' | SegmentEdgeFeatureKind;
export type SegmentEdgeFeature = {
  kind: SegmentEdgeFeatureKind;
  size: number;
};
export type SegmentEdgeFeatures = Record<SegmentFeatureEndpoint, SegmentEdgeFeature | null>;
export type ProfilePoint = {
  z: number;
  radius: number;
};
export type ProfileDraft = {
  enabled: boolean;
  points: ProfilePoint[];
  segmentTools: SegmentTool[];
  segmentFeatures: SegmentEdgeFeatures[];
};
export type PointSelection = {
  side: ProfileSide;
  index: number;
} | null;
export type SegmentSelection = {
  side: ProfileSide;
  index: number;
} | null;
export type DrawingState = {
  diameterMm: number;
  lengthMm: number;
  snapMm: number;
  gridMm: number;
  profiles: Record<ProfileSide, ProfileDraft>;
  activeSide: ProfileSide;
  activeTool: DrawingTool;
  selection: PointSelection;
  segmentSelection: SegmentSelection;
};
export type SegmentRange = {
  startIndex: number;
  endIndex: number;
  tool: SegmentTool;
  points: ProfilePoint[];
};
export type FieldControl = {
  field: HTMLLabelElement;
  input: HTMLInputElement;
};
export type NumberFieldOptions = {
  min?: number;
  step?: number;
};
export type DrawingHistory = {
  undoStack: DrawingState[];
  redoStack: DrawingState[];
};
export type BuildLatheCodeOptions = {
  stripEdgeFeatures?: boolean;
};
export type ContextMenuItem = {
  label: string;
  action: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};
export type ContextMenuSection = {
  title?: string;
  items: ContextMenuItem[];
};
export type FreehandCandidateToolset = 'lines' | 'arcs' | 'spline';
export type FreehandCandidate = {
  id: string;
  label: string;
  description: string;
  toolset: FreehandCandidateToolset;
  draft: ProfileDraft;
};
export type FreehandCandidateSetting = {
  id: string;
  label: string;
  description: string;
  toolset: FreehandCandidateToolset;
  toleranceScale: number;
  minToleranceMm: number;
  proximityScale: number;
};
export type PlotBounds = {
  left: number;
  right: number;
  top: number;
  axisY: number;
  width: number;
  height: number;
};
export type SvgViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type SvgScreenMetrics = {
  viewBox: SvgViewBox;
  px: (value: number) => number;
};
export const FREEHAND_CANDIDATE_SETTINGS: readonly FreehandCandidateSetting[] = [
  {
    id: 'balanced-lines',
    label: 'Balanced Lines',
    description: 'Line fit',
    toolset: 'lines',
    toleranceScale: 0.8,
    minToleranceMm: 0.5,
    proximityScale: 1,
  },
  {
    id: 'arc-blend-fine',
    label: 'Arc Blend Fine',
    description: 'Fine line + CONV/CONC',
    toolset: 'arcs',
    toleranceScale: 0.75,
    minToleranceMm: 0.45,
    proximityScale: 0.7,
  },
  {
    id: 'arc-blend-balanced',
    label: 'Arc Blend Balanced',
    description: 'Balanced line + CONV/CONC',
    toolset: 'arcs',
    toleranceScale: 1.2,
    minToleranceMm: 0.7,
    proximityScale: 1,
  },
  {
    id: 'arc-blend-coarse',
    label: 'Arc Blend Coarse',
    description: 'Coarse line + CONV/CONC',
    toolset: 'arcs',
    toleranceScale: 1.8,
    minToleranceMm: 0.95,
    proximityScale: 1.4,
  },
  {
    id: 'smooth-spline-fine',
    label: 'Smooth Spline Fine',
    description: 'Fine BSPLINE fit',
    toolset: 'spline',
    toleranceScale: 0.9,
    minToleranceMm: 0.55,
    proximityScale: 0.85,
  },
  {
    id: 'smooth-spline-balanced',
    label: 'Smooth Spline Balanced',
    description: 'Balanced BSPLINE fit',
    toolset: 'spline',
    toleranceScale: 1.5,
    minToleranceMm: 0.8,
    proximityScale: 1.2,
  },
  {
    id: 'smooth-spline-coarse',
    label: 'Smooth Spline Coarse',
    description: 'Coarse BSPLINE fit',
    toolset: 'spline',
    toleranceScale: 2.2,
    minToleranceMm: 1.1,
    proximityScale: 1.7,
  },
  {
    id: 'simple-lines',
    label: 'Simple Lines',
    description: 'Reduced line fit',
    toolset: 'lines',
    toleranceScale: 1.9,
    minToleranceMm: 1,
    proximityScale: 1.5,
  },
];
