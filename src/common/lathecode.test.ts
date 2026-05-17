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

function insidePoints(text: string): string {
  return pointsToString(new LatheCode(text).getInsideSegments());
}
