import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LatheCode } from './common/lathecode';
import { createLatheRenderObjects } from './scene';

describe('3D scene rendering', () => {
  it('uses a full part revolution by default', () => {
    const geometry = getLatheGeometry(createLatheRenderObjects(new LatheCode('STOCK D10\nL4 R3')).latheMesh);

    expect(geometry.parameters.phiLength).toBeCloseTo(Math.PI * 2);
  });

  it('uses configured part revolution degrees', () => {
    const geometry = getLatheGeometry(createLatheRenderObjects(
      new LatheCode('STOCK D10\nL4 R3'),
      {partRevolutionDegrees: 270},
    ).latheMesh);

    expect(geometry.parameters.phiLength).toBeCloseTo(Math.PI * 1.5);
  });
});

function getLatheGeometry(object: THREE.Object3D): THREE.LatheGeometry {
  return (object as THREE.Mesh<THREE.LatheGeometry>).geometry;
}
