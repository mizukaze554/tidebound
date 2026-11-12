import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';

test('match cleanup removes and disposes both fighters before restart', () => {
  const game = new Game(null, null);
  let removed = 0; let disposed = 0;
  game.scene = { remove() { removed += 1; } };
  game.player = { group: {}, dispose() { disposed += 1; } };
  game.enemy = { group: {}, dispose() { disposed += 1; } };
  game.ai = {};
  game.clearCharacters();
  assert.equal(removed, 2); assert.equal(disposed, 2);
  assert.equal(game.player, null); assert.equal(game.enemy, null); assert.equal(game.ai, null);
});
