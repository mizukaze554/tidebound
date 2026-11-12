import * as THREE from 'three';

const SETTINGS = {
  easy: { think: 0.38, aggression: 0.46, block: 0.16, dodge: 0.08 },
  normal: { think: 0.23, aggression: 0.68, block: 0.28, dodge: 0.16 },
  hard: { think: 0.12, aggression: 0.84, block: 0.42, dodge: 0.25 },
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
      else if (distance > 5.2) this.state = 'APPROACH';
      else if (distance < 2.75 && Math.random() < this.config.aggression) this.state = 'ATTACK';
      else this.state = 'STRAFE';
      this.actionTimer = 0.35 + Math.random() * 0.65;
      if (Math.random() < 0.18) this.strafeDirection *= -1;
    }

    let movement = 0;
    if (this.state === 'APPROACH') movement = c.move(dir, dt, distance > 10);
    else if (this.state === 'RETREAT') {
      const retreat = dir.clone().negate().add(new THREE.Vector3().crossVectors(dir, c.up).multiplyScalar(0.4));
      movement = c.move(retreat, dt, true);
      if (c.cooldowns[0] <= 0 && c.energy > 25 && Math.random() < 0.015) this.game.useSkill(c, 0);
    } else if (this.state === 'STRAFE') {
      const tangent = new THREE.Vector3().crossVectors(dir, c.up).multiplyScalar(this.strafeDirection);
      if (distance > 4) tangent.add(dir.clone().multiplyScalar(0.3));
      movement = c.move(tangent, dt, false);
      c.face(dir, dt);
      if (c.cooldowns[0] <= 0 && distance < 12 && Math.random() < 0.006) this.game.useSkill(c, 0);
    } else if (this.state === 'ATTACK') {
      c.face(dir, dt);
      if (distance < 3.1) c.startAttack(); else movement = c.move(dir, dt);
      if (Math.random() < this.config.dodge * dt && this.target.attack) c.dodge(new THREE.Vector3().crossVectors(dir, c.up));
    } else if (this.state === 'DEFEND') {
      c.face(dir, dt);
      c.setBlock(true);
      if (Math.random() < this.config.dodge * dt * 3) c.dodge(new THREE.Vector3().crossVectors(dir, c.up));
    }
    return movement;
  }
}
