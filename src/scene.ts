import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LatheCode, Segment } from './lathecode';

export class Scene extends THREE.Scene {
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
  private controls: OrbitControls;
  private latheCode: LatheCode | null = null;
  private latheMesh: THREE.Object3D | null = null;
  private stock: THREE.Object3D | null = null;

  constructor(container: HTMLElement) {
    super();

    this.background = new THREE.Color(0xffffff);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    this.addLight();
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-7, 7, -7, 7, 0, 1000);
    this.camera.position.z = 5;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.autoRotate = true;
    this.animate();
  }

  getLatheMesh(): THREE.Object3D | null {
    return this.latheMesh;
  }

  private fit(mesh: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDimension = Math.max(size.x, size.y, size.z);
    const desiredSize = maxDimension * 0.7;
    const desiredZoom = Math.max(1 / desiredSize, 1);
    this.camera.left = -desiredSize;
    this.camera.right = desiredSize;
    this.camera.top = desiredSize;
    this.camera.bottom = -desiredSize;
    this.camera.zoom = desiredZoom;
    this.camera.near = -100000;
    this.camera.far = 100000;
    this.camera.updateProjectionMatrix();
  }

  private addLight() {
    let light;
    light = new THREE.DirectionalLight(0xffffff, 1);
    light.castShadow = true;
    light.position.set(0, 1, 0);
    this.add(light);
    light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.castShadow = true;
    light.position.set(1, 0, 0);
    this.add(light);
    light = new THREE.DirectionalLight(0xffffff, 0.6);
    light.castShadow = true;
    light.position.set(0, 0, 1);
    this.add(light);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this, this.camera);
  }

  setLatheCode(value: LatheCode | null) {
    if (this.latheCode) {
      this.setLatheMesh(null);
      this.setStock(null);
    }
    this.latheCode = value;
    if (this.latheCode) {
      this.setLatheMesh(this.centerObject(this.rotateObject(this.createLatheMesh())) as THREE.Mesh);
      const stock = this.createStock();
      if (stock) this.setStock(this.centerObject(this.rotateObject(stock)));

      if (this.stock) this.fit(this.stock);
      else if (this.latheMesh) this.fit(this.latheMesh);
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

  private centerObject(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);
    object.position.sub(box.getCenter(new THREE.Vector3()));
    return object;
  }

  private rotateObject(object: THREE.Object3D) {
    object.rotation.z = 8.5;
    object.rotation.y = -1;
    return object;
  }

  private createLatheMesh(): THREE.Object3D {
    const insideSegments = this.latheCode?.getOutsideSegments() || [];
    const outsideSegments = this.latheCode?.getInsideSegments() || [];
    if (insideSegments.length && outsideSegments.length) {
      throw new Error('editor does not support both inside and outside profiles at the same time yet');
    }
    const segments = insideSegments.length ? insideSegments : outsideSegments;
    if (!segments?.length) throw new Error('Unable to build the profile');
    const vectors = segments.map(s => getApproxPoints(s)).flat();
    const latheGeometry = new THREE.LatheGeometry(vectors, 256, 0);
    return new THREE.Mesh(latheGeometry, createMetalMaterial());
  }

  private createStock() {
    const stock = this.latheCode!.getStock();
    if (!stock) return null;
    const geometry = new THREE.CylinderGeometry(stock.diameter / 2, stock.diameter / 2, stock.length, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 });
    return new THREE.Mesh(geometry, material);
  }
}

function createMetalMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0.8,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 0.8,
  });
}

function getApproxPoints(s: Segment): THREE.Vector2[] {
  if (s.type === 'line') return [new THREE.Vector2(s.start.x, s.start.z), new THREE.Vector2(s.end.x, s.end.z)];
  throw new Error(`Approximation of segment of type ${s.type} is not implemented`);
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
