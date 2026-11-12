import * as THREE from 'three';

const SETTINGS = {
  easy: { think: 0.42, aggression: 0.42, block: 0.12, dodge: 0.06, skill: 0.003, ideal: 3.8 },
  normal: { think: 0.24, aggression: 0.66, block: 0.28, dodge: 0.15, skill: 0.007, ideal: 3.45 },
  hard: { think: 0.12, aggression: 0.84, block: 0.44, dodge: 0.25, skill: 0.013, ideal: 3.15 },
};

export class EnemyAI {
  constructor(character, target, game, difficulty = 'normal') {
    this.character = character;
    this.target = target;
    this.game = game;
    this.setDifficulty(difficulty);
    this.state = 'IDLE';
    this.thinkTimer = 0;
    this.actionTimer = 0;
    this.strafeDirection = 1;
    this.skillSlot = 0;
  }

  setDifficulty(value) { this.difficulty = value; this.config = SETTINGS[value] || SETTINGS.normal; }

  update(dt) {
    const c = this.character;
    if (!c.alive || !this.target.alive) return 0;
    const offset = this.target.position.clone().sub(c.position).projectOnPlane(c.up);
    const distance = offset.length();
    const dir = offset.clone().normalize();
    this.thinkTimer -= dt;
    this.actionTimer -= dt;
    c.setBlock(false);

    if (this.thinkTimer <= 0) {
      this.thinkTimer = this.config.think + Math.random() * 0.15;
      if (c.health < 24 && distance < 7) this.state = 'RETREAT';
      else if (this.target.attack && distance < 3.3 && Math.random() < this.config.block) this.state = 'DEFEND';
      else if (distance > this.config.ideal + 1.4) this.state = 'APPROACH';
      else if (distance < this.config.ideal && Math.random() < this.config.aggression) this.state = 'ATTACK';
      else this.state = 'STRAFE';
      this.actionTimer = 0.35 + Math.random() * 0.65;
      if (Math.random() < 0.18) this.strafeDirection *= -1;
    }

    let movement = 0;
    if (this.state === 'APPROACH') movement = c.move(dir, dt, distance > 10);
    else if (this.state === 'RETREAT') {
      const retreat = dir.clone().negate().add(new THREE.Vector3().crossVectors(dir, c.up).multiplyScalar(0.4));
      movement = c.move(retreat, dt, true);
      if (c.cooldowns[this.skillSlot] <= 0 && c.energy > 25 && Math.random() < this.config.skill * 2.5) this.useSkill();
    } else if (this.state === 'STRAFE') {
      const tangent = new THREE.Vector3().crossVectors(dir, c.up).multiplyScalar(this.strafeDirection);
      if (distance > this.config.ideal + 0.5) tangent.add(dir.clone().multiplyScalar(0.35));
      else if (distance < this.config.ideal - 0.5) tangent.add(dir.clone().multiplyScalar(-0.28));
      movement = c.move(tangent, dt, false);
      c.face(dir, dt);
      if (c.cooldowns[this.skillSlot] <= 0 && distance < 12 && Math.random() < this.config.skill) this.useSkill();
    } else if (this.state === 'ATTACK') {
      c.face(dir, dt);
      if (distance < 3.1) {
        if (!c.attack && c.actionTimer <= 0 && this.difficulty === 'hard' && Math.random() < 0.08) c.startHeavyAttack();
        else c.startAttack();
      } else movement = c.move(dir, dt);
      if (Math.random() < this.config.dodge * dt && this.target.attack) c.dodge(new THREE.Vector3().crossVectors(dir, c.up));
    } else if (this.state === 'DEFEND') {
      c.face(dir, dt);
      c.setBlock(true);
      if (Math.random() < this.config.dodge * dt * 3) c.dodge(new THREE.Vector3().crossVectors(dir, c.up));
    }
    return movement;
  }

  useSkill() {
    this.game.useSkill(this.character, this.skillSlot);
    this.skillSlot = (this.skillSlot + 1) % 3;
  }
}
