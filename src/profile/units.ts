import { DEFAULT_SNAP_MM, type DrawingState } from './types.ts';

export const INCH_MM = 25.4;

// Drawing geometry stays in millimetres; convert only at the UI boundary.
export function getDrawingUnitMm(state: DrawingState): number {
  return state.source?.unitMm === INCH_MM ? INCH_MM : 1;
}

export function getDrawingUnitLabel(state: DrawingState): string {
  return getDrawingUnitMm(state) === INCH_MM ? 'in' : 'mm';
}

export function getDefaultDrawingSnapMm(unitMm: number): number {
  return unitMm === INCH_MM ? 0.01 * INCH_MM : DEFAULT_SNAP_MM;
}

export function formatDrawingInput(state: DrawingState, valueMm: number): string {
  const unitMm = getDrawingUnitMm(state);
  // Remove conversion noise without rounding editable dimensions to label precision.
  return unitMm === 1 ? String(valueMm) : String(Number((valueMm / unitMm).toPrecision(15)));
}

export function formatDrawingLength(state: DrawingState, valueMm: number): string {
  const unitMm = getDrawingUnitMm(state);
  return String(Number((valueMm / unitMm).toFixed(unitMm === INCH_MM ? 5 : 3)));
}
