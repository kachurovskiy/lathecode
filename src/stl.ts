import { resetRotation } from './scene.ts';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'

export function createDownloadLink(mesh: THREE.Object3D, name: string) {
  const exporter = new STLExporter();
  const stlData = exporter.parse(resetRotation(mesh.clone()), { binary: true });
  const blob = new Blob([stlData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getFileName(name || `lathecode_${Date.now()}`);
  return link;
};

export function getFileName(filename: string) {
  const sanitizedFilename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  return sanitizedFilename.toLowerCase().endsWith('.stl') ? sanitizedFilename : sanitizedFilename + '.stl';
}
