import { stlToLatheCodes } from "./stlimport";
import { stepToLatheCodes } from "./stepimport";
import { AppSettings, normalizeAppSettings } from "../common/settings";

export class ToModelWorkerMessage {
  constructor(readonly fileName: string, readonly buffer: ArrayBuffer, readonly settings?: Partial<AppSettings>) {}
}

export class FromModelWorkerMessage {
  constructor(
    readonly progressMessage?: string,
    readonly error?: string,
    readonly latheCodeText?: string,
  ) {}
}

self.onmessage = async (event) => {
  const data = event.data as ToModelWorkerMessage;
  try {
    const settings = normalizeAppSettings(data.settings ?? {});
    const extension = data.fileName.split('.').pop()?.toLowerCase();
    const progress = (message: string) => postMessage(new FromModelWorkerMessage(message));
    if (extension !== 'stl' && extension !== 'step' && extension !== 'stp') {
      throw new Error('Unsupported file type. Choose an STL, STEP, or STP file.');
    }
    const latheCodes = extension === 'stl'
      ? stlToLatheCodes(data.buffer, settings.pxPerMm, progress, settings)
      : await stepToLatheCodes(data.buffer, settings.pxPerMm, progress, settings);
    if (latheCodes.length > 0) {
      postMessage(new FromModelWorkerMessage(undefined, undefined, latheCodes[0].getText().trim()));
    } else {
      postMessage(new FromModelWorkerMessage(undefined, 'No lathe code generated'));
    }
  } catch (error) {
    postMessage(new FromModelWorkerMessage(undefined, error instanceof Error ? error.message : String(error)));
  }
  self.close();
};
