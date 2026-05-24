import { describe, it, expect } from 'vitest'
import { LatheCode, Point, Segment, removeColinearSegments, removeEmptySegments } from './lathecode';

describe('segment', () => {
  it('empty', () => {
    expect(new Segment('LINE', new Point(0, 0), new Point(0, 0)).isEmpty()).toBeTruthy();
    expect(new Segment('LINE', new Point(0, 0), new Point(1, 1)).isEmpty()).toBeFalsy();
  });

  it('isEqual', () => {
    const s1 = new Segment('LINE', new Point(0, 0), new Point(1, 1));
    const s2 = new Segment('LINE', new Point(1, 1), new Point(2, 1));
    expect(s1.isEqual(s1)).toBeTruthy();
    expect(s1.isEqual(s2)).toBeFalsy();
  });

  it('isColinear', () => {
    const s1 = new Segment('LINE', new Point(0, 0), new Point(1, 1));
    const s2 = new Segment('LINE', new Point(1, 1), new Point(2, 2));
    const s3 = new Segment('LINE', new Point(1, 1), new Point(2, 1));
    expect(s1.isColinear(s1)).toBeTruthy();
    expect(s1.isColinear(s2)).toBeTruthy();
    expect(s2.isColinear(s1)).toBeTruthy();
    expect(s1.isColinear(s3)).toBeFalsy();
    expect(s2.isColinear(s3)).toBeFalsy();

    const s4 = new Segment('LINE', new Point(0, 0), new Point(0, 3));
    const s5 = new Segment('LINE', new Point(0, 3), new Point(3, 3));
    expect(s4.isColinear(s5)).toBeFalsy();

    const s6 = new Segment('LINE', new Point(0, 0), new Point(0, 3));
    const s7 = new Segment('LINE', new Point(1, 0), new Point(1, 3));
    expect(s6.isColinear(s7)).toBeFalsy();

    const s8 = new Segment('LINE', new Point(0, 3), new Point(0, 0));
    const s9 = new Segment('LINE', new Point(0, 0), new Point(0, 1));
    expect(s8.isColinear(s9)).toBeTruthy();

    const s8c = new Segment('CONC', new Point(0, 3), new Point(0, 0));
    const s9c = new Segment('CONC', new Point(0, 0), new Point(0, 1));
    expect(s8c.isColinear(s9c)).toBeFalsy();
  })
})

describe('lathecode', () => {
  it('removeEmptySegments', () => {
    expect(removeEmptySegments([])).toEqual([]);

    const s1 = new Segment('LINE', new Point(0, 0), new Point(1, 1));
    const s2 = new Segment('LINE', new Point(1, 1), new Point(2, 2));
    expect(removeEmptySegments([s1, s2])).toEqual([s1, s2]);
  });

  it('removeColinearSegments', () => {
    expect(removeColinearSegments([])).toEqual([]);

    const s1 = new Segment('LINE', new Point(0, 0), new Point(1, 1));
    const s2 = new Segment('LINE', new Point(1, 1), new Point(2, 2));
    const s3 = new Segment('LINE', new Point(2, 2), new Point(2, 3));
    expect(removeColinearSegments([s1, s2, s3]).join(' ')).toEqual([new Segment('LINE', new Point(0, 0), new Point(2, 2)), s3].join(' '));

    const s4 = new Segment('LINE', new Point(0, 0), new Point(1, 1));
    const s5 = new Segment('LINE', new Point(1, 1), new Point(2, 2));
    const s6 = new Segment('LINE', new Point(-1, -1), new Point(0, 0));
    expect(removeColinearSegments([s4, s5, s6]).join(' ')).toEqual([new Segment('LINE', new Point(0, 0), new Point(0, 0))].join(' '));

    const s7 = new Segment('LINE', new Point(0, 3), new Point(0, 0));
    const s8 = new Segment('LINE', new Point(0, 0), new Point(0, 1));
    expect(removeColinearSegments([s7, s8]).join(' ')).toEqual([new Segment('LINE', new Point(0, 3), new Point(0, 1))].join(' '));
  });

  it('cylinder', () => {
    expectPoints('L2 R3', 'LINE:0,2-0,0 LINE:0,0-3,0 LINE:3,0-3,2 LINE:3,2-0,2', '');
  });

  it('cylinder in cm', () => {
    expectPoints('UNITS CM\nL2 R3', 'LINE:0,20-0,0 LINE:0,0-30,0 LINE:30,0-30,20 LINE:30,20-0,20', '');
  });

  it('does not scale tool angles by units', () => {
    const tool = new LatheCode('UNITS IN\nTOOL ANG R0.2 L7.75 A30 NA55\nL1 R1').getTool();
    expect(tool.cornerRadiusMm).toBeCloseTo(0.2 * 25.4);
    expect(tool.widthMm).toBeCloseTo(7.75 * 25.4);
    expect(tool.angleDeg).toBe(30);
    expect(tool.noseAngleDeg).toBe(55);
  });

  it('face + cylinder', () => {
    expectPoints('L1\nL2 D6', 'LINE:0,3-0,1 LINE:0,1-3,1 LINE:3,1-3,3 LINE:3,3-0,3', '');
  });

  it('face + cylinder + cutoff', () => {
    expectPoints('L1\nL2 D6\nL2', 'LINE:0,3-0,1 LINE:0,1-3,1 LINE:3,1-3,3 LINE:3,3-0,3', '');
  });

  it('shoulder', () => {
    expectPoints('L2 R2\nL3 R3', 'LINE:0,5-0,0 LINE:0,0-2,0 LINE:2,0-2,2 LINE:2,2-3,2 LINE:3,2-3,5 LINE:3,5-0,5', '');
  })

  it('defines cones from one endpoint and a centerline angle', () => {
    expect(outsideProfilePoints('L2 RS1 A45')).toBe('LINE:1,0-3,2');
    expect(outsideProfilePoints('L2 DS2 A45')).toBe('LINE:1,0-3,2');
    expect(outsideProfilePoints('L2 RE1 A-45')).toBe('LINE:3,0-1,2');
  });

  it('rejects angle-defined cones that cross the centerline', () => {
    expect(outsideProfilePoints('L1 RS1 A-45')).toBe('LINE:1,0-0,1');
    expect(() => new LatheCode('L2 RS1 A-45')).toThrow('Cone crosses centerline');
    expect(() => new LatheCode('L2 DE2 A45')).toThrow('Cone crosses centerline');
  });

  it('adds chamfers to both ends of a segment', () => {
    expect(outsideProfilePoints('L6 D10 CH0.5')).toBe('LINE:4.5,0-5,0.5 LINE:5,0.5-5,5.5 LINE:5,5.5-4.5,6');
  });

  it('adds independent fillets and chamfers to documented bolt segments', () => {
    const segments = new LatheCode(`L20 DS10 FI0.5 DE10 CH1
L6 DS19.6 CH0 DE19.6 CH0.5`).getOutsideProfileSegments();

    expect(segments[0].start).toEqual(new Point(4.5, 0));
    expect(segments.some(segment => segment.start.isEqual(new Point(5, 19)) && segment.end.isEqual(new Point(6, 20)))).toBeTruthy();
    expect(segments.some(segment => segment.start.isEqual(new Point(6, 20)) && segment.end.isEqual(new Point(9.8, 20)))).toBeTruthy();
    expect(segments.at(-1)!.end).toEqual(new Point(9.3, 26));
  });

  it('treats zero chamfers and fillets as no feature', () => {
    expect(outsideProfilePoints('L6 D10 CH0')).toBe('LINE:5,0-5,6');
    expect(outsideProfilePoints('L6 DS10 FI0 DE10 CH0')).toBe('LINE:5,0-5,6');
  });

  it('rejects chamfers and fillets that do not fit the segment', () => {
    expect(() => new LatheCode('L1 D10 CH0.6')).toThrow('too large for the segment');
  });

  it('measures chamfer and fillet feature size against horizontal segment length', () => {
    expect(() => new LatheCode('L3 DS0 CH0 DE3 CH3.3\nL3 D10')).toThrow('too large for the segment');
  });

  it('collapses a full-length tapered fillet into the equivalent profile curve', () => {
    const fillet = new LatheCode('L3 DS0 FI0 RE3 FI3\nL3 D10').getOutsideProfileSegments();
    const curve = new LatheCode('L3 RS0 RE3 CONC\nL3 D10').getOutsideProfileSegments();

    expect(pointsToString(fillet)).toBe(pointsToString(curve));
  });

  it('rejects chamfers and fillets that do not fit the radial edge', () => {
    expect(() => new LatheCode('L2 D10 CH2\nL2 D12')).toThrow('too large for the adjacent radial edge');
  });

  it('rejects chamfers and fillets on curved segments', () => {
    expect(() => new LatheCode('L5 DS0 FI0.5 DE10 CONV')).toThrow('not supported for CONV or CONC');
  });

  it('parses B-spline profile lines with diameter controls', () => {
    const latheCode = new LatheCode('L3 D10\nL24 DS10 DE22 BSPLINE D14 D26 D18');
    const spline = latheCode.getOutsideProfileSegments()[1];

    expect(spline.type).toBe('BSPLINE');
    expect(spline.start).toEqual(new Point(5, 3));
    expect(spline.end).toEqual(new Point(11, 27));
    expect(spline.controlPoints).toEqual([
      new Point(5, 3),
      new Point(7, 9),
      new Point(13, 15),
      new Point(9, 21),
      new Point(11, 27),
    ]);
    expect(latheCode.getStock()?.diameter).toBe(26);
  });

  it('face + shoulder + cutoff', () => {
    expectPoints('L1\nL2 R2\nL3 R3\nL2', 'LINE:0,6-0,1 LINE:0,1-2,1 LINE:2,1-2,3 LINE:2,3-3,3 LINE:3,3-3,6 LINE:3,6-0,6', '');
  });

  it('inside cylinder without stock', () => {
    expectPoints('INSIDE\nL2 R3', '', '');
  });

  it('inside cylinder', () => {
    expectPoints('STOCK R4\nINSIDE\nL2 R3', '', 'LINE:4,2-4,0 LINE:4,0-3,0 LINE:3,0-3,2 LINE:3,2-4,2');
  });

  it('inside face + cylinder', () => {
    expectPoints('STOCK R4\nINSIDE\nL1\nL2 R3', '', 'LINE:4,3-4,1 LINE:4,1-3,1 LINE:3,1-3,3 LINE:3,3-4,3');
  });

  it('inside face + cylinder + cutoff', () => {
    expectPoints('STOCK R4\nINSIDE\nL1\nL2 R3\nL3', '', 'LINE:4,3-4,1 LINE:4,1-3,1 LINE:3,1-3,3 LINE:3,3-4,3');
  });

  it('inside stepped profile uses stock as the outer boundary', () => {
    const latheCode = new LatheCode('STOCK D10\nINSIDE\nL2 R2\nL3 R3');
    expect(latheCode.getStock()).toEqual({diameter: 10, length: 5, innerDiameter: 0});
    expect(latheCode.getOutsideSegments()).toEqual([]);
    expect(pointsToString(latheCode.getInsideSegments())).toBe('LINE:5,5-5,0 LINE:5,0-2,0 LINE:2,0-2,2 LINE:2,2-3,2 LINE:3,2-3,5 LINE:3,5-5,5');
  });

  it('supports stock with an internal diameter', () => {
    const latheCode = new LatheCode('STOCK D10 ID4\nL5 R4');

    expect(latheCode.getStock()).toEqual({diameter: 10, length: 5, innerDiameter: 4});
    expect(pointsToString(latheCode.getStock()!.getSegments())).toBe('LINE:2,0-5,0 LINE:5,0-5,5 LINE:5,5-2,5 LINE:2,5-2,0');
    expect(pointsToString(latheCode.getOutsideSegments())).toBe('LINE:2,5-2,0 LINE:2,0-4,0 LINE:4,0-4,5 LINE:4,5-2,5');
  });

  it('supports stock with an internal radius', () => {
    const latheCode = new LatheCode('STOCK R5 IR2\nL5 R4');

    expect(latheCode.getStock()).toEqual({diameter: 10, length: 5, innerDiameter: 4});
  });

  it('keeps legacy stock allowance parsing', () => {
    expect(new LatheCode('STOCK D10 A1\nL5 R4').getStock()).toEqual({diameter: 10, length: 5, innerDiameter: 0});
  });

  it('rejects stock holes that are not smaller than the stock diameter', () => {
    expect(() => new LatheCode('STOCK D10 ID10\nL5 R4')).toThrow('stock internal hole must be smaller');
  });

  it('returns outside-only profiles explicitly', () => {
    const latheCode = new LatheCode('L2 R3');
    const profiles = latheCode.getProfiles();

    expect(profiles.map(profile => profile.side)).toEqual(['outside']);
    expect(pointsToString(profiles[0].segments)).toBe(pointsToString(latheCode.getOutsideSegments()));
    expect(latheCode.getSingleProfile()).toEqual(profiles[0]);
  });

  it('returns inside-only profiles explicitly', () => {
    const latheCode = new LatheCode('STOCK D10\nINSIDE\nL2 R3');
    const profiles = latheCode.getProfiles();

    expect(profiles.map(profile => profile.side)).toEqual(['inside']);
    expect(pointsToString(profiles[0].segments)).toBe(pointsToString(latheCode.getInsideSegments()));
    expect(latheCode.getSingleProfile()).toEqual(profiles[0]);
  });

  it('keeps mixed profiles explicit instead of selecting implicitly', () => {
    const latheCode = new LatheCode('STOCK D10\nL2 R4\nINSIDE\nL2 R2');
    const profiles = latheCode.getProfiles();

    expect(profiles.map(profile => profile.side)).toEqual(['outside', 'inside']);
    expect(pointsToString(profiles[0].segments)).toBe(pointsToString(latheCode.getOutsideSegments()));
    expect(pointsToString(profiles[1].segments)).toBe(pointsToString(latheCode.getInsideSegments()));
    expect(latheCode.getSingleProfile()).toBeNull();
  });

  it('creates outside-only lathecode from a mixed profile', () => {
    const latheCode = new LatheCode('STOCK D10\nTOOL RECT R0.2 L2\nL2 R4\nINSIDE\nL2 R2');

    expect(latheCode.getLatheCodeForProfile('outside')?.getText()).toBe('STOCK D10\nTOOL RECT R0.2 L2\nL2 R4');
  });

  it('drops stock ID from outside-only lathecode split from a mixed profile', () => {
    const latheCode = new LatheCode('STOCK D24 ID10\nTOOL ANG R0.15 L2.2 A120 NA55\nL24 D18\nINSIDE\nL24 D12');

    expect(latheCode.getLatheCodeForProfile('outside')?.getText()).toBe('STOCK D24\nTOOL ANG R0.15 L2.2 A120 NA55\nL24 D18');
  });

  it('creates inside-only lathecode from a mixed profile', () => {
    const latheCode = new LatheCode('STOCK D10\nTOOL RECT R0.2 L2\nL2 R4\nINSIDE\nL2 R2');

    expect(latheCode.getLatheCodeForProfile('inside')?.getText()).toBe('STOCK D10\nTOOL RECT R0.2 L2\nINSIDE\nL2 R2');
  });

  it('getCutoffStarts empty', () => {
    expect(new LatheCode('L2 R3\n').getCutoffStarts()).toEqual([]);
  });

  it('getCutoffStarts 1', () => {
    expect(new LatheCode('L1\nL2 R3\nL3').getCutoffStarts()).toEqual([3]);
  });

  it('getCutoffStarts 2', () => {
    expect(new LatheCode('L1\nL2 R3\nL3 R4\nL2').getCutoffStarts()).toEqual([6]);
  });

  it('getCutoffStarts with 0', () => {
    expect(new LatheCode('L1\nL2 R3\nL3 D0').getCutoffStarts()).toEqual([3]);
  });

  it('getMode', () => {
    expect(new LatheCode('L1\nL2 R3\nL3 D0').getMode()).toEqual('FACE');
    expect(new LatheCode('MODE FACE\nL1\nL2 R3\nL3 D0').getMode()).toEqual('FACE');
    expect(new LatheCode('MODE TURN\nL1\nL2 R3\nL3 D0').getMode()).toEqual('TURN');
  });

  it('getZDirection', () => {
    expect(new LatheCode('L1\nL2 R3\nL3 D0').getZDirection()).toEqual('LEFT');
    expect(new LatheCode('AXES LEFT DOWN\nL1\nL2 R3\nL3 D0').getZDirection()).toEqual('LEFT');
    expect(new LatheCode('AXES RIGHT DOWN\nL1\nL2 R3\nL3 D0').getZDirection()).toEqual('RIGHT');
  });

  it('getXDirection', () => {
    expect(new LatheCode('L1\nL2 R3\nL3 D0').getXDirection()).toEqual('UP');
    expect(new LatheCode('AXES LEFT UP\nL1\nL2 R3\nL3 D0').getXDirection()).toEqual('UP');
    expect(new LatheCode('AXES RIGHT DOWN\nL1\nL2 R3\nL3 D0').getXDirection()).toEqual('DOWN');
  });

  it('scales part dimensions without scaling stock allowance, machining settings, or parting slots', () => {
    expect(new LatheCode(`UNITS MM
STOCK D10 ID2 A0.5 ; stock
TOOL RECT R0.2 L2
DEPTH CUT0.5 FINISH0.1
FEED MOVE200 PASS50 PART10
L2 D4 ; outside
L1 ; parting
L3 DS4 DE6 CONV
INSIDE
L1 R1
L2 RS1 RE2 CONC`).scale(2, 3)).toEqual(`UNITS MM
STOCK D12 ID4 A0.5 ; stock
TOOL RECT R0.2 L2
DEPTH CUT0.5 FINISH0.1
FEED MOVE200 PASS50 PART10
L6 D8 ; outside
L1 ; parting
L9 DS8 DE12 CONV
INSIDE
L3 R2
L6 RS2 RE4 CONC`);
  });

  it('scales chamfers and fillets with radial dimensions', () => {
    expect(new LatheCode('STOCK D20\nL2 D10 FI0.5\nL3 DS12 CH0 DE12 CH1').scale(2, 3)).toBe('STOCK D24\nL6 D20 FI1\nL9 DS24 CH0 DE24 CH2');
  });

  it('scales B-spline endpoint and control dimensions', () => {
    expect(new LatheCode('STOCK D28\nL24 DS10 DE22 BSPLINE D14 R13 D18').scale(2, 3)).toBe('STOCK D52\nL72 DS20 DE44 BSPLINE D28 R26 D36');
  });

  it('scales cone angles for non-uniform radial and length scaling', () => {
    expect(new LatheCode('L2 RS1 A45').scale(2, 4)).toBe('L8 RS2 A26.5651');
  });

  it('rounds scaled dimensions to compact decimal output', () => {
    expect(new LatheCode('STOCK D10 ID1\nTOOL RECT R0.2 L2\nL2 R1\nL1 RS1 RE2').scale(1 / 3)).toBe('STOCK D1.3333 ID0.3333\nTOOL RECT R0.2 L2\nL0.6667 R0.3333\nL0.3333 RS0.3333 RE0.6667');
  });

  it('snaps immaterial scaled decimal differences back to clean values', () => {
    expect(new LatheCode('STOCK D10\nL1 D5').scale(1.00002, 1)).toBe('STOCK D5\nL1 D5');
  });

  it('reverses', () => {
    expect(new LatheCode(`UNITS MM
STOCK D23.25
TOOL RECT R0.2 L2
DEPTH CUT0.5 FINISH0.2
FEED MOVE200 PASS50 PART10

L2 D9.8 ; line 1
L3 D9.8
L24 DS15.733 DE14.5 ; line 3
L4 DS14.5 DE1 ; line 4
L6 DS1 DE10 BSPLINE D4 D14 D8 ; spline
L5 DS10 DE0 CONV
L15 DS0 DE5 CONC ; line 6
L1
L1 ; line 8`).reverse()).toEqual(`UNITS MM
STOCK D23.25
TOOL RECT R0.2 L2
DEPTH CUT0.5 FINISH0.2
FEED MOVE200 PASS50 PART10

L1 ; line 8
L1
L15 DS5 DE0 CONC ; line 6
L5 DS0 DE10 CONV
L6 DS10 DE1 BSPLINE D8 D14 D4 ; spline
L4 DS1 DE14.5 ; line 4
L24 DS14.5 DE15.733 ; line 3
L3 D9.8
L2 D9.8 ; line 1`);
  });

  it('reverses when the first line is a segment', () => {
    expect(new LatheCode(`L2 D4 ; line 1
L3 DS4 DE6
L1 ; cutoff`).reverse()).toEqual(`L1 ; cutoff
L3 DS6 DE4
L2 D4 ; line 1`);
  });

  it('reverses endpoint-angle cone lines', () => {
    expect(new LatheCode('L2 RS1 A45 ; cone').reverse()).toBe('L2 RE1 A-45 ; cone');
  });

  it('reverses endpoint chamfers and fillets', () => {
    expect(new LatheCode(`L20 DS10 FI0.5 DE10 CH1 ; shank
L6 D19.6 CH0.5 ; head`).reverse()).toEqual(`L6 D19.6 CH0.5 ; head
L20 DS10 CH1 DE10 FI0.5 ; shank`);
  });

  it('reverses inside-only profiles', () => {
    expect(new LatheCode(`STOCK D10
INSIDE
L2 R2 ; bore start
L3 RS2 RE3
L1 ; bore end`).reverse()).toEqual(`STOCK D10
INSIDE
L1 ; bore end
L3 RS3 RE2
L2 R2 ; bore start`);
  });

  it('double-reverses mixed inside and outside profiles to the same part', () => {
    const original = new LatheCode(`STOCK D12
L1 R5
L2 RS5 RE4 CONV
L1 R4
INSIDE
L1 R1.5
L2 RS1.5 RE2.5 CONC
L1 R2.5`);
    const doubleReversed = new LatheCode(new LatheCode(original.reverse()).reverse());

    expect(doubleReversed.getProfiles().map(profile => profile.side)).toEqual(['outside', 'inside']);
    expect(pointsToString(doubleReversed.getOutsideSegments())).toBe(pointsToString(original.getOutsideSegments()));
    expect(pointsToString(doubleReversed.getInsideSegments())).toBe(pointsToString(original.getInsideSegments()));
  });
})

function expectPoints(text: string, o: string, i: string) {
  expect(outsidePoints(text), text + ' outside').toBe(o);
  expect(insidePoints(text), text + ' inside').toBe(i);
}

function pointsToString(points: Segment[]): string {
  return points.join(' ');
}

function outsidePoints(text: string): string {
  return pointsToString(new LatheCode(text).getOutsideSegments());
}

function outsideProfilePoints(text: string): string {
  return pointsToString(new LatheCode(text).getOutsideProfileSegments());
}

function insidePoints(text: string): string {
  return pointsToString(new LatheCode(text).getInsideSegments());
}
