import { afterAll, beforeAll, expect, test } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { createServer, type ViteDevServer } from 'vite';
import { LatheCode, type ProfileSide } from '../../src/common/lathecode';
import { START_SAMPLE_DEFINITIONS } from '../../src/start/samples';

type SampleToolpathCase = {
  sampleId: string,
  title: string,
  side: ProfileSide,
  text: string,
};

type GeneratedToolpath = {
  gcode: string,
  partPng: string | null,
  toolPng: string | null,
  movesPng: string,
  moveCount: number,
};

type ArtifactIndexEntry = {
  sampleId: string,
  title: string,
  side: ProfileSide,
  moveCount: number,
  gcodeFile: string,
  partFile: string | null,
  toolFile: string | null,
  movesFile: string,
};

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(TEST_DIR, '..', '..');
const OUTPUT_DIR = resolve(TEST_DIR, process.env.SAMPLE_TOOLPATH_OUTPUT_DIR || 'artifacts');
const PX_PER_MM = getPositiveEnvNumber('SAMPLE_TOOLPATH_PX_PER_MM', 100);
const MOVES_IMAGE_WIDTH = getPositiveEnvNumber('SAMPLE_TOOLPATH_MOVES_WIDTH', 700);
const MOVES_IMAGE_HEIGHT = getPositiveEnvNumber('SAMPLE_TOOLPATH_MOVES_HEIGHT', 350);
const PUPPETEER_LAUNCH_OPTIONS = {
  args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox'],
  protocolTimeout: 3600000,
};

let server: ViteDevServer;
let browser: Browser;
let page: Page;
let baseUrl = '';

beforeAll(async () => {
  mkdirSync(OUTPUT_DIR, {recursive: true});
  server = await createServer({
    server: {
      host: '127.0.0.1',
      port: 0,
      watch: {
        ignored: ['**/test/sample-toolpaths/artifacts/**', '**/test/sample-toolpaths/.smoke/**'],
      },
    },
    logLevel: 'error',
  });
  await server.listen();

  baseUrl = server.resolvedUrls?.local[0] || '';
  if (!baseUrl) throw new Error('Unable to start Vite dev server for sample toolpath fixtures');

  browser = await puppeteer.launch(PUPPETEER_LAUNCH_OPTIONS);
  page = await browser.newPage();
  await page.goto(new URL('?moveTimeout=0', baseUrl).toString(), {waitUntil: 'domcontentloaded'});
}, 30000);

afterAll(async () => {
  await page?.close().catch(() => undefined);
  await browser?.close();
  await server?.close();
});

function getCases(): SampleToolpathCase[] {
  const filter = process.env.SAMPLE_TOOLPATH_FILTER?.trim().toLowerCase();
  const limit = getPositiveEnvNumber('SAMPLE_TOOLPATH_LIMIT', 0);
  const cases: SampleToolpathCase[] = [];

  for (const sample of START_SAMPLE_DEFINITIONS) {
    if (filter && !sample.id.toLowerCase().includes(filter) && !sample.title.toLowerCase().includes(filter)) continue;

    const latheCode = new LatheCode(sample.text);
    for (const profile of latheCode.getProfiles()) {
      const profileLatheCode = latheCode.getLatheCodeForProfile(profile.side);
      if (!profileLatheCode) continue;
      cases.push({
        sampleId: sample.id,
        title: sample.title,
        side: profile.side,
        text: profileLatheCode.getText(),
      });
    }
  }

  return limit > 0 ? cases.slice(0, limit) : cases;
}

function getPositiveEnvNumber(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;
  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function saveGCode(name: string, gcode: string) {
  writeFileSync(resolve(OUTPUT_DIR, name + '.gcode.txt'), normalize(gcode) + '\n');
}

function savePng(name: string, dataUrl: string | null) {
  const path = resolve(OUTPUT_DIR, name + '.png');
  if (dataUrl) writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  else rmSync(path, {force: true});
}

function normalize(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

function writeArtifactIndex(entries: ArtifactIndexEntry[], totalCases: number) {
  const generatedAt = new Date().toISOString();
  const outputPath = toProjectPath(OUTPUT_DIR);
  const pendingCount = Math.max(0, totalCases - entries.length);
  const emptyMessage = entries.length
    ? ''
    : '<p class="emptyMessage">Planning has not completed any sample profiles yet. This page will be rewritten as artifacts are generated.</p>';
  const rows = entries.map(entry => `
    <article class="artifactCard" id="${escapeAttribute(entry.sampleId)}-${entry.side}">
      <header>
        <div>
          <h2>${escapeHtml(entry.title)}</h2>
          <p><code>${escapeHtml(entry.sampleId)}.${entry.side}</code></p>
        </div>
        <div class="cardActions">
          <span>${entry.moveCount} moves</span>
          <button type="button" class="copyPromptButton" data-prompt="${escapeAttribute(encodeURIComponent(createCodexPrompt(entry)))}">Copy Codex Prompt</button>
        </div>
      </header>
      <div class="imageGrid">
        ${imagePanel('Part', entry.partFile)}
        ${imagePanel('Tool', entry.toolFile)}
        ${imagePanel('Moves', entry.movesFile)}
      </div>
      <details>
        <summary>GCode</summary>
        <p><a href="${escapeAttribute(entry.gcodeFile)}">${escapeHtml(entry.gcodeFile)}</a></p>
        <iframe src="${escapeAttribute(entry.gcodeFile)}" title="GCode for ${escapeAttribute(entry.sampleId)} ${entry.side}"></iframe>
      </details>
    </article>`).join('\n');

  writeFileSync(resolve(OUTPUT_DIR, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sample Toolpath Artifacts</title>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; color: #202124; background: #f5f6f7; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    h2 { margin: 0; font-size: 18px; }
    p { margin: 0; }
    code { font-family: Consolas, monospace; font-size: 13px; }
    .summary { margin: 0 0 18px; color: #555; }
    .artifactGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(1040px, 1fr)); gap: 16px; }
    .emptyMessage { margin: 20px 0; padding: 14px; border: 1px solid #d4d7db; background: #fff; color: #555; }
    .artifactCard { border: 1px solid #d4d7db; background: #fff; padding: 12px; }
    .artifactCard header { display: flex; justify-content: space-between; gap: 12px; align-items: start; margin-bottom: 10px; }
    .artifactCard header span { white-space: nowrap; color: #555; font-size: 13px; }
    .cardActions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
    .copyPromptButton { padding: 6px 8px; border: 1px solid #c5c8cc; background: #fff; color: #202124; cursor: pointer; font: inherit; font-size: 13px; }
    .copyPromptButton:hover { background: #f0f1f2; }
    .copyPromptButton.copied { border-color: #1f7a3f; color: #1f7a3f; }
    .imageGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    figure { margin: 0; border: 1px solid #e0e3e7; background: #fafafa; }
    figcaption { padding: 6px 8px; border-bottom: 1px solid #e0e3e7; font-weight: 600; font-size: 13px; }
    img { display: block; width: 100%; height: 420px; object-fit: contain; background: #fff; }
    .missing { display: grid; place-items: center; height: 420px; color: #777; background: #f0f1f2; }
    details { margin-top: 10px; }
    summary { cursor: pointer; font-weight: 600; }
    iframe { box-sizing: border-box; width: 100%; height: 520px; margin-top: 8px; border: 1px solid #d4d7db; background: #fff; }
    @media (max-width: 760px) {
      body { padding: 12px; }
      .artifactGrid { grid-template-columns: 1fr; }
      .imageGrid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <h1>Sample Toolpath Artifacts</h1>
  <p class="summary">Generated ${escapeHtml(generatedAt)}. Showing ${entries.length} of ${totalCases} planned sample profiles at ${PX_PER_MM} px/mm in <code>${escapeHtml(outputPath)}</code>. ${pendingCount ? `${pendingCount} still pending or failed.` : 'All planned profiles completed.'}</p>
  ${emptyMessage}
  <main class="artifactGrid">
${rows}
  </main>
  <script>
    async function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    document.addEventListener('click', event => {
      const target = event.target;
      const button = target instanceof Element ? target.closest('.copyPromptButton') : null;
      if (!button) return;
      const prompt = decodeURIComponent(button.dataset.prompt || '');
      copyText(prompt).then(() => {
        const previousText = button.textContent;
        button.textContent = 'Copied';
        button.classList.add('copied');
        window.setTimeout(() => {
          button.textContent = previousText;
          button.classList.remove('copied');
        }, 1200);
      }).catch(error => {
        window.prompt('Copy this Codex prompt:', prompt);
        console.error(error);
      });
    });
  </script>
</body>
</html>
`);
}

function createCodexPrompt(entry: ArtifactIndexEntry): string {
  const artifactPaths = [
    entry.partFile && `- Part image: ${artifactPath(entry.partFile)}`,
    entry.toolFile && `- Tool image: ${artifactPath(entry.toolFile)}`,
    `- Moves image: ${artifactPath(entry.movesFile)}`,
    `- GCode: ${artifactPath(entry.gcodeFile)}`,
  ].filter(Boolean).join('\n');

  return `I found a possible toolpath problem in the lathecode sample "${entry.title}" (${entry.sampleId}.${entry.side}).

Problem I see:
<describe the visual or GCode issue here>

Please inspect these generated artifacts:
${artifactPaths}

The source sample is in src/start/samples.ts with id "${entry.sampleId}". Fix the underlying sample, planner, or visualization issue as appropriate. After changing it, run:
SAMPLE_TOOLPATH_FILTER=${entry.sampleId} npm run test:sample-toolpaths
and any focused planner/sample tests that are relevant.`;
}

function artifactPath(file: string): string {
  return toProjectPath(resolve(OUTPUT_DIR, file));
}

function toProjectPath(path: string): string {
  return relative(PROJECT_ROOT, path).replace(/\\/g, '/');
}

function imagePanel(label: string, file: string | null): string {
  const body = file
    ? `<a href="${escapeAttribute(file)}"><img src="${escapeAttribute(file)}" alt="${escapeAttribute(label)} artifact"></a>`
    : '<div class="missing">Not generated</div>';
  return `<figure><figcaption>${escapeHtml(label)}</figcaption>${body}</figure>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(text: string): string {
  return escapeHtml(text);
}

async function generateToolpath(input: string): Promise<GeneratedToolpath> {
  return page.evaluate(async ({latheCodeText, pxPerMm, movesImageWidth, movesImageHeight}) => {
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

    const toMove = (move: any) => typeof move.toMove === 'function' ? move.toMove(pxPerMm) : move;
    const latheCode = new LatheCode(latheCodeText);
    const messages: any[] = [];
    new PlannerWorker(latheCode, {pxPerMm, moveTimeoutMs: 0}, {
      postMessage: message => messages.push(message),
    });

    const plannedMoves = messages.findLast(message => message.moves)?.moves;
    if (!plannedMoves?.length) throw new Error('Planner did not produce moves');

    const moves = plannedMoves.map(toMove);
    const movesCanvas = createMovesCanvas(moves, movesImageWidth, movesImageHeight, 0);
    const lastCanvas = messages.findLast(message => message.canvas)?.canvas;
    const lastTool = messages.findLast(message => message.tool)?.tool;

    return {
      gcode: createGCode(latheCode, moves),
      partPng: dataToPng(lastCanvas),
      toolPng: dataToPng(lastTool),
      movesPng: movesCanvas.toDataURL('image/png'),
      moveCount: moves.length,
    };
  }, {
    latheCodeText: input,
    pxPerMm: PX_PER_MM,
    movesImageWidth: MOVES_IMAGE_WIDTH,
    movesImageHeight: MOVES_IMAGE_HEIGHT,
  });
}

test('plans all sample profiles to gcode and images', async () => {
  const cases = getCases();
  const artifacts: ArtifactIndexEntry[] = [];
  expect(cases.length, 'No sample toolpath cases matched').toBeGreaterThan(0);
  writeArtifactIndex(artifacts, cases.length);

  for (const sampleCase of cases) {
    const name = `${sampleCase.sampleId}.${sampleCase.side}`;
    let result: GeneratedToolpath;
    try {
      result = await generateToolpath(sampleCase.text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to plan ${name} (${sampleCase.title}): ${message}`);
    }

    expect(result.gcode, `GCode was not generated for ${name}`).toContain('G91 ; relative positioning');
    expect(result.moveCount, `Planner did not produce moves for ${name}`).toBeGreaterThan(0);

    saveGCode(name, result.gcode);
    savePng(name + '.part', result.partPng);
    savePng(name + '.tool', result.toolPng);
    savePng(name + '.moves', result.movesPng);

    artifacts.push({
      sampleId: sampleCase.sampleId,
      title: sampleCase.title,
      side: sampleCase.side,
      moveCount: result.moveCount,
      gcodeFile: name + '.gcode.txt',
      partFile: result.partPng ? name + '.part.png' : null,
      toolFile: result.toolPng ? name + '.tool.png' : null,
      movesFile: name + '.moves.png',
    });
    writeArtifactIndex(artifacts, cases.length);
  }
}, {timeout: 3600000});
