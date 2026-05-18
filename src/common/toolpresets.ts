export type CanonicalToolType = 'RECT' | 'ROUND' | 'ANG';
export type ToolParamName = 'R' | 'L' | 'H' | 'A' | 'NA';
export type ToolParams = Partial<Record<ToolParamName, number>>;

export type KnownInsertOption = {
  readonly name: string,
  readonly type: CanonicalToolType,
  readonly material: string,
  readonly params: ToolParams,
};

const TOOL_PARAM_NAMES: readonly ToolParamName[] = ['R', 'L', 'H', 'A', 'NA'];

export const KNOWN_INSERT_OPTIONS: readonly KnownInsertOption[] = [
  {name: 'RCMT060200', type: 'ROUND', material: 'Steel', params: {R: 3}},
  {name: 'RCMT0803M0', type: 'ROUND', material: 'Steel', params: {R: 4}},
  {name: 'RCMT10T3M0', type: 'ROUND', material: 'Steel', params: {R: 5}},
  {name: 'RPMT08T2M0E-JS', type: 'ROUND', material: 'Steel', params: {R: 4}},
  {name: 'RPMT10T3M0E-JS', type: 'ROUND', material: 'Steel', params: {R: 5}},
  {name: 'RCGT0602M0-A', type: 'ROUND', material: 'Aluminium', params: {R: 3}},
  {name: 'MGMN150', type: 'RECT', material: 'Steel', params: {R: 0.15, L: 1.5}},
  {name: 'MGMN200', type: 'RECT', material: 'Steel', params: {R: 0.2, L: 2}},
  {name: 'MGMN250', type: 'RECT', material: 'Steel', params: {R: 0.2, L: 2.5}},
  {name: 'MGMN300', type: 'RECT', material: 'Steel', params: {R: 0.4, L: 3}},
  {name: 'MGMN400', type: 'RECT', material: 'Steel', params: {R: 0.4, L: 4}},
  {name: 'SP300 PC9030', type: 'RECT', material: 'Steel', params: {R: 0.2, L: 3.1}},
  {name: 'SCGT09T304-AK', type: 'ANG', material: 'Aluminium', params: {R: 0.4, L: 9.525, A: 0, NA: 90}},
  {name: 'CCGT060204-AK', type: 'ANG', material: 'Aluminium', params: {R: 0.4, L: 6.4, A: 45, NA: 80}},
  {name: 'CCMT060204', type: 'ANG', material: 'Steel', params: {R: 0.4, L: 6.5, A: 45, NA: 80}},
  {name: 'DCGT070202', type: 'ANG', material: 'General', params: {R: 0.2, L: 7.75, A: 32.5, NA: 55}},
  {name: 'DCGT070204-AK', type: 'ANG', material: 'Aluminium', params: {R: 0.4, L: 7.8, A: 32.5, NA: 55}},
  {name: 'VCGT110304-AK', type: 'ANG', material: 'Aluminium', params: {R: 0.4, L: 11.1, A: 20.5, NA: 35}},
  {name: 'WNMG080408-HA', type: 'ANG', material: 'Aluminium', params: {R: 0.8, L: 8.687, A: 45, NA: 80}},
  {name: '11IR A60-FY01-A', type: 'ANG', material: 'Aluminium', params: {R: 0.05, L: 11, A: 0, NA: 60}},
  {name: '11ER A60-FY01-A', type: 'ANG', material: 'Aluminium', params: {R: 0.05, L: 11, A: 0, NA: 60}},
  {name: '11ER A60', type: 'ANG', material: 'Threading', params: {R: 0.05, L: 11, A: 0, NA: 60}},
  {name: '11IR A60', type: 'ANG', material: 'Threading', params: {R: 0.05, L: 11, A: 0, NA: 60}},
  {name: '16ER AG60', type: 'ANG', material: 'Threading', params: {R: 0.05, L: 16, A: 0, NA: 60}},
  {name: '16IR AG60', type: 'ANG', material: 'Threading', params: {R: 0.05, L: 16, A: 0, NA: 60}},
  {name: '16ER AG55', type: 'ANG', material: 'Threading', params: {R: 0.08, L: 16, A: 0, NA: 55}},
  {name: '16IR AG55', type: 'ANG', material: 'Threading', params: {R: 0.08, L: 16, A: 0, NA: 55}},
  {name: '22ER N60', type: 'ANG', material: 'Threading', params: {R: 0.3, L: 22, A: 0, NA: 60}},
  {name: '22IR N60', type: 'ANG', material: 'Threading', params: {R: 0.3, L: 22, A: 0, NA: 60}},
  {name: '22ER N55', type: 'ANG', material: 'Threading', params: {R: 0.4, L: 22, A: 0, NA: 55}},
  {name: '22IR N55', type: 'ANG', material: 'Threading', params: {R: 0.4, L: 22, A: 0, NA: 55}},
  {name: 'CCMT09T304', type: 'ANG', material: 'Steel', params: {R: 0.4, L: 9.7, A: 45, NA: 80}},
  {name: 'CCMT09T308', type: 'ANG', material: 'Steel', params: {R: 0.8, L: 9.7, A: 45, NA: 80}},
  {name: 'DCMT070204', type: 'ANG', material: 'Steel', params: {R: 0.4, L: 7.8, A: 32.5, NA: 55}},
  {name: 'DCMT11T304', type: 'ANG', material: 'Steel', params: {R: 0.4, L: 11.6, A: 32.5, NA: 55}},
  {name: 'DCMT11T308', type: 'ANG', material: 'Steel', params: {R: 0.8, L: 11.6, A: 32.5, NA: 55}},
  {name: 'TCMT110204', type: 'ANG', material: 'Steel', params: {R: 0.4, L: 11, A: 0, NA: 60}},
  {name: 'TCMT110208', type: 'ANG', material: 'Steel', params: {R: 0.8, L: 11, A: 0, NA: 60}},
  {name: 'VBMT160404', type: 'ANG', material: 'Steel', params: {R: 0.4, L: 16.6, A: 20.5, NA: 35}},
  {name: 'VBMT160408', type: 'ANG', material: 'Steel', params: {R: 0.8, L: 16.6, A: 20.5, NA: 35}},
  {name: 'WNMG060404', type: 'ANG', material: 'Steel', params: {R: 0.4, L: 6.515, A: 45, NA: 80}},
  {name: 'WNMG060408', type: 'ANG', material: 'Steel', params: {R: 0.8, L: 6.515, A: 45, NA: 80}},
  {name: 'WNMG080408-MA', type: 'ANG', material: 'Steel', params: {R: 0.8, L: 8.687, A: 45, NA: 80}},
  {name: 'WNMG080404', type: 'ANG', material: 'Steel', params: {R: 0.4, L: 8.687, A: 45, NA: 80}},
  {name: 'WNMG080412', type: 'ANG', material: 'Steel', params: {R: 1.2, L: 8.687, A: 45, NA: 80}},
];

export function insertOptionToToolLine(option: KnownInsertOption, rotationAngle?: string): string {
  const params = {...option.params};
  const angle = rotationAngle?.trim();
  if (option.type === 'ANG' && angle) {
    params.A = Number(angle);
  }
  return `TOOL ${option.type}${formatToolParams(params)}`;
}

function formatToolParams(params: ToolParams): string {
  const parts = TOOL_PARAM_NAMES.flatMap(name => {
    const value = params[name];
    return value === undefined ? [] : [`${name}${numberToString(value)}`];
  });
  return parts.length ? ` ${parts.join(' ')}` : '';
}

function numberToString(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : String(value);
}
