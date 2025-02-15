import { stlToLatheCodes } from "./stlimport";

export class ToStlWorkerMessage {
  constructor(readonly pxPerMm: number, readonly stl: ArrayBuffer) {}
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
    const latheCodes = stlToLatheCodes(data.stl, event.data.pxPerMm, (progressMessage) => postMessage(new FromStlWorkerMessage(progressMessage)));
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
