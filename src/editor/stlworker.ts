import { optimizeMoves } from "../planner/optimize";
import { PixelMove } from "../planner/pixel";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export class ToStlWorkerMessage {
  constructor(readonly pxPerMm: number, readonly stl: ArrayBuffer) {}
}

export class FromStlWorkerMessage {
  constructor(
    readonly progressMessage?: string,
    readonly error?: string,
    readonly moves?: PixelMove[],
  ) {}
}

interface STL {
  vertices: number[];
  faces: number[][];
}

interface SymmetryAxis {
  axis: string;
  centroid: number[];
}

self.onmessage = async (event) => {
  const data: ToStlWorkerMessage = event.data;
  try {
    postMessage({ progressMessage: "Parsing STL file..." });
    const mesh = parseSTL(data.stl);

    postMessage({ progressMessage: "Finding symmetry axis..." });
    const symmetryAxis = findSymmetryAxis(mesh);

    postMessage({ progressMessage: "Generating movement instructions..." });
    let moves = generateMoves(mesh, symmetryAxis, data.pxPerMm);

    postMessage({ progressMessage: "Optimizing moves..." });
    postMessage({ moves: optimizeMoves(moves, (progressMessage) => postMessage({ progressMessage })) });
  } catch (error) {
    postMessage({ error });
  }
};

function parseSTL(stlBuffer: ArrayBuffer): STL {
  const loader = new STLLoader();
  const geometry = loader.parse(stlBuffer);
  const vertices = Array.from(geometry.attributes.position.array);
  const faces = [];
  for (let i = 0; i < vertices.length; i += 9) {
    faces.push([i / 3, (i + 3) / 3, (i + 6) / 3]);
  }
  return { vertices, faces };
}

export function findSymmetryAxis(mesh: STL): SymmetryAxis {
  const { vertices } = mesh;
  const axisOptions = ["x", "y", "z"];
  let bestAxis = "z";
  let bestScore = 0;
  const centroid = [0, 0, 0];
  // Compute centroid of the model
  for (let i = 0; i < vertices.length; i += 3) {
    centroid[0] += vertices[i];     // x
    centroid[1] += vertices[i + 1]; // y
    centroid[2] += vertices[i + 2]; // z
  }
  centroid[0] /= vertices.length / 3;
  centroid[1] /= vertices.length / 3;
  centroid[2] /= vertices.length / 3;

  axisOptions.forEach((currentAxis, axisIndex) => {
    let positiveSide = 0;
    let negativeSide = 0;
    for (let i = axisIndex; i < vertices.length; i += 3) {
      let value: number = 0;
      switch (currentAxis) {
        case "x":
          value = vertices[i] - centroid[0];
          break;
        case "y":
          value = vertices[i + 1] - centroid[1];
          break;
        case "z":
          value = vertices[i + 2] - centroid[2];
          break;
      }
      if (value > 0) {
        positiveSide++;
      } else {
        negativeSide++;
      }
    }
    const symmetryScore = Math.min(positiveSide, negativeSide) / (positiveSide + negativeSide);
    if (symmetryScore > bestScore) {
      bestScore = symmetryScore;
      bestAxis = currentAxis;
    }
  });
  return { axis: bestAxis, centroid };
}

export function generateMoves(mesh: STL, symmetryAxis: SymmetryAxis, pxPerMm: number) {
  const { vertices } = mesh;
  const axisIndex = { x: 0, y: 1, z: 2 }[symmetryAxis.axis];

  // Project model onto plane perpendicular to symmetry axis
  const projected = vertices.reduce((acc: number[], _, i) => {
    if (i % 3 !== axisIndex) acc.push(Math.round((vertices[i] - symmetryAxis.centroid[i % 3]) * pxPerMm));
    return acc;
  }, []);

  // Find bounding box to orient projection
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < projected.length; i += 2) {
    minX = Math.min(minX, projected[i]);
    maxX = Math.max(maxX, projected[i]);
    minY = Math.min(minY, projected[i + 1]);
    maxY = Math.max(maxY, projected[i + 1]);
  }

  // Take bottom half, zero.
  const half: {x: number, y: number}[] = [];
  for (let i = 0; i < projected.length - 2; i += 2) {
    const x = projected[i];
    const y = projected[i + 1];
    if (y < 0) half.push({x: x - minX, y: Math.abs(y)});
  }
  if (!half.length) return [];

  // Big side towards the end for smaller deflection.
  if (half[0].y > half[half.length - 1].y) {
    let maxX = 0;
    for (let pair of half) {
      if (pair.x > maxX) maxX = pair.x;
    }
    for (let pair of half) {
      pair.x = maxX - pair.x;
    }
  }

  // For any X only keep the point with highest Y
  half.sort((a, b) => a.x - b.x);
  const unique = [half[0]];
  for (let pair of half) {
    const last = unique[unique.length - 1];
    if (pair.x == last.x) {
      last.y = Math.max(last.y, pair.y);
    } else {
      unique.push(pair);
    }
  }

  // Normalize projection
  const moves = [];
  let prevPair = null;
  for (let pair of unique) {
    if (prevPair) moves.push(new PixelMove(prevPair.x, prevPair.y, pair.x - prevPair.x, pair.y - prevPair.y, 1, []));
    prevPair = pair;
  }

  // Sort moves from right to left
  moves.sort((a, b) => a.xStart - b.xStart);

  return moves;
}
