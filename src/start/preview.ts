import * as THREE from 'three';
import { LatheCode } from '../common/lathecode.ts';
import { loadAppSettings } from '../common/settings.ts';
import {
  addLatheLights,
  createLatheRenderObjects,
} from '../scene.ts';

const DEFAULT_PREVIEW_WIDTH = 216;
const DEFAULT_PREVIEW_HEIGHT = 216;
const MAX_PREVIEW_DEVICE_PIXEL_RATIO = 2;
const PREVIEW_RENDER_DELAY_MS = 80;
const PREVIEW_FIT_PADDING = 1.28;
const SAMPLE_PREVIEW_ROTATION_X = -0.72;
const SAMPLE_PREVIEW_ROTATION_Y = Math.PI + 0.35;
const SAMPLE_PREVIEW_ROTATION_Z = 2.2;
const AUTO_PREVIEW_ROTATION_DURATION_MS = 3000;
const AUTO_PREVIEW_ROTATION_RADIANS_PER_MS = 0.006 / (1000 / 60);
const AUTO_PREVIEW_ROTATION_TOTAL_RADIANS =
  AUTO_PREVIEW_ROTATION_DURATION_MS * AUTO_PREVIEW_ROTATION_RADIANS_PER_MS;

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
  width: number,
  height: number,
  sequence: number,
};

type LatheCodePreviewOptions = {
  width?: number,
  height?: number,
};

export type AutoRotatingLatheCodePreview = {
  setText: (text: string) => void,
  resize: (width: number, height: number) => void,
  dispose: () => void,
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

export function createLatheCodePreview(text: string, options: LatheCodePreviewOptions = {}): HTMLDivElement {
  const preview = document.createElement('div');
  preview.className = 'samplePreview';
  preview.setAttribute('aria-hidden', 'true');
  const width = sanitizePreviewDimension(options.width, DEFAULT_PREVIEW_WIDTH);
  const height = sanitizePreviewDimension(options.height, DEFAULT_PREVIEW_HEIGHT);

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
  const cacheKey = getPreviewCacheKey(text, partRevolutionDegrees, width, height);
  const cachedPreview = previewCache.get(cacheKey);
  if (cachedPreview instanceof HTMLCanvasElement) {
    preview.appendChild(cloneCanvas(cachedPreview));
  } else if (cachedPreview === 'unavailable') {
    preview.appendChild(createPreviewUnavailable());
  } else {
    preview.appendChild(createPreviewFallback('Preview loading'));
    if (isPreviewSessionActive()) {
      subscribePreview(cacheKey, preview);
      enqueuePreview(text, partRevolutionDegrees, width, height);
    }
  }

  return preview;
}

export function createAutoRotatingLatheCodePreview(container: HTMLElement): AutoRotatingLatheCodePreview {
  if (!canRenderPreview()) {
    container.replaceChildren(createPreviewUnavailable());
    return createUnavailableAutoPreview();
  }

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
  } catch {
    container.replaceChildren(createPreviewUnavailable());
    return createUnavailableAutoPreview();
  }

  const scene = new THREE.Scene();
  addLatheLights(scene);

  const camera = new THREE.OrthographicCamera(-7, 7, -7, 7, 0, 1000);
  const canvas = renderer.domElement;
  canvas.className = 'profileDrawingPreview3dCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.replaceChildren(canvas);
  renderer.setClearColor(0xffffff, 0);

  let model: THREE.Group | null = null;
  let lastText = '';
  let width = DEFAULT_PREVIEW_WIDTH;
  let height = DEFAULT_PREVIEW_HEIGHT;
  let animationFrame: number | null = null;
  let currentRotationY = SAMPLE_PREVIEW_ROTATION_Y;
  let rotationStartY = currentRotationY;
  let rotationStartedAtMs = 0;
  let disposed = false;

  const render = () => {
    if (model) renderer.render(scene, camera);
  };

  const fit = () => {
    if (!model) return;
    fitPreviewCamera(camera, [model], width / height);
  };

  const animate = (timestampMs: number) => {
    animationFrame = null;
    if (disposed) return;
    if (!model) return;

    const elapsedMs = Math.max(0, timestampMs - rotationStartedAtMs);
    const progress = Math.min(1, elapsedMs / AUTO_PREVIEW_ROTATION_DURATION_MS);
    currentRotationY = rotationStartY + AUTO_PREVIEW_ROTATION_TOTAL_RADIANS * easeInOutCubic(progress);
    model.rotation.y = currentRotationY;
    renderer.render(scene, camera);

    if (progress < 1) {
      animationFrame = window.requestAnimationFrame(animate);
    }
  };

  const startRotation = () => {
    if (disposed || !model) return;
    rotationStartY = currentRotationY;
    rotationStartedAtMs = getAnimationNow();
    if (animationFrame === null) animationFrame = window.requestAnimationFrame(animate);
  };

  const preview: AutoRotatingLatheCodePreview = {
    setText(text: string) {
      if (disposed || text === lastText) return;
      lastText = text;
      let nextModel: THREE.Group;
      let unusedStockMesh: THREE.Object3D | null = null;
      try {
        const renderObjects = createLatheRenderObjects(new LatheCode(text), {
          partRevolutionDegrees: loadAppSettings().partRevolutionDegrees,
        });
        unusedStockMesh = renderObjects.stockMesh;
        nextModel = new THREE.Group();
        nextModel.add(renderObjects.latheMesh);
        applySamplePreviewRotation(nextModel);
        nextModel.rotation.y = currentRotationY;
      } catch {
        return;
      } finally {
        if (unusedStockMesh) disposeObject(unusedStockMesh);
      }

      if (model) {
        scene.remove(model);
        disposeObject(model);
      }
      model = nextModel;
      scene.add(model);
      fit();
      render();
      startRotation();
    },
    resize(nextWidth: number, nextHeight: number) {
      if (disposed) return;
      width = sanitizePreviewDimension(nextWidth, DEFAULT_PREVIEW_WIDTH);
      height = sanitizePreviewDimension(nextHeight, DEFAULT_PREVIEW_HEIGHT);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PREVIEW_DEVICE_PIXEL_RATIO));
      renderer.setSize(width, height, false);
      fit();
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      if (model) {
        scene.remove(model);
        disposeObject(model);
        model = null;
      }
      renderer.dispose();
      canvas.remove();
    },
  };

  preview.resize(width, height);
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

function createUnavailableAutoPreview(): AutoRotatingLatheCodePreview {
  return {
    setText() {},
    resize() {},
    dispose() {},
  };
}

function enqueuePreview(text: string, partRevolutionDegrees: number, width: number, height: number) {
  if (!isPreviewSessionActive()) return;
  const cacheKey = getPreviewCacheKey(text, partRevolutionDegrees, width, height);
  if (previewCache.has(cacheKey) || previewQueue.some(job => job.cacheKey === cacheKey)) return;
  previewQueue.push({cacheKey, text, partRevolutionDegrees, width, height, sequence: nextPreviewJobSequence++});
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
    return renderLatheCodePreview(new LatheCode(job.text), job.partRevolutionDegrees, job.width, job.height);
  } catch {
    return 'unavailable';
  }
}

function renderLatheCodePreview(
  latheCode: LatheCode,
  partRevolutionDegrees: number,
  width: number,
  height: number,
): HTMLCanvasElement {
  const renderer = getSharedRenderer();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PREVIEW_DEVICE_PIXEL_RATIO);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
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
  fitPreviewCamera(camera, [group], width / height);
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

function getPreviewCacheKey(text: string, partRevolutionDegrees: number, width: number, height: number): string {
  return `${partRevolutionDegrees}:${width}x${height}\n${text}`;
}

function sanitizePreviewDimension(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.round(value);
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
  object.rotation.set(SAMPLE_PREVIEW_ROTATION_X, SAMPLE_PREVIEW_ROTATION_Y, SAMPLE_PREVIEW_ROTATION_Z);
}

function getAnimationNow(): number {
  return window.performance?.now?.() ?? Date.now();
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - ((-2 * progress + 2) ** 3) / 2;
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
