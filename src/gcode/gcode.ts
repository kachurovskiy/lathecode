import { LatheCode } from '../common/lathecode';
import { Sender, SenderMode } from './sender';
import { Move } from '../common/move';
import { createGCode } from './gcodeutils';
import { loadAppSettings } from '../common/settings';

export class GCode {
  private runTextarea: HTMLTextAreaElement;
  private copyButton: HTMLButtonElement;
  private h4Controls: HTMLElement;
  private sendButton: HTMLButtonElement;
  private saveGcodeButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private whatLink: HTMLAnchorElement;
  private senderError: HTMLDivElement;
  private runProgress: HTMLProgressElement;
  private sender: Sender | null = null;
  private copyStateTimeout = 0;
  private saveName = 'Part 1';
  private latheCode: LatheCode | null = null;

  constructor(private container: HTMLElement) {
    container.style.display = 'none';

    this.runTextarea = container.getElementsByTagName('textarea')[0];
    this.senderError = container.querySelector<HTMLDivElement>('.senderError')!;
    this.runProgress = container.getElementsByTagName('progress')[0];

    this.copyButton = container.querySelector<HTMLButtonElement>('.copyGcodeButton')!;
    this.copyButton.addEventListener('click', () => {
      void this.copyGCode();
    });

    this.h4Controls = container.querySelector<HTMLElement>('.h4Controls')!;

    this.sendButton = container.querySelector<HTMLButtonElement>('.sendButton')!;
    this.sendButton.addEventListener('click', () => {
      this.send(this.runTextarea!.value, 'run');
    });

    this.saveGcodeButton = container.querySelector<HTMLButtonElement>('.saveGcodeButton')!;
    this.saveGcodeButton.addEventListener('click', () => {
      this.saveName = (prompt('Please enter a short name for this part', this.saveName) || '').trim();
      if (!this.saveName) return;
      if (this.saveName.length < 2) {
        alert('Name should contain at least 2 characters');
        return;
      }
      if (!/^[0-9a-zA-Z +\-_]+$/.test(this.saveName)) {
        alert('Name can only consist of English alpha-numericals, space and +-_');
        return;
      }
      this.send(`"${this.saveName}\n${this.runTextarea!.value}"`, 'save');
    });

    this.stopButton = container.querySelector<HTMLButtonElement>('.stopButton')!;
    this.stopButton.addEventListener('click', () => this.sender!.stop());
    this.stopButton.style.display = 'none';

    this.whatLink = container.querySelector<HTMLAnchorElement>('.whatLink')!;
    this.updateSettings();
  }

  updateSettings() {
    this.h4Controls.hidden = !loadAppSettings().showNanoElsH4Controls;
  }

  private send(text: string, mode: SenderMode) {
    if (!this.latheCode?.isNanoElsCompatible()) {
      alert('This lathecode is not compatible with NanoEls due to axis direction');
      return;
    }
    if (!this.sender) this.sender = new Sender(() => this.senderStatusChange());
    this.sender.start(text, mode);
  }

  hide() {
    this.container.style.display = 'none';
  }

  show(latheCode: LatheCode, moves: Move[]) {
    this.latheCode = latheCode;
    this.runTextarea.value = createGCode(latheCode, moves);
    this.container.style.display = 'block';
    this.runTextarea.scrollIntoView({ behavior: "smooth" });
  }

  private async copyGCode() {
    const text = this.runTextarea.value;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        this.showCopiedState();
        return;
      } catch {
        // Fall back to selection-based copying below.
      }
    }

    this.runTextarea.focus();
    this.runTextarea.select();
    if (typeof document.execCommand === 'function' && document.execCommand('copy')) {
      this.showCopiedState();
    }
  }

  private showCopiedState() {
    window.clearTimeout(this.copyStateTimeout);
    this.copyButton.textContent = 'Copied';
    this.copyStateTimeout = window.setTimeout(() => {
      this.copyButton.textContent = 'Copy';
    }, 1200);
  }

  private senderStatusChange() {
    if (!this.sender) return;
    const status = this.sender.getStatus();
    const isRun = status.condition === 'run';
    if (this.runProgress) {
      this.runProgress.value = status.progress;
      this.runProgress.style.display = isRun ? 'block' : 'none';
    }
    if (status.condition !== 'disconnected' && this.whatLink.parentNode) {
      this.whatLink.remove();
    }
    if (this.stopButton) this.stopButton.style.display = isRun ? 'inline-block' : 'none';
    if (this.sendButton) this.sendButton.style.display = isRun ? 'none' : 'inline-block';
    if (this.saveGcodeButton) this.saveGcodeButton.style.display = isRun ? 'none' : 'inline-block';
    if (this.senderError) {
      this.senderError.style.display = status.error ? 'block' : 'none';
      this.senderError.innerText = status.error || '';
    }
  }
}
