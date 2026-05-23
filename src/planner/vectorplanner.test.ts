import { describe, expect, it } from 'vitest';
import { LatheCode, Point, Tool } from '../common/lathecode';
import { approximateSegments, offsetSegmentsRadially } from '../common/lathegeometry';
import { Move } from '../common/move';
import { differenceGeometry, geometryArea, intersectGeometry, polygonFromPoints, rectangleGeometry, unionGeometry, type VectorGeometry } from '../common/polygon';
import { createLinearSweptToolGeometry, getToolRadialBoundaryOvertravel } from '../common/toolgeometry';
import { getFeedMmMin } from '../gcode/gcodeutils';
import {
  simulateStockAfterMoves,
  TOOLPATH_GOUGE_TOLERANCE_AREA_MM2,
  VectorPlannerWorker,
  verifyFinalStockMatchesProtectedGeometry,
  verifyStockContainsProtectedGeometry,
} from './vectorplanner';

describe('VectorPlannerWorker', () => {
  it('plans outside moves without pixel resolution', () => {
    const moves = plan('STOCK D4\nTOOL RECT R0 L1 H1\nDEPTH CUT0.5 FINISH0.1\nMODE TURN\nL2 R1');

    expect(moves.length).toBeGreaterThan(0);
    expect(moves.some(move => move.cutAreaMmSq > 0)).toBeTruthy();
    expect(Math.min(...moves.flatMap(move => [move.yStartMm, move.yStartMm + move.yDeltaMm]))).toBeCloseTo(-2);
    expect(Math.max(...moves.flatMap(move => [move.yStartMm, move.yStartMm + move.yDeltaMm]))).toBeCloseTo(-1);
  });

  it('plans inside moves from an existing bore radius', () => {
    const moves = plan('STOCK D5 ID2\nTOOL RECT R0 L1 H1\nDEPTH CUT0.5 FINISH0.1\nINSIDE\nL3 D3');

    expect(moves.length).toBeGreaterThan(0);
    expect(moves.some(move => move.cutAreaMmSq > 0)).toBeTruthy();
    expect(Math.max(...moves.flatMap(move => [move.yStartMm, move.yStartMm + move.yDeltaMm]))).toBeCloseTo(-1);
    expect(Math.min(...moves.flatMap(move => [move.yStartMm, move.yStartMm + move.yDeltaMm]))).toBeCloseTo(-1.5);
  });

  it('keeps outside-only GCode for mixed tube profiles out of the bore', () => {
    const mixedLatheCode = new LatheCode(`STOCK D24 ID10
TOOL ANG R0.15 L2.2 A120 NA55
DEPTH CUT0.45 FINISH0.1
FEED MOVE190 PASS38 PART9
MODE TURN
L24 D18

INSIDE
L24 D12`);
    const outsideLatheCode = mixedLatheCode.getLatheCodeForProfile('outside')!;
    const moves = planLatheCode(outsideLatheCode);

    expect(outsideLatheCode.getText()).toContain('STOCK D24\n');
    expect(outsideLatheCode.getText()).not.toContain('ID10');
    expect(Math.max(...moves.flatMap(move => [move.yStartMm, move.yStartMm + move.yDeltaMm]))).toBeLessThanOrEqual(0);
  });

  it('keeps roughing moves outside the finish allowance on sloped profiles', () => {
    const finishMm = 0.2;
    const stockLengthMm = 10;
    const moves = plan(`STOCK D10
DEPTH CUT1 FINISH${finishMm}
MODE TURN
L${stockLengthMm} RS1 RE4`);
    const roughMoves = moves.filter(move =>
      move.cutAreaMmSq > 0 &&
      move.cutAreaMaxWidthMm > finishMm &&
      move.yDeltaMm === 0 &&
      move.xDeltaMm !== 0);

    expect(roughMoves.length).toBeGreaterThan(0);
    for (const move of roughMoves) {
      for (let i = 0; i <= 10; i++) {
        const xMm = move.xStartMm + move.xDeltaMm * i / 10;
        const zMm = xMm + stockLengthMm;
        const radiusAtZMm = 1 + 3 * zMm / stockLengthMm;
        const finishBoundaryY = -(radiusAtZMm + finishMm);
        expect(move.yStartMm).toBeLessThanOrEqual(finishBoundaryY + 0.0011);
      }
    }
  });

  it('uses one-way radial roughing passes in default face mode', () => {
    const finishMm = 0.2;
    const moves = plan(`STOCK D10
DEPTH CUT1 FINISH${finishMm}
L4 R3
L4 R2`);
    const roughMoves = moves.filter(move => move.cutAreaMmSq > 0 && move.cutAreaMaxWidthMm > finishMm);
    const radialRoughMoves = roughMoves.filter(move => move.xDeltaMm === 0 && move.yDeltaMm !== 0);
    const axialRoughMoves = roughMoves.filter(move => move.xDeltaMm !== 0 && move.yDeltaMm === 0);

    expect(radialRoughMoves.length).toBeGreaterThan(0);
    expect(axialRoughMoves).toEqual([]);
    for (const move of radialRoughMoves) {
      expect(move.yStartMm).toBeCloseTo(-5);
      expect(move.yDeltaMm).toBeGreaterThan(0);
    }
    for (let i = 1; i < radialRoughMoves.length; i++) {
      expect(radialRoughMoves[i].xStartMm).toBeGreaterThanOrEqual(radialRoughMoves[i - 1].xStartMm - 1e-6);
    }
  });

  it('does not chase cone roughing slivers with part-feed plunges', () => {
    const latheCode = new LatheCode(`L3.820 R6.000
L20.000 RS6.000 RE14.730
L10.250 R14.730`);
    const moves = planLatheCode(latheCode);
    const roughMoves = moves.filter(move =>
      move.cutAreaMmSq > 0 &&
      move.cutAreaMaxWidthMm > latheCode.getDepth().finishMm + 1e-6);
    const partFeedRoughMoves = roughMoves.filter(move =>
      getFeedMmMin(move, latheCode.getFeed(), latheCode.getTool()) === latheCode.getFeed().partMmMin);

    expect(partFeedRoughMoves).toEqual([]);
    expect(roughMoves.filter(move => move.cutAreaMmSq < 0.02)).toEqual([]);
  });

  it('does not rough plunge into grooves narrower than the tool width', () => {
    const finishMm = 0.1;
    const moves = plan(`STOCK D10
TOOL RECT R0 L2 H3
DEPTH CUT0.5 FINISH${finishMm}
L3 R4
L1 R2
L3 R4`);
    const roughRadialMoves = moves.filter(move =>
      move.cutAreaMmSq > 0 &&
      move.cutAreaMaxWidthMm > finishMm &&
      move.xDeltaMm === 0 &&
      move.yDeltaMm !== 0);
    const impossibleGroovePlunges = roughRadialMoves.filter(move => {
      const zMm = move.xStartMm + 7;
      const endY = move.yStartMm + move.yDeltaMm;
      return zMm > 3 && zMm < 4 && endY > -4;
    });

    expect(roughRadialMoves.length).toBeGreaterThan(0);
    expect(impossibleGroovePlunges).toEqual([]);
  });

  it('detects rough gouges from simulated stock instead of reconstructed protected geometry', () => {
    const stock = rectangleGeometry(-4, -2, 0, 0);
    const protectedGeometry = rectangleGeometry(-4, -1, 0, 0);
    const roughRemovable = differenceGeometry(stock, protectedGeometry);
    const actualStockAfterRoughing = simulateStockAfterMoves(
      stock,
      [new Move(-3, -0.5, 2, 0, 1, 1)],
      new Tool('RECT', 1, 1, 0),
      1,
    );

    expect(() => verifyStockContainsProtectedGeometry('Roughing', protectedGeometry, actualStockAfterRoughing))
      .toThrow('Roughing gouged protected geometry');
    expect(() => verifyStockContainsProtectedGeometry('Reconstructed', protectedGeometry, unionGeometry(protectedGeometry, roughRemovable)))
      .not.toThrow();
  });

  it('strict final verification detects gouges and leftover stock', () => {
    const finalPart = rectangleGeometry(-4, -1, 0, 0);

    expect(() => verifyFinalStockMatchesProtectedGeometry(finalPart, rectangleGeometry(-4, -0.8, 0, 0), 1))
      .toThrow('Final toolpath gouged protected geometry');
    expect(() => verifyFinalStockMatchesProtectedGeometry(finalPart, rectangleGeometry(-4, -1.2, 0, 0), 0.01))
      .toThrow('Final toolpath left uncut stock');
  });

  it('keeps roughing after a full-stock-radius peak once the tool has clearance', () => {
    const finishMm = 0.1;
    const stockLengthMm = 28.5;
    const moves = plan(`DEPTH CUT0.5 FINISH${finishMm}
L10 R3
L3.5 RS3 RE4
L2.5 R4
L2.5 RS4 RE8
L1 RS8 RE7.32
L2 RS7.32 RE6
L2 RS6 RE8
L5 R8`);
    const roughRadialMoves = moves.filter(move =>
      move.cutAreaMmSq > 0 &&
      move.cutAreaMaxWidthMm > finishMm &&
      move.xDeltaMm === 0 &&
      move.yDeltaMm > 0);
    const valleyMovesAfterPeak = roughRadialMoves.filter(move => {
      const zMm = move.xStartMm + stockLengthMm;
      return zMm > 21 && zMm < 22.5 && move.cutAreaMmSq > 0;
    });

    expect(valleyMovesAfterPeak.length).toBeGreaterThan(0);
  });

  it('uses angled tool footprint clearance for rough plunges', () => {
    const finishMm = 0.1;
    const latheCode = new LatheCode(`STOCK D10
TOOL ANG R0.4 L7.8 A32.5 NA55
DEPTH CUT0.5 FINISH${finishMm}
L3 R4
L1 R2
L3 R4`);
    const protectedGeometry = protectedGeometryWithAllowance(latheCode, finishMm);
    const moves = planLatheCode(latheCode);
    const roughRadialMoves = moves.filter(move =>
      move.cutAreaMmSq > 0 &&
      move.cutAreaMaxWidthMm > finishMm &&
      move.xDeltaMm === 0 &&
      move.yDeltaMm !== 0);

    expect(roughRadialMoves.length).toBeGreaterThan(0);
    for (const move of roughRadialMoves) {
      const sweptTool = createLinearSweptToolGeometry(
        latheCode.getTool(),
        1,
        move.xStartMm,
        move.yStartMm,
        move.xStartMm + move.xDeltaMm,
        move.yStartMm + move.yDeltaMm,
      );
      expect(geometryArea(intersectGeometry(sweptTool, protectedGeometry)))
        .toBeLessThanOrEqual(TOOLPATH_GOUGE_TOLERANCE_AREA_MM2 + 1e-5);
    }
  });

  it('keeps turn roughing tool footprint out of protected sphere geometry', () => {
    const finishMm = 0.1;
    const latheCode = new LatheCode(`TOOL RECT R0.2 L2
DEPTH CUT0.5 FINISH${finishMm}
MODE TURN
L1
L5 DS0 DE10 CONV
L5 DS10 DE0 CONV
L3 D3`);
    const protectedGeometry = protectedGeometryWithAllowance(latheCode, finishMm);
    const roughMoves = planLatheCode(latheCode).filter(move =>
      move.cutAreaMmSq > 0 &&
      move.cutAreaMaxWidthMm > finishMm);

    expect(roughMoves.length).toBeGreaterThan(0);
    for (const move of roughMoves) {
      const sweptTool = createLinearSweptToolGeometry(
        latheCode.getTool(),
        1,
        move.xStartMm,
        move.yStartMm,
        move.xStartMm + move.xDeltaMm,
        move.yStartMm + move.yDeltaMm,
      );
      expect(geometryArea(intersectGeometry(sweptTool, protectedGeometry)))
        .toBeLessThanOrEqual(TOOLPATH_GOUGE_TOLERANCE_AREA_MM2 + 1e-5);
    }
  });

  it('keeps finishing tool footprint out of protected sphere geometry', () => {
    const finishMm = 0.1;
    const latheCode = new LatheCode(`TOOL RECT R0.2 L2
DEPTH CUT0.5 FINISH${finishMm}
MODE TURN
L1
L5 DS0 DE10 CONV
L5 DS10 DE0 CONV
L3 D3`);
    const protectedGeometry = protectedGeometryWithAllowance(latheCode, 0);
    const finishMoves = planLatheCode(latheCode).filter(move =>
      move.cutAreaMmSq > 0 &&
      move.cutAreaMaxWidthMm <= finishMm + 1e-6);

    expect(finishMoves.length).toBeGreaterThan(0);
    for (const move of finishMoves) {
      const sweptTool = createLinearSweptToolGeometry(
        latheCode.getTool(),
        1,
        move.xStartMm,
        move.yStartMm,
        move.xStartMm + move.xDeltaMm,
        move.yStartMm + move.yDeltaMm,
      );
      expect(geometryArea(intersectGeometry(sweptTool, protectedGeometry)))
        .toBeLessThanOrEqual(TOOLPATH_GOUGE_TOLERANCE_AREA_MM2 + 1e-5);
    }
  });

  it('finishes rounded profiles with round tool contact compensation', () => {
    const latheCode = new LatheCode(`TOOL ROUND R3
DEPTH CUT1 FINISH0.2
L1 DS0 DE2 CONV
L14 DS2 DE20 CONC
L0.5 DS20 DE21 CONV
L0.5 DS21 DE20 CONV
L8 DS20 DE2 CONC
L3.1 D2`);
    const moves = planLatheCode(latheCode);
    const removableGeometry = differenceGeometry(stockGeometry(latheCode), protectedGeometryWithAllowance(latheCode, 0));
    const removedGeometry = removedGeometryForMoves(latheCode, moves);
    const remainingArea = geometryArea(differenceGeometry(removableGeometry, removedGeometry));

    expect(remainingArea).toBeLessThan(0.5);
  });

  it('finishes sloped profiles with rounded rectangular tool contact compensation', () => {
    const latheCode = new LatheCode(`STOCK D5
TOOL RECT R0.2 L3
DEPTH CUT1 FINISH0.1
L1 D2
L3 D3
L4 DS3 DE5
L3`);
    const moves = planLatheCode(latheCode);
    const removableGeometry = differenceGeometry(stockGeometry(latheCode), protectedGeometryWithAllowance(latheCode, 0));
    const removedGeometry = removedGeometryForMoves(latheCode, moves);
    const remainingArea = geometryArea(differenceGeometry(removableGeometry, removedGeometry));

    expect(remainingArea).toBeLessThan(0.5);
  });

  it('plunges tool-width cutoff slots between repeated parts', () => {
    const latheCode = new LatheCode(`STOCK D20

L5 R5
L3 R9
L3

L5 R5
L3 R9
L3

L5 R5
L3 R9
L3`);
    const moves = planLatheCode(latheCode);
    const removableGeometry = differenceGeometry(stockGeometry(latheCode), protectedGeometryWithAllowance(latheCode, 0));
    const removedGeometry = removedGeometryForMoves(latheCode, moves);
    const remainingGeometry = differenceGeometry(removableGeometry, removedGeometry);

    expect(geometryArea(intersectGeometry(remainingGeometry, rectangleGeometry(-25, -10, -22, 0)))).toBeLessThan(0.01);
    expect(geometryArea(intersectGeometry(remainingGeometry, rectangleGeometry(-14, -10, -11, 0)))).toBeLessThan(0.01);
    expect(geometryArea(intersectGeometry(remainingGeometry, rectangleGeometry(-3, -10, 0, 0)))).toBeLessThan(0.01);
    const maxCutY = Math.max(...moves
      .filter(move => move.cutAreaMmSq > 0)
      .map(move => move.yStartMm + move.yDeltaMm));
    expect(maxCutY).toBeGreaterThan(0.3);
    expect(maxCutY).toBeLessThanOrEqual(getToolRadialBoundaryOvertravel(latheCode.getTool(), 1) + 0.001);
  });

  it('limits terminal cutoff overtravel to the tool boundary in turn mode', () => {
    const latheCode = new LatheCode(`STOCK D20
MODE TURN

L5 R5
L3 R9
L3

L5 R5
L3 R9
L3

L5 R5
L3 R9
L3`);
    const moves = planLatheCode(latheCode);
    const maxCutY = Math.max(...moves
      .filter(move => move.cutAreaMmSq > 0)
      .map(move => move.yStartMm + move.yDeltaMm));

    expect(maxCutY).toBeGreaterThan(0.3);
    expect(maxCutY).toBeLessThanOrEqual(getToolRadialBoundaryOvertravel(latheCode.getTool(), 1) + 0.001);
  });

  it('cleans centerline face corners before plunging inward', () => {
    const latheCode = new LatheCode(`UNITS MM
STOCK D15.9
TOOL RECT R0.2 L2
DEPTH CUT0.5 FINISH0.2
L0.5 D0
L0.1 DS13.3 DE13.5
L0.8 D13.5
L0.1 DS13.5 DE13.3
L6.3 D10.5
L0.1 DS10.5 DE10.3
L2 D7`);
    const moves = planLatheCode(latheCode);
    const removableGeometry = differenceGeometry(stockGeometry(latheCode), protectedGeometryWithAllowance(latheCode, 0));
    const removedGeometry = removedGeometryForMoves(latheCode, moves);
    const remainingGeometry = differenceGeometry(removableGeometry, removedGeometry);

    expect(geometryArea(intersectGeometry(remainingGeometry, rectangleGeometry(-9.55, -0.5, -9.35, 0)))).toBeLessThan(0.001);
    expect(moves.some(move =>
      move.cutAreaMmSq > 0 &&
      Math.abs(move.xStartMm + 9.4001) < 0.001 &&
      move.yStartMm + move.yDeltaMm > 0.15)).toBeTruthy();
  });

  it('continues finishing after centerline cleanup onto the initial cone', () => {
    const latheCode = new LatheCode(`UNITS MM
STOCK D12
TOOL RECT R0.2 L2
DEPTH CUT0.5 FINISH0.2
MODE TURN
L0.5
L5.5 DS0 DE4
L0.2 DS7.8 DE8
L1.3 D8
L0.2 DS10.3 DE10.5
L0.7 D10.5
L0.2 DS10.5 DE10.3
L2`);
    const moves = planLatheCode(latheCode);
    const removableGeometry = differenceGeometry(stockGeometry(latheCode), protectedGeometryWithAllowance(latheCode, 0));
    const removedGeometry = removedGeometryForMoves(latheCode, moves);
    const remainingGeometry = differenceGeometry(removableGeometry, removedGeometry);

    expect(geometryArea(intersectGeometry(remainingGeometry, rectangleGeometry(-10.1, -2.3, -4.6, 0)))).toBeLessThan(0.01);
    expect(moves.some(move =>
      move.cutAreaMmSq > 0 &&
      Math.abs(move.xStartMm + 9.934688) < 0.001 &&
      move.xStartMm + move.xDeltaMm > -4.7 &&
      move.yStartMm + move.yDeltaMm < -1.8)).toBeTruthy();
  });

  it('keeps weird-pawn finish moves inside the stock radius', () => {
    const latheCode = new LatheCode(`L0.060 RS3.150 RE3.800
L0.110 RS3.800 RE4.440
L0.180 RS4.440 RE5.070
L0.240 RS5.070 RE5.670
L0.300 RS5.670 RE6.250
L0.360 RS6.250 RE6.800
L0.410 RS6.800 RE7.310
L0.450 RS7.310 RE7.770
L0.500 RS7.770 RE8.190
L0.540 RS8.190 RE8.560
L0.570 RS8.560 RE8.870
L0.610 RS8.870 RE9.120
L0.620 RS9.120 RE9.310
L0.640 RS9.310 RE9.440
L0.650 RS9.440 RE9.510
L0.650 R9.510
L0.650 RS9.510 RE9.450
L0.640 RS9.450 RE9.320
L0.620 RS9.320 RE9.130
L0.600 RS9.130 RE8.880
L0.580 RS8.880 RE8.570
L0.540 RS8.570 RE8.220
L2.520 RS8.220 RE5.970
L2.890 RS5.970 RE12.430
L2.230 R5.880
L1.840 RS12.520 RE7.570
L0.620 RS7.570 RE5.940
L0.870 RS5.940 RE6.570
L1.730 RS6.570 RE7.870
L10.500 R14.000`);
    const stock = latheCode.getStock()!;
    const finishWidth = latheCode.getDepth().finishMm;
    const finishMoves = planLatheCode(latheCode).filter(move =>
      move.cutAreaMmSq > 0 &&
      move.cutAreaMaxWidthMm <= finishWidth + 1e-6);
    const minFinishY = Math.min(...finishMoves.flatMap(move => [move.yStartMm, move.yStartMm + move.yDeltaMm]));

    expect(minFinishY).toBeGreaterThanOrEqual(-stock.radius - 0.001);
  });

  it('reports textual progress throughout vector planning', () => {
    const messages = planMessages(`STOCK D10
DEPTH CUT1 FINISH0.1
L4 R3
L4 R2`);

    expect(messages.some(message => message.progressMessage === 'Planning vector toolpath...')).toBeTruthy();
    expect(messages.some(message => message.progressMessage?.startsWith('Vector roughing '))).toBeTruthy();
    expect(messages.some(message => message.progressMessage?.startsWith('Vector face roughing pass '))).toBeTruthy();
    expect(messages.some(message => message.progressMessage?.startsWith('Vector finishing '))).toBeTruthy();
    expect(messages.at(-1)?.moves?.length).toBeGreaterThan(0);
  });
});

function plan(text: string): Move[] {
  return planMessages(text).find(message => message.moves)?.moves ?? [];
}

function planLatheCode(latheCode: LatheCode): Move[] {
  return planMessagesForLatheCode(latheCode).find(message => message.moves)?.moves ?? [];
}

function planMessages(text: string): {progressMessage?: string, moves?: Move[]}[] {
  return planMessagesForLatheCode(new LatheCode(text));
}

function planMessagesForLatheCode(latheCode: LatheCode): {progressMessage?: string, moves?: Move[]}[] {
  const messages: {progressMessage?: string, moves?: Move[]}[] = [];
  new VectorPlannerWorker(latheCode, {}, {
    postMessage: message => messages.push(message),
  });
  return messages;
}

function protectedGeometryWithAllowance(latheCode: LatheCode, finishMm: number): VectorGeometry {
  const stock = latheCode.getStock()!;
  const profile = latheCode.getSingleProfile()!;
  const radialOffsetMm = finishMm * (profile.side === 'inside' ? -1 : 1);
  const openSegments = profile.side === 'outside'
    ? latheCode.getOutsideProfileSegments()
    : latheCode.getInsideProfileSegments();
  const offsetPoints = approximateSegments(offsetSegmentsRadially(openSegments, radialOffsetMm));
  const first = offsetPoints[0];
  const last = offsetPoints.at(-1)!;
  const baselineRadius = profile.side === 'outside' ? stock.innerRadius : stock.radius;
  const ringPoints = [
    new Point(baselineRadius, first.z),
    ...offsetPoints,
    new Point(baselineRadius, last.z),
  ];
  return polygonFromPoints(ringPoints.map(point => ({
    x: point.z - stock.length,
    y: -point.x,
  })));
}

function stockGeometry(latheCode: LatheCode): VectorGeometry {
  const stock = latheCode.getStock()!;
  return polygonFromPoints(approximateSegments(stock.getSegments()).map(point => ({
    x: point.z - stock.length,
    y: -point.x,
  })));
}

function removedGeometryForMoves(latheCode: LatheCode, moves: Move[]): VectorGeometry {
  const profile = latheCode.getSingleProfile()!;
  const radialDirection = profile.side === 'outside' ? 1 : -1;
  return unionGeometry(...moves
    .filter(move => move.cutAreaMmSq > 0)
    .map(move => createLinearSweptToolGeometry(
      latheCode.getTool(),
      radialDirection,
      move.xStartMm,
      move.yStartMm,
      move.xStartMm + move.xDeltaMm,
      move.yStartMm + move.yDeltaMm,
    )));
}
