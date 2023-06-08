import './style.css'
import { Scene } from './scene.ts';
import { LatheCode } from './lathecode.ts';
import { createDownloadLink } from './stl.ts';

const scene = new Scene(document.getElementById('container')!);
const errorContainer = document.getElementById('errorContainer')!;
const latheCodeInput = document.querySelector<HTMLTextAreaElement>('#latheCodeInput')!;

let latheCode: LatheCode | null = null;

function update() {
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
