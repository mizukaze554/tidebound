import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Game } from '../src/core/Game.js';

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
      game.player = { startAttack() { attacks++; return true; }, setBlock(value) { blocking = value; }, move() { return 0; } };
      game.audio = { playSfx() {} };
      game.updatePlayer(0.016);
      assert.equal(attacks, 1, `${attack} attacks`);
      assert.equal(blocking, true, `${block} blocks`);
    }
  }
});
