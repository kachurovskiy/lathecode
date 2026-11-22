import { afterAll, beforeAll, test, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import puppeteer, { type Page } from 'puppeteer';
import { createServer, type ViteDevServer } from 'vite';

const SUFFIX = '.gcode.txt';
const PUPPETEER_LAUNCH_OPTIONS = {
  args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox'],
  protocolTimeout: 360000,
};

type GeneratedFixture = {
  gcode: string,
  partPng: string | null,
  toolPng: string | null,
  movesPng: string | null,
};

let server: ViteDevServer;
let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
let page: Page;
let baseUrl = '';

beforeAll(async () => {
  server = await createServer({
    server: {
      host: '127.0.0.1',
      port: 0,
      watch: {
        ignored: ['**/test/**'],
      },
    },
    logLevel: 'error',
  });
  await server.listen();

  baseUrl = server.resolvedUrls?.local[0] || '';
  if (!baseUrl) throw new Error('Unable to start Vite dev server for fixture tests');

  browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTIONS);
  page = await browser.newPage();
  await page.goto(new URL('?moveTimeout=0', baseUrl).toString(), {waitUntil: 'domcontentloaded'});
}, 30000);

afterAll(async () => {
  await page?.close().catch(() => undefined);
  await browser?.close();
  await server?.close();
});

function getInput(name: string) {
  return normalize(readFileSync(resolve(__dirname, name + '.txt'), 'utf-8'));
}

function saveGCode(name: string, gcode: string) {
  writeFileSync(resolve(__dirname, name + '.gcode.txt'), gcode + '\n');
}

function savePng(name: string, dataUrl: string | null) {
  const path = resolve(__dirname, name + '.png');
  if (dataUrl) writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  else rmSync(path, {force: true});
}

function normalize(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

function getCases() {
  return readdirSync(__dirname)
    .filter(file => file.endsWith(SUFFIX))
    .map(name => name.substring(0, name.length - SUFFIX.length));
}

async function generateFixture(input: string): Promise<GeneratedFixture> {
  return page.evaluate(async latheCodeText => {
    const browserImport = (path: string) => new Function('path', 'return import(path)')(path);
    const [
      { LatheCode },
      { PlannerWorker },
      { createGCode },
      { createMovesCanvas },
    ] = await Promise.all([
      browserImport('/src/common/lathecode.ts'),
      browserImport('/src/planner/plannerworker.ts'),
      browserImport('/src/gcode/gcodeutils.ts'),
      browserImport('/src/planner/planner.ts'),
    ]);

    const dataToPng = (image: {width: number, height: number, data: Uint8ClampedArray} | undefined) => {
      if (!image) return null;
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d')!.putImageData(new ImageData(image.data, image.width), 0, 0);
      return canvas.toDataURL('image/png');
    };

    const latheCode = new LatheCode(latheCodeText);
    const messages: any[] = [];
    new PlannerWorker(latheCode, 100, {
      postMessage: message => messages.push(message),
    });

    const pixelMoves = messages.find(message => message.moves)?.moves;
    if (!pixelMoves?.length) throw new Error('Planner did not produce moves');

    const moves = pixelMoves.map(move => move.toMove(100));
    const movesCanvas = createMovesCanvas(moves, 500, 250);
    const lastCanvas = messages.findLast(message => message.canvas)?.canvas;
    const lastTool = messages.findLast(message => message.tool)?.tool;

    return {
      gcode: createGCode(latheCode, moves),
      partPng: dataToPng(lastCanvas),
      toolPng: dataToPng(lastTool),
      movesPng: movesCanvas.toDataURL('image/png'),
    };
  }, input);
}

test('lathecode fixtures to gcode and images', async () => {
  for (const name of getCases()) {
    const result = await generateFixture(getInput(name));

    expect(result.gcode, `GCode was not generated for ${name}`).toContain('G91 ; relative positioning');
    saveGCode(name, normalize(result.gcode));
    savePng(name + '.part', result.partPng);
    savePng(name + '.tool', result.toolPng);
    savePng(name + '.moves', result.movesPng);
  }
}, {timeout: 900000});

test('parallel browser workers preserve parting strokes across smoothing settings', async () => {
  const results = await page.evaluate(async input => {
    const browserImport = (path: string) => new Function('path', 'return import(path)')(path);
    const [{LatheCode}, {PlannerWorker}, {optimizeMovesParallel}, {getFeedMmMin}] = await Promise.all([
      browserImport('/src/common/lathecode.ts'),
      browserImport('/src/planner/plannerworker.ts'),
      browserImport('/src/planner/paralleloptimize.ts'),
      browserImport('/src/gcode/gcodeutils.ts'),
    ]);
    const code = new LatheCode(input);
    let rawMoves: any[] = [];
    new PlannerWorker(code, {pxPerMm: 100, plannerPreviewSourcePixelLimit: 1}, {
      postMessage: (message: any) => { if (message.moves) rawMoves = message.moves; },
      optimizeMoves: (moves: any[]) => moves.map(move => move.withoutCutPixels()),
    });

    // Exercise real Worker transport even on machines exposing only one CPU.
    const concurrency = Object.getOwnPropertyDescriptor(navigator, 'hardwareConcurrency');
    Object.defineProperty(navigator, 'hardwareConcurrency', {configurable: true, value: 2});
    try {
      const results = [];
      for (const smoothingEpsilonPx of [0.9, 1, 1.25, 1.5, 5]) {
        const progress: string[] = [];
        const moves = await optimizeMovesParallel(rawMoves, (message: string) => progress.push(message), 'maxY', {pxPerMm: 100, smoothingEpsilonPx});
        const cutoffs = moves.filter((move: any) => move.cutArea > 0 && move.xStart + move.xDelta === 0 && move.yStart + move.yDelta <= 0);
        results.push({
          smoothingEpsilonPx,
          usedWorkers: progress.some(message => message.includes('using 2 workers')),
          fallback: progress.some(message => message.includes('Parallel optimization failed')),
          cutoffCount: cutoffs.length,
          radial: cutoffs.every((move: any) => move.xDelta === 0 && move.isParting),
          partFeed: cutoffs.every((move: any) => getFeedMmMin(move.toMove(100), code.getFeed(), code.getTool()) === code.getFeed().partMmMin),
          cutAreaMmSq: cutoffs.reduce((sum: number, move: any) => sum + move.cutArea, 0) / 100 ** 2,
        });
      }
      return results;
    } finally {
      if (concurrency) Object.defineProperty(navigator, 'hardwareConcurrency', concurrency);
      else Reflect.deleteProperty(navigator, 'hardwareConcurrency');
    }
  }, getInput('sample-lathe-part2-body-turn'));

  for (const result of results) {
    expect(result.usedWorkers, `smoothing ${result.smoothingEpsilonPx}`).toBe(true);
    expect(result.fallback).toBe(false);
    expect(result.cutoffCount).toBeGreaterThan(0);
    expect(result.radial).toBe(true);
    expect(result.partFeed).toBe(true);
    expect(result.cutAreaMmSq).toBeGreaterThan(40);
  }
}, 240000);
