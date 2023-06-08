import { describe, it, expect } from 'vitest'
import { LatheCode, Point, Segment, removeColinearSegments, removeEmptySegments } from './lathecode';

describe('segment', () => {
  it('empty', () => {
    expect(new Segment('line', new Point(0, 0), new Point(0, 0)).isEmpty()).toBeTruthy();
    expect(new Segment('line', new Point(0, 0), new Point(1, 1)).isEmpty()).toBeFalsy();
  });

  it('isEqual', () => {
    const s1 = new Segment('line', new Point(0, 0), new Point(1, 1));
    const s2 = new Segment('line', new Point(1, 1), new Point(2, 1));
    expect(s1.isEqual(s1)).toBeTruthy();
    expect(s1.isEqual(s2)).toBeFalsy();
  });

  it('isColinear', () => {
    const s1 = new Segment('line', new Point(0, 0), new Point(1, 1));
    const s2 = new Segment('line', new Point(1, 1), new Point(2, 2));
    const s3 = new Segment('line', new Point(1, 1), new Point(2, 1));
    expect(s1.isColinear(s1)).toBeTruthy();
    expect(s1.isColinear(s2)).toBeTruthy();
    expect(s2.isColinear(s1)).toBeTruthy();
    expect(s1.isColinear(s3)).toBeFalsy();
    expect(s2.isColinear(s3)).toBeFalsy();

    const s4 = new Segment('line', new Point(0, 0), new Point(0, 3));
    const s5 = new Segment('line', new Point(0, 3), new Point(3, 3));
    expect(s4.isColinear(s5)).toBeFalsy();

    const s6 = new Segment('line', new Point(0, 0), new Point(0, 3));
    const s7 = new Segment('line', new Point(1, 0), new Point(1, 3));
    expect(s6.isColinear(s7)).toBeFalsy();

    const s8 = new Segment('line', new Point(0, 3), new Point(0, 0));
    const s9 = new Segment('line', new Point(0, 0), new Point(0, 1));
    expect(s8.isColinear(s9)).toBeTruthy();
  })
})

describe('lathecode', () => {
  it('removeEmptySegments', () => {
    expect(removeEmptySegments([])).toEqual([]);

    const s1 = new Segment('line', new Point(0, 0), new Point(1, 1));
    const s2 = new Segment('line', new Point(1, 1), new Point(2, 2));
    expect(removeEmptySegments([s1, s2])).toEqual([s1, s2]);
  });

  it('removeColinearSegments', () => {
    expect(removeColinearSegments([])).toEqual([]);

    const s1 = new Segment('line', new Point(0, 0), new Point(1, 1));
    const s2 = new Segment('line', new Point(1, 1), new Point(2, 2));
    const s3 = new Segment('line', new Point(2, 2), new Point(2, 3));
    expect(removeColinearSegments([s1, s2, s3]).join(' ')).toEqual([new Segment('line', new Point(0, 0), new Point(2, 2)), s3].join(' '));

    const s4 = new Segment('line', new Point(0, 0), new Point(1, 1));
    const s5 = new Segment('line', new Point(1, 1), new Point(2, 2));
    const s6 = new Segment('line', new Point(-1, -1), new Point(0, 0));
    expect(removeColinearSegments([s4, s5, s6]).join(' ')).toEqual([new Segment('line', new Point(0, 0), new Point(0, 0))].join(' '));

    const s7 = new Segment('line', new Point(0, 3), new Point(0, 0));
    const s8 = new Segment('line', new Point(0, 0), new Point(0, 1));
    expect(removeColinearSegments([s7, s8]).join(' ')).toEqual([new Segment('line', new Point(0, 3), new Point(0, 1))].join(' '));
  });

  it('cylinder', () => {
    expectPoints('L2 R3', 'line:0,2-0,0 line:0,0-3,0 line:3,0-3,2 line:3,2-0,2', '');
  });

  it('cylinder in cm', () => {
    expectPoints('UNITS CM\nL2 R3', 'line:0,20-0,0 line:0,0-30,0 line:30,0-30,20 line:30,20-0,20', '');
  });

  it('face + cylinder', () => {
    expectPoints('L1\nL2 D6', 'line:0,3-0,1 line:0,1-3,1 line:3,1-3,3 line:3,3-0,3', '');
  });

  it('face + cylinder + cutoff', () => {
    expectPoints('L1\nL2 D6\nL2', 'line:0,3-0,1 line:0,1-3,1 line:3,1-3,3 line:3,3-0,3', '');
  });

  it('shoulder', () => {
    expectPoints('L2 R2\nL3 R3', 'line:0,5-0,0 line:0,0-2,0 line:2,0-2,2 line:2,2-3,2 line:3,2-3,5 line:3,5-0,5', '');
  })

  it('face + shoulder + cutoff', () => {
    expectPoints('L1\nL2 R2\nL3 R3\nL2', 'line:0,6-0,1 line:0,1-2,1 line:2,1-2,3 line:2,3-3,3 line:3,3-3,6 line:3,6-0,6', '');
  });

  it('inside cylinder without stock', () => {
    expectPoints('INSIDE\nL2 R3', '', '');
  });

  it('inside cylinder', () => {
    expectPoints('STOCK R4\nINSIDE\nL2 R3', '', 'line:4,2-4,0 line:4,0-3,0 line:3,0-3,2 line:3,2-4,2');
  });

  it('inside face + cylinder', () => {
    expectPoints('STOCK R4\nINSIDE\nL1\nL2 R3', '', 'line:4,3-4,1 line:4,1-3,1 line:3,1-3,3 line:3,3-4,3');
  });

  it('inside face + cylinder + cutoff', () => {
    expectPoints('STOCK R4\nINSIDE\nL1\nL2 R3\nL3', '', 'line:4,3-4,1 line:4,1-3,1 line:3,1-3,3 line:3,3-4,3');
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
