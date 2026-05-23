import { LatheCode, Point, Profile, Segment, Stock } from '../common/lathecode';
import { approximateSegments, offsetSegmentsRadially } from '../common/lathegeometry';
import { Move } from '../common/move';
import {
  configurePolygonSettings,
  differenceGeometry,
  geometryArea,
  geometryBounds,
  horizontalSpansAtY,
  intersectGeometry,
  openPathIntersectsGeometryInterior,
  polygonFromPoints,
  rectangleGeometry,
  unionGeometry,
  verticalSpansAtX,
  type VectorGeometry,
  type VectorPoint,
} from '../common/polygon';
import { AppSettings, DEFAULT_APP_SETTINGS, normalizeAppSettings } from '../common/settings';
import {
  configureToolGeometrySettings,
  createLinearSweptToolGeometry,
  createSweptToolGeometry,
  createToolFootprintGeometry,
  createToolKeepoutGeometry,
  getToolRadialBoundaryOvertravel,
  type ToolRadialDirection,
} from '../common/toolgeometry';

export type VectorPlannerPostMessage = (message: {progressMessage?: string, error?: string, moves?: Move[]}) => void;

export type VectorPlannerOptions = {
  postMessage?: VectorPlannerPostMessage,
};

type FacePlunge = {
  x: number,
  targetY: number,
  materialDepth: number,
  removedGeometry: VectorGeometry,
  removedArea: number,
};

type FinishToolPathPoint = {
  preferred: VectorPoint,
  exact: VectorPoint,
};

const EPSILON = DEFAULT_APP_SETTINGS.vectorComparisonToleranceMm;
export const TOOLPATH_GOUGE_TOLERANCE_AREA_MM2 = DEFAULT_APP_SETTINGS.vectorToolpathGougeToleranceAreaMm2;

/**
 * Vector planner mental model:
 *
 * The lathe profile is converted to a 2D ZX cross-section in radius units.
 * Planner x is axial position, shifted so the stock runs from -length to 0;
 * planner y is negative radius, which keeps outside turning moves in the
 * familiar "more negative means farther from centerline" direction used by
 * Move and preview code.
 *
 * Every move is planned for the G-code control point, not for a single tool
 * corner. Collision checks treat the control point as moving through
 * configuration space: protected part geometry is expanded by the reflected
 * whole-tool footprint, and candidate moves are also checked by subtracting
 * their exact swept whole-tool area. Keeping both views explicit avoids the
 * common lathe bug where a nose radius or tool tip clears but the rest of the
 * insert gouges the part.
 *
 * Roughing removes conservative strips/bands, then the generated moves are
 * resimulated against stock. Finishing works from that simulated stock, not
 * from the ideal roughing intent, so later passes see the material actually
 * left by the whole tool footprint.
 */
export class VectorPlannerWorker {
  private profile: Profile;
  private stock: Stock;
  private moves: Move[] = [];
  private postMessage: VectorPlannerPostMessage;
  private rightX: number;
  private leftX = 0;
  private safeY: number;
  private currentX: number;
  private currentY: number;
  private mode: ReturnType<LatheCode['getMode']>;
  private settings: AppSettings;
  // Keepouts are derived only from protected geometry plus the selected tool,
  // so cache them by geometry object while planning the rough and finish phases.
  private toolKeepouts = new WeakMap<VectorGeometry, VectorGeometry>();

  constructor(private latheCode: LatheCode, settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS, options: VectorPlannerOptions = {}) {
    this.settings = normalizeAppSettings(settings);
    configurePolygonSettings(this.settings);
    configureToolGeometrySettings(this.settings);
    const profile = latheCode.getSingleProfile();
    if (!profile) {
      if (latheCode.getProfiles().length > 1) throw new Error('Error: inside and outside not supported yet');
      throw new Error('Error: no segments');
    }
    const stock = latheCode.getStock();
    if (!stock) throw new Error('Error: specify stock');
    if (stock.diameter === 0) throw new Error('Error: stock diameter is 0');
    if (stock.length === 0) throw new Error('Error: stock length is 0');

    this.profile = profile;
    this.stock = stock;
    this.postMessage = options.postMessage || (message => postMessage(message));
    // This planner operates in the preview/move coordinate system. The safe
    // line is just outside existing stock: outer radius for OD work, bore
    // radius for ID work.
    this.rightX = -stock.length;
    this.safeY = this.profile.side === 'outside' ? -stock.radius : -stock.innerRadius;
    this.currentX = this.rightX;
    this.currentY = this.safeY;
    this.mode = latheCode.getMode();

    this.postMessage({progressMessage: 'Planning vector toolpath...'});
    this.plan();
    this.postMessage({progressMessage: `Showing ${this.moves.length} vector moves...`});
    this.postMessage({moves: this.moves});
  }

  private get epsilon(): number {
    return this.settings.vectorComparisonToleranceMm;
  }

  private get minUsefulCutMm(): number {
    return this.settings.vectorMinimumUsefulCutMm;
  }

  private plan() {
    const stockGeometry = this.geometryFromSegments(this.stock.getSegments());
    const radialDirection = this.profile.side === 'outside' ? 1 : -1;
    // Roughing protects an offset part that still has finish allowance on it.
    // The sign flips for ID work because "more material left" is radially
    // inward for outside cuts but radially outward for bores.
    const finishDepth = this.latheCode.getDepth().finishMm * (this.profile.side === 'inside' ? -1 : 1);
    const roughPartGeometry = this.profileGeometryWithAllowance(finishDepth);
    const roughRemovable = differenceGeometry(stockGeometry, roughPartGeometry);
    const roughKeepout = createToolKeepoutGeometry(this.latheCode.getTool(), radialDirection, roughPartGeometry);
    this.toolKeepouts.set(roughPartGeometry, roughKeepout);

    this.postMessage({progressMessage: `Vector roughing ${geometryArea(roughRemovable).toFixed(2)} mm2...`});
    const roughStartIndex = this.moves.length;
    if (this.mode === 'FACE') this.planFaceRoughing(roughRemovable, roughPartGeometry);
    else this.planTurnRoughing(roughRemovable, roughPartGeometry);
    // Do not infer the roughing result from the requested cuts. A rounded or
    // angled insert removes the swept footprint of the actual moves, which can
    // differ from rectangular pass bands around slopes, slots, and centerline.
    const actualStockAfterRoughing = simulateStockAfterMoves(
      stockGeometry,
      this.moves.slice(roughStartIndex),
      this.latheCode.getTool(),
      radialDirection,
    );
    verifyStockContainsProtectedGeometry(
      'Roughing',
      intersectGeometry(stockGeometry, roughPartGeometry),
      actualStockAfterRoughing,
      this.getVerificationGougeToleranceArea(roughPartGeometry),
    );

    this.postMessage({progressMessage: 'Vector finishing profile...'});
    const finishPartGeometry = this.profileGeometryWithAllowance(0);
    // Finishing should only chase material actually left after roughing. Air
    // through already-cleared regions is acceptable; gouging protected geometry
    // is checked with the same swept-tool model used for rough verification.
    const finishRemovable = differenceGeometry(actualStockAfterRoughing, finishPartGeometry);
    const finishKeepout = createToolKeepoutGeometry(this.latheCode.getTool(), radialDirection, finishPartGeometry);
    this.toolKeepouts.set(finishPartGeometry, finishKeepout);
    this.planFinishProfile(finishPartGeometry, finishRemovable);

    this.moveTo(this.currentX, this.safeY);
    this.moveTo(this.rightX, this.safeY);
    const actualStockAfterFinishing = simulateStockAfterMoves(stockGeometry, this.moves, this.latheCode.getTool(), radialDirection);
    verifyStockContainsProtectedGeometry(
      'Final toolpath',
      intersectGeometry(stockGeometry, finishPartGeometry),
      actualStockAfterFinishing,
      this.getVerificationGougeToleranceArea(finishPartGeometry),
    );
    this.reportFinalLeftoverStock(finishPartGeometry, actualStockAfterFinishing);
  }

  private planFaceRoughing(removable: VectorGeometry, protectedGeometry: VectorGeometry): VectorGeometry {
    const bounds = geometryBounds(removable);
    if (!bounds || geometryArea(removable) <= this.epsilon) return removable;

    const depth = Math.max(this.latheCode.getDepth().cutMm, this.settings.vectorMinimumCutDepthMm);
    const radialDirection = this.profile.side === 'outside' ? 1 : -1;
    let nextX = this.rightX;
    let stripStartX = this.rightX;
    let remaining = removable;
    const passCount = Math.max(1, Math.ceil((this.leftX - nextX) / depth));

    // Face mode advances axially in strips, but each actual rough cut is a
    // radial plunge. If a plunge only clears part of the current strip, keep the
    // stripStartX pinned so the next wider strip can still consider that
    // leftover material instead of silently declaring it done.
    for (let guard = 0; guard < 10000 && nextX < this.leftX - this.epsilon; guard++) {
      const targetX = Math.min(nextX + depth, this.leftX);
      const strip = rectangleGeometry(stripStartX, bounds.minY, targetX, bounds.maxY);
      const cutGeometry = intersectGeometry(remaining, strip);
      const minChipArea = this.getMinRoughChipArea(Math.abs(targetX - nextX));
      if (geometryArea(cutGeometry) <= minChipArea) {
        // Tiny residual islands are usually polygon chord/finish-allowance
        // slivers. Skipping them keeps roughing from producing slow part-feed
        // nibbling that finishing can handle more cleanly.
        remaining = differenceGeometry(remaining, strip);
        stripStartX = targetX;
        nextX = targetX;
        continue;
      }

      const cutWidth = Math.abs(targetX - nextX);
      this.postMessage({progressMessage: `Vector face roughing pass ${guard + 1}/${passCount}...`});
      const removedGeometry = this.planFaceStripCut(cutGeometry, protectedGeometry, stripStartX, targetX, cutWidth, radialDirection);
      if (geometryArea(removedGeometry) > this.epsilon) {
        remaining = differenceGeometry(remaining, removedGeometry);
        if (geometryArea(intersectGeometry(remaining, strip)) <= minChipArea) {
          remaining = differenceGeometry(remaining, strip);
          stripStartX = targetX;
        }
      }
      nextX = targetX;
    }
    return remaining;
  }

  private planTurnRoughing(removable: VectorGeometry, protectedGeometry: VectorGeometry): VectorGeometry {
    const bounds = geometryBounds(removable);
    if (!bounds || geometryArea(removable) <= this.epsilon) return removable;

    const depth = Math.max(this.latheCode.getDepth().cutMm, this.settings.vectorMinimumCutDepthMm);
    const direction = this.profile.side === 'outside' ? 1 : -1;
    const limitY = direction > 0 ? bounds.maxY : bounds.minY;
    let previousY = this.safeY;
    let remaining = removable;
    const passCount = Math.max(1, Math.ceil(Math.abs(limitY - previousY) / depth));

    // Turn mode advances radially in depth-of-cut bands, then cuts each
    // horizontal material span left-to-right. The band geometry is only a
    // search window; removed stock is still computed from the whole swept tool.
    for (let guard = 0; guard < 10000 && this.canStepToward(previousY, limitY, direction); guard++) {
      const targetY = direction > 0
        ? Math.min(previousY + depth, limitY)
        : Math.max(previousY - depth, limitY);
      const minY = Math.min(previousY, targetY);
      const maxY = Math.max(previousY, targetY);
      const band = rectangleGeometry(this.rightX, minY, this.leftX, maxY);
      const cutGeometry = intersectGeometry(remaining, band);
      const cutWidth = Math.abs(targetY - previousY);
      const minChipArea = this.getMinRoughChipArea(cutWidth);
      if (geometryArea(cutGeometry) <= minChipArea) {
        remaining = differenceGeometry(remaining, band);
        previousY = targetY;
        continue;
      }
      // Sample just inside the band rather than exactly on the polygon edge.
      // Span extraction on an edge can be ambiguous; this keeps the pass in the
      // material we intend to remove without materially changing depth of cut.
      const passY = targetY - direction * Math.min(this.settings.vectorPassInsetMm, cutWidth / 4);
      this.postMessage({progressMessage: `Vector turn roughing pass ${guard + 1}/${passCount}...`});
      const removedGeometry = this.planBandCut(cutGeometry, protectedGeometry, passY, cutWidth, direction);
      if (geometryArea(removedGeometry) > this.epsilon) {
        remaining = differenceGeometry(remaining, removedGeometry);
        if (geometryArea(intersectGeometry(remaining, band)) <= minChipArea) {
          remaining = differenceGeometry(remaining, band);
        }
      }
      previousY = targetY;
    }
    return remaining;
  }

  private getMinRoughChipArea(cutWidth: number): number {
    // Roughing is allowed to leave less than about half a finish pass worth of
    // area. This avoids generating many tiny rough cuts for numerical slivers
    // while preserving enough stock for a visible finishing pass.
    return Math.max(
      this.settings.vectorMinimumRoughChipAreaMm2,
      this.latheCode.getDepth().finishMm * Math.max(cutWidth, this.settings.vectorMinimumCutDepthMm) / 2,
    );
  }

  private planFaceStripCut(cutGeometry: VectorGeometry, protectedGeometry: VectorGeometry, minX: number, maxX: number, cutWidth: number, radialDirection: -1 | 1): VectorGeometry {
    const plunge = this.findFacePlunge(cutGeometry, protectedGeometry, minX, maxX, radialDirection);
    if (!plunge) return [];
    if (plunge.removedArea <= this.getMinRoughChipArea(cutWidth)) return [];

    this.moveTo(plunge.x, this.safeY);
    this.moveTo(plunge.x, plunge.targetY, plunge.removedArea, cutWidth);
    // When a face plunge reaches the radial boundary, a short sideways creep
    // can clean the bottom/cutoff edge that the finite tool width would
    // otherwise leave behind. It is still clipped by canToolMove.
    const creepGeometry = this.shouldCreepFaceStrip(plunge.targetY)
      ? this.planFaceStripCreep(cutGeometry, protectedGeometry, minX, plunge.x, cutWidth, radialDirection)
      : [];
    this.moveTo(this.currentX, this.safeY);

    return unionGeometry(plunge.removedGeometry, creepGeometry);
  }

  private shouldCreepFaceStrip(targetY: number): boolean {
    // Only creep near the centerline/inner-bore boundary. Away from that
    // boundary, sideways roughing in face mode risks turning a simple plunge
    // strategy into contour following, which finishing already handles.
    const baselineY = this.profile.side === 'outside' ? -this.stock.innerRadius : -this.stock.radius;
    return Math.abs(targetY - baselineY) <= Math.max(this.settings.vectorFaceCreepBoundaryRangeMm, this.latheCode.getDepth().cutMm);
  }

  private planFaceStripCreep(cutGeometry: VectorGeometry, protectedGeometry: VectorGeometry, minX: number, startX: number, cutWidth: number, radialDirection: -1 | 1): VectorGeometry {
    const removed: VectorGeometry[] = [];
    const width = startX - minX;
    if (width <= this.epsilon) return [];

    const step = Math.max(this.settings.vectorFaceCreepMinimumStepMm, Math.min(this.latheCode.getDepth().cutMm / 4, width / 4 || width));
    for (let x = startX - step; x >= minX - this.epsilon; x -= step) {
      const targetX = Math.max(minX, x);
      const targetY = this.findFaceCreepTargetY(cutGeometry, protectedGeometry, targetX, radialDirection);
      if (targetY === null) continue;

      const safePoint = this.findSafeFaceCreepPoint({x: this.currentX, y: this.currentY}, {x: targetX, y: targetY}, protectedGeometry, radialDirection);
      if (!safePoint) break;

      const removedGeometry = intersectGeometry(
        cutGeometry,
        createLinearSweptToolGeometry(this.latheCode.getTool(), radialDirection, this.currentX, this.currentY, safePoint.x, safePoint.y),
      );
      const removedArea = geometryArea(removedGeometry);
      this.moveTo(safePoint.x, safePoint.y, removedArea, cutWidth);
      if (removedArea > this.epsilon) removed.push(removedGeometry);
      if (!samePoint(safePoint, {x: targetX, y: targetY}, this.epsilon)) break;
    }

    return unionGeometry(...removed);
  }

  private findFacePlunge(cutGeometry: VectorGeometry, protectedGeometry: VectorGeometry, minX: number, maxX: number, radialDirection: -1 | 1): FacePlunge | null {
    let best: FacePlunge | null = null;
    // A strip may contain grooves or islands narrower than the tool. Try a
    // small set of representative X positions and choose the safe plunge that
    // removes the most material, rather than assuming the strip center is valid.
    for (const x of this.getFacePlungeCandidateXs(minX, maxX)) {
      for (const span of getVerticalSpansNearX(cutGeometry, x, minX, maxX, this.settings.vectorSpanSampleOffsetMaxMm, this.epsilon)) {
        const fullTargetY = radialDirection > 0 ? span.maxY : span.minY;
        const materialStartY = radialDirection > 0 ? span.minY : span.maxY;
        const targetY = this.findSafeFaceTargetY(x, fullTargetY, protectedGeometry, radialDirection);
        if (targetY === null) continue;

        const materialDepth = radialDirection > 0 ? targetY - materialStartY : materialStartY - targetY;
        if (materialDepth <= this.minUsefulCutMm) continue;
        const removedGeometry = intersectGeometry(
          cutGeometry,
          createSweptToolGeometry(this.latheCode.getTool(), radialDirection, x, this.safeY, targetY),
          rectangleGeometry(
            minX,
            Math.min(this.safeY, targetY),
            maxX,
            Math.max(this.safeY, targetY),
          ),
        );
        const removedArea = geometryArea(removedGeometry);
        if (removedArea <= this.epsilon) continue;
        if (!best ||
          removedArea > best.removedArea + this.epsilon ||
          (Math.abs(removedArea - best.removedArea) <= this.epsilon && materialDepth > best.materialDepth + this.epsilon) ||
          (Math.abs(removedArea - best.removedArea) <= this.epsilon && Math.abs(materialDepth - best.materialDepth) <= this.epsilon && x > best.x + this.epsilon)) {
          best = {x, targetY, materialDepth, removedGeometry, removedArea};
        }
      }
    }
    return best;
  }

  private findFaceCreepTargetY(cutGeometry: VectorGeometry, protectedGeometry: VectorGeometry, x: number, radialDirection: -1 | 1): number | null {
    let best: {targetY: number, materialDepth: number} | null = null;
    const bounds = geometryBounds(cutGeometry);
    if (!bounds) return null;

    for (const span of getVerticalSpansNearX(cutGeometry, x, bounds.minX, bounds.maxX, this.settings.vectorSpanSampleOffsetMaxMm, this.epsilon)) {
      const fullTargetY = radialDirection > 0 ? span.maxY : span.minY;
      const materialStartY = radialDirection > 0 ? span.minY : span.maxY;
      const targetY = this.findSafeFaceTargetY(x, fullTargetY, protectedGeometry, radialDirection);
      if (targetY === null) continue;

      const materialDepth = radialDirection > 0 ? targetY - materialStartY : materialStartY - targetY;
      if (materialDepth <= this.minUsefulCutMm) continue;
      if (!best || materialDepth > best.materialDepth + this.epsilon) best = {targetY, materialDepth};
    }

    return best?.targetY ?? null;
  }

  private findSafeFaceCreepPoint(start: VectorPoint, end: VectorPoint, protectedGeometry: VectorGeometry, radialDirection: -1 | 1): VectorPoint | null {
    if (this.canToolMove(start.x, start.y, end.x, end.y, protectedGeometry, radialDirection)) return end;

    // Candidate creep moves are monotonic along a single line segment: if the
    // full move collides, binary-search the last safe prefix instead of
    // stepping by pixels or arbitrary distances.
    let safeT = 0;
    let blockedT = 1;
    for (let i = 0; i < this.settings.vectorBinarySearchIterations; i++) {
      const midT = (safeT + blockedT) / 2;
      const midPoint = interpolatePoint(start, end, midT);
      if (this.canToolMove(start.x, start.y, midPoint.x, midPoint.y, protectedGeometry, radialDirection)) safeT = midT;
      else blockedT = midT;
    }

    if (safeT <= this.epsilon) return null;
    const safePoint = interpolatePoint(start, end, safeT);
    return distance(start, safePoint) > this.minUsefulCutMm ? safePoint : null;
  }

  private getFacePlungeCandidateXs(minX: number, maxX: number): number[] {
    const width = maxX - minX;
    if (width <= this.epsilon) return [];

    const margin = Math.min(this.settings.vectorCandidateMarginMm, width / 4);
    const startX = minX + margin;
    const endX = maxX - margin;
    if (endX < startX - this.epsilon) return [minX, (minX + maxX) / 2, maxX];

    const step = Math.max(this.settings.vectorCandidateMinimumStepMm, Math.min(this.latheCode.getDepth().cutMm / 2, width / 12 || width));
    const result: number[] = [minX, maxX];
    for (let x = startX; x <= endX + this.epsilon; x += step) {
      addUniqueNumber(result, Math.min(endX, x), this.epsilon);
    }
    addUniqueNumber(result, endX, this.epsilon);
    return result.sort((a, b) => a - b);
  }

  private findSafeFaceTargetY(passX: number, targetY: number, protectedGeometry: VectorGeometry, radialDirection: -1 | 1): number | null {
    if (Math.abs(targetY - this.safeY) <= this.epsilon) return null;
    if (this.canFacePlungeAt(passX, targetY, protectedGeometry, radialDirection)) return targetY;

    // The safe portion of a plunge is also monotonic from safeY toward targetY.
    // Searching in parameter space gives a maximal useful cut without making
    // planner behavior depend on a fixed linear step.
    let safeY = this.safeY;
    let blockedY = targetY;
    for (let i = 0; i < this.settings.vectorBinarySearchIterations; i++) {
      const midY = (safeY + blockedY) / 2;
      if (Math.abs(midY - this.safeY) <= this.epsilon) break;
      if (this.canFacePlungeAt(passX, midY, protectedGeometry, radialDirection)) safeY = midY;
      else blockedY = midY;
    }

    return Math.abs(safeY - this.safeY) > this.minUsefulCutMm ? safeY : null;
  }

  private canFacePlungeAt(passX: number, targetY: number, protectedGeometry: VectorGeometry, radialDirection: -1 | 1): boolean {
    return this.canToolMove(passX, this.safeY, passX, targetY, protectedGeometry, radialDirection);
  }

  private planBandCut(cutGeometry: VectorGeometry, protectedGeometry: VectorGeometry, passY: number, cutWidth: number, radialDirection: -1 | 1): VectorGeometry {
    const removed: VectorGeometry[] = [];
    for (const span of horizontalSpansAtY(cutGeometry, passY)) {
      const cut = this.findTurnCut(protectedGeometry, span.minX, span.maxX, passY, radialDirection);
      if (!cut) continue;

      this.moveTo(cut.startX, this.safeY);
      this.moveTo(cut.startX, passY, Math.max(cutWidth * 0.001, Math.abs(passY - this.safeY) * cutWidth * 0.01), cutWidth);
      this.moveTo(cut.endX, passY, cut.cutLength * cutWidth, cutWidth);
      this.moveTo(cut.endX, this.safeY);

      removed.push(intersectGeometry(
        cutGeometry,
        createLinearSweptToolGeometry(this.latheCode.getTool(), radialDirection, cut.startX, passY, cut.endX, passY),
      ));
    }
    return unionGeometry(...removed);
  }

  private findTurnCut(protectedGeometry: VectorGeometry, minX: number, maxX: number, passY: number, radialDirection: -1 | 1): {startX: number, endX: number, cutLength: number} | null {
    let best: {startX: number, endX: number, cutLength: number} | null = null;
    // For a horizontal material span, any candidate start must first be
    // reachable by a radial approach. Pick the reachable start that gives the
    // longest safe axial cut so each band is cleared with fewest passes.
    for (const startX of this.getTurnCutCandidateXs(minX, maxX)) {
      if (!this.canToolMove(startX, this.safeY, startX, passY, protectedGeometry, radialDirection)) continue;

      const endX = this.findSafeTurnEndX(startX, maxX, passY, protectedGeometry, radialDirection);
      if (endX === null) continue;

      const cutLength = endX - startX;
      if (cutLength <= this.minUsefulCutMm) continue;
      if (!best || cutLength > best.cutLength + this.epsilon) {
        best = {startX, endX, cutLength};
      }
    }
    return best;
  }

  private getTurnCutCandidateXs(minX: number, maxX: number): number[] {
    const width = maxX - minX;
    if (width <= this.epsilon) return [];

    const margin = Math.min(this.settings.vectorCandidateMarginMm, width / 4);
    const startX = minX + margin;
    const endX = maxX - margin;
    if (endX < startX - this.epsilon) return [(minX + maxX) / 2];

    const step = Math.max(this.settings.vectorCandidateMinimumStepMm, Math.min(this.latheCode.getDepth().cutMm / 2, width / 12 || width));
    const result: number[] = [];
    for (let x = startX; x <= endX + this.epsilon; x += step) {
      result.push(Math.min(endX, x));
    }
    if (!result.some(x => Math.abs(x - endX) <= this.epsilon)) result.push(endX);
    return result;
  }

  private findSafeTurnEndX(startX: number, targetX: number, passY: number, protectedGeometry: VectorGeometry, radialDirection: -1 | 1): number | null {
    if (targetX - startX <= this.epsilon) return null;
    if (this.canToolMove(startX, passY, targetX, passY, protectedGeometry, radialDirection)) return targetX;

    // Same monotonic-prefix idea as radial plunges: when the whole horizontal
    // pass would gouge, keep the longest prefix whose swept footprint clears.
    let safeX = startX;
    let blockedX = targetX;
    for (let i = 0; i < this.settings.vectorBinarySearchIterations; i++) {
      const midX = (safeX + blockedX) / 2;
      if (midX - startX <= this.epsilon) break;
      if (this.canToolMove(startX, passY, midX, passY, protectedGeometry, radialDirection)) safeX = midX;
      else blockedX = midX;
    }

    return safeX - startX > this.minUsefulCutMm ? safeX : null;
  }

  private canToolMove(startX: number, startY: number, endX: number, endY: number, protectedGeometry: VectorGeometry, radialDirection: -1 | 1): boolean {
    const keepoutGeometry = this.toolKeepouts.get(protectedGeometry) ??
      createToolKeepoutGeometry(this.latheCode.getTool(), radialDirection, protectedGeometry);
    const toolPath = [
      {x: startX, y: startY},
      {x: endX, y: endY},
    ];
    const keepoutBlocks = openPathIntersectsGeometryInterior(toolPath, keepoutGeometry);
    const sweptTool = createLinearSweptToolGeometry(this.latheCode.getTool(), radialDirection, startX, startY, endX, endY);
    const sweptToolClears =
      geometryArea(intersectGeometry(sweptTool, protectedGeometry)) <= this.settings.vectorToolpathGougeToleranceAreaMm2;

    // The keepout is the configuration-space view: if the control-point path
    // enters finalPart + reflectedTool, some part of the insert may overlap the
    // protected shape. Exact swept-area verification remains authoritative
    // around concave parting slots and numerical boundary contact.
    if (keepoutBlocks && !sweptToolClears) return false;
    return sweptToolClears;
  }

  private planFinishProfile(protectedGeometry: VectorGeometry, removableGeometry: VectorGeometry) {
    const openSegments = this.profile.side === 'outside'
      ? this.latheCode.getOutsideProfileSegments()
      : this.latheCode.getInsideProfileSegments();
    const profilePoints = approximateSegments(openSegments, this.getFinishChordMm())
      .map(point => this.pointToMovePoint(point));
    const radialDirection = this.profile.side === 'outside' ? 1 : -1;
    // Finishing follows a tool-control-point path derived from the desired
    // profile and the full insert footprint. Each point has a preferred
    // clearance version and an exact-contact fallback; the exact path prevents
    // tiny clearance offsets from leaving visible stock at sharp transitions.
    const points = this.getFinishToolPathPoints(profilePoints, radialDirection);
    if (points.length < 2) return;
    this.postMessage({progressMessage: `Vector finishing ${points.length - 1} profile segments...`});

    const finishWidth = Math.max(this.latheCode.getDepth().finishMm, this.settings.vectorMinimumCutDepthMm);
    let previous: VectorPoint | null = null;

    for (let index = 0; index < points.length; index++) {
      const {preferred, exact} = points[index];
      if (previous && this.shouldSkipDuplicateBoundaryPoint(previous, preferred, exact, radialDirection)) continue;

      if (!previous) {
        const plungePoint = this.findFinishPlungePoint(preferred, exact, protectedGeometry, radialDirection);
        if (plungePoint) {
          const start = {x: plungePoint.x, y: this.safeY};
          const cleanupPoint = this.extendFinishPointToCleanBoundary(
            start,
            plungePoint,
            removableGeometry,
            protectedGeometry,
            radialDirection,
            this.isTerminalRadialBoundaryPoint(index, points, radialDirection),
          );
          this.moveTo(plungePoint.x, this.safeY);
          this.moveTo(cleanupPoint.x, cleanupPoint.y, Math.abs(cleanupPoint.y - this.safeY) * finishWidth, finishWidth);
          const continuationPoint = this.recoverBoundaryCleanupForContinuation(
            cleanupPoint,
            plungePoint,
            points[index + 1],
            protectedGeometry,
            radialDirection,
          );
          if (!samePoint(continuationPoint, cleanupPoint, this.epsilon)) {
            this.moveTo(continuationPoint.x, continuationPoint.y, distance(cleanupPoint, continuationPoint) * finishWidth, finishWidth);
          }
          previous = continuationPoint;
        }
        continue;
      }

      // A finish segment is either reached fully, reached as a safe prefix, or
      // abandoned and restarted from safeY. Restarting is conservative but keeps
      // the planner from dragging the whole insert through protected geometry.
      const finishMove = this.findFinishMove(previous, preferred, exact, protectedGeometry, radialDirection);
      let cleanupPoint = finishMove?.reachedTarget
        ? this.extendFinishPointToCleanBoundary(
            previous,
            finishMove.point,
            removableGeometry,
            protectedGeometry,
            radialDirection,
            this.isTerminalRadialBoundaryPoint(index, points, radialDirection),
          )
        : finishMove?.point ?? null;
      if (finishMove && cleanupPoint) {
        this.moveTo(cleanupPoint.x, cleanupPoint.y, distance(previous, cleanupPoint) * finishWidth, finishWidth);
      }

      if (finishMove?.reachedTarget) {
        const cornerCleanupPoint = cleanupPoint && this.shouldCleanRadialBoundaryCorner(index, points, radialDirection)
          ? this.extendFinishPointPastRadialBoundary(cleanupPoint, removableGeometry, protectedGeometry, radialDirection)
          : null;
        if (cornerCleanupPoint && cleanupPoint && !samePoint(cornerCleanupPoint, cleanupPoint, this.epsilon)) {
          this.moveTo(
            cornerCleanupPoint.x,
            cornerCleanupPoint.y,
            distance(cleanupPoint, cornerCleanupPoint) * finishWidth,
            finishWidth,
          );
          cleanupPoint = cornerCleanupPoint;
        }
        const continuationPoint = cleanupPoint
          ? this.recoverBoundaryCleanupForContinuation(
              cleanupPoint,
              finishMove.point,
              points[index + 1],
              protectedGeometry,
              radialDirection,
            )
          : finishMove.point;
        if (cleanupPoint && !samePoint(continuationPoint, cleanupPoint, this.epsilon)) {
          this.moveTo(continuationPoint.x, continuationPoint.y, distance(cleanupPoint, continuationPoint) * finishWidth, finishWidth);
        }
        previous = continuationPoint;
      } else {
        this.moveTo(this.currentX, this.safeY);
        previous = null;
      }
    }
  }

  private findFinishPlungePoint(preferred: VectorPoint, exact: VectorPoint, protectedGeometry: VectorGeometry, radialDirection: -1 | 1): VectorPoint | null {
    if (this.canFinishPlunge(preferred, protectedGeometry, radialDirection)) return preferred;
    if (!samePoint(preferred, exact, this.epsilon) && this.canFinishPlunge(exact, protectedGeometry, radialDirection)) return exact;
    return null;
  }

  private canFinishPlunge(point: VectorPoint, protectedGeometry: VectorGeometry, radialDirection: -1 | 1): boolean {
    return this.canToolMove(point.x, this.safeY, point.x, point.y, protectedGeometry, radialDirection);
  }

  private getFinishToolPathPoints(profilePoints: VectorPoint[], radialDirection: -1 | 1): FinishToolPathPoint[] {
    // Convert desired contact points on the part into control-point locations
    // for the active tool. This is the finishing equivalent of cutter
    // compensation, but it uses the whole polygonal footprint rather than a
    // nominal nose radius.
    const footprintPoints = createToolFootprintGeometry(this.latheCode.getTool(), radialDirection)
      .flat(2)
      .map(([x, y]) => ({x, y}));
    const exactPoints = createToolAnchorPath(profilePoints, footprintPoints, radialDirection, 0, this.epsilon);
    const preferredPoints = createToolAnchorPath(profilePoints, footprintPoints, radialDirection, this.settings.vectorContactClearanceMm, this.epsilon);
    return preferredPoints.map((preferred, index) => {
      const exact = exactPoints[index] ?? preferred;
      // Rectangular inserts are normalized with the commanded point on their
      // right edge. Clamping prevents compensation from asking the machine to
      // start beyond stock ends just to keep the non-cutting side aligned.
      return this.latheCode.getTool().type === 'RECT'
        ? {
            preferred: this.clampFinishToolPathPoint(preferred),
            exact: this.clampFinishToolPathPoint(exact),
          }
        : {preferred, exact};
    });
  }

  private clampFinishToolPathPoint(point: VectorPoint): VectorPoint {
    return {
      x: Math.min(this.leftX, Math.max(this.rightX, point.x)),
      y: point.y,
    };
  }

  private findSafeFinishEndPoint(start: VectorPoint, end: VectorPoint, protectedGeometry: VectorGeometry, radialDirection: -1 | 1): VectorPoint | null {
    if (this.canToolMove(start.x, start.y, end.x, end.y, protectedGeometry, radialDirection)) return end;

    // Finish moves are short profile chords. If a full chord is unsafe, keep the
    // last safe prefix so the next loop can retract and resume from a clean
    // approach instead of depending on spatial stepping.
    let safeT = 0;
    let blockedT = 1;
    for (let i = 0; i < this.settings.vectorBinarySearchIterations; i++) {
      const midT = (safeT + blockedT) / 2;
      const midPoint = interpolatePoint(start, end, midT);
      if (this.canToolMove(start.x, start.y, midPoint.x, midPoint.y, protectedGeometry, radialDirection)) safeT = midT;
      else blockedT = midT;
    }

    if (safeT <= this.epsilon) return null;
    const safePoint = interpolatePoint(start, end, safeT);
    return distance(start, safePoint) > this.minUsefulCutMm ? safePoint : null;
  }

  private findFinishMove(
    start: VectorPoint,
    preferred: VectorPoint,
    exact: VectorPoint,
    protectedGeometry: VectorGeometry,
    radialDirection: -1 | 1,
  ): {point: VectorPoint, reachedTarget: boolean} | null {
    const preferredPoint = this.findSafeFinishEndPoint(start, preferred, protectedGeometry, radialDirection);
    if (preferredPoint && samePoint(preferredPoint, preferred, this.epsilon)) return {point: preferredPoint, reachedTarget: true};

    if (!samePoint(preferred, exact, this.epsilon)) {
      // Prefer clearance, but use exact contact when clearance is what blocks a
      // profile transition. If neither target is fully reachable, keep whichever
      // safe prefix made more progress along this chord.
      const exactPoint = this.findSafeFinishEndPoint(start, exact, protectedGeometry, radialDirection);
      if (exactPoint && samePoint(exactPoint, exact, this.epsilon)) return {point: exactPoint, reachedTarget: true};
      if (!preferredPoint) return exactPoint ? {point: exactPoint, reachedTarget: false} : null;
      if (exactPoint && distance(start, exactPoint) > distance(start, preferredPoint) + this.epsilon) {
        return {point: exactPoint, reachedTarget: false};
      }
    }

    return preferredPoint ? {point: preferredPoint, reachedTarget: false} : null;
  }

  private extendFinishPointToCleanBoundary(
    start: VectorPoint,
    end: VectorPoint,
    removableGeometry: VectorGeometry,
    protectedGeometry: VectorGeometry,
    radialDirection: -1 | 1,
    isTerminalCutoff: boolean,
  ): VectorPoint {
    const direction = normalizeVector(vectorBetween(start, end), this.epsilon);
    if (!direction || !this.isRadialBoundaryCleanupDirection(end, direction, radialDirection)) return end;

    const maxOvertravel = getToolRadialBoundaryOvertravel(this.latheCode.getTool(), radialDirection);
    if (maxOvertravel <= this.epsilon) return end;

    // Radial boundary cuts need controlled overtravel when the cutter's rounded
    // corner reaches the boundary before the full tool width has swept it. The
    // tool geometry computes the maximum useful overtravel; material-left tests
    // prevent unrelated extension except at terminal cutoffs.
    const baseRemovedArea = geometryArea(intersectGeometry(
      removableGeometry,
      createLinearSweptToolGeometry(this.latheCode.getTool(), radialDirection, start.x, start.y, end.x, end.y),
    ));
    const target = {
      x: end.x + direction.x * maxOvertravel,
      y: end.y + direction.y * maxOvertravel,
    };
    const safeTarget = this.findSafeFinishEndPoint(start, target, protectedGeometry, radialDirection);
    if (!safeTarget) return end;

    const extendedRemovedArea = geometryArea(intersectGeometry(
      removableGeometry,
      createLinearSweptToolGeometry(this.latheCode.getTool(), radialDirection, start.x, start.y, safeTarget.x, safeTarget.y),
    ));
    return isTerminalCutoff || extendedRemovedArea > baseRemovedArea + this.settings.vectorBoundaryCleanupMinAreaMm2 ? safeTarget : end;
  }

  private isRadialBoundaryCleanupDirection(point: VectorPoint, direction: VectorPoint, radialDirection: -1 | 1): boolean {
    const boundaryY = this.profile.side === 'outside' ? -this.stock.innerRadius : -this.stock.radius;
    const boundaryTolerance = this.settings.vectorRadialBoundaryToleranceMm;
    const movingBeyondBoundary = radialDirection > 0
      ? direction.y > 1 - this.epsilon && point.y >= boundaryY - boundaryTolerance
      : direction.y < -1 + this.epsilon && point.y <= boundaryY + boundaryTolerance;
    return movingBeyondBoundary && Math.abs(direction.x) <= boundaryTolerance;
  }

  private extendFinishPointPastRadialBoundary(
    point: VectorPoint,
    removableGeometry: VectorGeometry,
    protectedGeometry: VectorGeometry,
    radialDirection: -1 | 1,
  ): VectorPoint {
    const overtravel = getToolRadialBoundaryOvertravel(this.latheCode.getTool(), radialDirection);
    if (overtravel <= this.epsilon) return point;

    // At a radial-boundary corner, briefly pass the boundary before continuing
    // along the profile so the tool radius actually cleans the corner instead
    // of leaving a crescent of stock.
    const directionY = radialDirection > 0 ? 1 : -1;
    const target = {x: point.x, y: point.y + directionY * overtravel};
    const safeTarget = this.findSafeFinishEndPoint(point, target, protectedGeometry, radialDirection);
    if (!safeTarget) return point;

    const extraRemovedArea = geometryArea(intersectGeometry(
      removableGeometry,
      createLinearSweptToolGeometry(this.latheCode.getTool(), radialDirection, point.x, point.y, safeTarget.x, safeTarget.y),
    ));
    return extraRemovedArea > this.settings.vectorBoundaryCleanupMinAreaMm2 ? safeTarget : point;
  }

  private isTerminalRadialBoundaryPoint(index: number, points: FinishToolPathPoint[], radialDirection: -1 | 1): boolean {
    const point = points[index].exact;
    if (!this.isAtRadialBoundary(point, radialDirection)) return false;
    return points.slice(index + 1).every(next =>
      Math.abs(next.exact.x - point.x) <= this.settings.vectorRadialBoundaryToleranceMm &&
      this.isAtRadialBoundary(next.exact, radialDirection));
  }

  private shouldSkipDuplicateBoundaryPoint(previous: VectorPoint, preferred: VectorPoint, exact: VectorPoint, radialDirection: -1 | 1): boolean {
    if (!this.isBeyondRadialBoundary(previous, radialDirection)) return false;
    const point = this.isAtRadialBoundary(exact, radialDirection) ? exact : preferred;
    return Math.abs(previous.x - point.x) <= this.settings.vectorRadialBoundaryToleranceMm && this.isAtRadialBoundary(point, radialDirection);
  }

  private shouldCleanRadialBoundaryCorner(index: number, points: FinishToolPathPoint[], radialDirection: -1 | 1): boolean {
    const point = points[index].exact;
    const next = points[index + 1]?.exact;
    return !!next &&
      this.isAtRadialBoundary(point, radialDirection) &&
      !this.isAtRadialBoundary(next, radialDirection) &&
      Math.abs(next.x - point.x) <= this.settings.vectorRadialBoundaryToleranceMm;
  }

  private recoverBoundaryCleanupForContinuation(
    cleanupPoint: VectorPoint,
    boundaryPoint: VectorPoint,
    next: FinishToolPathPoint | undefined,
    protectedGeometry: VectorGeometry,
    radialDirection: -1 | 1,
  ): VectorPoint {
    if (!next || samePoint(cleanupPoint, boundaryPoint, this.epsilon) || !this.isBeyondRadialBoundary(cleanupPoint, radialDirection)) {
      return cleanupPoint;
    }

    // Cleanup overtravel can put the control point past a boundary where the
    // next profile chord is no longer reachable. If backing up to the true
    // boundary gives a complete continuation, prefer that over ending the
    // finishing chain and forcing a retract.
    const cleanupContinuation = this.findFinishMove(cleanupPoint, next.preferred, next.exact, protectedGeometry, radialDirection);
    if (cleanupContinuation?.reachedTarget) return cleanupPoint;

    const safeBoundary = this.findSafeFinishEndPoint(cleanupPoint, boundaryPoint, protectedGeometry, radialDirection);
    if (!safeBoundary || !samePoint(safeBoundary, boundaryPoint, this.epsilon)) return cleanupPoint;

    const boundaryContinuation = this.findFinishMove(boundaryPoint, next.preferred, next.exact, protectedGeometry, radialDirection);
    return boundaryContinuation?.reachedTarget ? boundaryPoint : cleanupPoint;
  }

  private isAtRadialBoundary(point: VectorPoint, radialDirection: -1 | 1): boolean {
    const boundaryY = this.profile.side === 'outside' ? -this.stock.innerRadius : -this.stock.radius;
    return radialDirection > 0
      ? point.y >= boundaryY - this.settings.vectorRadialBoundaryToleranceMm
      : point.y <= boundaryY + this.settings.vectorRadialBoundaryToleranceMm;
  }

  private isBeyondRadialBoundary(point: VectorPoint, radialDirection: -1 | 1): boolean {
    const boundaryY = this.profile.side === 'outside' ? -this.stock.innerRadius : -this.stock.radius;
    return radialDirection > 0
      ? point.y > boundaryY + this.settings.vectorRadialBoundaryToleranceMm
      : point.y < boundaryY - this.settings.vectorRadialBoundaryToleranceMm;
  }

  private geometryFromSegments(segments: Segment[]): VectorGeometry {
    return polygonFromPoints(approximateSegments(segments, this.getFinishChordMm())
      .map(point => this.pointToMovePoint(point)));
  }

  private profileGeometryWithAllowance(radialOffsetMm: number): VectorGeometry {
    const openSegments = this.profile.side === 'outside'
      ? this.latheCode.getOutsideProfileSegments()
      : this.latheCode.getInsideProfileSegments();
    const offsetPoints = approximateSegments(offsetSegmentsRadially(openSegments, radialOffsetMm), this.getFinishChordMm());
    if (!offsetPoints.length) return [];

    const first = offsetPoints[0];
    const last = offsetPoints.at(-1)!;
    // Open profile paths describe only the surface being cut. Closing to the
    // opposite stock radius creates the protected "solid part" region: to the
    // centerline/ID for outside work, or to the OD for inside boring.
    const baselineRadius = this.profile.side === 'outside' ? this.stock.innerRadius : this.stock.radius;
    const ringPoints = [
      new Point(baselineRadius, first.z),
      ...offsetPoints,
      new Point(baselineRadius, last.z),
    ];
    return polygonFromPoints(ringPoints.map(point => this.pointToMovePoint(point)));
  }

  private pointToMovePoint(point: Point): VectorPoint {
    // LatheCode stores positive radius and Z increasing from the left datum.
    // Planner/move space uses the stock-right end as negative X and mirrors
    // radius into negative Y, matching how previews and Move deltas are drawn.
    return {
      x: point.z - this.stock.length,
      y: -point.x,
    };
  }

  private moveTo(x: number, y: number, cutAreaMmSq = 0, cutAreaMaxWidthMm = 0) {
    const targetX = cleanNumber(x, this.epsilon);
    const targetY = cleanNumber(y, this.epsilon);
    const xDelta = cleanNumber(targetX - this.currentX, this.epsilon);
    const yDelta = cleanNumber(targetY - this.currentY, this.epsilon);
    if (Math.abs(xDelta) <= this.epsilon && Math.abs(yDelta) <= this.epsilon) {
      this.currentX = targetX;
      this.currentY = targetY;
      return;
    }

    this.moves.push(new Move(
      this.currentX,
      this.currentY,
      xDelta,
      yDelta,
      Math.max(0, cleanNumber(cutAreaMmSq, this.epsilon)),
      Math.max(0, cleanNumber(cutAreaMaxWidthMm, this.epsilon)),
    ));
    this.currentX = targetX;
    this.currentY = targetY;
  }

  private canStepToward(current: number, limit: number, direction: -1 | 1): boolean {
    return direction > 0 ? current < limit - this.epsilon : current > limit + this.epsilon;
  }

  private getFinishChordMm() {
    const minChord = Math.min(this.settings.vectorFinishChordMinMm, this.settings.vectorFinishChordMaxMm);
    const maxChord = Math.max(this.settings.vectorFinishChordMinMm, this.settings.vectorFinishChordMaxMm);
    return Math.max(minChord, Math.min(maxChord, this.latheCode.getDepth().cutMm / 2));
  }

  private getFinalLeftoverToleranceArea(protectedGeometry: VectorGeometry): number {
    const bounds = geometryBounds(protectedGeometry);
    if (!bounds) return this.settings.vectorToolpathGougeToleranceAreaMm2;

    // Curves are approximated as chords before polygon clipping. The expected
    // leftover from that approximation grows with profile perimeter, so scale
    // the reporting threshold with part size instead of using only a fixed area.
    const chordAreaAllowance = (
      (bounds.maxX - bounds.minX) + (bounds.maxY - bounds.minY)
    ) * (this.getFinishChordMm() + this.settings.vectorGeometryLinearToleranceMm) / 4;
    return Math.max(this.settings.vectorFinalLeftoverMinToleranceAreaMm2, chordAreaAllowance);
  }

  private reportFinalLeftoverStock(protectedGeometry: VectorGeometry, stockAfterFinishing: VectorGeometry): void {
    const leftoverArea = geometryArea(differenceGeometry(stockAfterFinishing, protectedGeometry));
    const toleranceArea = this.getFinalLeftoverToleranceArea(protectedGeometry);
    if (leftoverArea > toleranceArea) {
      this.postMessage({progressMessage: `Vector verification left ${leftoverArea.toFixed(2)} mm2 uncut stock.`});
    }
  }

  private getVerificationGougeToleranceArea(protectedGeometry: VectorGeometry): number {
    const bounds = geometryBounds(protectedGeometry);
    if (!bounds) return this.settings.vectorToolpathGougeToleranceAreaMm2;

    const boundaryScale = (bounds.maxX - bounds.minX) + (bounds.maxY - bounds.minY);
    return Math.max(
      this.settings.vectorToolpathGougeToleranceAreaMm2,
      boundaryScale * this.settings.vectorGeometryLinearToleranceMm / 10,
    );
  }
}

export function simulateStockAfterMoves(
  stockGeometry: VectorGeometry,
  moves: Move[],
  tool: ReturnType<LatheCode['getTool']>,
  radialDirection: ToolRadialDirection,
): VectorGeometry {
  // Verification and fixture previews both use this same stock simulation:
  // each generated control-point move subtracts the whole swept tool footprint.
  // That keeps planner correctness tied to physical removal, not to the pass
  // bands the rougher used to search for moves.
  let remainingStock = stockGeometry;
  for (const move of moves) {
    if (!remainingStock.length) return remainingStock;
    remainingStock = differenceGeometry(
      remainingStock,
      createLinearSweptToolGeometry(
        tool,
        radialDirection,
        move.xStartMm,
        move.yStartMm,
        move.xStartMm + move.xDeltaMm,
        move.yStartMm + move.yDeltaMm,
      ),
    );
  }
  return remainingStock;
}

export function verifyStockContainsProtectedGeometry(
  phase: string,
  protectedGeometry: VectorGeometry,
  stockGeometry: VectorGeometry,
  gougeToleranceArea = TOOLPATH_GOUGE_TOLERANCE_AREA_MM2,
): void {
  // A gouge means some protected part area is missing from the simulated stock
  // after cutting. Compare protected - stock, not stock - protected.
  const gougeArea = geometryArea(differenceGeometry(protectedGeometry, stockGeometry));
  if (gougeArea > gougeToleranceArea) {
    throw new Error(`${phase} gouged protected geometry (${formatArea(gougeArea)} mm2 > ${formatArea(gougeToleranceArea)} mm2)`);
  }
}

export function verifyFinalStockMatchesProtectedGeometry(
  finalProtectedGeometry: VectorGeometry,
  stockAfterFinishing: VectorGeometry,
  leftoverToleranceArea: number,
  gougeToleranceArea = TOOLPATH_GOUGE_TOLERANCE_AREA_MM2,
): void {
  verifyStockContainsProtectedGeometry('Final toolpath', finalProtectedGeometry, stockAfterFinishing, gougeToleranceArea);

  const leftoverArea = geometryArea(differenceGeometry(stockAfterFinishing, finalProtectedGeometry));
  if (leftoverArea > leftoverToleranceArea) {
    throw new Error(`Final toolpath left uncut stock (${formatArea(leftoverArea)} mm2 > ${formatArea(leftoverToleranceArea)} mm2)`);
  }
}

function formatArea(area: number): string {
  return area.toFixed(6).replace(/\.?0+$/, '');
}

function distance(a: VectorPoint, b: VectorPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function interpolatePoint(start: VectorPoint, end: VectorPoint, t: number): VectorPoint {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

function samePoint(a: VectorPoint, b: VectorPoint, epsilon = EPSILON): boolean {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}

function getVerticalSpansNearX(geometry: VectorGeometry, x: number, minX: number, maxX: number, sampleOffsetMaxMm = DEFAULT_APP_SETTINGS.vectorSpanSampleOffsetMaxMm, epsilon = EPSILON) {
  // Sampling exactly on a vertical polygon edge can return either adjacent span
  // depending on clipping details. Include tiny left/right samples and merge so
  // planning sees the material that is actually near this plunge X.
  const sampleOffset = Math.min(sampleOffsetMaxMm, Math.max((maxX - minX) / 1e6, epsilon));
  const sampleXs = [x];
  if (x > minX + epsilon) sampleXs.push(x - sampleOffset);
  if (x < maxX - epsilon) sampleXs.push(x + sampleOffset);

  const spans = sampleXs.flatMap(sampleX => verticalSpansAtX(geometry, sampleX));
  return mergeVerticalSpansForPlanning(spans, epsilon);
}

function mergeVerticalSpansForPlanning(spans: {minY: number, maxY: number}[], epsilon = EPSILON) {
  const sorted = spans
    .filter(span => span.maxY - span.minY > epsilon)
    .sort((a, b) => a.minY - b.minY || a.maxY - b.maxY);
  const result: {minY: number, maxY: number}[] = [];
  for (const span of sorted) {
    const previous = result.at(-1);
    if (!previous || span.minY > previous.maxY + epsilon) {
      result.push({...span});
    } else {
      previous.maxY = Math.max(previous.maxY, span.maxY);
    }
  }
  return result;
}

function createToolAnchorPath(profilePoints: VectorPoint[], footprintPoints: VectorPoint[], radialDirection: -1 | 1, contactClearanceMm: number, epsilon = EPSILON): VectorPoint[] {
  if (profilePoints.length < 2) return profilePoints;
  if (!footprintPoints.length) return profilePoints;
  // Corner compensation can create mathematically long miters. Limiting by the
  // tool size keeps control points near the part when adjacent profile chords
  // are almost parallel or numerically noisy.
  const miterLimit = Math.max(1, maxDistanceFromOrigin(footprintPoints));

  return profilePoints.map((_, index) => {
    return getToolAnchorPoint(profilePoints, index, footprintPoints, radialDirection, miterLimit, contactClearanceMm, epsilon);
  });
}

function getToolAnchorPoint(
  points: VectorPoint[],
  index: number,
  footprintPoints: VectorPoint[],
  radialDirection: -1 | 1,
  miterLimit: number,
  contactClearanceMm: number,
  epsilon: number,
): VectorPoint {
  const point = points[index];
  const incoming = index > 0 ? normalizeVector(vectorBetween(points[index - 1], point), epsilon) : null;
  const outgoing = index < points.length - 1 ? normalizeVector(vectorBetween(point, points[index + 1]), epsilon) : null;

  if (incoming && outgoing) {
    // For interior profile points, offset both neighboring contact lines by the
    // support point of the tool and intersect them. That gives one control
    // point whose footprint is tangent to both adjacent profile chords.
    const incomingNormal = normalForTangent(incoming, radialDirection);
    const outgoingNormal = normalForTangent(outgoing, radialDirection);
    const incomingOffsetPoint = getAnchorPointForNormal(point, incomingNormal, footprintPoints, contactClearanceMm, epsilon);
    const outgoingOffsetPoint = getAnchorPointForNormal(point, outgoingNormal, footprintPoints, contactClearanceMm, epsilon);
    const intersection = lineIntersection(incomingOffsetPoint, incoming, outgoingOffsetPoint, outgoing, epsilon);
    if (intersection && distance(point, intersection) <= miterLimit) return intersection;
  }

  // Endpoints and rejected miters fall back to the local removable-side normal.
  // That still positions the whole insert outside protected geometry even when
  // there is only one adjacent chord to define contact.
  const normal = getRemovableNormal(points, index, radialDirection, epsilon);
  return getAnchorPointForNormal(point, normal, footprintPoints, contactClearanceMm, epsilon);
}

function getAnchorPointForNormal(profilePoint: VectorPoint, normal: VectorPoint, footprintPoints: VectorPoint[], contactClearanceMm: number, epsilon = EPSILON): VectorPoint {
  const support = supportPointAlongNormal(footprintPoints, normal, epsilon);
  return {
    x: profilePoint.x - support.x + normal.x * contactClearanceMm,
    y: profilePoint.y - support.y + normal.y * contactClearanceMm,
  };
}

function supportPointAlongNormal(points: VectorPoint[], normal: VectorPoint, epsilon = EPSILON): VectorPoint {
  // The support point is the part of the tool footprint that would touch the
  // profile for this normal. Choosing the closest point on ties avoids jumping
  // across a flat face of a rectangular tool.
  let best = points[0];
  let bestDot = dot(best, normal);
  let bestDistance = squaredDistanceFromOrigin(best);

  for (const point of points.slice(1)) {
    const pointDot = dot(point, normal);
    const pointDistance = squaredDistanceFromOrigin(point);
    if (
      pointDot < bestDot - epsilon ||
      (Math.abs(pointDot - bestDot) <= epsilon && pointDistance < bestDistance)
    ) {
      best = point;
      bestDot = pointDot;
      bestDistance = pointDistance;
    }
  }

  return best;
}

function getRemovableNormal(points: VectorPoint[], index: number, radialDirection: -1 | 1, epsilon = EPSILON): VectorPoint {
  const incoming = index > 0 ? normalizeVector(vectorBetween(points[index - 1], points[index]), epsilon) : null;
  const outgoing = index < points.length - 1 ? normalizeVector(vectorBetween(points[index], points[index + 1]), epsilon) : null;
  const incomingNormal = incoming ? normalForTangent(incoming, radialDirection) : null;
  const outgoingNormal = outgoing ? normalForTangent(outgoing, radialDirection) : null;

  if (incomingNormal && outgoingNormal) {
    const average = normalizeVector({
      x: incomingNormal.x + outgoingNormal.x,
      y: incomingNormal.y + outgoingNormal.y,
    }, epsilon);
    if (average) return average;
  }

  return outgoingNormal || incomingNormal || {x: 0, y: -radialDirection};
}

function normalForTangent(tangent: VectorPoint, radialDirection: -1 | 1): VectorPoint {
  return {
    x: radialDirection * tangent.y,
    y: -radialDirection * tangent.x,
  };
}

function vectorBetween(start: VectorPoint, end: VectorPoint): VectorPoint {
  return {
    x: end.x - start.x,
    y: end.y - start.y,
  };
}

function normalizeVector(vector: VectorPoint, epsilon = EPSILON): VectorPoint | null {
  const length = distance({x: 0, y: 0}, vector);
  if (length <= epsilon) return null;
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function lineIntersection(pointA: VectorPoint, directionA: VectorPoint, pointB: VectorPoint, directionB: VectorPoint, epsilon = EPSILON): VectorPoint | null {
  const denominator = cross(directionA, directionB);
  if (Math.abs(denominator) <= epsilon) return null;

  const delta = vectorBetween(pointA, pointB);
  const t = cross(delta, directionB) / denominator;
  return {
    x: pointA.x + directionA.x * t,
    y: pointA.y + directionA.y * t,
  };
}

function cross(a: VectorPoint, b: VectorPoint): number {
  return a.x * b.y - a.y * b.x;
}

function dot(a: VectorPoint, b: VectorPoint): number {
  return a.x * b.x + a.y * b.y;
}

function squaredDistanceFromOrigin(point: VectorPoint): number {
  return point.x ** 2 + point.y ** 2;
}

function maxDistanceFromOrigin(points: VectorPoint[]): number {
  return Math.sqrt(Math.max(...points.map(squaredDistanceFromOrigin)));
}

function addUniqueNumber(values: number[], value: number, epsilon = EPSILON) {
  if (!values.some(existing => Math.abs(existing - value) <= epsilon)) values.push(value);
}

function cleanNumber(value: number, epsilon = EPSILON): number {
  if (Math.abs(value) <= epsilon) return 0;
  return Math.round(value * 1e6) / 1e6;
}
