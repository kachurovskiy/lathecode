
import { createFullScreenDialog } from '../common/dialog.ts';
import { LatheCode } from '../common/lathecode.ts';
import { Scene } from '../scene.ts';

/** Accepts and shows several LatheCode instances in a popup allowing user to choose one. */
export class Selector {
  async pickLatheCode(latheCodes: LatheCode[]): Promise<LatheCode|null> {
    if (latheCodes.length === 0) return null;
    if (latheCodes.length === 1) return latheCodes[0];
    return new Promise(resolve => {
      const container = document.createElement('div');
      container.className = 'selectorContainer';
      const dialog = createFullScreenDialog(container, 'Select one', () => resolve(null));
      latheCodes.map(latheCode => {
        const div = document.createElement('div');
        div.className = 'selectorScene';
        div.addEventListener('click', () => {
          dialog.remove();
          resolve(latheCode);
        });
        container.appendChild(div);
        const scene = new Scene(div);
        scene.setLatheCode(latheCode);
        return scene;
      });
    });
  }
}
