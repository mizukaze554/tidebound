import test from 'node:test';
import assert from 'node:assert/strict';
import { SkillStorage } from '../src/data/SkillStorage.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const skill = { name: 'Safe <b>Skill</b>', element: 'Fire', effect: 'Damage', shape: 'Projectile', power: 4, range: 8, speed: 7, duration: 2 };

test('legacy skills receive IDs that remain stable across loads', () => {
  const memory = new MemoryStorage();
  memory.setItem('tidebound.customSkills.v1', JSON.stringify([skill]));
  const storage = new SkillStorage(memory);
  const first = storage.load();
  const second = storage.load();
  assert.ok(first[0].id);
  assert.equal(first[0].id, second[0].id);
});

test('upsert updates by ID even when names are duplicated', () => {
  const memory = new MemoryStorage();
  const storage = new SkillStorage(memory);
  storage.save([{ ...skill, id: 'one' }, { ...skill, id: 'two', power: 2 }]);
  storage.upsert({ ...skill, id: 'two', power: 9 });
  const loaded = storage.load();
  assert.equal(loaded.length, 2);
  assert.equal(loaded.find((item) => item.id === 'two').power, 9);
  assert.equal(loaded.find((item) => item.id === 'one').power, 4);
});

test('delete and equipped IDs persist', () => {
  const memory = new MemoryStorage();
  const storage = new SkillStorage(memory);
  const skills = storage.save([{ ...skill, id: 'one' }, { ...skill, id: 'two' }]);
  storage.saveEquipped([skills[1], null, skills[0]]);
  assert.deepEqual(storage.loadEquipped(skills).map((item) => item?.id || null), ['two', null, 'one']);
  assert.deepEqual(storage.delete('one').map((item) => item.id), ['two']);
});

test('equipped slots resolve the latest saved definition by ID', () => {
  const memory = new MemoryStorage();
  const storage = new SkillStorage(memory);
  storage.save([{ ...skill, id: 'equipped', power: 2 }]);
  storage.saveEquipped([{ ...skill, id: 'equipped', power: 2 }, null, null]);
  storage.upsert({ ...skill, id: 'equipped', power: 10 });
  const equipped = storage.loadEquipped(storage.load());
  assert.equal(equipped[0].power, 10);
});
