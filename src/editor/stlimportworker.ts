import { stlToLatheCodes } from "./stlimport";
import { AppSettings, normalizeAppSettings } from "../common/settings";

export class ToStlWorkerMessage {
  constructor(readonly pxPerMm: number | undefined, readonly stl: ArrayBuffer, readonly settings?: Partial<AppSettings>) {}
}

export class FromStlWorkerMessage {
  constructor(
    readonly progressMessage?: string,
    readonly error?: string,
    readonly latheCodeText?: string,
  ) {}
}

self.onmessage = async (event) => {
  const data = event.data as ToStlWorkerMessage;
  try {
    const settings = normalizeAppSettings({...(data.settings ?? {}), pxPerMm: data.pxPerMm ?? data.settings?.pxPerMm});
    const latheCodes = stlToLatheCodes(data.stl, settings.pxPerMm, (progressMessage) => postMessage(new FromStlWorkerMessage(progressMessage)), settings);
    if (latheCodes.length > 0) {
      postMessage(new FromStlWorkerMessage(undefined, undefined, latheCodes[0].getText().trim()));
    } else {
      postMessage(new FromStlWorkerMessage(undefined, 'No lathe code generated'));
    }
  } catch (error) {
    postMessage(new FromStlWorkerMessage(undefined, error instanceof Error ? error.message : String(error)));
  }
  self.close();
};
