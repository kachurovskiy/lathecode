import * as THREE from "three";
import { optimizeMoves } from "../planner/optimize";
import { PixelMove } from "../planner/pixel";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { createFullScreenDialog } from "../common/dialog";

export class ToStlWorkerMessage {
  constructor(readonly pxPerMm: number, readonly stl: ArrayBuffer) {}
}

export class FromStlWorkerMessage {
  constructor(
    readonly progressMessage?: string,
    readonly error?: string,
    readonly moveOptions?: PixelMove[][],
  ) {}
}

interface STL {
  vertices: number[];
  faces: number[][];
}

interface Vector2D {
  x: number;
  y: number;
  prev?: Vector2D;
  next?: Vector2D;
}

export function processStl(data: ToStlWorkerMessage): FromStlWorkerMessage {
  const mesh = parseSTL(data.stl);
  const projectionsX = cutMeshWithPlane(mesh, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0));
  console.log(projectionsX);
  const projectionsY = cutMeshWithPlane(mesh, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0));
  console.log(projectionsY);
  const projectionsZ = cutMeshWithPlane(mesh, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
  console.log(projectionsZ);
  let allProjections = [... projectionsX, ... projectionsY, ... projectionsZ]
    .filter(p => p.length > 0)
    .filter(projection => {
      let minX = projection[0].x;
      let maxX = projection[0].x;
      let minY = projection[0].y;
      let maxY = projection[0].y;
      for (let pair of projection) {
        minX = Math.min(minX, pair.x);
        maxX = Math.max(maxX, pair.x);
        minY = Math.min(minY, pair.y);
        maxY = Math.max(maxY, pair.y);
      }
      return maxX - minX > 1e-4 && maxY - minY > 1e-4;
    });

  const projectionsWithArea = allProjections.map(projection => {
    let minX = projection[0].x;
    let maxX = projection[0].x;
    let minY = projection[0].y;
    let maxY = projection[0].y;
    for (let pair of projection) {
      minX = Math.min(minX, pair.x);
      maxX = Math.max(maxX, pair.x);
      minY = Math.min(minY, pair.y);
      maxY = Math.max(maxY, pair.y);
    }
    return { projection, area: (maxX - minX) * (maxY - minY) };
  });
  projectionsWithArea.sort((a, b) => b.area - a.area);
  allProjections = projectionsWithArea.slice(0, 3).map(p => p.projection);

  // showForDebug(allProjections);

  allProjections.push(... allProjections.map(projection => projection.map(pair => ({ x: pair.y, y: pair.x }))));

  const moveOptions = allProjections
    .map(p => projectionToMoves(p, data.pxPerMm))
    .map(moves => optimizeMoves(moves, () => {}))
    .filter(moves => moves.length > 0);
  return {moveOptions};
}

function parseSTL(stlBuffer: ArrayBuffer): STL {
  const loader = new STLLoader();
  let geometry = loader.parse(stlBuffer).center();
  const vertices = Array.from(geometry.attributes.position.array);
  const faces = [];
  for (let i = 0; i < vertices.length; i += 9) {
    faces.push([i / 3, (i + 3) / 3, (i + 6) / 3]);
  }
  return { vertices, faces };
}

function projectionToMoves(projection: Vector2D[], pxPerMm: number): PixelMove[] {
  // Modify projection: multiply every x and y by pxPerMm and round
  for (let pair of projection) {
    pair.x = Math.round(pair.x * pxPerMm);
    pair.y = Math.round(pair.y * pxPerMm);
  }

  // Remove consequitive duplicate points.
  const uniqueProjection = [projection[0]];
  for (let i = 1; i < projection.length; i++) {
    if (projection[i].x !== projection[i - 1].x || projection[i].y !== projection[i - 1].y) {
      uniqueProjection.push(projection[i]);
    }
  }
  projection = uniqueProjection;

  // Convert projection to bidirectional linked list
  for (let i = 0; i < projection.length; i++) {
    projection[i].prev = projection[(i - 1 + projection.length) % projection.length];
    projection[i].next = projection[(i + 1) % projection.length];
  }

  // Find the point with lowest x
  let minX = Infinity;
  let minXPoint = null;
  for (let pair of projection) {
    if (pair.x < minX) {
      minX = pair.x;
      minXPoint = pair;
    }
  }

  // Find the point with highest x
  let maxX = -Infinity;
  let maxXPoint = null;
  for (let pair of projection) {
    if (pair.x > maxX) {
      maxX = pair.x;
      maxXPoint = pair;
    }
  }

  if (!minXPoint || !maxXPoint || minX === maxX) return [];

  // Find the first different y when going next
  let currentPoint = minXPoint;
  let nextYNotEqualToCurrentY = 0;
  do {
    currentPoint = currentPoint.next!;
    nextYNotEqualToCurrentY = currentPoint.y;
  } while (minXPoint.y === nextYNotEqualToCurrentY && currentPoint !== minXPoint);

  // Find the first different y when going prev
  currentPoint = minXPoint;
  let prevYNotEqualToCurrentY = 0;
  do {
    currentPoint = currentPoint.prev!;
    prevYNotEqualToCurrentY = currentPoint.y;
  } while (minXPoint.y === prevYNotEqualToCurrentY && currentPoint !== minXPoint);

  if (nextYNotEqualToCurrentY === prevYNotEqualToCurrentY) return [];

  // Make all y values positive
  for (let pair of projection) {
    pair.y = Math.abs(pair.y);
  }

  const moves = [];
  const direction = nextYNotEqualToCurrentY > prevYNotEqualToCurrentY ? 'next' : 'prev';
  currentPoint = minXPoint;
  const points = [];
  // Iterate from minXPoint until we reach maxXPoint and generate moves
  while (currentPoint !== maxXPoint) {
    points.push(currentPoint);
    const nextPoint = currentPoint[direction]!;
    currentPoint = nextPoint;
  }

  // Less deflection to have a larger base for the part
  const maxYForMinX = points.filter(p => p.x === minX).reduce((max, p) => Math.max(max, p.y), -Infinity);
  const maxYForMaxX = points.filter(p => p.x === maxX).reduce((max, p) => Math.max(max, p.y), -Infinity);
  if (maxYForMaxX < maxYForMinX) points.reverse();

  // Generate moves
  for (let i = 0; i < points.length - 1; i++) {
    const currentPoint = points[i];
    const nextPoint = points[i + 1];
    const dx = nextPoint.x - currentPoint.x;
    const dy = nextPoint.y - currentPoint.y;
    moves.push(new PixelMove(currentPoint.x - minX, currentPoint.y, dx, dy, 1, []));
  }

  return moves;
}

function cutMeshWithPlane(mesh: STL, planeNormal: THREE.Vector3, planePoint: THREE.Vector3): Vector2D[][] {
  const intersectionEdges: Map<string, THREE.Vector3[]> = new Map();
  const coplanarEdges: Map<string, THREE.Vector3[]> = new Map();

  function edgeKey(a: THREE.Vector3, b: THREE.Vector3): string {
    return a.x < b.x || (a.x === b.x && a.y < b.y) || (a.x === b.x && a.y === b.y && a.z < b.z)
      ? `${a.x},${a.y},${a.z}-${b.x},${b.y},${b.z}`
      : `${b.x},${b.y},${b.z}-${a.x},${a.y},${a.z}`;
  }

  // Step 1: Find intersection edges and merge coplanar faces
  for (const face of mesh.faces) {
    const v0 = new THREE.Vector3(
      mesh.vertices[face[0] * 3],
      mesh.vertices[face[0] * 3 + 1],
      mesh.vertices[face[0] * 3 + 2]
    );
    const v1 = new THREE.Vector3(
      mesh.vertices[face[1] * 3],
      mesh.vertices[face[1] * 3 + 1],
      mesh.vertices[face[1] * 3 + 2]
    );
    const v2 = new THREE.Vector3(
      mesh.vertices[face[2] * 3],
      mesh.vertices[face[2] * 3 + 1],
      mesh.vertices[face[2] * 3 + 2]
    );

    const points = [v0, v1, v2];
    const distances = points.map(p => planeNormal.dot(p.clone().sub(planePoint)));

    let intersectionPoints: THREE.Vector3[] = [];

    if (Math.abs(distances[0]) < 1e-6 && Math.abs(distances[1]) < 1e-6 && Math.abs(distances[2]) < 1e-6) {
      // Face is coplanar
      const edges = [[v0, v1], [v1, v2], [v2, v0]];
      for (const [p1, p2] of edges) {
        const key = edgeKey(p1, p2);
        if (coplanarEdges.has(key)) {
          coplanarEdges.delete(key); // Shared edge cancels out
        } else {
          coplanarEdges.set(key, [p1, p2]);
        }
      }
      continue;
    }

    // Detect intersection points between edges
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (distances[i] * distances[j] < 0) {
        const t = distances[i] / (distances[i] - distances[j]);
        const intersection = points[i].clone().lerp(points[j], t);
        intersectionPoints.push(intersection);
      }
    }

    if (intersectionPoints.length === 2) {
      const key = edgeKey(intersectionPoints[0], intersectionPoints[1]);
      if (intersectionEdges.has(key)) {
        intersectionEdges.delete(key); // Remove duplicate edges
      } else {
        intersectionEdges.set(key, [intersectionPoints[0], intersectionPoints[1]]);
      }
    }
  }

  const allEdges = [...intersectionEdges.values(), ...coplanarEdges.values()];
  if (allEdges.length === 0) return [];

  // Step 2: Group edges into closed loops
  const loops: THREE.Vector3[][] = [];

  while (allEdges.length > 0) {
    const currentLoop: THREE.Vector3[] = [allEdges[0][0]];
    let currentPoint = allEdges[0][1];
    allEdges.splice(0, 1);

    while (true) {
      let foundNext = false;

      for (let i = 0; i < allEdges.length; i++) {
        const [p1, p2] = allEdges[i];

        if (p1.distanceTo(currentPoint) < 1e-6) {
          currentLoop.push(p1);
          currentPoint = p2;
          allEdges.splice(i, 1);
          foundNext = true;
          break;
        } else if (p2.distanceTo(currentPoint) < 1e-6) {
          currentLoop.push(p2);
          currentPoint = p1;
          allEdges.splice(i, 1);
          foundNext = true;
          break;
        }
      }

      if (!foundNext) break;
    }

    if (currentLoop.length > 2) {
      loops.push(currentLoop);
    }
  }

  // Step 3: Compute 2D projection
  function getPlaneBasis(normal: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
    let u = new THREE.Vector3();
    let v = new THREE.Vector3();

    if (Math.abs(normal.x) > Math.abs(normal.z)) {
      u.set(-normal.y, normal.x, 0).normalize();
    } else {
      u.set(0, -normal.z, normal.y).normalize();
    }

    v.crossVectors(normal, u).normalize();
    return [u, v];
  }

  const [u, v] = getPlaneBasis(planeNormal);

  function projectToPlane(point: THREE.Vector3): Vector2D {
    return {
      x: point.dot(u),
      y: point.dot(v),
    };
  }

  let projectedLoops: Vector2D[][] = loops.map(loop => loop.map(p => projectToPlane(p)));

  // Step 4: Remove unnecessary points
  function simplifyLoop(loop: Vector2D[]): Vector2D[] {
    return loop.filter((p, i, arr) => {
      if (i === 0 || i === arr.length - 1) return true;
      const prev = arr[i - 1];
      const next = arr[i + 1];

      return !((p.x === prev.x && p.x === next.x) || (p.y === prev.y && p.y === next.y));
    });
  }

  projectedLoops = projectedLoops.map(simplifyLoop);

  return projectedLoops;
}

export function showForDebug(allProjections: Vector2D[][]) {
  const elements = allProjections.map(projection => {
    const canvas = document.createElement('canvas');
    canvas.className = 'selectorScene';
    const size = 500;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    const minX = projection.reduce((min, pair) => Math.min(min, pair.x), Infinity);
    const maxX = projection.reduce((max, pair) => Math.max(max, pair.x), -Infinity);
    const minY = projection.reduce((min, pair) => Math.min(min, pair.y), Infinity);
    const maxY = projection.reduce((max, pair) => Math.max(max, pair.y), -Infinity);
    let scaleToFitSize = Math.min(size / (maxX - minX), size / (maxY - minY));
    for (let i = 0; i < projection.length; i++) {
      const pair = projection[i];
      if (i === 0) ctx.moveTo((pair.x - minX) * scaleToFitSize, (pair.y - minY) * scaleToFitSize);
      else ctx.lineTo((pair.x - minX) * scaleToFitSize, (pair.y - minY) * scaleToFitSize);
    }
    ctx.closePath();
    ctx.stroke();
    return canvas;
  });
  const element = document.createElement('div');
  element.className = 'selectorContainer';
  for (const canvas of elements) {
    element.appendChild(canvas);
  }
  createFullScreenDialog(element, "Projections", () => {});
}
