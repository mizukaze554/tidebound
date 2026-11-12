import * as THREE from 'three';
import { sweptSphereIntersectsCapsule } from './HitDetection.js';

export const ELEMENTS = {
  Water: { color: 0x48c9ff, bonus: 'control' },
  Fire: { color: 0xff6b32, bonus: 'damage' },
  Wind: { color: 0xa5ffd8, bonus: 'speed' },
  Earth: { color: 0xc6a36a, bonus: 'guard' },
};

export class SkillSystem {
  constructor(scene, effects, onDamage) {
    this.scene = scene;
    this.effects = effects;
    this.onDamage = onDamage;
    this.active = [];
  }

  static validate(skill) {
    if (!skill.name?.trim()) return 'Give the skill a name.';
    if (!ELEMENTS[skill.element]) return 'Choose a valid element.';
    const allowed = {
      Projectile: ['Damage', 'Push', 'Pull'],
      Area: ['Damage', 'Push', 'Pull', 'Heal'],
      Beam: ['Damage', 'Push', 'Pull'],
      Self: ['Shield', 'Heal', 'Push'],
    };
    if (!allowed[skill.shape]?.includes(skill.effect)) {
      return `${skill.effect} cannot use the ${skill.shape} shape. Self supports Shield, Heal, and Push (a dash).`;
    }
    for (const key of ['power', 'range', 'speed', 'duration']) {
      if (!Number.isFinite(Number(skill[key])) || Number(skill[key]) < 1 || Number(skill[key]) > 10) return `${key} must be from 1 to 10.`;
    }
    if (!Number.isInteger(Number(skill.projectileCount ?? 1)) || Number(skill.projectileCount ?? 1) < 1 || Number(skill.projectileCount ?? 1) > 5) return 'projectileCount must be from 1 to 5.';
    if (!Number.isFinite(Number(skill.spread ?? 0)) || Number(skill.spread ?? 0) < 0 || Number(skill.spread ?? 0) > 35) return 'spread must be from 0 to 35.';
    if (!Number.isFinite(Number(skill.knockback ?? 5)) || Number(skill.knockback ?? 5) < 1 || Number(skill.knockback ?? 5) > 10) return 'knockback must be from 1 to 10.';
    if (!Number.isFinite(Number(skill.castTime ?? 0)) || Number(skill.castTime ?? 0) < 0 || Number(skill.castTime ?? 0) > 1.5) return 'castTime must be from 0 to 1.5.';
    return null;
  }

  static cost(skill) {
    const shape = { Self: 2, Projectile: 5, Area: 9, Beam: 12 }[skill.shape] || 0;
    const effect = { Damage: 4, Push: 3, Pull: 4, Shield: 7, Heal: 8 }[skill.effect] || 0;
    return Math.round(8 + shape + effect + skill.power * 1.75 + skill.range * 0.55 + skill.duration * 0.8 + skill.speed * 0.25
      + (Number(skill.projectileCount ?? 1) - 1) * 4 + Number(skill.spread ?? 0) * 0.08 + Number(skill.knockback ?? 5) * 0.35
      - Number(skill.castTime ?? 0) * 3);
  }

  static cooldown(skill) { return 2.2 + skill.power * 0.18 + skill.duration * 0.2 + (skill.shape === 'Area' ? 0.8 : 0) + (Number(skill.projectileCount ?? 1) - 1) * 0.22; }

  static range(skill) { return Number(skill.range); }

  activate(caster, target, skill, slot = 0) {
    const error = SkillSystem.validate(skill);
    if (error) return { ok: false, error };
    const cost = SkillSystem.cost(skill);
    if (caster.energy < cost) return { ok: false, error: 'Not enough energy.' };
    if (caster.cooldowns[slot] > 0) return { ok: false, error: 'Skill is cooling down.' };
    caster.energy -= cost;
    caster.cooldowns[slot] = SkillSystem.cooldown(skill);
    caster.stats.skills += 1;
    const direction = target?.alive ? target.position.clone().sub(caster.position).projectOnPlane(caster.up).normalize() : caster.facing.clone();
    caster.face(direction);
    const color = ELEMENTS[skill.element].color;

    const castTime = Number(skill.castTime ?? 0);
    if (castTime > 0) {
      caster.actionTimer = Math.max(caster.actionTimer, castTime);
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.7, 30),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
      );
      mesh.position.copy(caster.position).addScaledVector(caster.up, 0.08);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), caster.up);
      this.scene.add(mesh);
      this.active.push({ type: 'cast', mesh, caster, target, skill, direction, color, elapsed: 0, duration: castTime });
    } else this.execute(caster, target, skill, direction, color);
    this.effects.sound(skill.element.toLowerCase());
    return { ok: true, cost };
  }

  execute(caster, target, skill, direction, color) {
    if (!caster.alive) return;
    if (skill.shape === 'Self') this.self(caster, skill, direction, color);
    else if (skill.shape === 'Projectile') {
      const count = Number(skill.projectileCount ?? 1);
      const spread = THREE.MathUtils.degToRad(Number(skill.spread ?? 0));
      for (let i = 0; i < count; i++) {
        const offset = count === 1 ? 0 : THREE.MathUtils.lerp(-spread / 2, spread / 2, i / (count - 1));
        this.projectile(caster, target, skill, direction.clone().applyAxisAngle(caster.up, offset), color, 1 / Math.sqrt(count));
      }
    } else if (skill.shape === 'Area') this.area(caster, target, skill, color);
    else if (skill.shape === 'Beam') this.beam(caster, target, skill, direction, color);
  }

  self(caster, skill, direction, color) {
    if (skill.effect === 'Shield') {
      caster.shield = Math.max(caster.shield, skill.power * 6 + (skill.element === 'Earth' ? 12 : 0));
      caster.shieldTimer = skill.duration * 0.8 + 1.5;
      this.effects.barrier(caster, color, caster.shieldTimer);
    } else if (skill.effect === 'Heal') {
      const amount = caster.heal(skill.power * 4 + skill.duration * 2);
      this.effects.heal(caster, color);
      this.effects.damageNumber(caster.position, amount, false, true);
    } else if (skill.effect === 'Push') {
      const boost = 7 + skill.power * 0.8 + skill.speed * 0.4;
      caster.position.addScaledVector(direction, Math.min(skill.range, boost * 0.55));
      caster.invulnerable = 0.18;
      this.effects.windTrail(caster.position, direction, color);
    }
  }

  projectile(caster, target, skill, direction, color, damageScale = 1) {
    const radius = 0.22 + skill.power * 0.025;
    const geometry = skill.element === 'Earth' ? new THREE.DodecahedronGeometry(radius, 0) : new THREE.SphereGeometry(radius, 10, 8);
    const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2, roughness: 0.2 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(caster.position).addScaledVector(caster.up, 1.5).addScaledVector(direction, 0.9);
    mesh.castShadow = true;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.5, radius * 0.08, 5, 18), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
    halo.rotation.x = Math.PI / 2; mesh.add(halo);
    this.scene.add(mesh);
    this.active.push({ type: 'projectile', mesh, previousPosition: mesh.position.clone(), caster, target, skill, direction, color, distance: 0, hit: false, radius, damageScale, trailTimer: 0 });
  }

  area(caster, target, skill, color) {
    const center = caster.position.clone();
    const maxRadius = SkillSystem.range(skill);
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.12, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), caster.up);
    mesh.position.copy(center).addScaledVector(caster.up, 0.13);
    this.scene.add(mesh);
    const healsCaster = skill.effect === 'Heal';
    if (healsCaster) this.applyEffect(caster, target, skill, caster.facing, color);
    this.active.push({ type: 'area', mesh, caster, target, skill, color, elapsed: 0, duration: 0.35 + skill.duration * 0.09, maxRadius, hit: healsCaster });
  }

  beam(caster, target, skill, direction, color) {
    const length = SkillSystem.range(skill);
    const start = caster.position.clone().addScaledVector(caster.up, 1.45);
    const end = start.clone().addScaledVector(direction, length);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08 + skill.power * 0.012, 0.18, length, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
    );
    mesh.position.copy(start).addScaledVector(direction, length / 2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.scene.add(mesh);
    const hitbox = target?.getBodyHitbox?.();
    const hit = target?.alive && hitbox && sweptSphereIntersectsCapsule(start, end, 0.18, hitbox.start, hitbox.end, hitbox.radius);
    if (hit) this.applyEffect(caster, target, skill, direction, color);
    this.active.push({ type: 'beam', mesh, elapsed: 0, duration: 0.18 + skill.duration * 0.045 });
  }

  applyEffect(caster, target, skill, direction, color, damageScale = 1) {
    if (skill.effect === 'Heal') {
      const amount = caster.heal(skill.power * 3.5 + skill.duration);
      this.effects.heal(caster, color);
      this.effects.damageNumber(caster.position, amount, false, true);
      return;
    }
    if (!target?.alive) return;
    if (skill.effect === 'Damage') {
      const multiplier = skill.element === 'Fire' ? 1.18 : 1;
      const knockback = 0.7 + Number(skill.knockback ?? 5) * 0.35;
      const result = target.takeDamage((8 + skill.power * 3.2) * multiplier * damageScale, caster, knockback, skill.element);
      if (result.hit) {
        this.effects.impact(target.position, color, result.blocked);
        this.effects.damageNumber(target.position, result.damage, result.blocked);
        this.onDamage?.(target, result);
      }
    } else if (skill.effect === 'Push' || skill.effect === 'Pull') {
      const away = target.position.clone().sub(caster.position).projectOnPlane(caster.up).normalize();
      const sign = skill.effect === 'Pull' ? -1 : 1;
      const strength = (1.2 + Number(skill.knockback ?? 5) * 0.55 + skill.power * 0.2) * sign;
      target.position.addScaledVector(away, strength);
      target.hitStun = Math.max(target.hitStun, 0.18 + skill.power * 0.02);
      this.effects.impact(target.position, color, false);
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      let remove = false;
      if (item.type === 'cast') {
        item.elapsed += dt;
        const progress = Math.min(1, item.elapsed / item.duration);
        item.mesh.position.copy(item.caster.position).addScaledVector(item.caster.up, 0.08);
        item.mesh.scale.setScalar(1 + progress * 1.4);
        item.mesh.rotation.z += dt * 4;
        item.mesh.material.opacity = 0.75 * (1 - progress * 0.55);
        if (!item.caster.alive) remove = true;
        else if (progress >= 1) { this.execute(item.caster, item.target, item.skill, item.direction, item.color); remove = true; }
      } else if (item.type === 'projectile') {
        const speed = 6 + item.skill.speed * 1.25 + (item.skill.element === 'Wind' ? 3 : 0);
        const travel = Math.min(speed * dt, SkillSystem.range(item.skill) - item.distance);
        item.previousPosition.copy(item.mesh.position);
        item.mesh.position.addScaledVector(item.direction, travel);
        item.mesh.rotation.x += dt * 6; item.mesh.rotation.y += dt * 9;
        item.trailTimer -= dt;
        if (item.trailTimer <= 0) { this.effects.elementTrail(item.mesh.position, item.direction, item.color, item.skill.element); item.trailTimer = 0.075; }
        item.distance += travel;
        const hitbox = item.target?.getBodyHitbox?.(item.target.previousPosition);
        const targetDelta = item.target?.position.clone().sub(item.target.previousPosition);
        const relativeEnd = targetDelta ? item.mesh.position.clone().sub(targetDelta) : item.mesh.position;
        if (!item.hit && item.target?.alive && hitbox && sweptSphereIntersectsCapsule(
          item.previousPosition,
          relativeEnd,
          item.radius,
          hitbox.start,
          hitbox.end,
          hitbox.radius,
        )) {
          item.hit = true;
          this.applyEffect(item.caster, item.target, item.skill, item.direction, item.color, item.damageScale);
          this.effects.elementBurst(item.target.position, item.color, item.skill.element);
          remove = true;
        }
        if (item.distance >= SkillSystem.range(item.skill)) remove = true;
      } else if (item.type === 'area') {
        item.elapsed += dt;
        const progress = Math.min(1, item.elapsed / item.duration);
        const radius = item.maxRadius * progress;
        item.mesh.scale.setScalar(Math.max(0.01, radius));
        item.mesh.material.opacity = 0.8 * (1 - progress);
        item.mesh.rotation.z += dt * (item.skill.element === 'Water' ? 2 : 0.5);
        if (!item.hit && item.target?.alive && item.target.position.distanceTo(item.caster.position) <= radius + item.target.radius) {
          item.hit = true;
          this.applyEffect(item.caster, item.target, item.skill, item.target.position.clone().sub(item.caster.position).normalize(), item.color);
        }
        if (progress >= 1) remove = true;
      } else if (item.type === 'beam') {
        item.elapsed += dt;
        item.mesh.material.opacity = 0.85 * (1 - item.elapsed / item.duration);
        if (item.elapsed >= item.duration) remove = true;
      }
      if (remove) this.remove(i);
    }
  }

  remove(index) {
    const item = this.active[index];
    this.scene.remove(item.mesh);
    const geometries = new Set(); const materials = new Set();
    item.mesh.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry) geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean).forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.active.splice(index, 1);
  }

  clear() { for (let i = this.active.length - 1; i >= 0; i--) this.remove(i); }
}
