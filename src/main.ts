import './style.css'
import { Scene } from './scene.ts';
import { createDownloadLink } from './stl.ts';
import { GCode, GCodeMoveSelectionEvent } from './gcode/gcode.ts';
import { Editor, PlanEvent } from './editor/editor.ts';
import { StartLatheCodeEvent, StartPanel, StartStlEvent } from './start/index.ts';
import { Planner } from './planner/planner.ts';
import { LatheCode } from './common/lathecode.ts';
import { CrossSection } from './crosssection.ts';
import { loadAppSettings } from './common/settings.ts';
import { resumePendingUsage } from './llm/usage.ts';
import { SourceDrawingPanel } from './sourcedrawing.ts';

const crossSectionContainer = document.getElementById('crossSectionContainer')!;
const crossSection = new CrossSection(crossSectionContainer);
const sourceDrawings = new SourceDrawingPanel(document.getElementById('sourceDrawingContainer')!);
const sceneContainer = document.getElementById('sceneContainer')!;
const scene = new Scene(sceneContainer, 500, loadAppSettings());
const editorContainer = document.getElementById('editorContainer')!;
const editor = new Editor(editorContainer, {deferInitialUpdate: true});
const start = new StartPanel(document.getElementById('startContainer')!, {
  getCurrentLatheCodeText: () => editorContainer.hidden ? '' : editor.getText(),
});
const planner = new Planner(document.getElementById('plannerContainer')!);
const gcode = new GCode(document.getElementById('gcodeContainer')!);
let plannedLatheCode: LatheCode | null = null;
void resumePendingUsage(loadAppSettings().openRouterApiKey);

const hasSavedDraft = !!localStorage.getItem('latheCode')?.trim();
editorContainer.hidden = !hasSavedDraft;
crossSectionContainer.hidden = !hasSavedDraft;
sceneContainer.hidden = !hasSavedDraft;

function setLatheCode() {
  plannedLatheCode = null;
  crossSection.setLatheCode(editor.getLatheCode());
  scene.setLatheCode(editor.getLatheCode());
  planner.setLatheCode(null);
  gcode.hide();
}
setLatheCode();
editor.addEventListener('change', () => setLatheCode());
editor.addEventListener('saved', () => start.updateSavedLatheCodes());

start.addEventListener('start', (event) => {
  const started = event as StartLatheCodeEvent;
  if (!started.options.preserveSourceImages) sourceDrawings.setImages(started.options.sourceImages ?? []);
  editorContainer.hidden = false;
  crossSectionContainer.hidden = false;
  sceneContainer.hidden = false;
  editor.setText(started.text);
  start.updateSavedLatheCodes();
});

start.addEventListener('stlfile', async (event) => {
  editorContainer.hidden = false;
  crossSectionContainer.hidden = false;
  sceneContainer.hidden = false;
  const before = editor.getText();
  await editor.importStlFile((event as StartStlEvent).file);
  if (editor.getText() !== before) sourceDrawings.setImages([]);
  start.updateSavedLatheCodes();
});

start.addEventListener('settingschange', () => {
  void resumePendingUsage(loadAppSettings().openRouterApiKey);
  gcode.updateSettings();
  scene.setSettings(loadAppSettings());
  setLatheCode();
  start.updateSavedLatheCodes();
});

editor.addEventListener('stl', () => {
  const mesh = scene.getLatheMesh();
  const latheCode = editor.getLatheCode();
  if (!mesh || !latheCode) return;
  const link = createDownloadLink(mesh, latheCode.getTitle());
  link.click();
  URL.revokeObjectURL(link.href);
});

editor.addEventListener('plan', (event) => {
  const planEvent = event as PlanEvent;
  plannedLatheCode = planEvent.latheCode;
  planner.setLatheCode(plannedLatheCode, planEvent.settings);
});

planner.addEventListener('change', () => {
  const moves = planner.getMoves();
  if (plannedLatheCode && moves && moves.length) {
    gcode.show(plannedLatheCode, moves);
  } else {
    gcode.hide();
  }
});

gcode.addEventListener(GCodeMoveSelectionEvent.type, (event) => {
  planner.showMovesThrough((event as GCodeMoveSelectionEvent).moveCount);
});
