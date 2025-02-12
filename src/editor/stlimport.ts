import * as THREE from "three";
import { optimizeMoves } from "../planner/optimize";
import { Pixel } from "../common/pixel";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { createFullScreenDialog } from "../common/dialog";
import { cutPolygonLower, deduplicatePixelMoves, getNLargestPolygons, getPolygonArea, mirrorPolygonY, moveIntoNonNegtiveX, movesToLatheCodeOrNull, polygonToTurnSegments, removeConsecutiveDuplicatePoints, removeTinyAreaPolygons, repairPointsGoingBack, scaleAndRoundPolygon, segmentToMoves } from "../common/pixelutils";
import { LatheCode } from "../common/lathecode";

interface STL {
  vertices: number[];
  faces: number[][];
  boundingBox: THREE.Box3 | null;
}

export function stlToLatheCodes(stl: ArrayBuffer, pxPerMm: number): LatheCode[] {
  // Mesh is centered around 0
  const mesh = parseSTL(stl);

  // We don't know how the mesh is oriented and along which axis is intended to be rotated so we try all options and let user choose.
  const projectionsX = cutMeshWithPlane(mesh, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0));
  const projectionsY = cutMeshWithPlane(mesh, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0));
  const projectionsZ = cutMeshWithPlane(mesh, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));

  let projections = removeTinyAreaPolygons([... projectionsX, ... projectionsY, ... projectionsZ]);

  // With complex models there can be too many projections, WebGL doesn't allow more than a few contexts.
  projections = getNLargestPolygons(projections, 3);

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
  if (mesh.boundingBox !== null) {
    let size = new THREE.Vector3();
    mesh.boundingBox.getSize(size);
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

function parseSTL(stlBuffer: ArrayBuffer): STL {
  const loader = new STLLoader();
  let geometry = loader.parse(stlBuffer).center();
  const vertices = Array.from(geometry.attributes.position.array);
  const faces = [];
  for (let i = 0; i < vertices.length; i += 9) {
    faces.push([i / 3, (i + 3) / 3, (i + 6) / 3]);
  }
  return { vertices, faces, boundingBox: geometry.boundingBox };
}

function cutMeshWithPlane(mesh: STL, planeNormal: THREE.Vector3, planePoint: THREE.Vector3): Pixel[][] {
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
