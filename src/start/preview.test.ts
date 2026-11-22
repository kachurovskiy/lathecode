import * as THREE from 'three';
import {describe, expect, it} from 'vitest';
import {LatheCode} from '../common/lathecode';
import {createLathePreviewModel} from './preview';

describe('profile preview orientation', () => {
  it.each([
    [
      'asymmetric shaft',
      'STOCK D30\nL10 D8\nL30 D24',
      'STOCK D30\nL30 D24\nL10 D8',
    ],
    [
      'tube with a blind bore',
      'STOCK D30 ID4\nL40 D24\nINSIDE\nL10 D8',
      'STOCK D30 ID4\nL40 D24\nINSIDE\nL30 D4\nL10 D8',
    ],
  ])('renders an imported %s in editor orientation', (_name, source, editorOrder) => {
    const imported = createLathePreviewModel(new LatheCode(source), 270, true);
    const fresh = createLathePreviewModel(new LatheCode(editorOrder), 270);
    expect(worldVertices(imported)).toEqual(worldVertices(fresh));
    expect(worldVertices(imported)).not.toEqual(worldVertices(createLathePreviewModel(new LatheCode(source), 270)));
  });

  it('keeps a blind bore aligned with the part when a trailing cutoff is mirrored', () => {
    const source = new LatheCode('STOCK D30 ID4\nL40 D24\nL2\nINSIDE\nL10 D8');
    const model = createLathePreviewModel(source, 270, true);
    model.updateMatrixWorld(true);
    const mesh = model.children[0] as THREE.Mesh<THREE.LatheGeometry>;
    const inverseViewRotation = model.quaternion.clone().invert();
    const profile = mesh.geometry.parameters.points.map(point => {
      const position = new THREE.Vector3(point.x, point.y, 0)
        .applyMatrix4(mesh.matrixWorld).applyQuaternion(inverseViewRotation);
      return [position.x, position.y + source.getStock()!.length / 2].map(value => Math.round(value * 1e6) / 1e6);
    });
    expect(new Set(profile.map(point => JSON.stringify(point)))).toEqual(new Set([
      [12, 2], [12, 42], // The cutoff occupies Z0-2; the part occupies Z2-42.
      [2, 2], [2, 32], // Existing stock bore before the blind bore.
      [4, 32], [4, 42], // The ten-millimetre blind bore opens at the right end.
    ].map(point => JSON.stringify(point))));
  });
});

function worldVertices(model: THREE.Object3D): string[] {
  const vertices = new Set<string>();
  const point = new THREE.Vector3();
  model.updateMatrixWorld(true);
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
      vertices.add(JSON.stringify(point.toArray().map(value => Math.round(value * 1e4))));
    }
  });
  return [...vertices].sort();
}
