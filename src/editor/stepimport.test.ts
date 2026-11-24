// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { stepToLatheCodes } from './stepimport';

// Exercise the real CAD reader; supply the bundled WASM without an HTTP server.
vi.mock('occt-import-js/dist/occt-import-js.wasm?url', async () => {
  const { readFileSync } = await import('node:fs');
  return {default: `data:application/octet-stream;base64,${readFileSync('node_modules/occt-import-js/dist/occt-import-js.wasm').toString('base64')}`};
});

const pipe = readFileSync('test/integration/pipe.step', 'utf8');
function buffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function fractionalPipeAt(offset: number): string {
  const scale = 1.01333;
  return pipe
    .replace(/CARTESIAN_POINT\('',\(([^)]+)\)\)/g, (_match, coordinates: string) =>
      `CARTESIAN_POINT('',(${coordinates.split(',').map(value => (Number(value) * scale + offset).toFixed(8)).join(',')}))`)
    .replace(/((?:CIRCLE|CYLINDRICAL_SURFACE)\('',#\d+,)([\d.]+)(\))/g,
      (_match, prefix: string, radius: string, suffix: string) => `${prefix}${(Number(radius) * scale).toFixed(8)}${suffix}`);
}

describe('stepToLatheCodes', () => {
  it('imports a curved solid and preserves its through-hole', async () => {
    const codes = await stepToLatheCodes(buffer(pipe), 100, () => {});
    expect(codes[0].getText()).toBe('STOCK D6.000 ID2.000\nL10.000 R3.000');
  });

  it.each([
    {pxPerMm: 1000, offset: 100_000},
    {pxPerMm: 1000, offset: -100_000},
    {pxPerMm: 100, offset: 1_000_000},
    {pxPerMm: 100, offset: -1_000_000},
  ])('preserves fractional dimensions at offset $offset mm with $pxPerMm px/mm', async ({pxPerMm, offset}) => {
    const atOrigin = await stepToLatheCodes(buffer(fractionalPipeAt(0)), pxPerMm, () => {});
    const translated = await stepToLatheCodes(buffer(fractionalPipeAt(offset)), pxPerMm, () => {});
    const originalStock = atOrigin[0]?.getStock();
    const translatedStock = translated[0]?.getStock();
    expect(originalStock).toBeTruthy();
    expect(translatedStock).toBeTruthy();
    expect(translatedStock!.innerDiameter).toBe(originalStock!.innerDiameter);
    expect(translatedStock!.length).toBe(originalStock!.length);
    // OCCT can tessellate translated circles differently. Allow one radial
    // pixel for that approximation, but no additional loss from Float32.
    expect(Math.abs(translatedStock!.radius - originalStock!.radius)).toBeLessThanOrEqual(1 / pxPerMm + 1e-9);
  });

  it('converts inch geometry to millimetres', async () => {
    const inches = pipe.replace(
      '#12=(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.));',
      `#12=(CONVERSION_BASED_UNIT('INCH',#90) LENGTH_UNIT() NAMED_UNIT(#91));
       #90=LENGTH_MEASURE_WITH_UNIT(LENGTH_MEASURE(25.4),#92);
       #91=DIMENSIONAL_EXPONENTS(1.,0.,0.,0.,0.,0.,0.);
       #92=(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.));`,
    );
    const codes = await stepToLatheCodes(buffer(inches), 100, () => {});
    expect(codes[0].getText()).toBe('STOCK D152.400 ID50.800\nL254.000 R76.200');
  });

  it('rejects invalid STEP data', async () => {
    await expect(stepToLatheCodes(buffer('not a STEP file'), 100, () => {})).rejects.toThrow('Unable to read STEP file');
  });

  it('rejects multiple bodies instead of silently choosing one', async () => {
    const multipleBodies = pipe.replace('(#20),#11', '(#20,#22),#11')
      .replace("#20=MANIFOLD_SOLID_BREP('pipe',#21);", "#20=MANIFOLD_SOLID_BREP('pipe',#21);\n#22=MANIFOLD_SOLID_BREP('second pipe',#21);");
    await expect(stepToLatheCodes(buffer(multipleBodies), 100, () => {})).rejects.toThrow('multiple bodies');
  });
});
