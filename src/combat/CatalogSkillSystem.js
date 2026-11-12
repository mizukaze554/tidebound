import * as THREE from 'three';
import { inMeleeArc, sweptSphereIntersectsCapsule } from './HitDetection.js';

const COLORS = { fire: 0xff7348, water: 0x55d2ff, wind: 0x9fffd4, earth: 0xc6a36a, ice: 0x9deaff, lightning: 0xd6bdff, nature: 0x84da75, shadow: 0x9b7bc2, light: 0xffe9ad, metal: 0xb8d5dc, sound: 0xeb9dff, arcane: 0x9f8bff, gravity: 0x6860a2, sand: 0xddbf7a, mist: 0xb4d9e0, crystal: 0x7ce9ec, spirit: 0xc8b4ff, plant: 0x89cb69, radiance: 0xffdd88, moon: 0xb8caff };

export class CatalogSkillSystem {
  constructor(scene, effects, world, onDamage) {
    this.scene = scene; this.effects = effects; this.world = world; this.onDamage = onDamage;
    this.active = [];
  }

  clear() {
    for (const entry of this.active) if (entry.mesh) { this.scene.remove(entry.mesh); entry.mesh.geometry.dispose(); entry.mesh.material.dispose(); }
    this.active.length = 0;
  }

  activate(caster, target, skill, slot = 0) {
    if (!skill?.combat) return { ok: false, error: 'Skill unavailable.' };
    const combat = skill.combat;
    if (caster.energy < combat.energyCost) return { ok: false, error: 'Not enough energy.' };
    if (caster.cooldowns[slot] > 0) return { ok: false, error: 'Skill is cooling down.' };
    caster.energy -= combat.energyCost;
    caster.cooldowns[slot] = combat.cooldownSec;
    caster.stats.skills++;
    caster.actionTimer = Math.max(caster.actionTimer, combat.castTimeSec);
    const direction = target?.alive ? target.position.clone().sub(caster.position).projectOnPlane(caster.up).normalize() : caster.facing.clone();
    const entry = { type: 'cast', caster, target, skill, direction, remaining: combat.castTimeSec };
    if (entry.remaining > 0) this.active.push(entry);
    else this.execute(entry);
    this.effects.sound(skill.element in COLORS ? skill.element : 'skill');
    return { ok: true, cost: combat.energyCost };
  }

  execute(entry) {
    const { caster, target, skill, direction } = entry;
    if (!caster.alive) return;
    const combat = skill.combat, color = COLORS[skill.element] || 0x9deaff;
    if (combat.shape === 'barrier') {
      this.applyEffects(caster, caster, skill, direction, color);
    } else if (combat.shape === 'dash') {
      this.applyEffects(caster, caster, skill, direction, color);
    } else if (combat.shape === 'melee_arc') {
      caster.face(direction);
      const hit = target?.alive && inMeleeArc(caster, target, combat.rangeM, Math.max(1.2, combat.radiusM));
      this.effects.slash(caster, 1, Boolean(hit));
      if (hit) this.applyEffects(caster, target, skill, direction, color);
    } else if (combat.shape === 'area') {
      this.effects.elementBurst(caster.position, color, skill.element);
      if (target?.alive && target.position.distanceTo(caster.position) <= combat.radiusM + target.radius) this.applyEffects(caster, target, skill, direction, color);
    } else if (combat.shape === 'projectile') {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color }));
      mesh.position.copy(caster.position).addScaledVector(caster.up, 1.4).addScaledVector(direction, 0.8);
      this.scene.add(mesh);
      this.active.push({ type: 'projectile', caster, target, skill, direction, mesh, distance: 0, previous: mesh.position.clone(), color });
    }
  }

  applyEffects(caster, target, skill, direction, color) {
    let damaged = false;
    for (const effect of skill.combat.effects) {
      if (effect.type === 'damage' && target?.alive && target !== caster) {
        const result = target.takeDamage(effect.amount * (caster.effectiveAttackPower?.() || caster.attackPower) / Math.max(1, caster.attackPower), caster, 1.4, effect.damageType);
        if (result.hit) { damaged = true; this.effects.damageNumber(target.position, result.damage, result.blocked); this.onDamage?.(target, result); }
      } else if (effect.type === 'status' && target?.alive && target !== caster && Math.random() < effect.chance) {
        target.addStatus(effect.statusId, effect.durationSec);
        if (effect.statusId === 'pull') target.velocity.add(caster.position.clone().sub(target.position).projectOnPlane(target.up).normalize().multiplyScalar(3));
      } else if (effect.type === 'shield') {
        caster.shield = Math.max(caster.shield, effect.amount);
        caster.shieldTimer = Math.max(caster.shieldTimer, effect.durationSec);
        this.effects.barrier(caster, color, effect.durationSec);
      } else if (effect.type === 'buff') {
        caster.addBuff(effect.buffId, effect.magnitude, effect.durationSec);
      } else if (effect.type === 'dash') {
        const travel = direction.clone().projectOnPlane(caster.up).normalize();
        const start = caster.position.clone();
        for (let distance = 0; distance < effect.distanceM; distance += 0.35) {
          const step = Math.min(0.35, effect.distanceM - distance);
          caster.position.addScaledVector(travel, step);
          this.world.constrain(caster);
          if (this.world.blocksMovement?.(caster.position, caster.radius)) { caster.position.copy(start); this.world.constrain(caster); break; }
        }
        caster.invulnerable = Math.max(caster.invulnerable, effect.invulnerableSec);
        this.effects.windTrail(caster.position, travel, color);
      }
    }
    if (damaged) { this.effects.impact(target.position, color, false); this.effects.elementBurst(target.position, color, skill.element); }
  }

  update(dt) {
    for (let index = this.active.length - 1; index >= 0; index--) {
      const entry = this.active[index];
      if (entry.type === 'cast') {
        entry.remaining -= dt;
        if (entry.remaining <= 0) { this.active.splice(index, 1); this.execute(entry); }
      } else {
        const combat = entry.skill.combat;
        entry.previous.copy(entry.mesh.position);
        const step = Math.min((8 + combat.rangeM) * dt, combat.rangeM - entry.distance);
        entry.mesh.position.addScaledVector(entry.direction, step);
        entry.distance += step;
        const hitbox = entry.target?.getBodyHitbox?.();
        const hit = entry.target?.alive && hitbox && sweptSphereIntersectsCapsule(entry.previous, entry.mesh.position, 0.25, hitbox.start, hitbox.end, hitbox.radius);
        if (hit) this.applyEffects(entry.caster, entry.target, entry.skill, entry.direction, entry.color);
        if (hit || entry.distance >= combat.rangeM) {
          this.scene.remove(entry.mesh); entry.mesh.geometry.dispose(); entry.mesh.material.dispose(); this.active.splice(index, 1);
        }
      }
    }
  }
}
