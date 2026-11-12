import * as THREE from 'three';
import { Character } from './Character.js';

export class Monster extends Character {
  constructor(scene, position, color = 0x637e9c) {
    super(scene, { color, accent: 0xffb16c, name: 'Wildling', position, enemy: true });
    this.fallbackObjects.forEach((object) => { object.visible = false; });
    const coat = new THREE.MeshToonMaterial({ color });
    const eye = new THREE.MeshToonMaterial({ color: 0xffe0a0, emissive: 0xff9a45, emissiveIntensity: 0.8 });
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), coat);
    body.position.y = 1.2; body.scale.set(1, 0.8, 1.2); this.group.add(body);
    for (const x of [-0.55, 0.55]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 6), coat);
      horn.position.set(x, 2.15, 0.1); this.group.add(horn);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), eye);
      pupil.position.set(x * 0.48, 1.33, 0.98); this.group.add(pupil);
    }
    this.group.traverse((object) => { if (object.isMesh) { object.castShadow = true; object.userData.owner = this; } });
    this.maxHealth = this.health = 42;
    this.attackPower = 7;
    this.speed = 3.6;
    this.aggro = false;
  }
}
