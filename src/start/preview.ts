import * as THREE from 'three';
import { LatheCode } from '../common/lathecode.ts';
import { loadAppSettings } from '../common/settings.ts';
import {
  addLatheLights,
  createLatheRenderObjects,
} from '../scene.ts';

const PREVIEW_WIDTH = 216;
const PREVIEW_HEIGHT = 216;
const MAX_PREVIEW_DEVICE_PIXEL_RATIO = 2;
const PREVIEW_RENDER_DELAY_MS = 80;
const PREVIEW_FIT_PADDING = 1.08;

let sharedRenderer: THREE.WebGLRenderer | null = null;
let queueRunning = false;
const previewCache = new Map<string, HTMLCanvasElement | 'unavailable'>();
const previewQueue: PreviewJob[] = [];
const previewSubscribers = new Map<string, Set<HTMLDivElement>>();

type PreviewJob = {
  cacheKey: string,
  text: string,
  partRevolutionDegrees: number,
};

export function preloadLatheCodePreviews(texts: readonly string[]) {
  if (!canRenderPreview()) return;
  const settings = loadAppSettings();
  texts.forEach(text => enqueuePreview(text, settings.partRevolutionDegrees));
}

export function createLatheCodePreview(text: string): HTMLDivElement {
  const preview = document.createElement('div');
  preview.className = 'samplePreview';
  preview.setAttribute('aria-hidden', 'true');

  try {
    new LatheCode(text);
  } catch {
    preview.appendChild(createPreviewFallback('Preview unavailable'));
    return preview;
  }

  if (!canRenderPreview()) {
    preview.appendChild(createPreviewUnavailable());
    return preview;
  }

  const partRevolutionDegrees = loadAppSettings().partRevolutionDegrees;
  const cacheKey = getPreviewCacheKey(text, partRevolutionDegrees);
  const cachedPreview = previewCache.get(cacheKey);
  if (cachedPreview instanceof HTMLCanvasElement) {
    preview.appendChild(cloneCanvas(cachedPreview));
  } else if (cachedPreview === 'unavailable') {
    preview.appendChild(createPreviewUnavailable());
  } else {
    preview.appendChild(createPreviewFallback('Preview loading'));
    subscribePreview(cacheKey, preview);
    enqueuePreview(text, partRevolutionDegrees);
  }

  return preview;
}

function enqueuePreview(text: string, partRevolutionDegrees: number) {
  const cacheKey = getPreviewCacheKey(text, partRevolutionDegrees);
  if (previewCache.has(cacheKey) || previewQueue.some(job => job.cacheKey === cacheKey)) return;
  previewQueue.push({cacheKey, text, partRevolutionDegrees});
  schedulePreviewQueue();
}

function schedulePreviewQueue() {
  if (queueRunning) return;
  queueRunning = true;
  window.setTimeout(processNextPreview, PREVIEW_RENDER_DELAY_MS);
}

function processNextPreview() {
  const job = previewQueue.shift();
  if (!job) {
    queueRunning = false;
    return;
  }

  previewCache.set(job.cacheKey, renderPreviewJob(job));
  publishPreview(job.cacheKey);
  window.setTimeout(processNextPreview, PREVIEW_RENDER_DELAY_MS);
}

function renderPreviewJob(job: PreviewJob): HTMLCanvasElement | 'unavailable' {
  try {
    return renderLatheCodePreview(new LatheCode(job.text), job.partRevolutionDegrees);
  } catch {
    return 'unavailable';
  }
}

function renderLatheCodePreview(latheCode: LatheCode, partRevolutionDegrees: number): HTMLCanvasElement {
  const renderer = getSharedRenderer();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PREVIEW_DEVICE_PIXEL_RATIO);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(PREVIEW_WIDTH, PREVIEW_HEIGHT, false);
  renderer.setClearColor(0xffffff, 0);

  const scene = new THREE.Scene();
  addLatheLights(scene);

  const renderObjects = createLatheRenderObjects(latheCode, {
    partRevolutionDegrees,
  });
  const group = new THREE.Group();
  group.add(renderObjects.latheMesh);
  applySamplePreviewRotation(group);
  scene.add(group);

  const camera = new THREE.OrthographicCamera(-7, 7, -7, 7, 0, 1000);
  fitPreviewCamera(camera, [group], PREVIEW_WIDTH / PREVIEW_HEIGHT);
  renderer.render(scene, camera);

  const canvas = document.createElement('canvas');
  canvas.className = 'samplePreviewCanvas';
  canvas.width = renderer.domElement.width;
  canvas.height = renderer.domElement.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D preview canvas unavailable');
  context.drawImage(renderer.domElement, 0, 0);

  disposeObject(group);
  disposeObject(renderObjects.stockMesh);
  return canvas;
}

function getPreviewCacheKey(text: string, partRevolutionDegrees: number): string {
  return `${partRevolutionDegrees}\n${text}`;
}

function subscribePreview(cacheKey: string, preview: HTMLDivElement) {
  const subscribers = previewSubscribers.get(cacheKey) ?? new Set<HTMLDivElement>();
  subscribers.add(preview);
  previewSubscribers.set(cacheKey, subscribers);
}

function publishPreview(cacheKey: string) {
  const subscribers = previewSubscribers.get(cacheKey);
  if (!subscribers) return;
  const cachedPreview = previewCache.get(cacheKey);
  subscribers.forEach(preview => {
    preview.replaceChildren(cachedPreview instanceof HTMLCanvasElement
      ? cloneCanvas(cachedPreview)
      : createPreviewUnavailable());
  });
  previewSubscribers.delete(cacheKey);
}

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = source.className;
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D preview canvas unavailable');
  context.drawImage(source, 0, 0);
  return canvas;
}

function applySamplePreviewRotation(object: THREE.Object3D) {
  object.rotation.set(-0.72, Math.PI + 0.35, 2.2);
}

function fitPreviewCamera(camera: THREE.OrthographicCamera, objects: THREE.Object3D[], aspect: number) {
  const box = new THREE.Box3();
  objects.forEach(object => box.union(new THREE.Box3().setFromObject(object)));
  if (box.isEmpty()) return;

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const halfHeight = Math.max(size.y, size.x / aspect, 0.001) * PREVIEW_FIT_PADDING / 2;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.position.set(center.x, center.y, box.max.z + Math.max(size.z, 1));
  camera.near = -100000;
  camera.far = 100000;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
}

function getSharedRenderer(): THREE.WebGLRenderer {
  if (!canRenderPreview()) {
    throw new Error('WebGL preview unavailable');
  }
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
  }
  return sharedRenderer;
}

function canRenderPreview(): boolean {
  return typeof WebGLRenderingContext !== 'undefined' || typeof WebGL2RenderingContext !== 'undefined';
}

function createPreviewFallback(message: string): HTMLDivElement {
  const fallback = document.createElement('div');
  fallback.className = 'samplePreviewFallback';
  fallback.textContent = message;
  return fallback;
}

function createPreviewUnavailable(): HTMLDivElement {
  const fallback = document.createElement('div');
  fallback.className = 'samplePreviewUnavailable';
  fallback.textContent = '3D preview unavailable';
  return fallback;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach(entry => entry.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}
