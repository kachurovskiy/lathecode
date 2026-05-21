import * as THREE from "three";
import { optimizeMoves } from "../planner/optimize";
import { Pixel } from "../common/pixel";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { createFullScreenDialog } from "../common/dialog";
import { Pair, Polygon } from "polygon-clipping";
import * as polygonClipping from "polygon-clipping";
import { cutPolygonLower, getPolygonArea, mirrorPolygonY, moveIntoNonNegativeX, removeConsecutiveDuplicatePoints, removeTinyAreaPolygons, repairPointsGoingBack, scaleAndRoundPolygon, segmentToMoves } from "../common/pixelutils";
import { LatheCode } from "../common/lathecode";
import { booleanValid } from '@turf/boolean-valid';
import { AppSettings, DEFAULT_APP_SETTINGS, loadAppSettings, normalizeAppSettings } from "../common/settings";

type CoordinatePlane = "xy" | "xz" | "yz";

export function stlToLatheCodes(stl: ArrayBuffer, pxPerMm: number, callback: (progressMessage: string) => void, settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS): LatheCode[] {
  const normalizedSettings = normalizeAppSettings({...settings, pxPerMm});
  // Mesh is centered around 0
  const loader = new STLLoader();
  const geometry = loader.parse(stl).center();

  // We don't know how the mesh is oriented and along which axis is intended to be rotated so we try all options and let user choose.
  callback("Calculating xy section...");
  const projectionsX = projectOrCut(geometry, "xy", new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), callback);
  callback("Calculating yz section...");
  const projectionsY = projectOrCut(geometry, "yz", new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), callback);
  callback("Calculating xz section...");
  const projectionsZ = projectOrCut(geometry, "xz", new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), callback);
  callback("Post-processing sections...");

  let latheCodes = [
    ...sectionLoopsToLatheCodes(projectionsX, normalizedSettings),
    ...sectionLoopsToLatheCodes(projectionsY, normalizedSettings),
    ...sectionLoopsToLatheCodes(projectionsZ, normalizedSettings),
    ...sectionLoopsToLatheCodes(swapSectionLoops(projectionsX), normalizedSettings),
    ...sectionLoopsToLatheCodes(swapSectionLoops(projectionsY), normalizedSettings),
    ...sectionLoopsToLatheCodes(swapSectionLoops(projectionsZ), normalizedSettings),
  ];
  latheCodes = deduplicateLatheCodes(latheCodes);
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
  plane: CoordinatePlane,
  planeNormal: THREE.Vector3,
  planePoint: THREE.Vector3,
  progressCallback: (progressMessage: string) => void,
): Pixel[][] {
  const cutLoops = cutMeshWithPlane(geometry, plane, planeNormal, planePoint);
  if (cutLoops.length > 0) return cutLoops;

  try {
    return projectOnPlane(geometry, plane, progressCallback);
  } catch (e) {
    console.log(`Failed projecting on plane ${plane}: ${e}`);
    return [];
  }
}

function sectionLoopsToLatheCodes(sectionLoops: Pixel[][], settings: AppSettings): LatheCode[] {
  let projections = removeTinyAreaPolygons(sectionLoops);
  projections = projections.map(projection => scaleAndRoundPolygon(projection, settings.pxPerMm));
  projections = projections.map(projection => removeConsecutiveDuplicatePoints(projection));
  projections = projections.map(projection => moveIntoNonNegativeX(mirrorPolygonY(cutPolygonLower(projection))));
  projections = projections.filter(projection => projection.length > 2 && getPolygonArea(projection) > 0.001);
  return projections.map(projection => materialPolygonToLatheCodeOrNull(projection, settings)).filter(lc => lc !== null) as LatheCode[];
}

function swapSectionLoops(sectionLoops: Pixel[][]): Pixel[][] {
  return sectionLoops.map(loop => loop.map(pair => new Pixel(pair.y, pair.x)));
}

function materialPolygonToLatheCodeOrNull(polygon: Pixel[], settings: AppSettings): LatheCode | null {
  const pxPerMm = settings.pxPerMm;
  const outer = normalizeProfileChain(extractBoundaryChain(polygon, "outer"));
  const inner = normalizeProfileChain(extractBoundaryChain(polygon, "inner"));
  if (outer.length < 2) return null;

  const outerText = profileChainToLatheText(outer, settings);
  if (!outerText) return null;

  const maxOuterRadiusPx = Math.max(...outer.map(p => p.y));
  const maxInnerRadiusPx = inner.length ? Math.max(...inner.map(p => p.y)) : 0;
  const hasInnerProfile = maxInnerRadiusPx > 0;
  const constantInnerRadiusPx = hasInnerProfile ? getConstantRadiusPx(inner) : null;
  let text = outerText;

  if (constantInnerRadiusPx !== null && constantInnerRadiusPx > 0) {
    text = `STOCK D${formatMm(maxOuterRadiusPx * 2 / pxPerMm)} ID${formatMm(constantInnerRadiusPx * 2 / pxPerMm)}\n${outerText}`;
  } else if (hasInnerProfile) {
    const innerText = profileChainToLatheText(inner, settings);
    if (!innerText) return null;
    text = `STOCK D${formatMm(maxOuterRadiusPx * 2 / pxPerMm)}\n${outerText}\nINSIDE\n${innerText}`;
  }

  try {
    return new LatheCode(text);
  } catch {
    return null;
  }
}

function extractBoundaryChain(polygon: Pixel[], boundary: "outer" | "inner"): Pixel[] {
  const minX = Math.min(...polygon.map(p => p.x));
  const maxX = Math.max(...polygon.map(p => p.x));
  if (minX === maxX) return [];

  const leftIndex = findExtremePointIndex(polygon, minX, boundary === "outer" ? "maxY" : "minY");
  const rightIndex = findExtremePointIndex(polygon, maxX, boundary === "outer" ? "maxY" : "minY");
  const positiveDirectionPath = pathBetween(polygon, leftIndex, rightIndex, 1);
  const negativeDirectionPath = pathBetween(polygon, leftIndex, rightIndex, -1);
  const positiveMeanY = meanY(positiveDirectionPath);
  const negativeMeanY = meanY(negativeDirectionPath);
  const result = boundary === "outer"
    ? positiveMeanY >= negativeMeanY ? positiveDirectionPath : negativeDirectionPath
    : positiveMeanY <= negativeMeanY ? positiveDirectionPath : negativeDirectionPath;
  return result[0].x <= result.at(-1)!.x ? result : result.concat().reverse();
}

function findExtremePointIndex(polygon: Pixel[], x: number, yMode: "minY" | "maxY"): number {
  let result = -1;
  for (let i = 0; i < polygon.length; i++) {
    const point = polygon[i];
    if (point.x !== x) continue;
    if (result === -1) {
      result = i;
    } else if (yMode === "minY" && point.y < polygon[result].y) {
      result = i;
    } else if (yMode === "maxY" && point.y > polygon[result].y) {
      result = i;
    }
  }
  if (result === -1) throw new Error("Expected polygon point not found");
  return result;
}

function pathBetween(polygon: Pixel[], startIndex: number, endIndex: number, direction: 1 | -1): Pixel[] {
  const result = [polygon[startIndex]];
  let index = startIndex;
  while (index !== endIndex) {
    index = (index + direction + polygon.length) % polygon.length;
    result.push(polygon[index]);
    if (result.length > polygon.length + 1) throw new Error("Unable to find polygon path");
  }
  return result;
}

function meanY(path: Pixel[]): number {
  return path.reduce((sum, point) => sum + point.y, 0) / path.length;
}

function normalizeProfileChain(chain: Pixel[]): Pixel[] {
  if (chain.length < 2) return chain;
  return removeConsecutiveDuplicatePoints(repairPointsGoingBack(removeConsecutiveDuplicatePoints(chain.concat())));
}

function profileChainToLatheText(chain: Pixel[], settings: AppSettings): string {
  const moves = optimizeMoves(segmentToMoves(chain), () => {}, 'maxY', settings);
  return moves
    .map(m => m.toMove(settings.pxPerMm).toLatheCode().trim())
    .filter(line => line.length > 0)
    .join('\n');
}

function getConstantRadiusPx(chain: Pixel[]): number | null {
  const minY = Math.min(...chain.map(p => p.y));
  const maxY = Math.max(...chain.map(p => p.y));
  return maxY - minY <= 1 ? Math.round((minY + maxY) / 2) : null;
}

function formatMm(num: number): string {
  return Math.abs(num).toFixed(3);
}

function deduplicateLatheCodes(latheCodes: LatheCode[]): LatheCode[] {
  const seen = new Set<string>();
  const result: LatheCode[] = [];
  for (const latheCode of latheCodes) {
    const key = latheCode.getText();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(latheCode);
  }
  return result;
}

function r5(num: number): number {
  return Math.round(num * 1e5);
}

export function projectOnPlane(
  geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>,
  plane: CoordinatePlane,
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
  geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>,
  plane: CoordinatePlane,
  planeNormal: THREE.Vector3,
  planePoint: THREE.Vector3,
): Pixel[][] {
  const intersectionEdges: Map<string, THREE.Vector3[]> = new Map();
  const coplanarEdges: Map<string, THREE.Vector3[]> = new Map();
  const EPS = 1e-6;

  function edgeKey(a: THREE.Vector3, b: THREE.Vector3): string {
    const aKey = pointKey(a);
    const bKey = pointKey(b);
    return aKey < bKey ? `${aKey}-${bKey}` : `${bKey}-${aKey}`;
  }

  function pointKey(p: THREE.Vector3): string {
    return `${Math.round(p.x / EPS)},${Math.round(p.y / EPS)},${Math.round(p.z / EPS)}`;
  }

  function samePoint(a: THREE.Vector3, b: THREE.Vector3): boolean {
    return a.distanceTo(b) < EPS;
  }

  function addEdge(edges: Map<string, THREE.Vector3[]>, a: THREE.Vector3, b: THREE.Vector3) {
    if (samePoint(a, b)) return;
    edges.set(edgeKey(a, b), [a, b]);
  }

  function toggleEdge(edges: Map<string, THREE.Vector3[]>, a: THREE.Vector3, b: THREE.Vector3) {
    if (samePoint(a, b)) return;
    const key = edgeKey(a, b);
    if (edges.has(key)) edges.delete(key);
    else edges.set(key, [a, b]);
  }

  // Step 1: Find intersection edges and merge coplanar faces
  const mesh = Array.from(geometry.attributes.position.array);
  for (let i = 0; i < mesh.length; i += 9) {
    const v0 = new THREE.Vector3(mesh[i], mesh[i + 1], mesh[i + 2]);
    const v1 = new THREE.Vector3(mesh[i + 3], mesh[i + 4], mesh[i + 5]);
    const v2 = new THREE.Vector3(mesh[i + 6], mesh[i + 7], mesh[i + 8]);
    const points = [v0, v1, v2];
    const distances = points.map(p => planeNormal.dot(p.clone().sub(planePoint)));

    if (distances.every(distance => Math.abs(distance) < EPS)) {
      // Face is coplanar
      const edges = [[v0, v1], [v1, v2], [v2, v0]];
      for (const [p1, p2] of edges) {
        toggleEdge(coplanarEdges, p1, p2);
      }
      continue;
    }

    const intersectionPoints: THREE.Vector3[] = [];
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex++) {
      const nextIndex = (edgeIndex + 1) % 3;
      const distance = distances[edgeIndex];
      const nextDistance = distances[nextIndex];
      if (Math.abs(distance) < EPS) {
        intersectionPoints.push(points[edgeIndex]);
      }
      if (distance * nextDistance < 0) {
        const t = distance / (distance - nextDistance);
        intersectionPoints.push(points[edgeIndex].clone().lerp(points[nextIndex], t));
      }
    }

    const uniqueIntersectionPoints: THREE.Vector3[] = [];
    for (const point of intersectionPoints) {
      if (!uniqueIntersectionPoints.some(existingPoint => samePoint(existingPoint, point))) {
        uniqueIntersectionPoints.push(point);
      }
    }

    if (uniqueIntersectionPoints.length === 2) {
      addEdge(intersectionEdges, uniqueIntersectionPoints[0], uniqueIntersectionPoints[1]);
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

        if (p1.distanceTo(currentPoint) < EPS) {
          currentLoop.push(p1);
          currentPoint = p2;
          allEdges.splice(i, 1);
          foundNext = true;
          break;
        } else if (p2.distanceTo(currentPoint) < EPS) {
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

  function projectToPlane(point: THREE.Vector3): Pixel {
    if (plane === "xy") return new Pixel(point.x, point.y);
    if (plane === "xz") return new Pixel(point.x, point.z);
    return new Pixel(point.y, point.z);
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
  const settings = loadAppSettings();
  const elements = projections.map(projection => {
    const canvas = document.createElement('canvas');
    canvas.className = 'selectorScene';
    const size = settings.stlDebugCanvasSizePx;
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
