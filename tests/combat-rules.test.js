import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Character } from '../src/entities/Character.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';

test('perfect guard negates damage and dodge invulnerability rejects hits', () => {
  const scene = new THREE.Scene();
  const defender = new Character(scene, { color: 0x0000ff, accent: 0xffffff, name: 'D', position: new THREE.Vector3(0, 1, 0) });
  const attacker = new Character(scene, { color: 0xff0000, accent: 0xffffff, name: 'A', position: new THREE.Vector3(0, 1, 2), enemy: true });
  defender.up.set(0, 1, 0); defender.facing.set(0, 0, 1); attacker.up.set(0, 1, 0);
  defender.setBlock(true);
  const guarded = defender.takeDamage(20, attacker);
  assert.equal(guarded.perfect, true); assert.equal(guarded.damage, 0); assert.equal(defender.health, 100);
  defender.setBlock(false); defender.invulnerable = 0.2;
  assert.equal(defender.takeDamage(20, attacker).hit, false);
  defender.dispose(); attacker.dispose();
});

test('one melee attack can damage its target only once', () => {
  let hits = 0;
  const attacker = { alive: true, enemy: false, position: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), facing: new THREE.Vector3(0, 0, 1), attackPower: 10, actionTimer: 0.2, attack: { step: 1, duration: 0.48, hit: false } };
  const target = { alive: true, position: new THREE.Vector3(0, 0, 1.5), radius: 0.7, takeDamage: () => ({ hit: true, damage: 10, blocked: false }) };
  const effects = { slash() {}, impact() {}, damageNumber() {} };
  const combat = new CombatSystem(effects, () => { hits += 1; });
  combat.update(attacker, target); combat.update(attacker, target);
  assert.equal(hits, 1); assert.equal(attacker.attack.hit, true);
});
