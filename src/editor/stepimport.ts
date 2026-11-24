import * as THREE from 'three';
import createOcct, { type OcctImporter } from 'occt-import-js';
import wasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings, type AppSettings } from '../common/settings';
import { meshToLatheCodes } from './stlimport';

let importerPromise: Promise<OcctImporter> | undefined;

function loadImporter(): Promise<OcctImporter> {
  if (!importerPromise) {
    importerPromise = (async () => {
      const response = await fetch(wasmUrl);
      if (!response.ok) throw new Error('Unable to load the STEP importer. Please reload and try again.');
      return createOcct({wasmBinary: new Uint8Array(await response.arrayBuffer())});
    })().catch(error => {
      importerPromise = undefined;
      throw error;
    });
  }
  return importerPromise;
}

export async function stepToLatheCodes(
  step: ArrayBuffer,
  pxPerMm: number,
  callback: (progressMessage: string) => void,
  settings: Partial<AppSettings> = DEFAULT_APP_SETTINGS,
) {
  const normalizedSettings = normalizeAppSettings({...settings, pxPerMm});
  callback('Loading STEP importer...');
  const importer = await loadImporter();
  callback('Reading STEP geometry...');
  const result = importer.ReadStepFile(new Uint8Array(step), {
    linearUnit: 'millimeter',
    linearDeflectionType: 'absolute_value',
    // Keep tessellation within one profile pixel, capped at 0.01 mm.
    linearDeflection: Math.min(0.01, 1 / normalizedSettings.pxPerMm),
    angularDeflection: 0.1,
  });
  if (!result.success) throw new Error('Unable to read STEP file. Export a STEP solid and try again.');
  if (!result.meshes?.length) throw new Error('No mesh geometry found in STEP file.');
  if (result.meshes.length !== 1) {
    throw new Error('STEP file contains multiple bodies. Export a single lathe part and try again.');
  }

  const mesh = result.meshes[0];
  const positions = mesh.attributes.position.array;
  const indices = mesh.index.array;
  if (!positions.length || positions.length % 3 !== 0 || !positions.every(Number.isFinite)
    || !indices.length || indices.length % 3 !== 0
    || !indices.every(index => Number.isInteger(index) && index >= 0 && index < positions.length / 3)) {
    throw new Error('STEP file contains invalid or empty mesh geometry.');
  }
  const geometry = new THREE.BufferGeometry();
  // These coordinates are used only for CPU-side centering and slicing.
  // Keep CAD precision so distance from the origin cannot round away detail.
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float64Array(positions), 3));
  geometry.setIndex(indices);
  return meshToLatheCodes(geometry, normalizedSettings.pxPerMm, callback, normalizedSettings);
}
