import './style.css'
import { Scene } from './scene.ts';
import { LatheCode } from './lathecode.ts';
import { createDownloadLink } from './stl.ts';
import { GCode } from './gcode.ts';

const scene = new Scene(document.getElementById('sceneContainer')!);
const errorContainer = document.getElementById('errorContainer')!;
const latheCodeInput = document.querySelector<HTMLTextAreaElement>('#latheCodeInput')!;
const gcode = new GCode(document.getElementById('gcodeContainer')!);
const sceneContainer = document.getElementById('sceneContainer')!;
const toolbar = document.getElementById('toolbar')!;

let latheCode: LatheCode | null = null;

function update() {
  sceneContainer.style.display = 'block';
  gcode.setLatheCode(null);
  toolbar.style.display = 'block';
  try {
    latheCode = new LatheCode(latheCodeInput.value + '\n');
    scene.setLatheCode(latheCode);
    errorContainer.textContent = '';
  } catch (error: any) {
    errorContainer.textContent = error.message;
    scene.setLatheCode(null);
  }
}
latheCodeInput.addEventListener('input', update);
update();

document.querySelector<HTMLButtonElement>('#stlButton')!.addEventListener('click', () => {
  const mesh = scene.getLatheMesh();
  if (!mesh || !latheCode) return;
  const link = createDownloadLink(mesh, latheCode.getTitle());
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector<HTMLButtonElement>('#gcodeButton')!.addEventListener('click', () => {
  scene.setLatheCode(null);
  sceneContainer.style.display = 'none';
  gcode.setLatheCode(latheCode);
  toolbar.style.display = 'none';
});
