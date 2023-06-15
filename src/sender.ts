export class SenderStatus {
  constructor(
    readonly condition: 'disconnected'|'idle'|'run',
    readonly error: string,
    readonly progress: number,
    readonly z: number,
    readonly x: number,
    readonly feed: number,
    readonly rpm: number) {}
}

export class Sender {
  private port: SerialPort | null = null;
  private readTimeout = 0;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private writer: WritableStreamDefaultWriter<string> | null = null;
  private isOn = false;
  private waitForOkOrError = false;
  private lines: string[] = [];
  private lineIndex = 0;
  private unparsedResponse = '';
  private error = '';
  private z = 0;
  private x = 0;
  private feed = 0;
  private rpm = 0;

  constructor(readonly statusChangeCallback: () => void) {}

  getStatus() {
    return {
      condition: this.port ? (this.isOn ? 'run' : 'idle') : 'disconnected',
      error: this.error,
      progress: this.lines.length ? this.lineIndex / this.lines.length : 0,
      z: this.z,
      x: this.x,
      feed: this.feed,
      rpm: this.rpm,
    }
  }

  private setStatus(s: string) {
    if (s.startsWith('<')) s = s.substring(1);
    if (s.endsWith('>')) {
      s = s.slice(0, -1);
    } else {
      debugger
    }
    const parts = s.split('|');
    if (parts.length >= 3) {
      if (parts[1].startsWith('WPos:')) {
        const coords = parts[1].substring('WPos:'.length).split(',');
        this.z = Number(coords[2]);
        this.x = Number(coords[0]);
      }
      if (parts[2].startsWith('FS:')) {
        const coords = parts[2].substring('FS:'.length).split(',');
        this.feed = Number(coords[0]);
        this.rpm = Number(coords[1]);
      }
    } else {
      debugger
    }
    this.statusChangeCallback();
  }

  private setError(e: string) {
    this.error = e;
    this.statusChangeCallback();
  }

  async start(text: string) {
    if (!text) return;
    if (this.isOn) {
      this.stop();
    }
    if (!this.port) {
      await this.selectPort();
      if (!this.port) return;
    }
    this.lines = text.split('\n');
    this.lineIndex = 0;
    this.isOn = true;
    this.setError('');
    this.waitForOkOrError = false;
    this.unparsedResponse = '';
    this.write('~');
    this.writeCurrentLine();
    this.statusChangeCallback();
  }

  async stop() {
    await this.write('!');
    if (!this.isOn) return;
    this.isOn = false;
    this.askForStatus();
    this.statusChangeCallback();
  }

  private async write(sequence: string) {
    if (!this.port) return;
    console.log('command: ', sequence);
    if (!this.port.writable) {
      if (sequence != '?') {
        this.setError('Port is not writable, try reconnecting the USB and switching to GCODE mode.');
      }
      return;
    }
    if (!this.writer) {
      try {
        const textEncoder = new TextEncoderStream();
        textEncoder.readable.pipeTo(this.port.writable);
        this.writer = textEncoder.writable.getWriter();
      } catch (e) {
        this.setError('Failed to write: ' + e);
        return;
      }
    }
    await this.writer.write(sequence);
  }

  private async writeCurrentLine() {
    if (!this.isOn || this.waitForOkOrError) return;
    if (this.lineIndex >= this.lines.length) {
      this.stop();
      return;
    }
    const line = this.lines[this.lineIndex].split(';')[0].trim();
    if (!line) {
      this.lineIndex++;
      this.writeCurrentLine();
      return;
    }
    this.waitForOkOrError = true;
    await this.write(line + '\n');
    await this.readFromPort();
  };

  private async processResponse(response: string) {
    this.unparsedResponse = (this.unparsedResponse + response).trimStart();
    console.log(`response: "${response}"`, `unparsedResponse: "${this.unparsedResponse}"`);

    // Cut out status message.
    const statuses = this.unparsedResponse.match(/(<[^>]+>)/);
    if (statuses && statuses.length > 1) {
      statuses.shift();
      for (const s of statuses) {
        this.unparsedResponse = this.unparsedResponse.replace(s, '');
      }
      this.setStatus(statuses.pop()!);
    }

    if (this.unparsedResponse.startsWith('error:')) {
      this.setError(this.unparsedResponse);
      this.unparsedResponse = '';
      this.stop();
    } else if (this.unparsedResponse.startsWith('ok')) {
      this.unparsedResponse = '';
      this.waitForOkOrError = false;
      this.lineIndex++;
      this.statusChangeCallback();
      if (this.isOn) await this.writeCurrentLine();
    }
  }

  private async selectPort() {
    if (this.port) {
      this.closePort();
    }
    if (navigator.serial) {
      this.port = await navigator.serial.requestPort();
    } else {
      this.error = 'Browser does not support Serial API';
    }
    if (this.port) {
      try {
        await this.port.open({ baudRate: 115200 });
        this.statusChangeCallback();
        this.readSoon();
        await this.askForStatus();
      } catch (e) {
        this.setError(`Unable to open port - likely some other app is using it - try closing Arduino IDE.\n${e}`);
        this.closePort();
      }
    }
  }

  private async askForStatus() {
    try {
      await this.write('?');
    } catch (e) {
      this.setError(`Device disconnected? ${e}`);
      this.closePort();
    }
  }

  private readSoon() {
    clearTimeout(this.readTimeout);
    this.readTimeout = window.setTimeout(() => this.readFromPort(), 200);
  }

  private async readFromPort() {
    if (!this.port) return;
    try {
      if (!this.port.readable) {
        this.readSoon();
        return;
      }
      if (!this.reader) {
        const textDecoder = new TextDecoderStream();
        this.port.readable.pipeTo(textDecoder.writable);
        this.reader = textDecoder.readable.getReader();
      }
      const { value } = await this.reader.read();
      if (!value) {
        this.readSoon();
        return;
      }
      await this.processResponse(value);
      this.readSoon();
    } catch (e: any) {
      this.setError(e.message || String(e));
      this.closePort();
    }
  }

  private async closePort() {
    if (!this.port) return;
    clearTimeout(this.readTimeout);
    this.readTimeout = 0;
    if (this.reader) {
      if (this.reader.releaseLock) this.reader.releaseLock();
      this.reader = null;
    }
    if (this.writer) {
      if (this.writer.releaseLock) this.writer.releaseLock();
      this.writer = null;
    }
    try {
      await this.port.close();
    } catch (e) {
      // Ignore close errors.
    }
    this.port = null;
  }

}
