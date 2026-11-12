import * as THREE from 'three';
import { AnimationStateController } from './AnimationController.js';
import { modifier } from '../combat/CatalogModifiers.js';

export class Character {
  constructor(scene, { color, accent, name, position, gender = 'male', enemy = false }) {
    this.scene = scene;
    this.name = name;
    this.enemy = enemy;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);
    this.position = this.group.position;
    this.previousPosition = this.position.clone();
    this.velocity = new THREE.Vector3();
    this.up = position.clone().normalize();
    if (this.up.lengthSq() < 0.5) this.up.set(0, 1, 0);
    this.verticalSpeed = 0;
    this.facing = new THREE.Vector3(0, 0, enemy ? 1 : -1);
    this.radius = 0.72;
    this.maxHealth = 100;
    this.health = 100;
    this.maxStamina = 100;
    this.stamina = 100;
    this.maxEnergy = 100;
    this.energy = 70;
    this.speed = 5.2;
    this.attackPower = 10;
    this.defense = 2;
    this.alive = true;
    this.grounded = true;
    this.blocking = false;
    this.perfectBlockTimer = 0;
    this.invulnerable = 0;
    this.hitStun = 0;
    this.actionTimer = 0;
    this.attack = null;
    this.comboStep = 0;
    this.comboWindow = 0;
    this.comboQueued = false;
    this.dodgeTimer = 0;
    this.shield = 0;
    this.shieldTimer = 0;
    this.stats = { dealt: 0, received: 0, skills: 0, hits: 0, blocks: 0, perfectBlocks: 0, dodges: 0 };
    this.cooldowns = [0, 0, 0];
    this.statuses = [];
    this.buffs = [];
    this.animTime = Math.random() * 10;
    this.landingTimer = 0;
    this.gender = gender;
    this.buildModel(color, accent);
    this.fallbackObjects = [...this.group.children];
    this.modelController = null;
    this.externalModel = null;
  }

  buildModel(color, accent) {
    const bodyMat = new THREE.MeshToonMaterial({ color });
    const darkMat = new THREE.MeshToonMaterial({ color: this.enemy ? 0x3b1721 : 0x17304b });
    const skinMat = new THREE.MeshToonMaterial({ color: this.enemy ? 0xffb7a5 : 0xf1c9ad });
    const hairMat = new THREE.MeshToonMaterial({ color: this.enemy ? 0x5e1827 : 0x172c4d });
    const whiteMat = new THREE.MeshToonMaterial({ color: 0xf7fbff });
    const glowMat = new THREE.MeshToonMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.25 });
    const add = (geometry, material, parent, position) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const torsoWidth = this.gender === 'female' ? 0.82 : 0.98;
    this.torso = add(new THREE.BoxGeometry(torsoWidth, 1.25, 0.58), bodyMat, this.group, [0, 1.75, 0]);
    this.head = add(new THREE.SphereGeometry(0.38, 16, 12), skinMat, this.group, [0, 2.72, 0]);
    const hair = add(new THREE.SphereGeometry(0.405, 16, 9, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat, this.head, [0, 0.07, 0]);
    hair.rotation.x = -0.08;
    add(new THREE.SphereGeometry(0.055, 8, 6), whiteMat, this.head, [-0.13, 0.01, 0.35]);
    add(new THREE.SphereGeometry(0.055, 8, 6), whiteMat, this.head, [0.13, 0.01, 0.35]);
    add(new THREE.SphereGeometry(0.027, 8, 6), glowMat, this.head, [-0.13, 0.01, 0.397]);
    add(new THREE.SphereGeometry(0.027, 8, 6), glowMat, this.head, [0.13, 0.01, 0.397]);
    add(new THREE.TorusGeometry(0.2, 0.025, 6, 18), glowMat, this.head, [0, 0.01, -0.36]).rotation.x = Math.PI / 2;
    this.leftArm = new THREE.Group(); this.leftArm.position.set(-torsoWidth * 0.65, 2.18, 0); this.group.add(this.leftArm);
    this.rightArm = new THREE.Group(); this.rightArm.position.set(torsoWidth * 0.65, 2.18, 0); this.group.add(this.rightArm);
    add(new THREE.BoxGeometry(0.27, 1.08, 0.3), bodyMat, this.leftArm, [0, -0.48, 0]);
    add(new THREE.BoxGeometry(0.27, 1.08, 0.3), bodyMat, this.rightArm, [0, -0.48, 0]);
    this.leftLeg = new THREE.Group(); this.leftLeg.position.set(-0.27, 1.15, 0); this.group.add(this.leftLeg);
    this.rightLeg = new THREE.Group(); this.rightLeg.position.set(0.27, 1.15, 0); this.group.add(this.rightLeg);
    add(new THREE.BoxGeometry(0.34, 1.2, 0.38), darkMat, this.leftLeg, [0, -0.56, 0]);
    add(new THREE.BoxGeometry(0.34, 1.2, 0.38), darkMat, this.rightLeg, [0, -0.56, 0]);
    add(new THREE.BoxGeometry(0.42, 0.2, 0.6), bodyMat, this.leftLeg, [0, -1.08, 0.1]);
    add(new THREE.BoxGeometry(0.42, 0.2, 0.6), bodyMat, this.rightLeg, [0, -1.08, 0.1]);
    const sash = add(new THREE.CylinderGeometry(this.gender === 'female' ? 0.5 : 0.55, 0.68, 0.62, 8), bodyMat, this.group, [0, 1.14, 0]);
    sash.scale.z = 0.72;
    this.cape = add(new THREE.BoxGeometry(0.72, 1.25, 0.07), glowMat, this.group, [0, 1.75, -0.38]);
    this.cape.rotation.x = -0.08;
    this.weapon = add(new THREE.BoxGeometry(0.13, 1.85, 0.18), glowMat, this.rightArm, [0, -1.25, -0.1]);
    this.weapon.rotation.z = -0.12;
    add(new THREE.BoxGeometry(0.65, 0.12, 0.24), darkMat, this.rightArm, [0, -0.43, -0.1]);
    this.aura = add(new THREE.TorusGeometry(0.82, 0.045, 6, 30), glowMat, this.group, [0, 0.06, 0]);
    this.aura.rotation.x = Math.PI / 2;
    this.aura.visible = false;
    this.group.traverse((object) => { if (object.isMesh) object.userData.owner = this; });
  }

  face(direction, dt = 1) {
    if (direction.lengthSq() < 0.001) return;
    this.facing.copy(direction).projectOnPlane(this.up).normalize();
    if (this.facing.lengthSq() < 0.001) return;
    const right = new THREE.Vector3().crossVectors(this.up, this.facing).normalize();
    const basis = new THREE.Matrix4().makeBasis(right, this.up, this.facing);
    const target = new THREE.Quaternion().setFromRotationMatrix(basis);
    this.group.quaternion.slerp(target, Math.min(1, dt * 14));
  }

  move(direction, dt, sprint = false) {
    if (!this.alive || this.hitStun > 0 || this.dodgeTimer > 0) return false;
    direction.projectOnPlane(this.up);
    const moving = direction.lengthSq() > 0.01;
    if (!moving) return false;
    const running = sprint && this.stamina > 4;
    const statusSpeed = this.statuses.reduce((value, entry) => value * modifier('status', entry.id).speed, 1);
    const buffSpeed = this.buffs.reduce((value, entry) => value * modifier('buff', entry.id, entry.magnitude).speed, 1);
    const speed = this.speed * statusSpeed * buffSpeed * (running ? 1.62 : 1);
    this.position.addScaledVector(direction.normalize(), speed * dt);
    if (!this.attack) this.face(direction, dt);
    if (running) this.stamina = Math.max(0, this.stamina - 18 * dt);
    return running ? 2 : 1;
  }

  jump() {
    if (!this.grounded || this.stamina < 14 || this.actionTimer > 0) return false;
    this.verticalSpeed = 7.4;
    this.grounded = false;
    this.stamina -= 14;
    return true;
  }

  dodge(direction) {
    if (!this.alive || this.stamina < 22 || this.dodgeTimer > 0 || this.hitStun > 0) return false;
    this.stamina -= 22;
    this.stats.dodges += 1;
    this.dodgeTimer = 0.42;
    this.invulnerable = 0.32;
    const dir = direction.lengthSq() > 0.01 ? direction.clone().projectOnPlane(this.up).normalize() : this.facing.clone().negate();
    this.velocity.x = dir.x * 13;
    this.velocity.y = dir.y * 13;
    this.velocity.z = dir.z * 13;
    this.face(dir);
    return true;
  }

  startAttack() {
    if (!this.alive || this.hitStun > 0 || this.dodgeTimer > 0 || this.blocking) return false;
    if (this.actionTimer > 0) {
      const progress = this.attack ? 1 - this.actionTimer / this.attack.duration : 0;
      if (this.attack && progress >= 0.34) this.comboQueued = true;
      return false;
    }
    if (this.stamina < 10) return false;
    this.comboStep = this.comboWindow > 0 ? (this.comboStep % 3) + 1 : 1;
    const durations = [0, 0.48, 0.54, 0.68];
    this.stamina -= 8 + this.comboStep * 2;
    this.actionTimer = durations[this.comboStep];
    this.attack = { step: this.comboStep, duration: durations[this.comboStep], hit: false, windup: [0, 0.34, 0.3, 0.42][this.comboStep] };
    this.comboQueued = false;
    return true;
  }

  startHeavyAttack() {
    if (!this.alive || this.hitStun > 0 || this.dodgeTimer > 0 || this.blocking || this.actionTimer > 0 || this.stamina < 28) return false;
    this.stamina -= 28;
    this.comboWindow = 0;
    this.comboStep = 3;
    this.actionTimer = 0.88;
    this.attack = { step: 3, duration: 0.88, hit: false, windup: 0.52, heavy: true };
    this.comboQueued = false;
    return true;
  }

  setBlock(value) {
    const next = value && this.alive && this.hitStun <= 0 && this.stamina > 0 && this.dodgeTimer <= 0;
    if (next && !this.blocking) this.perfectBlockTimer = 0.16;
    this.blocking = next;
  }

  takeDamage(amount, source, knockback = 2, element = null) {
    if (!this.alive || this.invulnerable > 0) return { hit: false, damage: 0 };
    const toSource = source.position.clone().sub(this.position).projectOnPlane(this.up).normalize();
    const facingSource = this.facing.dot(toSource) > 0.12;
    const blocked = this.blocking && facingSource && this.stamina > 0;
    const perfect = blocked && this.perfectBlockTimer > 0;
    const defenseFactor = this.statuses.reduce((value, entry) => value * modifier('status', entry.id).defense, 1)
      * this.buffs.reduce((value, entry) => value * modifier('buff', entry.id, entry.magnitude).defense, 1);
    let damage = Math.max(1, amount - this.defense * defenseFactor);
    if (blocked) {
      this.stats.blocks += 1;
      if (perfect) this.stats.perfectBlocks += 1;
      damage *= perfect ? 0 : 0.24;
      this.stamina = Math.max(0, this.stamina - amount * (perfect ? 0.3 : 1.2));
      if (perfect) source.hitStun = Math.max(source.hitStun, 0.32);
      if (this.stamina <= 0) this.blocking = false;
    }
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, damage);
      this.shield -= absorbed;
      damage -= absorbed;
    }
    damage = Math.max(0, Math.round(damage));
    this.health = Math.max(0, this.health - damage);
    this.stats.received += damage;
    source.stats.dealt += damage;
    if (!blocked && damage > 0) {
      this.hitStun = 0.22 + damage * 0.008;
      this.velocity.add(this.position.clone().sub(source.position).projectOnPlane(this.up).normalize().multiplyScalar(knockback));
    }
    if (damage > 0) source.stats.hits += 1;
    if (this.health <= 0) {
      this.alive = false;
      this.actionTimer = 0;
      this.blocking = false;
    }
    return { hit: true, damage, blocked, perfect, element };
  }

  heal(amount) {
    const actual = Math.min(this.maxHealth - this.health, amount);
    this.health += actual;
    return actual;
  }

  effectiveAttackPower() {
    return this.attackPower * this.statuses.reduce((value, entry) => value * modifier('status', entry.id).attack, 1)
      * this.buffs.reduce((value, entry) => value * modifier('buff', entry.id, entry.magnitude).attack, 1);
  }

  addStatus(id, durationSec) {
    const current = this.statuses.find((entry) => entry.id === id);
    if (current) current.remaining = Math.max(current.remaining, durationSec);
    else this.statuses.push({ id, remaining: durationSec, tick: 0 });
  }

  addBuff(id, magnitude, durationSec) {
    const current = this.buffs.find((entry) => entry.id === id);
    if (current) { current.remaining = Math.max(current.remaining, durationSec); current.magnitude = Math.max(current.magnitude, magnitude); }
    else this.buffs.push({ id, magnitude, remaining: durationSec });
  }

  capturePreviousPosition() { this.previousPosition.copy(this.position); }

  getBodyHitbox(atPosition = this.position) {
    return {
      start: atPosition.clone().addScaledVector(this.up, 0.55),
      end: atPosition.clone().addScaledVector(this.up, 2.5),
      radius: this.radius,
    };
  }

  setExternalModel(model, clips = []) {
    this.fallbackObjects.forEach((object) => { object.visible = false; });
    this.externalModel = model;
    this.group.add(model);
    this.modelController = new AnimationStateController(model, clips);
  }

  animationState(movement) {
    if (!this.alive) return 'defeat';
    if (this.hitStun > 0) return 'hit';
    if (this.dodgeTimer > 0) return 'dodge';
    if (this.blocking) return 'block';
    if (this.attack) return `attack${this.attack.step}`;
    if (!this.grounded) return 'jump';
    if (this.landingTimer > 0) return 'landing';
    if (movement === 2) return 'sprint';
    if (movement === 1) return 'walk';
    return 'idle';
  }

  dispose() {
    this.modelController?.dispose();
    const geometries = new Set(); const materials = new Set();
    this.group.traverse((object) => {
      if (!object.isMesh || object.userData.sharedResource) return;
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean).forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }

  update(dt, movementState = 0) {
    for (const status of this.statuses) {
      status.remaining -= dt;
      status.tick += dt;
      if (status.tick >= 1 && this.alive) {
        status.tick -= 1;
        const damage = modifier('status', status.id).dot;
        if (damage) { this.health = Math.max(0, this.health - damage); if (this.health === 0) this.alive = false; }
        if (status.id === 'drain') this.energy = Math.max(0, this.energy - 3);
      }
    }
    this.statuses = this.statuses.filter((entry) => entry.remaining > 0);
    for (const buff of this.buffs) {
      buff.remaining -= dt;
      const healing = modifier('buff', buff.id, buff.magnitude).healing;
      if (healing && this.alive) this.heal(healing * dt * 3);
    }
    this.buffs = this.buffs.filter((entry) => entry.remaining > 0);
    this.animTime += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.hitStun = Math.max(0, this.hitStun - dt);
    this.perfectBlockTimer = Math.max(0, this.perfectBlockTimer - dt);
    this.landingTimer = Math.max(0, this.landingTimer - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    if (this.shieldTimer <= 0) this.shield = 0;
    for (let i = 0; i < this.cooldowns.length; i++) this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
    if (!this.blocking && this.dodgeTimer <= 0 && this.alive) this.stamina = Math.min(this.maxStamina, this.stamina + 20 * dt);
    if (this.alive) this.energy = Math.min(this.maxEnergy, this.energy + 5.5 * dt);

    if (!this.grounded) {
      this.verticalSpeed -= 18 * dt;
      this.position.addScaledVector(this.up, this.verticalSpeed * dt);
    }
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      this.position.addScaledVector(this.velocity, dt);
      this.velocity.multiplyScalar(Math.max(0, 1 - dt * 4.5));
    } else if (this.hitStun > 0) {
      this.position.addScaledVector(this.velocity, dt);
      this.velocity.multiplyScalar(Math.max(0, 1 - dt * 8));
    } else { this.velocity.set(0, 0, 0); }

    if (this.actionTimer > 0) {
      this.actionTimer -= dt;
      if (this.actionTimer <= 0 && this.attack) {
        this.comboWindow = 0.32;
        const queued = this.comboQueued;
        this.attack = null;
        if (queued) this.startAttack();
      }
    }
    this.animate(movementState);
    this.modelController?.update(dt, this.animationState(movementState));
  }

  animate(movement) {
    const breath = Math.sin(this.animTime * 2.4) * 0.025;
    this.torso.scale.y = 1 + breath;
    let swing = movement ? Math.sin(this.animTime * (movement === 2 ? 13 : 8)) * (movement === 2 ? 0.7 : 0.42) : 0;
    this.leftLeg.rotation.x += (swing - this.leftLeg.rotation.x) * 0.22;
    this.rightLeg.rotation.x += (-swing - this.rightLeg.rotation.x) * 0.22;
    let leftTarget = -swing * 0.65;
    let rightTarget = swing * 0.65;
    if (this.blocking) { leftTarget = -1.05; rightTarget = -1.15; }
    if (this.attack) {
      const p = 1 - this.actionTimer / this.attack.duration;
      const windup = this.attack.windup;
      const strikeProgress = THREE.MathUtils.clamp((p - windup) / (1 - windup), 0, 1);
      const slash = p < windup ? -p / windup : Math.sin(strikeProgress * Math.PI);
      const direction = this.attack.step === 2 ? -1 : 1;
      rightTarget = this.attack.step === 3 ? -1.75 + slash * 3.1 : -1.35 + slash * 2.7 * direction;
      this.leftArm.rotation.z = this.attack.step === 3 ? -0.45 * Math.sin(p * Math.PI) : 0;
      this.torso.rotation.y = (p < windup ? -p / windup : Math.sin(strikeProgress * Math.PI * 2)) * 0.38 * direction;
    } else { this.torso.rotation.y *= 0.78; this.leftArm.rotation.z *= 0.7; }
    this.leftArm.rotation.x += (leftTarget - this.leftArm.rotation.x) * 0.25;
    this.rightArm.rotation.x += (rightTarget - this.rightArm.rotation.x) * 0.3;
    if (this.hitStun > 0) this.torso.rotation.z = Math.sin(this.animTime * 35) * 0.12;
    else this.torso.rotation.z *= 0.75;
    this.cape.rotation.x = -0.08 + Math.sin(this.animTime * 2.1) * 0.04 - movement * 0.09;
    if (!this.alive) {
      this.torso.rotation.z += (Math.PI / 2 - this.torso.rotation.z) * 0.035;
      this.group.position.addScaledVector(this.up, -0.008);
    }
    this.aura.visible = this.shield > 0;
    if (this.aura.visible) this.aura.rotation.z += 0.035;
  }
}
