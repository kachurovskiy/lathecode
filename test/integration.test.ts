import { test, expect } from 'vitest';
import { readFileSync, readdirSync, write, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import puppeteer from 'puppeteer';
import { Page } from 'puppeteer';
import { get } from 'http';

const SUFFIX = '.gcode.txt';

function getInput(name: string) {
  return normalize(readFileSync(resolve(__dirname, name + '.txt'), 'utf-8'));
}

function saveInput(name: string, input: string) {
  writeFileSync(resolve(__dirname, name + '.txt'), input + '\n');
  writeFileSync(resolve(__dirname, name + SUFFIX), '');
}

function saveGCode(name: string, gcode: string) {
  writeFileSync(resolve(__dirname, name + '.gcode.txt'), gcode + '\n');
}

function normalize(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

async function screenshot(page: Page, name: string, selector: string) {
  const canvas = await page.$(selector);
  const path = resolve(__dirname, name + '.png');
  if (canvas) await canvas.screenshot({path});
  else rmSync(path, {force: true});
}

function getCases() {
  return readdirSync(__dirname).filter(file => file.endsWith(SUFFIX)).map(name => name.substring(0, name.length - SUFFIX.length));
}

function getStls() {
  return readdirSync(__dirname).filter(file => file.endsWith('.stl')).map(name => name.substring(0, name.length - 4));
}

test('stl to lathecode', async () => {
  const browser = await puppeteer.launch(
    // { headless: false } // for debugging
  );
  const page = await browser.newPage();
  await page.goto('http://localhost:5173?moveTimeout=0');

  for (let name of getStls()) {
    // Empty the lathecode input
    await page.$eval('.latheCodeInput', el => (el as HTMLTextAreaElement).value = '');

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

  await browser.close();
}, {timeout: 60000});

test('lathecode inputs to gcode', async () => {
  const browser = await puppeteer.launch(
    // { headless: false } // for debugging
  );
  const page = await browser.newPage();
  await page.goto('http://localhost:5173?moveTimeout=0');

  for (let name of getCases()) {
    // Type in the lathecode
    await page.$eval('.latheCodeInput', el => (el as HTMLTextAreaElement).value = '');
    await page.type('.latheCodeInput', getInput(name));

    // Ensure there's no error reported parsing lathecode
    expect(await page.$eval('.errorContainer', el => (el as HTMLDivElement).innerText)).toBe('');

    // Start GCode calculation
    await page.click('.planButton');

    // Save GCode so that developer would notice effects on GCode in `git diff`
    await page.waitForSelector('#gcodeTextarea', { visible: true, timeout: 10000 });
    let result = await page.$eval('#gcodeTextarea', (el) => (el as HTMLTextAreaElement).value);
    saveGCode(name, normalize(result));

    // Take screenshot of the tool path to easier understand the difference
    await screenshot(page, name + '.part', '#plannerContainer canvas.part');
    await screenshot(page, name + '.tool', '#plannerContainer canvas.tool');
    await screenshot(page, name + '.moves', '#plannerContainer canvas.moves');
  }

  await browser.close();
}, {timeout: 60000});
