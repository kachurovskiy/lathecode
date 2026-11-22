import { describe, expect, it } from 'vitest';
import { LatheCode } from '../common/lathecode';
import { applyDrawingFeatureCorrections, buildLatheCodeFromDrawing, buildOutgoingLatheCodeFromDrawing, getDrawingFeatureCorrections } from './serialization';
import { canSelectedSegmentEndpointHaveFeature, cloneDrawingState, createInitialState, ensureProfileEnabled, getDefaultSegmentFeatureSize, insertPoint, recordUndoState, redoDrawingState, resizeDrawing, setSelectedSegmentTool, undoDrawingState, updatePointPosition } from './state';
import { START_SAMPLE_DEFINITIONS } from '../start/samples';
import type { DrawingState, ProfileDraft, SegmentEdgeFeatures } from './types';

describe('profile serialization', () => {
  const inchTube = '; Inch tube job\r\nUNITS IN ; drawing units\r\nSTOCK D1 ID0.25 A0.05 ; existing hole\r\nTOOL RECT R0.01 L0.08\r\nDEPTH CUT0.02 FINISH0.005\r\nFEED MOVE10 PASS2 PART1\r\nMODE FACE\r\nAXES RIGHT DOWN\r\n\r\n; First shoulder\r\nL0.5 D0.6 CH0.02 ; keep this edge\r\nL0.5 D0.8 ; body\r\n; End of job\r\n';

  it.each([
    ['inch tube with setup and comments', inchTube],
    ['implicit setup', '; original\nL10 R5\n'],
    ['mixed source line endings', '; original\r\nSTOCK D10\nL10 D8\r\n'],
    ['blind bore', 'STOCK D30 ID4\nL50 D26\nINSIDE ; bore\nL30 D8\n; bottom remains solid'],
    ['inside only', 'STOCK D30 ID4\nTOOL RECT R0.2 L2\nINSIDE\nL30 D10'],
    ['cutoffs and multiple parts', 'STOCK D30 ID4\nL10 D20\nL2 ; cutoff\nL15 D24\nL2 ; final cutoff'],
    ['angle and arc definitions', 'STOCK D30\nL10 DS8 A5\nL10 DS12 DE20 CONV\nL10 DS20 DE24 CONC'],
    ['adjacent independent splines', 'STOCK D30\nL10 DS10 DE12 BSPLINE D15 D8\nL10 DS12 DE14 BSPLINE D20 D10'],
    ['spline controls beyond stock', 'STOCK D30\nL20 DS10 DE10 BSPLINE D32 D12'],
    ['zero length source steps', 'STOCK D30\nL10 D10\nL0 DS10 DE20\nL10 D20'],
  ])('round trips %s without changing any source text', (_label, source) => {
    const before = new LatheCode(source);
    const state = createInitialState(source);
    state.activeSide = 'inside';
    ensureProfileEnabled(state, 'inside');
    state.snapMm = 0.25;
    state.gridMm = 2;
    resizeDrawing(state, state.diameterMm, state.lengthMm);
    const output = buildOutgoingLatheCodeFromDrawing(state);
    expect(output).toBe(source);
    const after = new LatheCode(output);
    expect(after.getStock()).toEqual(before.getStock());
    expect(after.getProfiles()).toEqual(before.getProfiles());
  });

  it('round trips every sample without changing machining meaning', () => {
    for (const sample of START_SAMPLE_DEFINITIONS) {
      expect(buildOutgoingLatheCodeFromDrawing(createInitialState(sample.text)), sample.id).toBe(sample.text);
    }
  });

  it('retains setup, source units, cutoffs, and comments after a local geometry edit', () => {
    const source = `${inchTube}L0.08 ; cutoff`;
    const state = createInitialState(source);
    const before = new LatheCode(source);
    // The rightmost point belongs to the first line in the original program.
    const index = state.profiles.outside.points.length - 1;
    updatePointPosition(state, {side: 'outside', index}, {z: state.lengthMm, radius: 7}, false);
    const output = buildOutgoingLatheCodeFromDrawing(state);
    const after = new LatheCode(output);
    expect(output).toContain('UNITS IN ; drawing units');
    expect(output).toContain('STOCK D1 ID0.25 A0.05 ; existing hole');
    expect(output).toContain('L0.5 D0.8 ; body');
    expect(output).toContain('L0.08 ; cutoff');
    expect(output).toContain('; First shoulder');
    expect(output).toContain('; keep this edge');
    expect(output).toContain('; End of job');
    expect(output).not.toContain('INSIDE');
    expect(after.getStock()).toEqual(before.getStock());
    expect(after.getTool()).toEqual(before.getTool());
    expect(after.getFeed()).toEqual(before.getFeed());
    expect(after.getDepth()).toEqual(before.getDepth());
    expect(after.getMode()).toEqual(before.getMode());
    expect(after.getXDirection()).toEqual(before.getXDirection());
    expect(after.getZDirection()).toEqual(before.getZDirection());
    expect(after.getSourceProfileSegmentDefinitions('outside')[0].segment.start.x).toBeCloseTo(7, 9);
  });

  it('keeps stock bore empty without creating an inside machining profile', () => {
    const state = createInitialState('STOCK D30 IR3.175\nL20 D20');
    updatePointPosition(state, {side: 'outside', index: 1}, {z: 20, radius: 9}, false);
    const output = buildOutgoingLatheCodeFromDrawing(state);
    expect(output).not.toContain('INSIDE');
    expect(new LatheCode(output).getStock()?.innerDiameter).toBe(6.35);
  });

  it('preserves blind bore depth when either profile is edited', () => {
    const state = createInitialState('STOCK D30 ID4\nL50 D26\nINSIDE\nL30 D8');
    expect(state.profiles.inside.points[0].z).toBe(20);
    updatePointPosition(state, {side: 'outside', index: 1}, {z: 50, radius: 12}, false);
    expect(buildOutgoingLatheCodeFromDrawing(state)).toContain('INSIDE\nL30 D8');
    updatePointPosition(state, {side: 'inside', index: 0}, {z: 20, radius: 5}, false);
    const inside = new LatheCode(buildOutgoingLatheCodeFromDrawing(state)).getSourceProfileSegmentDefinitions('inside');
    expect(inside).toHaveLength(1);
    expect(inside[0].segment.end.z).toBe(30);
    expect(inside[0].segment.end.x).toBe(5);
  });

  it('does not add outside machining to an inside-only program', () => {
    const state = createInitialState('STOCK D30 ID4\nINSIDE\nL30 D10');
    updatePointPosition(state, {side: 'inside', index: 1}, {z: 30, radius: 6}, false);
    const result = new LatheCode(buildOutgoingLatheCodeFromDrawing(state));
    expect(result.getSourceProfileSegmentDefinitions('outside')).toHaveLength(0);
    expect(result.getStock()?.innerDiameter).toBe(4);
  });

  it('keeps bore headings and footer comments attached when adding profiles', () => {
    const insideOnly = createInitialState('STOCK D30 ID4\n; Bore dimensions\nINSIDE\nL30 D10\n; End of job\n');
    updatePointPosition(insideOnly, {side: 'outside', index: 0}, {z: 0, radius: 14}, false);
    const outsideAdded = buildOutgoingLatheCodeFromDrawing(insideOnly);
    expect(outsideAdded).toContain('; Bore dimensions\nINSIDE\nL30 D10');
    expect(outsideAdded.endsWith('; End of job\n')).toBe(true);

    const outsideOnly = createInitialState('STOCK D30 ID4\nL30 D20\n; End of job\n');
    outsideOnly.profiles.inside.points.forEach(point => point.radius = 4);
    const insideAdded = buildOutgoingLatheCodeFromDrawing(outsideOnly);
    expect(insideAdded).toContain('INSIDE\nL30 D8\n; End of job\n');
    expect(new LatheCode(insideAdded).getStock()?.innerDiameter).toBe(4);
  });

  it('preserves unchanged spline boundaries and angle syntax after other edits', () => {
    const original = 'STOCK D40\nL10 DS10 DE12 BSPLINE D15 D8\nL10 DS12 DE14 BSPLINE D20 D10\nL10 DS14 A5\nL10 D20';
    const state = createInitialState(original);
    updatePointPosition(state, {side: 'outside', index: 0}, {z: 0, radius: 11}, false);
    const output = buildOutgoingLatheCodeFromDrawing(state);
    expect(output).toContain('L10 DS10 DE12 BSPLINE D15 D8\nL10 DS12 DE14 BSPLINE D20 D10\nL10 DS14 A5');
    expect(new LatheCode(output).getSourceProfileSegmentDefinitions('outside')).toHaveLength(4);
  });

  it('keeps endpoint features and comments when splitting a source line', () => {
    const source = 'STOCK D30\nL50 DS20 CH1 DE20 FI1 ; finished edges\n; machining note';
    const state = createInitialState(source);
    insertPoint(state, 'outside', {z: 25, radius: 10}, 'line');
    const output = buildOutgoingLatheCodeFromDrawing(state);
    expect(output).toContain('CH1');
    expect(output).toContain('FI1');
    expect(output).toContain('; finished edges');
    expect(output).toContain('; machining note');
    expect(new LatheCode(output).getSourceProfileSegmentDefinitions('outside')).toHaveLength(2);
  });

  it('pins inferred stock size when reducing a profile diameter', () => {
    const state = createInitialState('UNITS IN\nL1 D1');
    state.profiles.outside.points.forEach(point => point.radius = 10);
    const after = new LatheCode(buildOutgoingLatheCodeFromDrawing(state));
    expect(after.getStock()?.diameter).toBe(25.4);
    expect(after.getPartDimensions()?.diameter).toBeCloseTo(20, 9);
  });

  it('keeps every span when converting an imported spline to lines', () => {
    const state = createInitialState('STOCK D30\nL30 DS10 DE16 BSPLINE D12 D14 ; spline note');
    state.segmentSelection = {side: 'outside', index: 1};
    setSelectedSegmentTool(state, 'line');
    const output = buildOutgoingLatheCodeFromDrawing(state);
    const after = new LatheCode(output);
    expect(after.getSourceProfileSegmentDefinitions('outside')).toHaveLength(3);
    expect(after.getStock()?.length).toBe(30);
    expect(output.match(/spline note/g)).toHaveLength(1);
  });

  it('keeps every span when inserting a point into an imported spline', () => {
    const state = createInitialState('STOCK D30\nL30 DS10 DE16 BSPLINE D12 D14 ; spline note');
    insertPoint(state, 'outside', {z: 15, radius: 6.5}, 'line');
    const output = buildOutgoingLatheCodeFromDrawing(state);
    expect(new LatheCode(output).getStock()?.length).toBe(30);
    expect(output.match(/spline note/g)).toHaveLength(1);
  });

  it('retains spline controls beyond the stock when editing another coordinate', () => {
    const state = createInitialState('STOCK D30\nL20 DS10 DE10 BSPLINE D32 D12');
    const index = state.profiles.outside.points.findIndex(point => point.radius === 16);
    const point = state.profiles.outside.points[index];
    updatePointPosition(state, {side: 'outside', index}, {...point, radius: 16.5}, false);
    expect(state.profiles.outside.points[index].radius).toBe(16.5);
    expect(buildOutgoingLatheCodeFromDrawing(state)).toContain('BSPLINE D33 D12');
  });

  it('adds a control point to the same imported spline', () => {
    const state = createInitialState('STOCK D30\nL30 DS10 DE16 BSPLINE D12 D14 ; spline note');
    insertPoint(state, 'outside', {z: 15, radius: 6.5}, 'spline');
    const after = new LatheCode(buildOutgoingLatheCodeFromDrawing(state));
    const spans = after.getSourceProfileSegmentDefinitions('outside');
    expect(spans).toHaveLength(1);
    expect(spans[0].segment.controlPoints).toHaveLength(5);
    expect(after.getStock()?.length).toBe(30);
  });

  it('preserves bore, allowances and setup during an explicit overall resize', () => {
    const state = createInitialState(inchTube);
    resizeDrawing(state, 50.8, 50.8);
    const output = buildOutgoingLatheCodeFromDrawing(state);
    expect(output).toContain('STOCK D2 ID0.25 A0.05 ; existing hole');
    expect(output).not.toContain('INSIDE');
    expect(new LatheCode(output).getStock()).toEqual({diameter: 50.8, innerDiameter: 6.35, length: 50.8});
  });

  it.each(['L2 ; cutoff', 'L2 D4 ; cutoff'])('keeps a hollow-stock %s at the bore during resizing', cutoff => {
    const original = `STOCK D30 ID4\nL20 D20\n${cutoff}`;
    const state = createInitialState(original);
    resizeDrawing(state, 60, 44);
    const output = buildOutgoingLatheCodeFromDrawing(state);
    const after = new LatheCode(output);
    expect(after.getStock()).toEqual({diameter: 60, innerDiameter: 4, length: 44});
    const cut = after.getSourceProfileSegmentDefinitions('outside').at(-1)!.segment;
    expect(cut.start).toMatchObject({x: 2, z: 40});
    expect(cut.end).toMatchObject({x: 2, z: 44});
    expect(state.profiles.outside.points.slice(0, 2).map(point => point.radius)).toEqual([2, 2]);
    expect(output).toContain('; cutoff');
    if (cutoff === 'L2 ; cutoff') expect(after.getCutoffStarts()).toEqual([40]);
    resizeDrawing(state, 30, 22);
    expect(buildOutgoingLatheCodeFromDrawing(state)).toBe(original);
  });

  it('keeps split cutoffs in inch-based multi-part programs through repeated resizes', () => {
    const state = createInitialState('UNITS IN\nSTOCK D1 ID0.25\nL1 D0.75\nL0.125 ; middle cutoff\nL1 D0.75\nL0.125 ; final cutoff');
    state.snapMm = 0;
    const midpoint = (state.profiles.outside.points[0].z + state.profiles.outside.points[1].z) / 2;
    insertPoint(state, 'outside', {z: midpoint, radius: 3.175}, 'line');
    for (const diameter of [50.8, 12.7, 25.4]) {
      resizeDrawing(state, diameter, state.lengthMm);
      const output = buildOutgoingLatheCodeFromDrawing(state);
      const after = new LatheCode(output);
      expect(after.getStock()?.innerDiameter).toBe(6.35);
      expect(after.getCutoffStarts()).toHaveLength(3);
      const cuts = after.getSourceProfileSegmentDefinitions('outside').filter(definition => definition.segment.start.x === 3.175);
      expect(cuts).toHaveLength(3);
      expect(cuts.every(definition => definition.segment.end.x === 3.175)).toBe(true);
      expect(output.match(/final cutoff/g)).toHaveLength(1);
    }
  });

  it('continues scaling ordinary grooves and cutoffs explicitly changed to grooves', () => {
    const groove = createInitialState('STOCK D30 ID4\nL20 D20\nL2 D8');
    resizeDrawing(groove, 15, groove.lengthMm);
    resizeDrawing(groove, 30, groove.lengthMm);
    expect(buildOutgoingLatheCodeFromDrawing(groove)).toBe('STOCK D30 ID4\nL20 D20\nL2 D8');

    const editedCutoff = createInitialState('STOCK D30 ID4\nL20 D20\nL2');
    for (const index of [0, 1]) {
      const point = editedCutoff.profiles.outside.points[index];
      updatePointPosition(editedCutoff, {side: 'outside', index}, {...point, radius: 3}, false);
    }
    resizeDrawing(editedCutoff, 60, editedCutoff.lengthMm);
    expect(buildOutgoingLatheCodeFromDrawing(editedCutoff)).toContain('L2 D12');
  });

  it.each([
    ['STOCKD30ID4A0.5 ; stock', 'STOCKD60ID4A0.5 ; stock'],
    ['STOCKR15IR2A0.5 ; stock', 'STOCKR30IR2A0.5 ; stock'],
    ['STOCK   D30 ID4 A0.5 ; stock', 'STOCK   D60 ID4 A0.5 ; stock'],
  ])('preserves compact and spaced stock syntax when editing %s', (stock, resizedStock) => {
    const source = `${stock}\nL20D20`;
    const state = createInitialState(source);
    expect(buildOutgoingLatheCodeFromDrawing(state)).toBe(source);
    updatePointPosition(state, {side: 'outside', index: 0}, {z: 0, radius: 9}, false);
    expect(buildOutgoingLatheCodeFromDrawing(state)).toContain(stock);
    resizeDrawing(state, 60, state.lengthMm);
    const output = buildOutgoingLatheCodeFromDrawing(state);
    expect(output.split('\n')[0]).toBe(resizedStock);
    expect(output.match(/STOCK/g)).toHaveLength(1);
    expect(new LatheCode(output).getStock()).toEqual({diameter: 60, innerDiameter: 4, length: 20});
  });

  it.each([0, 1, 2, 3, 4])('inserts implicit stock before compact setup directive %i', firstDirective => {
    const directives = ['TOOLRECTR0.01L0.08', 'DEPTHCUT0.01FINISH0.002', 'FEEDMOVE10PASS2PART1', 'MODEFACE', 'AXESRIGHTDOWN'];
    const setup = `UNITSIN\n${directives.slice(firstDirective).join('\n')}`;
    const source = `${setup}\nL1D1`;
    const state = createInitialState(source);
    const before = new LatheCode(source);
    expect(buildOutgoingLatheCodeFromDrawing(state)).toBe(source);
    updatePointPosition(state, {side: 'outside', index: 0}, {z: 0, radius: 10}, false);
    const output = buildOutgoingLatheCodeFromDrawing(state);
    expect(output).toContain(`UNITSIN\nSTOCK D1\n${directives[firstDirective]}`);
    const after = new LatheCode(output);
    expect(after.getStock()).toEqual(before.getStock());
    expect(after.getTool()).toEqual(before.getTool());
    expect(after.getDepth()).toEqual(before.getDepth());
    expect(after.getFeed()).toEqual(before.getFeed());
    expect(after.getMode()).toEqual(before.getMode());
    expect(after.getXDirection()).toEqual(before.getXDirection());
    expect(after.getZDirection()).toEqual(before.getZDirection());
  });

  it('restores exact source and setup after undo, including imported snapshots', () => {
    const state = createInitialState(inchTube);
    const history = {undoStack: [] as DrawingState[], redoStack: [] as DrawingState[]};
    recordUndoState(history, cloneDrawingState(state));
    updatePointPosition(state, {side: 'outside', index: 0}, {z: 0, radius: 11}, false);
    const edited = buildOutgoingLatheCodeFromDrawing(state);
    expect(edited).not.toBe(inchTube);
    expect(undoDrawingState(state, history)).toBe(true);
    expect(buildOutgoingLatheCodeFromDrawing(state)).toBe(inchTube);
    expect(redoDrawingState(state, history)).toBe(true);
    expect(buildOutgoingLatheCodeFromDrawing(state)).toBe(edited);
    expect(buildOutgoingLatheCodeFromDrawing(createInitialState(edited))).toBe(edited);
  });

  it('requires an explicit correction instead of shrinking or removing invalid features', () => {
    const state = createInitialState('STOCK D30\nL50 DS30 FI1 DE30 CH1');
    resizeDrawing(state, 30, 1);
    const before = cloneDrawingState(state);
    expect(() => buildOutgoingLatheCodeFromDrawing(state)).toThrow(/No features were changed/);
    expect(state).toEqual(before);
    const corrections = getDrawingFeatureCorrections(state);
    expect(corrections).toHaveLength(2);
    applyDrawingFeatureCorrections(state, corrections);
    expect(() => new LatheCode(buildOutgoingLatheCodeFromDrawing(state))).not.toThrow();
  });

  it('keeps features when changing segment type until removal is explicitly accepted', () => {
    const state = createInitialState('STOCK D30\nL20 DS10 CH1 DE20');
    state.segmentSelection = {side: 'outside', index: 0};
    setSelectedSegmentTool(state, 'convex');
    expect(state.profiles.outside.segmentFeatures[0].end?.size).toBe(1);
    expect(() => buildOutgoingLatheCodeFromDrawing(state)).toThrow(/Chamfers/);
    const corrections = getDrawingFeatureCorrections(state);
    expect(corrections.some(correction => correction.after === null)).toBe(true);
    applyDrawingFeatureCorrections(state, corrections);
    expect(() => buildOutgoingLatheCodeFromDrawing(state)).not.toThrow();
  });

  it('rejects invalid source instead of opening a replacement default part', () => {
    expect(() => createInitialState('UNITS IN\nSTOCK D1\nLbad')).toThrow();
  });

  it('keeps chamfers on continuous cone corners', () => {
    const state = drawingState({
      points: [
        {z: 0, radius: 2},
        {z: 2, radius: 3},
        {z: 4, radius: 2},
      ],
      segmentFeatures: [
        {start: null, end: {kind: 'chamfer', size: 0.5}},
        emptyFeatures(),
      ],
    });

    const text = buildLatheCodeFromDrawing(state);

    expect(text).toContain('L2 DS4 DE6 CH0.5');
    expect(new LatheCode(text).getOutsideProfileSegments().length).toBeGreaterThan(2);
  });

  it('allows endpoint features on cone-to-cylinder corners', () => {
    const state = drawingState({
      points: [
        {z: 0, radius: 2},
        {z: 2, radius: 3},
        {z: 4, radius: 3},
      ],
      segmentFeatures: [
        {start: null, end: {kind: 'fillet', size: 0.5}},
        emptyFeatures(),
      ],
    });
    state.segmentSelection = {side: 'outside', index: 0};

    expect(canSelectedSegmentEndpointHaveFeature(state, 'end')).toBe(true);
    expect(getDefaultSegmentFeatureSize(state, 'end')).toBeGreaterThan(0);
    expect(buildLatheCodeFromDrawing(state)).toContain('L2 DS4 DE6 FI0.5');
  });
});

function drawingState(outside: Partial<ProfileDraft>): DrawingState {
  const outsideProfile: ProfileDraft = {
    enabled: true,
    points: outside.points ?? [
      {z: 0, radius: 2},
      {z: 4, radius: 2},
    ],
    segmentTools: outside.segmentTools ?? Array.from({length: Math.max(0, (outside.points?.length ?? 2) - 1)}, () => 'line'),
    segmentFeatures: outside.segmentFeatures ?? Array.from({length: Math.max(0, (outside.points?.length ?? 2) - 1)}, emptyFeatures),
  };
  return {
    diameterMm: 10,
    lengthMm: 4,
    snapMm: 1,
    gridMm: 1,
    profiles: {
      outside: outsideProfile,
      inside: {
        enabled: false,
        points: [
          {z: 0, radius: 0},
          {z: 4, radius: 0},
        ],
        segmentTools: ['line'],
        segmentFeatures: [emptyFeatures()],
      },
    },
    activeSide: 'outside',
    activeTool: 'select',
    selection: null,
    segmentSelection: null,
  };
}

function emptyFeatures(): SegmentEdgeFeatures {
  return {start: null, end: null};
}
