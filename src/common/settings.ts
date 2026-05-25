export const PX_PER_MM_OPTIONS = [10, 50, 100, 250, 500, 750, 1000] as const;
export const PX_PER_MM_STORAGE_KEY = 'pxPerMm';
export const PLANNER_ENGINE_OPTIONS = ['pixel', 'vector'] as const;
export const DEFAULT_OPENROUTER_MODEL = 'deepseek/deepseek-v4-pro';
export const DEFAULT_OPENROUTER_VISION_MODEL = 'google/gemini-3.1-flash-lite-preview';

export type PlannerEngine = typeof PLANNER_ENGINE_OPTIONS[number];

export type AppSettings = {
  pxPerMm: number,
  plannerEngine: PlannerEngine,
  cuttingEdgeThicknessPx: number,
  optimizeEpsilonDegrees: number,
  smoothingEpsilonPx: number,
  plannerCanvasSizePx: number,
  plannerPreviewSourcePixelLimit: number,
  moveTimeoutMs: number,
  stlDebugCanvasSizePx: number,
  partRevolutionDegrees: number,
  vectorComparisonToleranceMm: number,
  vectorContactClearanceMm: number,
  vectorToolpathGougeToleranceAreaMm2: number,
  vectorFinalLeftoverMinToleranceAreaMm2: number,
  vectorGeometryLinearToleranceMm: number,
  vectorMinimumCutDepthMm: number,
  vectorMinimumRoughChipAreaMm2: number,
  vectorMinimumUsefulCutMm: number,
  vectorPassInsetMm: number,
  vectorCandidateMarginMm: number,
  vectorCandidateMinimumStepMm: number,
  vectorFaceCreepBoundaryRangeMm: number,
  vectorFaceCreepMinimumStepMm: number,
  vectorBoundaryCleanupMinAreaMm2: number,
  vectorRadialBoundaryToleranceMm: number,
  vectorFinishChordMinMm: number,
  vectorFinishChordMaxMm: number,
  vectorSpanSampleOffsetMaxMm: number,
  vectorBinarySearchIterations: number,
  polygonEpsilonMm: number,
  polygonClipperScale: number,
  toolGeometryCircleSteps: number,
  toolGeometryOvertravelScanSteps: number,
  toolGeometryOvertravelBinarySearchIterations: number,
  toolGeometryBoundaryToleranceMm: number,
  stlProjectionScale: number,
  stlCutPlaneToleranceMm: number,
  stlProjectionMinimumAreaPx2: number,
  stlConstantRadiusTolerancePx: number,
  stlSizeMatchTolerance: number,
  showNanoElsH4Controls: boolean,
  openRouterApiKey: string,
  openRouterModel: string,
  openRouterVisionModel: string,
};

export type AppSettingKey = keyof AppSettings;

type BaseAppSettingDefinition = {
  key: AppSettingKey,
  label: string,
  storageKey: string,
  guidance: string,
};

export type NumericAppSettingDefinition = BaseAppSettingDefinition & {
  type: 'number',
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  reasonableValues: string,
  integer?: boolean,
};

export type SelectAppSettingDefinition = BaseAppSettingDefinition & {
  type: 'select',
  defaultValue: PlannerEngine,
  options: readonly {
    value: PlannerEngine,
    label: string,
  }[],
};

export type BooleanAppSettingDefinition = BaseAppSettingDefinition & {
  type: 'boolean',
  defaultValue: boolean,
};

export type TextAppSettingDefinition = BaseAppSettingDefinition & {
  type: 'text',
  defaultValue: string,
  inputType?: 'text' | 'password',
  placeholder?: string,
  allowEmpty?: boolean,
};

export type AppSettingDefinition =
  NumericAppSettingDefinition
  | SelectAppSettingDefinition
  | BooleanAppSettingDefinition
  | TextAppSettingDefinition;

export type AppSettingSectionDefinition = {
  id: string,
  label: string,
  guidance: string,
  plannerEngines?: readonly PlannerEngine[],
  definitions: readonly AppSettingDefinition[],
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  pxPerMm: 100,
  plannerEngine: 'pixel',
  cuttingEdgeThicknessPx: 2,
  optimizeEpsilonDegrees: 0.05,
  smoothingEpsilonPx: 0.9,
  plannerCanvasSizePx: 500,
  plannerPreviewSourcePixelLimit: 1000000000,
  moveTimeoutMs: 50,
  stlDebugCanvasSizePx: 500,
  partRevolutionDegrees: 360,
  vectorComparisonToleranceMm: 1e-6,
  vectorContactClearanceMm: 1e-4,
  vectorToolpathGougeToleranceAreaMm2: 1e-4,
  vectorFinalLeftoverMinToleranceAreaMm2: 0.5,
  vectorGeometryLinearToleranceMm: 0.001,
  vectorMinimumCutDepthMm: 0.001,
  vectorMinimumRoughChipAreaMm2: 0.001,
  vectorMinimumUsefulCutMm: 0.001,
  vectorPassInsetMm: 0.001,
  vectorCandidateMarginMm: 0.001,
  vectorCandidateMinimumStepMm: 0.05,
  vectorFaceCreepBoundaryRangeMm: 0.5,
  vectorFaceCreepMinimumStepMm: 0.025,
  vectorBoundaryCleanupMinAreaMm2: 1e-5,
  vectorRadialBoundaryToleranceMm: 0.001,
  vectorFinishChordMinMm: 0.05,
  vectorFinishChordMaxMm: 0.1,
  vectorSpanSampleOffsetMaxMm: 1e-5,
  vectorBinarySearchIterations: 20,
  polygonEpsilonMm: 1e-9,
  polygonClipperScale: 100000,
  toolGeometryCircleSteps: 48,
  toolGeometryOvertravelScanSteps: 100,
  toolGeometryOvertravelBinarySearchIterations: 24,
  toolGeometryBoundaryToleranceMm: 1e-6,
  stlProjectionScale: 100000,
  stlCutPlaneToleranceMm: 1e-6,
  stlProjectionMinimumAreaPx2: 0.001,
  stlConstantRadiusTolerancePx: 1,
  stlSizeMatchTolerance: 0.2,
  showNanoElsH4Controls: false,
  openRouterApiKey: '',
  openRouterModel: DEFAULT_OPENROUTER_MODEL,
  openRouterVisionModel: DEFAULT_OPENROUTER_VISION_MODEL,
};

export const DEFAULT_PX_PER_MM = DEFAULT_APP_SETTINGS.pxPerMm;
export const DEFAULT_PLANNER_ENGINE = DEFAULT_APP_SETTINGS.plannerEngine;
export const CUTTING_EDGE_THICKNESS_PX = DEFAULT_APP_SETTINGS.cuttingEdgeThicknessPx;
export const OPTIMIZE_EPSILON_DEGREES = DEFAULT_APP_SETTINGS.optimizeEpsilonDegrees;
export const SMOOTHING_EPSILON_PX = DEFAULT_APP_SETTINGS.smoothingEpsilonPx;
export const PLANNER_CANVAS_SIZE_PX = DEFAULT_APP_SETTINGS.plannerCanvasSizePx;
export const DEFAULT_MOVE_TIMEOUT_MS = DEFAULT_APP_SETTINGS.moveTimeoutMs;
export const STL_DEBUG_CANVAS_SIZE_PX = DEFAULT_APP_SETTINGS.stlDebugCanvasSizePx;

export const APP_SETTING_SECTIONS: readonly AppSettingSectionDefinition[] = [
  {
    id: 'planning',
    label: 'Planning',
    guidance: 'Core planner selection and resolution shared by planning and STL import.',
    definitions: [
      {
        key: 'pxPerMm',
        type: 'number',
        label: 'Pixels per mm',
        storageKey: PX_PER_MM_STORAGE_KEY,
        defaultValue: DEFAULT_APP_SETTINGS.pxPerMm,
        min: 10,
        max: 1000,
        step: 1,
        unit: 'px/mm',
        reasonableValues: PX_PER_MM_OPTIONS.join(', '),
        guidance: 'Raster resolution for planning and STL import. Higher values preserve more detail but make planning slower and memory-heavy.',
        integer: true,
      },
      {
        key: 'plannerEngine',
        type: 'select',
        label: 'Planner engine',
        storageKey: 'plannerEngine',
        defaultValue: DEFAULT_APP_SETTINGS.plannerEngine,
        options: [
          {value: 'pixel', label: 'Pixel (stable)'},
          {value: 'vector', label: 'Vector (experimental)'},
        ],
        guidance: 'Choose the stable pixel planner or the experimental vector planner. Pixel remains the default because it is currently more reliable.',
      },
    ],
  },
  {
    id: 'pixelPlanner',
    label: 'Pixel Planner',
    guidance: 'Raster planner controls that affect pixel cutting, move merging, and generated GCode.',
    plannerEngines: ['pixel'],
    definitions: [
      {
        key: 'cuttingEdgeThicknessPx',
        type: 'number',
        label: 'Cutting edge thickness',
        storageKey: 'cuttingEdgeThicknessPx',
        defaultValue: DEFAULT_APP_SETTINGS.cuttingEdgeThicknessPx,
        min: 1,
        max: 10,
        step: 1,
        unit: 'px',
        reasonableValues: '1 to 5',
        guidance: 'Number of tool-color pixels treated as the active cutting edge. Increase only if tool outlines are too thin or fragmented.',
        integer: true,
      },
      {
        key: 'optimizeEpsilonDegrees',
        type: 'number',
        label: 'Cone optimization angle tolerance',
        storageKey: 'optimizeEpsilonDegrees',
        defaultValue: DEFAULT_APP_SETTINGS.optimizeEpsilonDegrees,
        min: 0,
        max: 1,
        step: 0.01,
        unit: 'degrees',
        reasonableValues: '0.01 to 0.2',
        guidance: 'Maximum angle difference for merging repeating cone-like move patterns. Higher values reduce moves but can alter geometry.',
      },
      {
        key: 'smoothingEpsilonPx',
        type: 'number',
        label: 'Move smoothing tolerance',
        storageKey: 'smoothingEpsilonPx',
        defaultValue: DEFAULT_APP_SETTINGS.smoothingEpsilonPx,
        min: 0,
        max: 5,
        step: 0.05,
        unit: 'px',
        reasonableValues: '0.2 to 1.5',
        guidance: 'Maximum pixel deviation allowed when smoothing adjacent moves. Higher values produce shorter GCode with less pixel-level fidelity.',
      },
    ],
  },
  {
    id: 'vectorPlanner',
    label: 'Vector Planner Advanced',
    guidance: 'Geometry tolerances for the experimental vector planner. Defaults match the built-in planner behavior.',
    plannerEngines: ['vector'],
    definitions: [
      {
        key: 'vectorComparisonToleranceMm',
        type: 'number',
        label: 'Comparison tolerance',
        storageKey: 'vectorComparisonToleranceMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorComparisonToleranceMm,
        min: 0,
        max: 0.001,
        step: 0.000001,
        unit: 'mm',
        reasonableValues: '0.000001 to 0.00001',
        guidance: 'Tiny coordinate tolerance used for equality and loop progress checks. Increase only for numerical instability.',
      },
      {
        key: 'vectorContactClearanceMm',
        type: 'number',
        label: 'Finish contact clearance',
        storageKey: 'vectorContactClearanceMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorContactClearanceMm,
        min: 0,
        max: 0.01,
        step: 0.0001,
        unit: 'mm',
        reasonableValues: '0 to 0.001',
        guidance: 'Small offset between preferred finishing contact and exact tool contact. Lower values cut closer but may touch protected boundaries.',
      },
      {
        key: 'vectorToolpathGougeToleranceAreaMm2',
        type: 'number',
        label: 'Gouge tolerance area',
        storageKey: 'vectorToolpathGougeToleranceAreaMm2',
        defaultValue: DEFAULT_APP_SETTINGS.vectorToolpathGougeToleranceAreaMm2,
        min: 0,
        max: 0.1,
        step: 0.0001,
        unit: 'mm2',
        reasonableValues: '0.00001 to 0.001',
        guidance: 'Allowed protected-area overlap during swept-tool checks. Keep this small; larger values can hide real gouges.',
      },
      {
        key: 'vectorFinalLeftoverMinToleranceAreaMm2',
        type: 'number',
        label: 'Leftover stock report threshold',
        storageKey: 'vectorFinalLeftoverMinToleranceAreaMm2',
        defaultValue: DEFAULT_APP_SETTINGS.vectorFinalLeftoverMinToleranceAreaMm2,
        min: 0,
        max: 10,
        step: 0.01,
        unit: 'mm2',
        reasonableValues: '0.1 to 1',
        guidance: 'Minimum leftover-stock area before final vector verification reports uncut material.',
      },
      {
        key: 'vectorGeometryLinearToleranceMm',
        type: 'number',
        label: 'Geometry linear tolerance',
        storageKey: 'vectorGeometryLinearToleranceMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorGeometryLinearToleranceMm,
        min: 0,
        max: 0.1,
        step: 0.0001,
        unit: 'mm',
        reasonableValues: '0.0005 to 0.005',
        guidance: 'Linear tolerance used when scaling verification area allowances for polygon and chord approximation.',
      },
      {
        key: 'vectorMinimumCutDepthMm',
        type: 'number',
        label: 'Minimum cut depth',
        storageKey: 'vectorMinimumCutDepthMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorMinimumCutDepthMm,
        min: 0.000001,
        max: 0.1,
        step: 0.0001,
        unit: 'mm',
        reasonableValues: '0.0005 to 0.005',
        guidance: 'Lower bound for cut and finish widths used by vector pass planning.',
      },
      {
        key: 'vectorMinimumRoughChipAreaMm2',
        type: 'number',
        label: 'Minimum rough chip area',
        storageKey: 'vectorMinimumRoughChipAreaMm2',
        defaultValue: DEFAULT_APP_SETTINGS.vectorMinimumRoughChipAreaMm2,
        min: 0,
        max: 1,
        step: 0.0001,
        unit: 'mm2',
        reasonableValues: '0.0005 to 0.01',
        guidance: 'Smallest roughing chip area worth planning. Raising this reduces tiny rough moves and leaves more to finishing.',
      },
      {
        key: 'vectorMinimumUsefulCutMm',
        type: 'number',
        label: 'Minimum useful cut length',
        storageKey: 'vectorMinimumUsefulCutMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorMinimumUsefulCutMm,
        min: 0,
        max: 0.1,
        step: 0.0001,
        unit: 'mm',
        reasonableValues: '0.0005 to 0.005',
        guidance: 'Minimum material depth or safe prefix length before a vector cut is considered useful.',
      },
      {
        key: 'vectorPassInsetMm',
        type: 'number',
        label: 'Pass edge inset',
        storageKey: 'vectorPassInsetMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorPassInsetMm,
        min: 0,
        max: 0.05,
        step: 0.0001,
        unit: 'mm',
        reasonableValues: '0.0005 to 0.005',
        guidance: 'Small inset used to sample inside a roughing band rather than exactly on a polygon edge.',
      },
      {
        key: 'vectorCandidateMarginMm',
        type: 'number',
        label: 'Candidate edge margin',
        storageKey: 'vectorCandidateMarginMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorCandidateMarginMm,
        min: 0,
        max: 0.05,
        step: 0.0001,
        unit: 'mm',
        reasonableValues: '0.0005 to 0.005',
        guidance: 'Margin from span edges when choosing candidate plunge and turn start locations.',
      },
      {
        key: 'vectorCandidateMinimumStepMm',
        type: 'number',
        label: 'Candidate minimum step',
        storageKey: 'vectorCandidateMinimumStepMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorCandidateMinimumStepMm,
        min: 0.001,
        max: 1,
        step: 0.001,
        unit: 'mm',
        reasonableValues: '0.02 to 0.1',
        guidance: 'Smallest spacing between sampled candidate roughing locations. Lower values search more positions and can slow planning.',
      },
      {
        key: 'vectorFaceCreepBoundaryRangeMm',
        type: 'number',
        label: 'Face creep boundary range',
        storageKey: 'vectorFaceCreepBoundaryRangeMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorFaceCreepBoundaryRangeMm,
        min: 0,
        max: 5,
        step: 0.01,
        unit: 'mm',
        reasonableValues: '0.1 to 1',
        guidance: 'Distance from the radial boundary where face roughing may add sideways cleanup creep moves.',
      },
      {
        key: 'vectorFaceCreepMinimumStepMm',
        type: 'number',
        label: 'Face creep minimum step',
        storageKey: 'vectorFaceCreepMinimumStepMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorFaceCreepMinimumStepMm,
        min: 0.001,
        max: 0.5,
        step: 0.001,
        unit: 'mm',
        reasonableValues: '0.01 to 0.05',
        guidance: 'Smallest step for sideways face cleanup creep. Lower values are finer but slower.',
      },
      {
        key: 'vectorBoundaryCleanupMinAreaMm2',
        type: 'number',
        label: 'Boundary cleanup minimum area',
        storageKey: 'vectorBoundaryCleanupMinAreaMm2',
        defaultValue: DEFAULT_APP_SETTINGS.vectorBoundaryCleanupMinAreaMm2,
        min: 0,
        max: 0.01,
        step: 0.00001,
        unit: 'mm2',
        reasonableValues: '0.00001 to 0.0001',
        guidance: 'Minimum extra swept material needed before non-terminal radial boundary overtravel is kept.',
      },
      {
        key: 'vectorRadialBoundaryToleranceMm',
        type: 'number',
        label: 'Radial boundary tolerance',
        storageKey: 'vectorRadialBoundaryToleranceMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorRadialBoundaryToleranceMm,
        min: 0,
        max: 0.05,
        step: 0.0001,
        unit: 'mm',
        reasonableValues: '0.0005 to 0.005',
        guidance: 'Tolerance for recognizing centerline, bore, or OD radial-boundary cleanup points.',
      },
      {
        key: 'vectorFinishChordMinMm',
        type: 'number',
        label: 'Finish chord minimum',
        storageKey: 'vectorFinishChordMinMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorFinishChordMinMm,
        min: 0.001,
        max: 1,
        step: 0.001,
        unit: 'mm',
        reasonableValues: '0.02 to 0.1',
        guidance: 'Lower bound for curve chord length in vector profile approximation. Smaller values preserve more detail and may slow clipping.',
      },
      {
        key: 'vectorFinishChordMaxMm',
        type: 'number',
        label: 'Finish chord maximum',
        storageKey: 'vectorFinishChordMaxMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorFinishChordMaxMm,
        min: 0.001,
        max: 2,
        step: 0.001,
        unit: 'mm',
        reasonableValues: '0.05 to 0.2',
        guidance: 'Upper bound for curve chord length in vector profile approximation. Larger values are faster but less accurate on curves.',
      },
      {
        key: 'vectorSpanSampleOffsetMaxMm',
        type: 'number',
        label: 'Span sample offset maximum',
        storageKey: 'vectorSpanSampleOffsetMaxMm',
        defaultValue: DEFAULT_APP_SETTINGS.vectorSpanSampleOffsetMaxMm,
        min: 0,
        max: 0.001,
        step: 0.000001,
        unit: 'mm',
        reasonableValues: '0.000001 to 0.00005',
        guidance: 'Maximum tiny offset used when sampling spans beside polygon edges.',
      },
      {
        key: 'vectorBinarySearchIterations',
        type: 'number',
        label: 'Safe-prefix search iterations',
        storageKey: 'vectorBinarySearchIterations',
        defaultValue: DEFAULT_APP_SETTINGS.vectorBinarySearchIterations,
        min: 1,
        max: 60,
        step: 1,
        unit: 'iterations',
        reasonableValues: '12 to 30',
        guidance: 'Iterations used when binary-searching the longest safe prefix of a candidate vector move.',
        integer: true,
      },
    ],
  },
  {
    id: 'geometry',
    label: 'Geometry Advanced',
    guidance: 'Shared polygon and tool-footprint tolerances used by vector planning and geometry clipping.',
    plannerEngines: ['vector'],
    definitions: [
      {
        key: 'polygonEpsilonMm',
        type: 'number',
        label: 'Polygon epsilon',
        storageKey: 'polygonEpsilonMm',
        defaultValue: DEFAULT_APP_SETTINGS.polygonEpsilonMm,
        min: 0,
        max: 0.000001,
        step: 0.000000001,
        unit: 'mm',
        reasonableValues: '0.000000001 to 0.00000001',
        guidance: 'Tiny tolerance for polygon duplicate points, span merging, and area filters before fixed-point clipping.',
      },
      {
        key: 'polygonClipperScale',
        type: 'number',
        label: 'Polygon fixed-point scale',
        storageKey: 'polygonClipperScale',
        defaultValue: DEFAULT_APP_SETTINGS.polygonClipperScale,
        min: 1000,
        max: 10000000,
        step: 1000,
        unit: 'units/mm',
        reasonableValues: '100000 to 1000000',
        guidance: 'Scale factor for converting vector geometry to integer coordinates for Clipper operations. Higher values preserve more precision but reduce safe coordinate range.',
        integer: true,
      },
      {
        key: 'toolGeometryCircleSteps',
        type: 'number',
        label: 'Tool circle steps',
        storageKey: 'toolGeometryCircleSteps',
        defaultValue: DEFAULT_APP_SETTINGS.toolGeometryCircleSteps,
        min: 8,
        max: 360,
        step: 1,
        unit: 'segments',
        reasonableValues: '32 to 96',
        guidance: 'Number of segments used to approximate full circular tool noses and rounded corners. Higher values are smoother and slower.',
        integer: true,
      },
      {
        key: 'toolGeometryOvertravelScanSteps',
        type: 'number',
        label: 'Boundary overtravel scan steps',
        storageKey: 'toolGeometryOvertravelScanSteps',
        defaultValue: DEFAULT_APP_SETTINGS.toolGeometryOvertravelScanSteps,
        min: 10,
        max: 1000,
        step: 1,
        unit: 'steps',
        reasonableValues: '50 to 200',
        guidance: 'Coarse scan steps for finding useful radial-boundary overtravel from the tool footprint.',
        integer: true,
      },
      {
        key: 'toolGeometryOvertravelBinarySearchIterations',
        type: 'number',
        label: 'Boundary overtravel refine iterations',
        storageKey: 'toolGeometryOvertravelBinarySearchIterations',
        defaultValue: DEFAULT_APP_SETTINGS.toolGeometryOvertravelBinarySearchIterations,
        min: 1,
        max: 60,
        step: 1,
        unit: 'iterations',
        reasonableValues: '16 to 32',
        guidance: 'Binary-search iterations for refining radial-boundary overtravel after the coarse scan finds a crossing.',
        integer: true,
      },
      {
        key: 'toolGeometryBoundaryToleranceMm',
        type: 'number',
        label: 'Tool boundary tolerance',
        storageKey: 'toolGeometryBoundaryToleranceMm',
        defaultValue: DEFAULT_APP_SETTINGS.toolGeometryBoundaryToleranceMm,
        min: 0,
        max: 0.001,
        step: 0.000001,
        unit: 'mm',
        reasonableValues: '0.000001 to 0.00001',
        guidance: 'Tolerance for deciding whether a tool footprint span covers the full tool width at a boundary sample.',
      },
    ],
  },
  {
    id: 'stlImport',
    label: 'STL Import Advanced',
    guidance: 'Numerical tolerances used when projecting or slicing STL meshes into lathe profiles.',
    definitions: [
      {
        key: 'stlProjectionScale',
        type: 'number',
        label: 'STL projection scale',
        storageKey: 'stlProjectionScale',
        defaultValue: DEFAULT_APP_SETTINGS.stlProjectionScale,
        min: 1000,
        max: 1000000,
        step: 1000,
        unit: 'units/mm',
        reasonableValues: '100000 to 200000',
        guidance: 'Scale used to round projected triangle coordinates before polygon union. Higher values preserve detail but can make clipping noisier.',
        integer: true,
      },
      {
        key: 'stlCutPlaneToleranceMm',
        type: 'number',
        label: 'STL cut-plane tolerance',
        storageKey: 'stlCutPlaneToleranceMm',
        defaultValue: DEFAULT_APP_SETTINGS.stlCutPlaneToleranceMm,
        min: 0.000000001,
        max: 0.001,
        step: 0.000001,
        unit: 'mm',
        reasonableValues: '0.000001 to 0.00001',
        guidance: 'Distance tolerance for classifying STL vertices and faces as lying on a slicing plane.',
      },
      {
        key: 'stlProjectionMinimumAreaPx2',
        type: 'number',
        label: 'STL minimum projection area',
        storageKey: 'stlProjectionMinimumAreaPx2',
        defaultValue: DEFAULT_APP_SETTINGS.stlProjectionMinimumAreaPx2,
        min: 0,
        max: 10,
        step: 0.001,
        unit: 'px2',
        reasonableValues: '0.001 to 0.1',
        guidance: 'Minimum projected polygon area kept after STL section cleanup.',
      },
      {
        key: 'stlConstantRadiusTolerancePx',
        type: 'number',
        label: 'STL constant radius tolerance',
        storageKey: 'stlConstantRadiusTolerancePx',
        defaultValue: DEFAULT_APP_SETTINGS.stlConstantRadiusTolerancePx,
        min: 0,
        max: 20,
        step: 0.1,
        unit: 'px',
        reasonableValues: '0.5 to 2',
        guidance: 'Pixel tolerance for recognizing an imported inner profile as a constant stock bore radius.',
      },
      {
        key: 'stlSizeMatchTolerance',
        type: 'number',
        label: 'STL size match tolerance',
        storageKey: 'stlSizeMatchTolerance',
        defaultValue: DEFAULT_APP_SETTINGS.stlSizeMatchTolerance,
        min: 0,
        max: 2,
        step: 0.01,
        unit: 'ratio',
        reasonableValues: '0.1 to 0.4',
        guidance: 'Relative bounding-box mismatch allowed when ranking candidate STL projections against the source mesh size.',
      },
    ],
  },
  {
    id: 'preview',
    label: 'Preview And Debug',
    guidance: 'Display-only settings for previews and diagnostic canvases.',
    definitions: [
      {
        key: 'partRevolutionDegrees',
        type: 'number',
        label: '3D part revolution',
        storageKey: 'partRevolutionDegrees',
        defaultValue: DEFAULT_APP_SETTINGS.partRevolutionDegrees,
        min: 45,
        max: 360,
        step: 1,
        unit: 'degrees',
        reasonableValues: '180 to 360',
        guidance: 'Angular sweep used when revolving the part in the 3D preview. Use 360 for a complete solid or 270 for a cutaway view.',
        integer: true,
      },
      {
        key: 'plannerCanvasSizePx',
        type: 'number',
        label: 'Planner preview size',
        storageKey: 'plannerCanvasSizePx',
        defaultValue: DEFAULT_APP_SETTINGS.plannerCanvasSizePx,
        min: 100,
        max: 2000,
        step: 50,
        unit: 'px',
        reasonableValues: '300 to 1000',
        guidance: 'Target size for planner and toolpath previews. This affects display size, not generated machine coordinates.',
        integer: true,
      },
      {
        key: 'plannerPreviewSourcePixelLimit',
        type: 'number',
        label: 'Planner preview source pixel limit',
        storageKey: 'plannerPreviewSourcePixelLimit',
        defaultValue: DEFAULT_APP_SETTINGS.plannerPreviewSourcePixelLimit,
        min: 0,
        max: 10000000000,
        step: 1000000,
        unit: 'px',
        reasonableValues: '10000000 to 1000000000',
        guidance: 'Largest pixel-planner source bitmap eligible for uncut-area preview generation. Lower this to avoid extra preview scan time on huge high-resolution jobs; set 0 to disable these previews.',
        integer: true,
      },
      {
        key: 'moveTimeoutMs',
        type: 'number',
        label: 'Toolpath draw delay',
        storageKey: 'moveTimeoutMs',
        defaultValue: DEFAULT_APP_SETTINGS.moveTimeoutMs,
        min: 0,
        max: 1000,
        step: 1,
        unit: 'ms',
        reasonableValues: '0 to 100',
        guidance: 'Delay between drawn toolpath moves. Use 0 for immediate rendering; URL parameter moveTimeout still overrides this value.',
        integer: true,
      },
      {
        key: 'stlDebugCanvasSizePx',
        type: 'number',
        label: 'STL debug preview size',
        storageKey: 'stlDebugCanvasSizePx',
        defaultValue: DEFAULT_APP_SETTINGS.stlDebugCanvasSizePx,
        min: 100,
        max: 2000,
        step: 50,
        unit: 'px',
        reasonableValues: '300 to 1000',
        guidance: 'Canvas size for STL projection debug views. This affects debug display only.',
        integer: true,
      },
    ],
  },
  {
    id: 'gcodeOutput',
    label: 'GCode Output',
    guidance: 'Controls for generated G-code output actions and sender integrations.',
    definitions: [
      {
        key: 'showNanoElsH4Controls',
        type: 'boolean',
        label: 'Show NanoEls H4 controls',
        storageKey: 'showNanoElsH4Controls',
        defaultValue: DEFAULT_APP_SETTINGS.showNanoElsH4Controls,
        guidance: 'Show browser Serial API buttons for running or saving generated G-code on NanoEls H4. Keep this off if you usually copy G-code or use another controller.',
      },
    ],
  },
  {
    id: 'llm',
    label: 'LLM',
    guidance: 'OpenRouter settings used by prompt, drawing, and editor modification actions. LLM actions send only the data needed for that action from this browser to OpenRouter.',
    definitions: [
      {
        key: 'openRouterApiKey',
        type: 'text',
        label: 'OpenRouter API key',
        storageKey: 'openRouterApiKey',
        defaultValue: DEFAULT_APP_SETTINGS.openRouterApiKey,
        inputType: 'password',
        placeholder: 'sk-or-...',
        allowEmpty: true,
        guidance: 'Stored locally in this browser. LLM requests use OpenRouter provider filters that deny data-collecting and non-ZDR endpoints.',
      },
      {
        key: 'openRouterModel',
        type: 'text',
        label: 'OpenRouter text model',
        storageKey: 'openRouterModel',
        defaultValue: DEFAULT_APP_SETTINGS.openRouterModel,
        placeholder: DEFAULT_OPENROUTER_MODEL,
        guidance: 'Model used for text prompts and editor modifications.',
      },
      {
        key: 'openRouterVisionModel',
        type: 'text',
        label: 'OpenRouter vision model',
        storageKey: 'openRouterVisionModel',
        defaultValue: DEFAULT_APP_SETTINGS.openRouterVisionModel,
        placeholder: DEFAULT_OPENROUTER_VISION_MODEL,
        guidance: 'Model used for technical drawing image uploads. DeepSeek V3.2 is text-only on OpenRouter, so image input needs a vision-capable model.',
      },
    ],
  },
];

export const APP_SETTING_DEFINITIONS: readonly AppSettingDefinition[] = APP_SETTING_SECTIONS.flatMap(section => section.definitions);

type RawAppSettingValue = number | string | boolean | null | undefined;
type AppSettingValue = number | PlannerEngine | boolean | string;

export function parsePxPerMm(value: number | string | null | undefined): number {
  return parseNumericAppSetting(getNumericAppSettingDefinition('pxPerMm'), value);
}

export function normalizeAppSettings(values: Partial<Record<AppSettingKey, RawAppSettingValue>> = {}): AppSettings {
  const settings = {...DEFAULT_APP_SETTINGS} as Record<AppSettingKey, AppSettingValue>;
  for (const definition of APP_SETTING_DEFINITIONS) {
    settings[definition.key] = parseAppSetting(definition, values[definition.key]);
  }
  return settings as AppSettings;
}

export function loadAppSettings(storage: Storage = localStorage): AppSettings {
  const values: Partial<Record<AppSettingKey, string | null>> = {};
  for (const definition of APP_SETTING_DEFINITIONS) {
    values[definition.key] = storage.getItem(definition.storageKey);
  }
  return normalizeAppSettings(values);
}

export function saveAppSettings(settings: Partial<AppSettings>, storage: Storage = localStorage): AppSettings {
  const normalized = normalizeAppSettings(settings);
  for (const definition of APP_SETTING_DEFINITIONS) {
    storage.setItem(definition.storageKey, String(normalized[definition.key]));
  }
  return normalized;
}

function parseAppSetting(definition: AppSettingDefinition, value: RawAppSettingValue): AppSettingValue {
  if (definition.type === 'select') return parseSelectAppSetting(definition, value);
  if (definition.type === 'boolean') return parseBooleanAppSetting(definition, value);
  if (definition.type === 'text') return parseTextAppSetting(definition, value);
  return parseNumericAppSetting(definition, value);
}

function parseSelectAppSetting(definition: SelectAppSettingDefinition, value: RawAppSettingValue): PlannerEngine {
  if (typeof value !== 'string') return definition.defaultValue;
  return definition.options.some(option => option.value === value) ? value as PlannerEngine : definition.defaultValue;
}

function parseNumericAppSetting(definition: NumericAppSettingDefinition, value: RawAppSettingValue): number {
  if (value === null || value === undefined || value === '') return definition.defaultValue;
  if (typeof value === 'boolean') return definition.defaultValue;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return definition.defaultValue;
  const rounded = definition.integer ? Math.round(numberValue) : numberValue;
  return Math.min(definition.max, Math.max(definition.min, rounded));
}

function parseBooleanAppSetting(definition: BooleanAppSettingDefinition, value: RawAppSettingValue): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return definition.defaultValue;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return definition.defaultValue;
}

function parseTextAppSetting(definition: TextAppSettingDefinition, value: RawAppSettingValue): string {
  if (value === null || value === undefined) return definition.defaultValue;
  if (typeof value === 'boolean') return definition.defaultValue;
  const textValue = String(value).trim();
  if (!textValue && !definition.allowEmpty) return definition.defaultValue;
  return textValue;
}

function getNumericAppSettingDefinition(key: AppSettingKey): NumericAppSettingDefinition {
  const definition = APP_SETTING_DEFINITIONS.find((d): d is NumericAppSettingDefinition => d.key === key && d.type === 'number');
  if (!definition) throw new Error(`Unknown numeric app setting: ${key}`);
  return definition;
}
