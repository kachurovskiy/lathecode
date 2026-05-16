import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { stlToLatheCodes } from './stlimport';

describe('stlToLatheCodes', () => {
  it('preserves a pipe as stock with an internal through-hole', () => {
    const latheCodes = stlToLatheCodes(exportLatheProfile([
      new THREE.Vector2(1, 0),
      new THREE.Vector2(3, 0),
      new THREE.Vector2(3, 10),
      new THREE.Vector2(1, 10),
      new THREE.Vector2(1, 0),
    ]), 100, () => {});

    expect(latheCodes[0].getText()).toBe('STOCK D6.000 ID2.000\nL10.000 R3.000');
  });

  it('preserves a vase-like open cavity as an inside profile', () => {
    const latheCodes = stlToLatheCodes(exportLatheProfile([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(3, 0),
      new THREE.Vector2(3, 10),
      new THREE.Vector2(2, 10),
      new THREE.Vector2(2, 2),
      new THREE.Vector2(0, 2),
      new THREE.Vector2(0, 0),
    ]), 100, () => {});

    const text = latheCodes[0].getText();
    expect(text).toContain('STOCK D6.000');
    expect(text).toContain('L10.000 R3.000');
    expect(text).toContain('INSIDE');
    expect(text).toContain('L8.000 R2.000');
  });
});

function exportLatheProfile(points: THREE.Vector2[]): ArrayBuffer {
  const geometry = new THREE.LatheGeometry(points, 64, 0);
  const mesh = new THREE.Mesh(geometry);
  const stl = new STLExporter().parse(mesh, {binary: true}) as string | ArrayBuffer | DataView;
  if (stl instanceof DataView) return stl.buffer.slice(stl.byteOffset, stl.byteOffset + stl.byteLength);
  if (stl instanceof ArrayBuffer) return stl;
  return new TextEncoder().encode(stl).buffer;
}
