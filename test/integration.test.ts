import { afterAll, beforeAll, test, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import puppeteer, { type Page } from 'puppeteer';
import { createServer, type ViteDevServer } from 'vite';

const SUFFIX = '.gcode.txt';
const PUPPETEER_LAUNCH_OPTIONS = {
  args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox'],
  // headless: false, // for debugging
};
let server: ViteDevServer;
let baseUrl = '';

beforeAll(async () => {
  server = await createServer({
    server: {
      host: '127.0.0.1',
      port: 0,
    },
    logLevel: 'error',
  });
  await server.listen();

  baseUrl = server.resolvedUrls?.local[0] || '';
  if (!baseUrl) throw new Error('Unable to start Vite dev server for integration tests');
}, 30000);

afterAll(async () => {
  await server?.close();
});

function getAppUrl() {
  return new URL('?moveTimeout=0', baseUrl).toString();
}

function getInput(name: string) {
  return normalize(readFileSync(resolve(__dirname, name + '.txt'), 'utf-8'));
}

function saveInput(name: string, input: string) {
  writeFileSync(resolve(__dirname, name + '.txt'), input + '\n');
  const gcodePath = resolve(__dirname, name + SUFFIX);
  if (!readdirSync(__dirname).includes(name + SUFFIX)) writeFileSync(gcodePath, '');
}

function saveGCode(name: string, gcode: string) {
  writeFileSync(resolve(__dirname, name + '.gcode.txt'), gcode + '\n');
}

function normalize(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

async function screenshot(page: Page, name: string, selector: string) {
  const path = resolve(__dirname, name + '.png');
  const dataUrl = await page.$eval(selector, el => {
    if (!(el instanceof HTMLCanvasElement)) throw new Error('Selected element is not a canvas');
    return el.toDataURL('image/png');
  }).catch(() => null);
  if (dataUrl) writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  else rmSync(path, {force: true});
}

async function setLatheCodeInput(page: Page, value: string) {
  await page.$eval('.latheCodeInput', (el, text) => {
    const input = el as HTMLTextAreaElement;
    input.value = text as string;
    input.dispatchEvent(new Event('input', {bubbles: true}));
  }, value);
}

function getCases() {
  return readdirSync(__dirname).filter(file => file.endsWith(SUFFIX)).map(name => name.substring(0, name.length - SUFFIX.length));
}

function getStls() {
  return readdirSync(__dirname).filter(file => file.endsWith('.stl')).map(name => name.substring(0, name.length - 4));
}

test('stl to lathecode', async () => {
  const browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTIONS);
  try {
    const page = await browser.newPage();
    await page.goto(getAppUrl(), {waitUntil: 'domcontentloaded'});

    for (let name of getStls()) {
      // Empty the lathecode input
      await setLatheCodeInput(page, '');

      // Click imageButton and pick the stl file in the system file picker
      const [fileChooser] = await Promise.all([page.waitForFileChooser(), page.click('.imageButton')]);
      await fileChooser.accept([resolve(__dirname, name + '.stl')]);

      // Wait for body to lose busy cursor
      await page.waitForFunction(() => getComputedStyle(document.body).cursor !== 'wait', {timeout: 10000});

      // Ensure there's no error reported parsing lathecode
      expect(await page.$eval('.errorContainer', el => (el as HTMLDivElement).innerText), `Error in file ${name}`).toBe('');

      let latheCode = await page.$eval('.latheCodeInput', el => (el as HTMLTextAreaElement).value);
      saveInput(name, normalize(latheCode));
    }
  } finally {
    await browser.close();
  }
}, {timeout: 60000});

test('lathecode inputs to gcode', async () => {
  const browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTIONS);
  try {
    const page = await browser.newPage();
    await page.goto(getAppUrl(), {waitUntil: 'domcontentloaded'});

    for (let name of getCases()) {
      // Set the lathecode
      await setLatheCodeInput(page, getInput(name));

      // Ensure there's no error reported parsing lathecode
      expect(await page.$eval('.errorContainer', el => (el as HTMLDivElement).innerText)).toBe('');

      // Start GCode calculation
      await page.click('.planButton');

      // Save GCode so that developer would notice effects on GCode in `git diff`
      try {
        await page.waitForSelector('#gcodeTextarea', { visible: true, timeout: 30000 });
      } catch (error) {
        const editorError = await page.$eval('.errorContainer', el => (el as HTMLDivElement).innerText);
        throw new Error(`GCode was not generated for ${name}: ${error instanceof Error ? error.message : String(error)}${editorError ? `\nEditor error: ${editorError}` : ''}`);
      }
      let result = await page.$eval('#gcodeTextarea', (el) => (el as HTMLTextAreaElement).value);
      saveGCode(name, normalize(result));

      // Take screenshot of the tool path to easier understand the difference
      await screenshot(page, name + '.part', '#plannerContainer canvas.part');
      await screenshot(page, name + '.tool', '#plannerContainer canvas.tool');
      await screenshot(page, name + '.moves', '#plannerContainer canvas.moves');
    }
  } finally {
    await browser.close();
  }
}, {timeout: 120000});
