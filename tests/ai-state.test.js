import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EnemyAI } from '../src/entities/EnemyAI.js';

function fighter(position, health = 100) {
  return { position, previousPosition: position.clone(), up: new THREE.Vector3(0, 1, 0), health, alive: true, attack: null, energy: 100, cooldowns: [0, 0, 0], move: () => 1, face() {}, setBlock() {}, startAttack() {}, dodge() {} };
}

test('AI approaches at long range and retreats at critical health', () => {
  const target = fighter(new THREE.Vector3(10, 0, 0));
  const enemy = fighter(new THREE.Vector3(0, 0, 0));
  const ai = new EnemyAI(enemy, target, { useSkill() {} }, 'normal');
  ai.update(0.016); assert.equal(ai.state, 'APPROACH');
  enemy.health = 10; target.position.set(3, 0, 0); ai.thinkTimer = 0;
  ai.update(0.016); assert.equal(ai.state, 'RETREAT');
});
