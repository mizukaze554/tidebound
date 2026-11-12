import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Game } from '../src/core/Game.js';
import { Character } from '../src/entities/Character.js';

const inputFor = (pressed, held) => ({
  consume(code) { return pressed.delete(code); },
  down(code) { return held.has(code); },
  button(code) { return held.has(`Mouse${code}`); },
});

test('exploration accepts mouse or keyboard attack and hold block', () => {
  for (const attack of ['Mouse0', 'KeyC']) {
    for (const block of ['Mouse2', 'KeyV']) {
      let attacks = 0, blocking = false;
      const game = Object.create(Game.prototype);
      game.mode = 'explore'; game.locked = false; game.enemy = null;
      game.input = inputFor(new Set([attack]), new Set([block]));
      game.followCamera = { forward: () => new THREE.Vector3(0, 0, 1), right: () => new THREE.Vector3(1, 0, 0) };
      game.player = { startAttack() { attacks++; return true; }, setBlock(value) { blocking = value; }, face() {}, move() { return 0; } };
      game.audio = { playSfx() {} };
      game.updatePlayer(0.016);
      assert.equal(attacks, 1, `${attack} attacks`);
      assert.equal(blocking, true, `${block} blocks`);
    }
  }
});

test('a character can sprint while an attack animation is active', () => {
  const character = new Character(new THREE.Scene(), { color: 0x267bb4, accent: 0x5ee3ff, name: 'Wayfarer', position: new THREE.Vector3(0, 700, 0) });
  character.face(new THREE.Vector3(0, 0, -1));
  assert.equal(character.startAttack(), true);
  const original = character.position.clone();
  assert.equal(character.move(new THREE.Vector3(1, 0, 0), 0.1, true), 2);
  assert.ok(character.position.distanceTo(original) > 0.5);
  assert.ok(character.attack);
  assert.ok(character.facing.z < -0.9, 'movement does not turn the active attack away from its target');
  character.dispose();
});
