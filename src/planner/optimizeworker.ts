import { AppSettings } from "../common/settings";
import { PixelMove, PixelMoveData } from "../common/pixel";
import { optimizeMovesBeforeSmoothing, TravelRetractionSide } from "./optimize";

type OptimizeWorkerRequest = {
  moves: PixelMoveData[],
  settings: AppSettings,
  travelRetractionSide: TravelRetractionSide,
};

type OptimizeWorkerResponse = {
  moves?: PixelMoveData[],
  error?: string,
};

self.onmessage = (event: MessageEvent<OptimizeWorkerRequest>) => {
  try {
    const request = event.data;
    const moves = request.moves.map(move => PixelMove.fromData(move));
    const optimized = optimizeMovesBeforeSmoothing(moves, () => {}, request.travelRetractionSide, request.settings);
    const response: OptimizeWorkerResponse = {moves: optimized};
    postMessage(response);
  } catch (error) {
    const response: OptimizeWorkerResponse = {error: error instanceof Error ? error.message : String(error)};
    postMessage(response);
  }
};
