import './style.css'
import { Scene } from './scene.ts';
import { createDownloadLink } from './stl.ts';
import { GCode } from './gcode/gcode.ts';
import { Editor } from './editor.ts';
import { Planner } from './planner/planner.ts';

const scene = new Scene(document.getElementById('sceneContainer')!);
const editor = new Editor(document.getElementById('editorContainer')!);
const planner = new Planner(document.getElementById('plannerContainer')!);
const gcode = new GCode(document.getElementById('gcodeContainer')!);

function setLatheCode() {
  scene.setLatheCode(editor.getLatheCode());
  planner.setLatheCode(null);
  gcode.hide();
}
setLatheCode();
editor.addEventListener('change', () => setLatheCode());

editor.addEventListener('stl', () => {
  const mesh = scene.getLatheMesh();
  const latheCode = editor.getLatheCode();
  if (!mesh || !latheCode) return;
  const link = createDownloadLink(mesh, latheCode.getTitle());
  link.click();
  URL.revokeObjectURL(link.href);
});

editor.addEventListener('plan', () => {
  planner.setLatheCode(editor.getLatheCode());
});

planner.addEventListener('change', () => {
  const latheCode = editor.getLatheCode();
  const moves = planner.getMoves();
  if (latheCode && moves && moves.length) {
    gcode.show(latheCode, moves);
  } else {
    gcode.hide();
  }
});
