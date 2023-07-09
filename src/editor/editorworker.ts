import { optimizeMoves } from "../planner/optimize";
import { PixelMove } from "../planner/pixel";

export class ToEditorWorkerMessage {
  constructor(readonly pxPerMm: number, readonly image: ArrayBuffer) {}
}

export class FromEditorWorkerMessage {
  constructor(
    readonly progressMessage?: string,
    readonly error?: string,
    readonly moves?: PixelMove[],
  ) {}
}

self.onmessage = async (event) => {
  const data: ToEditorWorkerMessage = event.data;
  let imageArray = new Uint8Array(data.image);
  const imageBlob = new Blob([imageArray], { type: "image/*" });
  let img = await createImageBitmap(imageBlob);
  const canvas = extractBottomHalf(rotateClockwise(img));
  const moves = detectMoves(canvas.getContext('2d')!);
  console.log('moves', moves);
  postMessage({moves: optimizeMoves(moves, (progressMessage) => postMessage({progressMessage}))});
};

function detectMoves(ctx: OffscreenCanvasRenderingContext2D): PixelMove[] {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { width, height, data } = imageData;
  const result: PixelMove[] = [];
  let prevY = 0;
  for (let x = width - 1; x >= 0; x--) {
    let y = height - 1;
    for (; y >= 0; y--) {
      const pixelIndex = (y * width + x) * 4;
      const red = data[pixelIndex];
      const green = data[pixelIndex + 1];
      const blue = data[pixelIndex + 2];
      const alpha = data[pixelIndex + 3];
      if (red <= 128 && green <= 128 && blue <= 128 && alpha >= 128) {
        break;
      }
    }
    result.push(new PixelMove(x-1, prevY, -1, y - prevY, y > 0 ? 1 : 0, []));
    prevY = y;
  }
  return result;
}

function rotateClockwise(image: ImageBitmap): OffscreenCanvas {
    const canvas = new OffscreenCanvas(image.height, image.width);
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    return canvas;
}

function extractBottomHalf(image: OffscreenCanvas): OffscreenCanvas {
  const canvas = new OffscreenCanvas(image.width, image.height / 2);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, image.height / 2, image.width, image.height / 2, 0, 0, image.width, image.height / 2);
  return canvas;
}
