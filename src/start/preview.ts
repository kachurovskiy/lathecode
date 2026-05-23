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
let queueTimer: number | null = null;
let nextPreviewJobSequence = 0;
let activePreviewSessions = 0;
const previewCache = new Map<string, HTMLCanvasElement | 'unavailable'>();
const previewQueue: PreviewJob[] = [];
const previewSubscribers = new Map<string, Set<HTMLDivElement>>();

type PreviewJob = {
  cacheKey: string,
  text: string,
  partRevolutionDegrees: number,
  sequence: number,
};

export function beginLatheCodePreviewSession(): () => void {
  activePreviewSessions++;
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    activePreviewSessions = Math.max(0, activePreviewSessions - 1);
    if (!activePreviewSessions) cancelPendingPreviewJobs();
  };
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
    if (isPreviewSessionActive()) {
      subscribePreview(cacheKey, preview);
      enqueuePreview(text, partRevolutionDegrees);
    }
  }

  return preview;
}

export function prioritizeVisibleLatheCodePreviews() {
  if (!isPreviewSessionActive()) return;
  if (!previewQueue.length) return;
  const priorities = new Map<string, number>();
  for (const job of previewQueue) {
    priorities.set(job.cacheKey, getPreviewJobPriority(job.cacheKey));
  }
  previewQueue.sort((a, b) =>
    (priorities.get(b.cacheKey) ?? 0) - (priorities.get(a.cacheKey) ?? 0)
    || a.sequence - b.sequence);
  if ((priorities.get(previewQueue[0].cacheKey) ?? 0) > 0) acceleratePreviewQueue();
}

function enqueuePreview(text: string, partRevolutionDegrees: number) {
  if (!isPreviewSessionActive()) return;
  const cacheKey = getPreviewCacheKey(text, partRevolutionDegrees);
  if (previewCache.has(cacheKey) || previewQueue.some(job => job.cacheKey === cacheKey)) return;
  previewQueue.push({cacheKey, text, partRevolutionDegrees, sequence: nextPreviewJobSequence++});
  schedulePreviewQueue();
}

function schedulePreviewQueue() {
  if (!isPreviewSessionActive()) return;
  if (queueTimer !== null) return;
  queueTimer = window.setTimeout(processNextPreview, getPreviewQueueDelayMs());
}

function acceleratePreviewQueue() {
  if (!isPreviewSessionActive()) return;
  if (!previewQueue.length) return;
  if (queueTimer !== null) window.clearTimeout(queueTimer);
  queueTimer = window.setTimeout(processNextPreview, 0);
}

function processNextPreview() {
  queueTimer = null;
  if (!isPreviewSessionActive()) return;
  prioritizeVisibleLatheCodePreviews();
  const job = previewQueue.shift();
  if (!job) return;

  previewCache.set(job.cacheKey, renderPreviewJob(job));
  publishPreview(job.cacheKey);
  if (previewQueue.length) schedulePreviewQueue();
}

function isPreviewSessionActive(): boolean {
  return activePreviewSessions > 0;
}

function cancelPendingPreviewJobs() {
  if (queueTimer !== null) {
    window.clearTimeout(queueTimer);
    queueTimer = null;
  }
  previewQueue.length = 0;
  previewSubscribers.clear();
}

function getPreviewQueueDelayMs() {
  return previewSubscribers.size > 0 ? 0 : PREVIEW_RENDER_DELAY_MS;
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
  prioritizeVisibleLatheCodePreviews();
  acceleratePreviewQueue();
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

function getPreviewJobPriority(cacheKey: string): number {
  const subscribers = previewSubscribers.get(cacheKey);
  if (!subscribers) return 0;

  let hasVisibleSubscriber = false;
  for (const preview of Array.from(subscribers)) {
    if (!preview.isConnected) continue;
    if (!isElementVisible(preview)) continue;
    hasVisibleSubscriber = true;
    if (isElementInViewport(preview)) return 2;
  }

  return hasVisibleSubscriber ? 1 : 0;
}

function isElementVisible(element: HTMLElement): boolean {
  if (element.closest('[hidden]')) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom > 0
    && rect.right > 0
    && rect.top < viewportHeight
    && rect.left < viewportWidth;
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
