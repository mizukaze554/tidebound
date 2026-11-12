import { inMeleeArc } from './HitDetection.js';

export class CombatSystem {
  constructor(effects, onDamage) {
    this.effects = effects;
    this.onDamage = onDamage;
  }

  update(attacker, target) {
    const attack = attacker.attack;
    if (!attack || attack.hit || !attacker.alive || !target.alive) return;
    const progress = 1 - attacker.actionTimer / attack.duration;
    const impactTimes = [0, 0.48, 0.44, 0.58];
    if (progress < impactTimes[attack.step]) return;
    attack.hit = true;
    const ranges = [0, 2.45, 2.55, 2.95];
    if (!inMeleeArc(attacker, target, ranges[attack.step], attack.step === 3 ? 1.75 : 1.35)) {
      this.effects.slash(attacker, attack.step, false);
      return;
    }
    const result = target.takeDamage(attacker.attackPower + attack.step * 3, attacker, 2.2 + attack.step * 0.8);
    this.effects.slash(attacker, attack.step, true);
    if (result.hit) {
      this.effects.impact(target.position, attacker.enemy ? 0xff6b5d : 0x69d8ff, result.blocked);
      this.effects.damageNumber(target.position, result.damage, result.blocked);
      this.onDamage?.(target, result);
    }
  }
}
