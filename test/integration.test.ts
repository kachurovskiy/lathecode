import { test, expect } from 'vitest';
import { readFileSync, readdirSync, write, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import puppeteer from 'puppeteer';
import { Page } from 'puppeteer';

const SUFFIX = '.gcode.txt';

function getInput(name: string) {
  return normalize(readFileSync(resolve(__dirname, name + '.txt'), 'utf-8'));
}

function getGCode(name: string) {
  return normalize(readFileSync(resolve(__dirname, name + SUFFIX), 'utf-8'));
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

const CASES: string[] = readdirSync(__dirname).filter(file => file.endsWith(SUFFIX)).map(name => name.substring(0, name.length - SUFFIX.length));

test('lathecode inputs to gcode', async () => {
  const browser = await puppeteer.launch(
    // { headless: false } // for debugging
  );
  const page = await browser.newPage();
  await page.goto('http://localhost:5173?moveTimeout=0');

  for (let name of CASES) {
    // Type in the lathecode
    await page.$eval('.latheCodeInput', el => (el as HTMLTextAreaElement).value = '');
    await page.type('.latheCodeInput', getInput(name));

    // Ensure there's no error reported parsing lathecode
    expect(await page.$eval('.errorContainer', el => (el as HTMLDivElement).innerText)).toBe('');

    // Start GCode calculation
    await page.click('.planButton');

    // Check that GCode is as expected
    await page.waitForSelector('#gcodeTextarea', { visible: true, timeout: 10000 });
    let result = await page.$eval('#gcodeTextarea', (el) => (el as HTMLTextAreaElement).value);
    result = normalize(result);
    saveGCode(name, result);
    expect(result).toBe(getGCode(name));

    // Take screenshot of the tool path to easier understand the difference
    await screenshot(page, name + '.part', '#plannerContainer canvas.part');
    await screenshot(page, name + '.tool', '#plannerContainer canvas.tool');
    await screenshot(page, name + '.moves', '#plannerContainer canvas.moves');
  }

  await browser.close();
}, {timeout: 60000});
