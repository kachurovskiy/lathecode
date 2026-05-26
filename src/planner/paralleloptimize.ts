import OptimizeWorker from './optimizeworker?worker&inline';
import { AppSettings, DEFAULT_APP_SETTINGS, normalizeAppSettings } from "../common/settings";
import { PixelMove, PixelMoveData } from "../common/pixel";
import { optimizeMoves, TravelRetractionSide } from "./optimize";

const PARALLEL_OPTIMIZE_MIN_MOVES = 100000;
const PARALLEL_OPTIMIZE_MIN_MOVES_PER_WORKER = 30000;
const PARALLEL_OPTIMIZE_MAX_WORKERS = 8;

type OptimizeWorkerResponse = {
  moves?: PixelMoveData[],
  error?: string,
};

export async function optimizeMovesParallel(
  moves: PixelMove[],
  progressCallback: (message: string) => void,
  travelRetractionSide: TravelRetractionSide = 'maxY',
  settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS,
): Promise<PixelMove[]> {
  const normalizedSettings = normalizeAppSettings(settings);
  const workerCount = getParallelOptimizeWorkerCount(moves.length);
  if (workerCount <= 1) return optimizeMoves(moves, progressCallback, travelRetractionSide, normalizedSettings);

  const chunks = splitMovesForParallelOptimization(moves, workerCount);
  if (chunks.length <= 1) return optimizeMoves(moves, progressCallback, travelRetractionSide, normalizedSettings);

  progressCallback(`Optimizing ${moves.length} moves using ${chunks.length} workers...`);
  try {
    let completedChunks = 0;
    const optimizedChunks = await Promise.all(chunks.map(async chunk => {
      const optimized = await optimizeChunkInWorker(chunk, travelRetractionSide, normalizedSettings);
      completedChunks++;
      progressCallback(`Optimized move chunk ${completedChunks} of ${chunks.length}`);
      return optimized;
    }));
    const mergedMoves = optimizedChunks.flat();
    progressCallback(`Stabilizing ${mergedMoves.length} optimized moves...`);
    return optimizeMoves(mergedMoves, progressCallback, travelRetractionSide, normalizedSettings);
  } catch (error) {
    progressCallback(`Parallel optimization failed, retrying on one worker: ${error instanceof Error ? error.message : String(error)}`);
    return optimizeMoves(moves, progressCallback, travelRetractionSide, normalizedSettings);
  }
}

export function getParallelOptimizeWorkerCount(moveCount: number, hardwareConcurrency = getHardwareConcurrency()): number {
  if (moveCount < PARALLEL_OPTIMIZE_MIN_MOVES) return 1;
  const usefulWorkers = Math.floor(moveCount / PARALLEL_OPTIMIZE_MIN_MOVES_PER_WORKER);
  return Math.max(1, Math.min(hardwareConcurrency, usefulWorkers, PARALLEL_OPTIMIZE_MAX_WORKERS));
}

export function splitMovesForParallelOptimization(moves: PixelMove[], workerCount: number): PixelMove[][] {
  if (workerCount <= 1 || moves.length <= 1) return [moves];

  const chunks: PixelMove[][] = [];
  let start = 0;
  for (let chunkIndex = 1; chunkIndex < workerCount && start < moves.length; chunkIndex++) {
    const remainingWorkers = workerCount - chunkIndex + 1;
    const target = start + Math.ceil((moves.length - start) / remainingWorkers);
    const end = findChunkEnd(moves, start, target);
    if (end <= start || end >= moves.length) break;
    chunks.push(moves.slice(start, end));
    start = end;
  }
  chunks.push(moves.slice(start));
  return chunks.filter(chunk => chunk.length > 0);
}

function findChunkEnd(moves: PixelMove[], start: number, target: number): number {
  const clampedTarget = Math.max(start + 1, Math.min(target, moves.length));
  if (clampedTarget >= moves.length || isSafeChunkBoundary(moves, clampedTarget)) return clampedTarget;

  let forward = clampedTarget + 1;
  let backward = clampedTarget - 1;
  while (forward < moves.length || backward > start) {
    if (forward < moves.length && isSafeChunkBoundary(moves, forward)) return forward;
    if (backward > start && isSafeChunkBoundary(moves, backward)) return backward;
    forward++;
    backward--;
  }
  return moves.length;
}

function isSafeChunkBoundary(moves: PixelMove[], index: number): boolean {
  if (index <= 0 || index >= moves.length) return true;
  // Travel optimization depends on the whole travel run to preserve the safe retract Y.
  return !!moves[index - 1].cutArea || !!moves[index].cutArea;
}

function optimizeChunkInWorker(
  moves: PixelMove[],
  travelRetractionSide: TravelRetractionSide,
  settings: AppSettings,
): Promise<PixelMove[]> {
  return new Promise((resolve, reject) => {
    const worker = new OptimizeWorker();
    worker.onmessage = (event: MessageEvent<OptimizeWorkerResponse>) => {
      worker.terminate();
      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }
      resolve((event.data.moves ?? []).map(move => PixelMove.fromData(move)));
    };
    worker.onerror = event => {
      worker.terminate();
      reject(new Error(event.message));
    };
    worker.postMessage({
      moves,
      settings,
      travelRetractionSide,
    });
  });
}

function getHardwareConcurrency(): number {
  return Math.max(1, Math.floor(globalThis.navigator?.hardwareConcurrency ?? 1));
}
