import * as THREE from 'three';
import { animate } from 'animejs';

export class Effects {
  constructor(scene, camera, uiRoot, audioManager = null) {
    this.scene = scene;
    this.camera = camera;
    this.uiRoot = uiRoot;
    this.items = [];
    this.audioManager = audioManager;
    this.particleScale = 0.75;
  }

  sound(type = 'hit') {
    if (this.audioManager) { this.audioManager.playSfx(type); return; }
    try {
      this.audio ||= new AudioContext();
      if (this.audio.state === 'suspended') this.audio.resume();
      const osc = this.audio.createOscillator();
      const gain = this.audio.createGain();
      osc.type = type === 'skill' ? 'sine' : type === 'block' ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(type === 'skill' ? 260 : type === 'block' ? 110 : 85, this.audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(type === 'skill' ? 540 : 42, this.audio.currentTime + 0.12);
      gain.gain.setValueAtTime(0.055, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.14);
      osc.connect(gain).connect(this.audio.destination);
      osc.start(); osc.stop(this.audio.currentTime + 0.15);
    } catch { /* audio is optional */ }
  }

  add(mesh, life, update) {
    if (this.items.length >= Math.round(180 * this.particleScale)) {
      const oldest = this.items.shift();
      if (oldest) this.disposeItem(oldest);
    }
    this.scene.add(mesh);
    this.items.push({ mesh, life, maxLife: life, update });
    return mesh;
  }

  disposeItem(item) {
    this.scene.remove(item.mesh);
    const geometries = new Set();
    const materials = new Set();
    item.mesh.traverse((child) => {
      if (!child.isMesh || child.userData.sharedResource) return;
      if (child.geometry) geometries.add(child.geometry);
      const list = Array.isArray(child.material) ? child.material : [child.material];
      list.filter(Boolean).forEach((material) => { if (!material.userData?.sharedResource) materials.add(material); });
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }

  slash(character, step, hit) {
    const color = character.enemy ? 0xff715e : 0x69e4ff;
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.55 + step * 0.12, 0.055 + step * 0.012, 5, 32, Math.PI * 1.15),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    mesh.position.copy(character.position).addScaledVector(character.up, 1.35).addScaledVector(character.facing, 0.8);
    mesh.quaternion.copy(character.group.quaternion);
    mesh.rotateZ(step === 2 ? -0.8 : 0.45);
    this.add(mesh, 0.24, (item) => { item.mesh.scale.multiplyScalar(1.06); item.mesh.material.opacity = item.life / item.maxLife; });
    if (hit) this.sound('hit');
  }

  impact(position, color, blocked) {
    const group = new THREE.Group();
    const up = position.clone().normalize();
    group.position.copy(position).addScaledVector(up, 1.4);
    const sparkGeometry = new THREE.BoxGeometry(0.055, 0.055, 0.45);
    for (let i = 0; i < 10; i++) {
      const spark = new THREE.Mesh(sparkGeometry, new THREE.MeshBasicMaterial({ color: blocked ? 0x9feaff : color, transparent: true, opacity: 1 }));
      spark.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      spark.userData.velocity = new THREE.Vector3().randomDirection().multiplyScalar(2.4 + Math.random() * 2.5);
      group.add(spark);
    }
    this.add(group, 0.38, (item, dt) => {
      item.mesh.children.forEach((spark) => { spark.position.addScaledVector(spark.userData.velocity, dt); spark.material.opacity = item.life / item.maxLife; });
    });
    this.sound(blocked ? 'block' : 'hit');
  }

  blockBurst(character, perfect = false) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.92, 32),
      new THREE.MeshBasicMaterial({ color: perfect ? 0xffe6a4 : 0xbcefff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.position.copy(character.position).addScaledVector(character.up, 1.45).addScaledVector(character.facing, 0.7);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), character.facing);
    this.add(mesh, 0.28, (item, dt) => {
      item.mesh.scale.multiplyScalar(1 + dt * 8);
      item.mesh.material.opacity = item.life / item.maxLife;
    });
    if (perfect) this.sound('perfectBlock');
  }

  elementTrail(position, direction, color, element) {
    if (this.particleScale < 0.5 && Math.random() > 0.45) return;
    const geometry = element === 'Earth' ? new THREE.TetrahedronGeometry(0.09, 0) : new THREE.SphereGeometry(0.055, 5, 4);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, depthWrite: false }));
    mesh.position.copy(position).addScaledVector(direction, -0.18);
    const drift = new THREE.Vector3().randomDirection().multiplyScalar(element === 'Fire' ? 0.7 : 0.35);
    this.add(mesh, 0.26, (item, dt) => {
      item.mesh.position.addScaledVector(drift, dt);
      item.mesh.scale.multiplyScalar(Math.max(0.9, 1 - dt * 1.8));
      item.mesh.material.opacity = 0.65 * item.life / item.maxLife;
    });
  }

  elementBurst(position, color, element) {
    const group = new THREE.Group();
    const up = position.clone().normalize();
    group.position.copy(position).addScaledVector(up, 1.3);
    const count = Math.max(4, Math.round(12 * this.particleScale));
    const geometry = element === 'Earth' ? new THREE.TetrahedronGeometry(0.12, 0) : new THREE.SphereGeometry(0.07, 5, 4);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    for (let i = 0; i < count; i++) {
      const particle = new THREE.Mesh(geometry, material.clone());
      particle.userData.velocity = new THREE.Vector3().randomDirection().addScaledVector(up, 0.5).multiplyScalar(1.5 + Math.random() * 2.5);
      group.add(particle);
    }
    if (element === 'Water' || element === 'Wind') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 5, 24), material.clone());
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up); ring.userData.ring = true; group.add(ring);
    }
    this.add(group, 0.48, (item, dt) => item.mesh.children.forEach((particle) => {
      if (particle.userData.ring) particle.scale.multiplyScalar(1 + dt * 7);
      else particle.position.addScaledVector(particle.userData.velocity, dt);
      particle.material.opacity = item.life / item.maxLife;
    }));
  }

  setQuality(preset) { this.particleScale = ({ low: 0.42, balanced: 0.75, high: 1 }[preset] || 0.75); }

  barrier(character, color, duration) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 20, 14),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, wireframe: true, depthWrite: false }),
    );
    mesh.position.copy(character.position).addScaledVector(character.up, 1.35);
    this.add(mesh, duration, (item, dt) => {
      item.mesh.position.copy(character.position).addScaledVector(character.up, 1.35);
      item.mesh.rotation.y += dt * 1.8;
      item.mesh.material.opacity = Math.min(0.22, item.life * 0.25);
    });
  }

  heal(character, color) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.06, 6, 30),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
    );
    mesh.position.copy(character.position).addScaledVector(character.up, 0.3);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), character.up);
    this.add(mesh, 0.8, (item, dt) => { item.mesh.position.addScaledVector(character.up, dt * 2.2); item.mesh.scale.multiplyScalar(1 + dt); item.mesh.material.opacity = item.life / item.maxLife; });
  }

  windTrail(position, direction, color) {
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.65 + i * 0.08, 0.035, 5, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65 }));
      const up = position.clone().normalize();
      mesh.position.copy(position).addScaledVector(direction, -i * 0.5).addScaledVector(up, 0.8);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      this.add(mesh, 0.3 + i * 0.06, (item) => { item.mesh.material.opacity = item.life / item.maxLife; });
    }
  }

  damageNumber(position, value, blocked = false, healing = false, critical = false) {
    const el = document.createElement('div');
    el.className = `damage-number ${healing ? 'healing' : blocked ? 'blocked' : critical ? 'critical' : ''}`;
    el.textContent = healing ? `+${Math.round(value)}` : blocked ? `${Math.round(value)}${blocked && value === 0 ? ' PERFECT' : ' GUARD'}` : critical ? `-${Math.round(value)} CRITICAL` : `-${Math.round(value)}`;
    this.uiRoot.append(el);
    const p = position.clone().addScaledVector(position.clone().normalize(), 2.65).project(this.camera);
    el.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight}px`;
    animate(el, { translateY: -70, scale: [0.65, 1.15, 1], opacity: [0, 1, 0], duration: 850, ease: 'outExpo', onComplete: () => el.remove() });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= dt;
      item.update?.(item, dt);
      if (item.life <= 0) {
        this.disposeItem(item);
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    for (const item of this.items) this.disposeItem(item);
    this.items.length = 0;
  }

  get activeParticles() { return this.items.reduce((total, item) => total + Math.max(1, item.mesh.children?.length || 0), 0); }
}
