import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSkillDefinition, parseSkillImport, serializeSkillExport } from '../src/data/SkillSchema.js';

test('legacy skills receive backward-compatible advanced defaults', () => {
  const skill = normalizeSkillDefinition({ name: 'Old Tide', element: 'Water', effect: 'Damage', shape: 'Projectile', power: 4, range: 6, speed: 7, duration: 2 });
  assert.equal(skill.projectileCount, 1);
  assert.equal(skill.spread, 0);
  assert.equal(skill.knockback, 5);
  assert.equal(skill.castTime, 0);
});

test('skill exports round-trip through strict JSON import with fresh IDs', () => {
  const json = serializeSkillExport([{ id: 'old', name: 'Ember Fan', element: 'Fire', effect: 'Damage', shape: 'Projectile', power: 6, range: 8, speed: 7, duration: 2, projectileCount: 3, spread: 18, knockback: 4, castTime: 0.3 }]);
  const imported = parseSkillImport(json, () => 'fresh-id');
  assert.equal(imported[0].id, 'fresh-id');
  assert.equal(imported[0].projectileCount, 3);
});

test('skill imports reject oversized and invalid definitions', () => {
  assert.throws(() => parseSkillImport('x'.repeat(33000), () => 'id'), /smaller than 32 KB/);
  assert.throws(() => parseSkillImport(JSON.stringify([{ name: '<script>', element: 'Void', effect: 'Damage', shape: 'Projectile', power: 5, range: 5, speed: 5, duration: 5 }]), () => 'id'), /Invalid element/);
});
