import * as THREE from "three";
import { optimizeMoves } from "../planner/optimize";
import { Pixel } from "../common/pixel";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { createFullScreenDialog } from "../common/dialog";
import { Pair, Polygon } from "polygon-clipping";
import * as polygonClipping from "polygon-clipping";
import { cutPolygonLower, deduplicatePixelMoves, getPolygonArea, mirrorPolygonY, moveIntoNonNegtiveX, movesToLatheCodeOrNull, polygonToTurnSegments, removeConsecutiveDuplicatePoints, removeTinyAreaPolygons, repairPointsGoingBack, scaleAndRoundPolygon, segmentToMoves } from "../common/pixelutils";
import { LatheCode } from "../common/lathecode";
import { booleanValid } from '@turf/boolean-valid';

export function stlToLatheCodes(stl: ArrayBuffer, pxPerMm: number, callback: (progressMessage: string) => void): LatheCode[] {
  // Mesh is centered around 0
  const loader = new STLLoader();
  const geometry = loader.parse(stl).center();

  // We don't know how the mesh is oriented and along which axis is intended to be rotated so we try all options and let user choose.
  callback("Calculating xy projection...");
  const projectionsX = projectOrCut(geometry, "xy", new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), callback);
  callback("Calculating yz projection...");
  const projectionsY = projectOrCut(geometry, "yz", new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), callback);
  callback("Calculating xz projection...");
  const projectionsZ = projectOrCut(geometry, "xz", new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), callback);
  callback("Post-processing projections...");

  let projections = removeTinyAreaPolygons([... projectionsX, ... projectionsY, ... projectionsZ]);

  // Also include the rotated projections
  projections.push(... projections.map(projection => projection.map(pair => new Pixel(pair.y, pair.x))));

  // Convert from STL mm to pixels
  projections = projections.map(projection => scaleAndRoundPolygon(projection, pxPerMm));

  projections = projections.map(projection => removeConsecutiveDuplicatePoints(projection));
  projections = projections.map(projection => moveIntoNonNegtiveX(mirrorPolygonY(cutPolygonLower(projection))));
  projections = projections.filter(projection => getPolygonArea(projection) > 0.001);
  projections = projections.map(projection => polygonToTurnSegments(projection)).reduce((a, b) => a.concat(b), []);
  projections = projections.map(projection => repairPointsGoingBack(projection));

  let movesList = projections
    .map(p => segmentToMoves(p))
    .map(moves => optimizeMoves(moves, () => {}))
    .filter(moves => moves.length > 0);
  movesList = deduplicatePixelMoves(movesList);

  let latheCodes = movesList.map(m => movesToLatheCodeOrNull(m, pxPerMm)).filter(lc => lc !== null) as LatheCode[];
  if (geometry.boundingBox !== null) {
    let size = new THREE.Vector3();
    geometry.boundingBox.getSize(size);
    const largest = Math.max(size.x, size.y, size.z);
    const smallest = Math.min(size.x, size.y, size.z);
    const middle = size.x + size.y + size.z - largest - smallest;
    size = new THREE.Vector3(largest, middle, smallest);
    const wellSizedLatheCodes = latheCodes.filter(lc => {
      const lcSize = lc.getBoundingBox();
      const diff = Math.abs(lcSize.x - size.x) / size.x + Math.abs(lcSize.y - size.y) / size.y + Math.abs(lcSize.z - size.z) / size.z;
      return diff < 0.2;
    });
    if (wellSizedLatheCodes.length) {
      latheCodes = wellSizedLatheCodes;
    }
    latheCodes.sort((a, b) => size.distanceTo(a.getBoundingBox()) - size.distanceTo(b.getBoundingBox()));
    latheCodes = latheCodes.slice(0, 3);
  }
  return latheCodes;
}

export function projectOrCut(
  geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>,
  plane: string,
  planeNormal: THREE.Vector3,
  planePoint: THREE.Vector3,
  progressCallback: (progressMessage: string) => void,
): Pixel[][] {
  try {
    return projectOnPlane(geometry, plane, progressCallback);
  } catch (e) {
    console.log(`Failed projecting on plane ${plane}: ${e}`);
    return cutMeshWithPlane(geometry, planeNormal, planePoint)
  }
}

function r5(num: number): number {
  return Math.round(num * 1e5);
}

export function projectOnPlane(
  geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>,
  plane: string,
  progressCallback: (progressMessage: string) => void,
): Pixel[][] {
  const positions = geometry.attributes.position.array;
  const projectedPolygons: Polygon[] = [];
  for (let i = 0; i < positions.length; i += 9) {
    // Directly access the coordinates from positions array
    const x1 = r5(positions[i]), y1 = r5(positions[i + 1]), z1 = r5(positions[i + 2]);
    const x2 = r5(positions[i + 3]), y2 = r5(positions[i + 4]), z2 = r5(positions[i + 5]);
    const x3 = r5(positions[i + 6]), y3 = r5(positions[i + 7]), z3 = r5(positions[i + 8]);

    let projectedTriangle: Pair[] = [];

    if (plane === "xy" && (z1 >= 0 || z2 >= 0 || z3 >= 0)) {
      projectedTriangle = [[x1, y1], [x2, y2], [x3, y3], [x1, y1]];
    } else if (plane === "xz" && (y1 >= 0 || y2 >= 0 || y3 >= 0)) {
      projectedTriangle = [[x1, z1], [x2, z2], [x3, z3], [x1, z1]];
    } else if (plane === "yz" && (x1 >= 0 || x2 >= 0 || x3 >= 0)) {
      projectedTriangle = [[y1, z1], [y2, z2], [y3, z3], [y1, z1]];
    } else {
      continue;
    }

    if (booleanValid({type: "Polygon", coordinates: [projectedTriangle]})) {
      projectedTriangle.pop();
      projectedPolygons.push([projectedTriangle]);
    }
  }
  progressCallback(`Merging ${projectedPolygons.length} polygons for plane ${plane}, please wait ${estimatePolygonClippingTime(projectedPolygons.length)} seconds...`);
  const result = (polygonClipping as unknown as any).default.union(projectedPolygons);
  return result.map((polygon: Polygon) =>
    polygon[0].map(([x, y]) => new Pixel(x / 1e5, y / 1e5))
  );
}

function estimatePolygonClippingTime(N: number, avgEdgesPerPolygon: number = 3, baseTimePerOp: number = 0.00001): number {
  const n = N * avgEdgesPerPolygon;
  const k = n / 2;
  const estimatedOps = (n + k) * Math.log2(n);
  return Math.ceil(baseTimePerOp * estimatedOps);
}

function cutMeshWithPlane(
  geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>, planeNormal: THREE.Vector3, planePoint: THREE.Vector3): Pixel[][] {
  const intersectionEdges: Map<string, THREE.Vector3[]> = new Map();
  const coplanarEdges: Map<string, THREE.Vector3[]> = new Map();

  function edgeKey(a: THREE.Vector3, b: THREE.Vector3): string {
    return a.x < b.x || (a.x === b.x && a.y < b.y) || (a.x === b.x && a.y === b.y && a.z < b.z)
      ? `${a.x},${a.y},${a.z}-${b.x},${b.y},${b.z}`
      : `${b.x},${b.y},${b.z}-${a.x},${a.y},${a.z}`;
  }

  // Step 1: Find intersection edges and merge coplanar faces
  const mesh = Array.from(geometry.attributes.position.array);
  for (let i = 0; i < mesh.length; i += 9) {
    const v0 = new THREE.Vector3(mesh[i], mesh[i + 1], mesh[i + 2]);
    const v1 = new THREE.Vector3(mesh[i + 3], mesh[i + 4], mesh[i + 5]);
    const v2 = new THREE.Vector3(mesh[i + 6], mesh[i + 7], mesh[i + 8]);
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

  function projectToPlane(point: THREE.Vector3): Pixel {
    return new Pixel(point.dot(u), point.dot(v));
  }

  let projectedLoops: Pixel[][] = loops.map(loop => loop.map(p => projectToPlane(p)));

  // Step 4: Remove unnecessary points
  function simplifyLoop(loop: Pixel[]): Pixel[] {
    return loop.filter((p, i, arr) => {
      const prev = arr[(i - 1 + arr.length) % arr.length];
      const next = arr[(i + 1) % arr.length];

      return !((p.x === prev.x && p.x === next.x) || (p.y === prev.y && p.y === next.y));
    });
  }

  projectedLoops = projectedLoops.map(simplifyLoop);

  return projectedLoops.filter(loop => loop.length > 2);
}

export function showForDebug(projections: Pixel[][]) {
  const elements = projections.map(projection => {
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
