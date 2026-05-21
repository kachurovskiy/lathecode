import { afterAll, beforeAll, expect, test } from 'vitest';
import { readdirSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import puppeteer, { type Page } from 'puppeteer';
import { createServer, type ViteDevServer } from 'vite';
import { KNOWN_INSERT_OPTIONS, insertOptionToToolLine } from '../src/common/toolpresets';

const PUPPETEER_LAUNCH_OPTIONS = {
  args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox'],
  protocolTimeout: 360000,
};
const SCREENSHOT_PREFIX = 'known-insert-';
const SCREENSHOT_SUFFIX = '.tool.png';

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
  if (!baseUrl) throw new Error('Unable to start Vite dev server for insert screenshots');

  browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTIONS);
  page = await browser.newPage();
  await page.goto(new URL('?moveTimeout=0', baseUrl).toString(), {waitUntil: 'domcontentloaded'});
}, 30000);

afterAll(async () => {
  await page?.close().catch(() => undefined);
  await browser?.close();
  await server?.close();
});

test('known insert options to tool screenshots', async () => {
  const inserts = KNOWN_INSERT_OPTIONS.map(option => ({
    name: option.name,
    toolLine: insertOptionToToolLine(option),
  }));
  const insertNames = inserts.map(insert => insert.name);
  const screenshots = await renderKnownInsertTools(inserts);

  expect(screenshots.map(screenshot => screenshot.name)).toEqual(insertNames);
  cleanupStaleScreenshots(insertNames);
  for (const screenshot of screenshots) {
    expect(screenshot.dataUrl, screenshot.name).toMatch(/^data:image\/png;base64,/);
    savePng(insertScreenshotFile(screenshot.name), screenshot.dataUrl);
  }
}, {timeout: 120000});

async function renderKnownInsertTools(inserts: {name: string, toolLine: string}[]): Promise<{name: string, dataUrl: string}[]> {
  return page.evaluate(async insertOptions => {
    const browserImport = (path: string) => new Function('path', 'return import(path)')(path);
    const [
      { LatheCode },
      { Rasterizer },
    ] = await Promise.all([
      browserImport('/src/common/lathecode.ts'),
      browserImport('/src/planner/rasterizer.ts'),
    ]);

    const toolToPng = (toolLine: string) => {
      const toolBitmap = new Rasterizer(new LatheCode(`${toolLine}\nL1 R1`), 40).createToolBitmap();
      const canvas = document.createElement('canvas');
      canvas.width = toolBitmap.width;
      canvas.height = toolBitmap.height;
      canvas.getContext('2d')!.putImageData(new ImageData(toolBitmap.toImageDataArray(true), toolBitmap.width), 0, 0);
      return canvas.toDataURL('image/png');
    };

    return insertOptions.map(option => ({name: option.name, dataUrl: toolToPng(option.toolLine)}));
  }, inserts);
}

function savePng(fileName: string, dataUrl: string) {
  writeFileSync(resolve(__dirname, fileName), Buffer.from(dataUrl.split(',')[1], 'base64'));
}

function cleanupStaleScreenshots(insertNames: string[]) {
  const expected = new Set(insertNames.map(insertScreenshotFile));
  for (const file of readdirSync(__dirname)) {
    if (file.startsWith(SCREENSHOT_PREFIX) && file.endsWith(SCREENSHOT_SUFFIX) && !expected.has(file)) {
      rmSync(resolve(__dirname, file), {force: true});
    }
  }
}

function insertScreenshotFile(insertName: string): string {
  return `${SCREENSHOT_PREFIX}${insertName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}${SCREENSHOT_SUFFIX}`;
}
