import './style.css'
import { Scene } from './scene.ts';
import { LatheCode } from './lathecode.ts';
import { createDownloadLink } from './stl.ts';
import { GCode } from './gcode.ts';

const scene = new Scene(document.getElementById('sceneContainer')!);
const errorContainer = document.getElementById('errorContainer')!;
const latheCodeInput = document.querySelector<HTMLTextAreaElement>('#latheCodeInput')!;
const gcode = new GCode(document.getElementById('gcodeContainer')!);

let latheCode: LatheCode | null = null;

function update() {
  gcode.setLatheCode(null);
  try {
    localStorage.setItem('latheCode', latheCodeInput.value);
    latheCode = new LatheCode(latheCodeInput.value + '\n');
    scene.setLatheCode(latheCode);
    errorContainer.textContent = '';
  } catch (error: any) {
    errorContainer.textContent = error.message;
    scene.setLatheCode(null);
  }
}
latheCodeInput.addEventListener('input', update);
latheCodeInput.value = localStorage.getItem('latheCode') || latheCodeInput.value;
update();

document.querySelector<HTMLButtonElement>('#stlButton')!.addEventListener('click', () => {
  const mesh = scene.getLatheMesh();
  if (!mesh || !latheCode) return;
  const link = createDownloadLink(mesh, latheCode.getTitle());
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector<HTMLButtonElement>('#gcodeButton')!.addEventListener('click', () => {
  gcode.setLatheCode(latheCode);
});
