import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Optional environment art is loaded only when a local manifest names it.
// A failed download leaves the procedural world fully playable.
export class EnvironmentAssetRegistry {
  constructor(entries = {}) {
    this.entries = entries;
    this.cache = new Map();
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.progress = new Map();
  }

  static async fromManifest(path = './assets/models/environment/manifest.json') {
    try {
      const response = await fetch(path);
      if (!response.ok) return new EnvironmentAssetRegistry();
      return new EnvironmentAssetRegistry(await response.json());
    } catch {
      return new EnvironmentAssetRegistry();
    }
  }

  async load(key) {
    const path = this.entries[key];
    if (!path) return null;
    if (!this.cache.has(key)) {
      this.cache.set(key, new Promise((resolve) => {
        this.loader.load(path, (gltf) => {
          this.progress.set(key, 1);
          resolve(gltf.scene);
        }, (event) => {
          if (event.total) this.progress.set(key, event.loaded / event.total);
        }, () => resolve(null));
      }));
    }
    return this.cache.get(key);
  }

  async create(key, fallback) {
    const source = await this.load(key);
    if (!source) return fallback();
    const model = source.clone(true);
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = object.receiveShadow = true;
      object.userData.sharedResource = true;
    });
    return model;
  }

  dispose() {
    for (const promise of this.cache.values()) promise.then((source) => {
      if (!source) return;
      const geometries = new Set(), materials = new Set();
      source.traverse((object) => {
        if (!object.isMesh) return;
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    });
    this.cache.clear();
  }
}
