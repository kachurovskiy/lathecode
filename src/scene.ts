import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LatheCode, Segment, Stock, type Tool } from './common/lathecode';
import { approximateSegments } from './common/lathegeometry';
import { DEFAULT_APP_SETTINGS, type AppSettings, normalizeAppSettings } from './common/settings';

export class Scene extends THREE.Scene {
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
  private controls: OrbitControls;
  private settings: AppSettings;
  private latheCode: LatheCode | null = null;
  private latheMesh: THREE.Object3D | null = null;
  private stock: THREE.Object3D | null = null;
  private orientationMarkers: THREE.Object3D | null = null;

  constructor(readonly container: HTMLElement, size = 500, settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS) {
    super();
    this.settings = normalizeAppSettings(settings);

    this.background = new THREE.Color(0xffffff);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(size, size);
    this.addLight();
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('click', () => {
      this.controls.autoRotate = false;
    });
    this.camera = new THREE.OrthographicCamera(-7, 7, -7, 7, 0, 1000);
    this.camera.position.z = 5;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.autoRotate = true;
    this.animate();
    applyLatheViewRotation(this);
  }

  getLatheMesh(): THREE.Object3D | null {
    return this.latheMesh;
  }

  private fit(...objects: THREE.Object3D[]) {
    fitLatheCamera(this.camera, objects);
  }

  private addLight() {
    addLatheLights(this);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this, this.camera);
  }

  setSettings(settings: Partial<AppSettings>) {
    this.settings = normalizeAppSettings(settings);
  }

  setLatheCode(value: LatheCode | null) {
    if (this.latheCode) {
      this.setLatheMesh(null);
      this.setStock(null);
      this.setOrientationMarkers(null);
    }
    this.latheCode = value;
    if (this.latheCode) {
      const renderObjects = createLatheRenderObjects(this.latheCode, {
        includeOrientationMarkers: true,
        partRevolutionDegrees: this.settings.partRevolutionDegrees,
      });
      this.setStock(renderObjects.stockMesh);
      this.setLatheMesh(renderObjects.latheMesh);
      this.setOrientationMarkers(renderObjects.orientationMarkers ?? null);
      this.fit(renderObjects.stockMesh, renderObjects.orientationMarkers!);
    }
  }

  private setLatheMesh(value: THREE.Object3D | null) {
    if (this.latheMesh) this.remove(this.latheMesh);
    this.latheMesh = value;
    if (this.latheMesh) this.add(this.latheMesh);
  }

  private setStock(value: THREE.Object3D | null) {
    if (this.stock) this.remove(this.stock);
    this.stock = value;
    if (this.stock) this.add(this.stock);
  }

  private setOrientationMarkers(value: THREE.Object3D | null) {
    if (this.orientationMarkers) this.remove(this.orientationMarkers);
    this.orientationMarkers = value;
    if (this.orientationMarkers) this.add(this.orientationMarkers);
  }
}

export type LatheRenderObjects = {
  stockSpec: Stock,
  stockMesh: THREE.Object3D,
  latheMesh: THREE.Object3D,
  orientationMarkers?: THREE.Object3D,
};

export type LatheRenderOptions = {
  includeOrientationMarkers?: boolean,
  partRevolutionDegrees?: number,
};

export function createLatheRenderObjects(
    latheCode: LatheCode,
    options: LatheRenderOptions = {}): LatheRenderObjects {
  const stockSpec = latheCode.getStock();
  if (!stockSpec) throw new Error('stock is required');

  const stockMesh = centerObject(createStockMesh(stockSpec));
  const latheMesh = createLatheMesh(latheCode, options);
  latheMesh.position.set(stockMesh.position.x, stockMesh.position.y - stockSpec.length / 2, stockMesh.position.z);

  const orientationMarkers = options.includeOrientationMarkers
    ? createOrientationMarkers(latheCode, stockSpec, stockMesh.position)
    : undefined;

  return {stockSpec, stockMesh, latheMesh, orientationMarkers};
}

export function createLatheRenderGroup(
    latheCode: LatheCode,
    options: LatheRenderOptions = {}): {group: THREE.Group, objects: LatheRenderObjects} {
  const objects = createLatheRenderObjects(latheCode, options);
  const group = new THREE.Group();
  group.add(objects.stockMesh);
  group.add(objects.latheMesh);
  if (objects.orientationMarkers) group.add(objects.orientationMarkers);
  return {group, objects};
}

export function addLatheLights(target: THREE.Object3D) {
  let light;
  light = new THREE.DirectionalLight(0xffffff, 1);
  light.castShadow = true;
  light.position.set(0, 1, 0);
  target.add(light);
  light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.castShadow = true;
  light.position.set(1, 0, 0);
  target.add(light);
  light = new THREE.DirectionalLight(0xffffff, 0.6);
  light.castShadow = true;
  light.position.set(0, 0, 1);
  target.add(light);
}

export function applyLatheViewRotation(object: THREE.Object3D) {
  object.rotation.z = -8.5;
  object.rotation.y = 1;
  object.rotation.x = 1.5;
}

export function fitLatheCamera(camera: THREE.OrthographicCamera, objects: THREE.Object3D[]) {
  const box = new THREE.Box3();
  objects.forEach(object => box.union(new THREE.Box3().setFromObject(object)));
  if (box.isEmpty()) return;

  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  const desiredSize = maxDimension * 0.7;
  const desiredZoom = Math.max(1 / desiredSize, 1);
  camera.left = -desiredSize;
  camera.right = desiredSize;
  camera.top = desiredSize;
  camera.bottom = -desiredSize;
  camera.zoom = desiredZoom;
  camera.near = -100000;
  camera.far = 100000;
  camera.updateProjectionMatrix();
}

function createLatheMesh(latheCode: LatheCode, options: LatheRenderOptions = {}): THREE.Object3D {
  const profiles = latheCode.getProfiles();
  if (profiles.length > 1) return createCombinedLatheMesh(latheCode, options);
  const profile = profiles[0];
  if (!profile) throw new Error('Unable to build the profile');
  const vectors = segmentsToVectors(profile.segments);
  const latheGeometry = new THREE.LatheGeometry(vectors, 256, 0, getPartRevolutionRadians(options.partRevolutionDegrees));
  return new THREE.Mesh(latheGeometry, createMetalMaterial());
}

function createCombinedLatheMesh(latheCode: LatheCode, options: LatheRenderOptions = {}): THREE.Object3D {
  const outside = segmentsToVectors(latheCode.getOutsidePartProfileSegments());
  const inside = segmentsToVectors(latheCode.getInsidePartProfileSegments());
  if (outside.length < 2 || inside.length < 2) throw new Error('Unable to build combined inside/outside profile');

  const profile = removeConsecutiveVectorDuplicates([
    inside[0],
    outside[0],
    ...outside.slice(1),
    inside.at(-1)!,
    ...inside.slice(0, -1).reverse(),
    inside[0],
  ]);
  const latheGeometry = new THREE.LatheGeometry(profile, 256, 0, getPartRevolutionRadians(options.partRevolutionDegrees));
  return new THREE.Mesh(latheGeometry, createMetalMaterial());
}

function getPartRevolutionRadians(degrees = DEFAULT_APP_SETTINGS.partRevolutionDegrees): number {
  const clampedDegrees = Math.min(360, Math.max(1, degrees));
  return clampedDegrees >= 360 ? Math.PI * 2 : clampedDegrees * Math.PI / 180;
}

function createStockMesh(stock: Stock) {
  const geometry = new THREE.LatheGeometry(segmentsToVectors(stock.getSegments()), 256, 0);
  geometry.translate(0, -stock.length / 2, 0);
  const material = new THREE.MeshBasicMaterial({
    color: STOCK_MATERIAL_COLOR,
    transparent: true,
    opacity: STOCK_MATERIAL_OPACITY,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

function createOrientationMarkers(latheCode: LatheCode, stock: Stock, stockPosition: THREE.Vector3) {
  const group = new THREE.Group();
  const maxDimension = Math.max(stock.length, stock.diameter, 1);
  const markerSize = Math.min(Math.max(maxDimension * 0.08, 0.16), Math.max(stock.radius * 0.5, 0.2));
  const sideOffset = Math.max(maxDimension * 0.025, 0.08);
  const chuckY = stock.length / 2;
  const zZeroY = -stock.length / 2;
  const chuckColor = 0x555555;

  const chuck = createRevolvedSquare(stock.radius * 1.14, markerSize, chuckColor, 0.75);
  chuck.position.y = chuckY + sideOffset + markerSize / 2;
  group.add(chuck);

  group.add(createToolAtZero(latheCode.getTool(), zZeroY, markerSize));
  group.position.copy(stockPosition);

  return group;
}

function centerObject(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);
  object.position.sub(box.getCenter(new THREE.Vector3()));
  return object;
}

const PART_MATERIAL_COLOR = 0xe5e8ec;
const PART_MATERIAL_OPACITY = 0.68;
const STOCK_MATERIAL_COLOR = 0x7ed957;
const STOCK_MATERIAL_OPACITY = 0.22;

function createMetalMaterial() {
  return new THREE.MeshStandardMaterial({
    color: PART_MATERIAL_COLOR,
    roughness: 0.65,
    metalness: 0.25,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: PART_MATERIAL_OPACITY,
    depthWrite: false,
  });
}

function createRevolvedSquare(radius: number, sideLength: number, color: number, opacity: number) {
  const halfSide = sideLength / 2;
  const innerRadius = Math.max(0, radius - halfSide);
  const outerRadius = radius + halfSide;
  const profile = [
    new THREE.Vector2(innerRadius, -halfSide),
    new THREE.Vector2(outerRadius, -halfSide),
    new THREE.Vector2(outerRadius, halfSide),
    new THREE.Vector2(innerRadius, halfSide),
    new THREE.Vector2(innerRadius, -halfSide),
  ];
  const geometry = new THREE.LatheGeometry(profile, 72, 0);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return new THREE.Mesh(geometry, material);
}

function createToolAtZero(tool: Tool, zZeroY: number, markerSize: number) {
  const group = new THREE.Group();
  const insert = createToolInsert(tool, Math.max(markerSize * 0.28, 0.06));

  insert.object.position.x = 0;
  insert.object.position.z = 0;
  group.add(insert.object);
  group.position.set(0, zZeroY, 0);
  return group;
}

function createToolInsert(tool: Tool, depth: number) {
  const material = createMarkerMaterial(0xff0000, 0.95);
  const group = new THREE.Group();
  let radialHeight = tool.heightMm;
  let axialWidth = tool.widthMm;

  if (tool.type === 'RECT') {
    radialHeight = Math.max(tool.heightMm, 0.01);
    axialWidth = Math.max(tool.widthMm, 0.01);
    group.add(createExtrudedShape(createRoundedRectShape(radialHeight, axialWidth, tool.cornerRadiusMm), depth, material, 9));
  } else if (tool.type === 'ROUND') {
    const radius = Math.max(tool.cornerRadiusMm, 0.01);
    radialHeight = radius * 2;
    axialWidth = radius * 2;
    group.add(createExtrudedShape(createCircleShape(new THREE.Vector2(radius, -radius), radius), depth, material, 9));
  } else if (tool.type === 'ANG') {
    const geometry = createAngledToolShapes(tool);
    radialHeight = geometry.radialHeight;
    axialWidth = geometry.axialWidth;
    geometry.shapes.forEach(shape => group.add(createExtrudedShape(shape, depth, material, 9)));
  } else {
    throw new Error(`tool of type ${tool.type} not implemented`);
  }

  return { object: group, radialHeight, axialWidth, depth };
}

function createMarkerMaterial(color: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createExtrudedShape(shape: THREE.Shape, depth: number, material: THREE.Material, renderOrder: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = renderOrder;
  return mesh;
}

function createRoundedRectShape(radialHeight: number, axialWidth: number, cornerRadius: number) {
  const radius = Math.max(0, Math.min(cornerRadius, radialHeight / 2, axialWidth / 2));
  const shape = new THREE.Shape();

  shape.moveTo(radius, 0);
  shape.lineTo(radialHeight - radius, 0);
  shape.quadraticCurveTo(radialHeight, 0, radialHeight, -radius);
  shape.lineTo(radialHeight, -axialWidth + radius);
  shape.quadraticCurveTo(radialHeight, -axialWidth, radialHeight - radius, -axialWidth);
  shape.lineTo(radius, -axialWidth);
  shape.quadraticCurveTo(0, -axialWidth, 0, -axialWidth + radius);
  shape.lineTo(0, -radius);
  shape.quadraticCurveTo(0, 0, radius, 0);
  return shape;
}

function createCircleShape(center: THREE.Vector2, radius: number) {
  const shape = new THREE.Shape();
  shape.absarc(center.x, center.y, radius, 0, Math.PI * 2, false);
  return shape;
}

function createAngledToolShapes(tool: Tool) {
  const edgeLengthMm = tool.widthMm;
  const cornerRadiusMm = tool.cornerRadiusMm;
  const sizeMm = (cornerRadiusMm + edgeLengthMm) * 2;
  const center = new THREE.Vector2(sizeMm / 2, sizeMm / 2);
  const noseAngleDeg = tool.noseAngleDeg ?? 0;
  const rotation = tool.angleDeg ?? 0;
  const leftArmStart = polarToCartesian(cornerRadiusMm, 180 - noseAngleDeg / 2 + rotation).add(center);
  const leftArmEnd = polarToCartesian(edgeLengthMm, 270 - noseAngleDeg / 2 + rotation).add(leftArmStart);
  const rightArmStart = polarToCartesian(cornerRadiusMm, noseAngleDeg / 2 + rotation).add(center);
  const rightArmEnd = polarToCartesian(edgeLengthMm, 270 + noseAngleDeg / 2 + rotation).add(rightArmStart);
  const bounds = getBounds([
    new THREE.Vector2(center.x - cornerRadiusMm, center.y - cornerRadiusMm),
    new THREE.Vector2(center.x + cornerRadiusMm, center.y + cornerRadiusMm),
    leftArmStart,
    leftArmEnd,
    rightArmStart,
    rightArmEnd,
  ]);
  const mapPoint = (point: THREE.Vector2) => new THREE.Vector2(point.y - bounds.minY, -(point.x - bounds.minX));
  const shapes: THREE.Shape[] = [];
  if (cornerRadiusMm > 0) shapes.push(createCircleShape(mapPoint(center), cornerRadiusMm));
  shapes.push(createPolygonShape([leftArmStart, leftArmEnd, rightArmEnd, rightArmStart].map(mapPoint)));

  return {
    shapes,
    radialHeight: Math.max(bounds.maxY - bounds.minY, 0.01),
    axialWidth: Math.max(bounds.maxX - bounds.minX, 0.01),
  };
}

function createPolygonShape(points: THREE.Vector2[]) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => shape.lineTo(point.x, point.y));
  shape.closePath();
  return shape;
}

function getBounds(points: THREE.Vector2[]) {
  return {
    minX: Math.min(...points.map(point => point.x)),
    maxX: Math.max(...points.map(point => point.x)),
    minY: Math.min(...points.map(point => point.y)),
    maxY: Math.max(...points.map(point => point.y)),
  };
}

function polarToCartesian(radius: number, angleInDegrees: number) {
  const angle = angleInDegrees * Math.PI / 180;
  return new THREE.Vector2(radius * Math.cos(angle), -radius * Math.sin(angle));
}

function segmentsToVectors(segments: Segment[]): THREE.Vector2[] {
  return removeConsecutiveVectorDuplicates(approximateSegments(segments, 0.1).map(point => new THREE.Vector2(point.x, point.z)));
}

function removeConsecutiveVectorDuplicates(points: THREE.Vector2[]): THREE.Vector2[] {
  const result: THREE.Vector2[] = [];
  for (const point of points) {
    if (!result.length || !result.at(-1)!.equals(point)) result.push(point);
  }
  return result;
}

export function resetRotation(object: THREE.Object3D) {
  object.rotation.set(-Math.PI / 2, 0, 0);
  for (let child of object.children) {
    resetRotation(child);
  }
  object.updateMatrix();
  object.updateMatrixWorld(true);
  return object;
}
