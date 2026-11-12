import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
  }

  load(path) {
    if (!this.cache.has(path)) this.cache.set(path, this.loader.loadAsync(path));
    return this.cache.get(path);
  }

  async applyToCharacter(character, path) {
    try {
      const gltf = await this.load(path);
      if (!character.group.parent) return false;
      const model = cloneSkeleton(gltf.scene);
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = object.receiveShadow = true;
        object.userData.sharedResource = true; // Cache owns GLTF geometry/material resources.
      });
      const initialBox = new THREE.Box3().setFromObject(model);
      const height = Math.max(0.001, initialBox.max.y - initialBox.min.y);
      model.scale.setScalar(2.9 / height);
      model.updateMatrixWorld(true);
      const scaledBox = new THREE.Box3().setFromObject(model);
      model.position.y -= scaledBox.min.y;
      model.rotation.y = Math.PI;
      character.setExternalModel(model, gltf.animations);
      return true;
    } catch {
      return false; // Missing/invalid assets intentionally retain geometric fallback.
    }
  }
}
