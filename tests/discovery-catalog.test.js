import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/data/CatalogRules.js';
import { validateWorldCatalog } from '../src/data/WorldCatalogRules.js';
import { DiscoveryStorage, DISCOVERY_KEY } from '../src/data/DiscoveryStorage.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
const skills = read('catalog/skills.json'), items = read('catalog/items.json');
const assets = read('world-kit/world_assets.json'), recipes = read('world-kit/world_recipes.json');
const resources = read('world-kit/resources.json'), biomes = read('world-kit/biomes.json');
const memory = () => { const data = new Map(); return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value), data }; };

test('supplied catalogs have exact counts and valid references', () => {
  assert.deepEqual(validateCatalog(skills, items), []);
  assert.deepEqual(validateWorldCatalog(assets, recipes, resources, biomes), []);
  assert.match(validateCatalog(skills.slice(1), items)[0], /1,000/);
  assert.match(validateWorldCatalog(assets, recipes.slice(1), resources, biomes)[0], /350/);
  const invalidSkills = [...skills];
  invalidSkills[0] = { ...skills[0], combat: { ...skills[0].combat, effects: [{ type: 'execute_script' }] } };
  assert.ok(validateCatalog(invalidSkills, items).some((error) => error.includes('unsupported effect')));
  const invalidRecipes = [...recipes];
  invalidRecipes[0] = { ...recipes[0], materials: [{ resourceId: 'missing_ore', quantity: 1 }] };
  assert.ok(validateWorldCatalog(assets, invalidRecipes, resources, biomes).some((error) => error.includes('invalid material')));
});

test('one-time starter roll is classless, weighted, unique and unaffected by appearance', () => {
  const store = memory();
  const storage = new DiscoveryStorage(skills, items, store, () => 0.1);
  const first = storage.createCharacter('female');
  assert.equal(first.newRewards.skillIds.length, 2);
  assert.equal(new Set(first.newRewards.skillIds).size, 2);
  assert.notEqual(storage.skillById.get(first.newRewards.skillIds[0]).domain, storage.skillById.get(first.newRewards.skillIds[1]).domain);
  assert.equal(storage.itemById.get(first.newRewards.weaponId).type, 'weapon');
  assert.equal(storage.itemById.get(first.newRewards.weaponId).requirements.class, null);
  assert.equal(store.data.has(DISCOVERY_KEY), true);
  const again = new DiscoveryStorage(skills, items, store, () => 0.99).createCharacter('male');
  assert.equal(again.newRewards, null);
  assert.deepEqual(again.state.skillIds, first.state.skillIds);
  assert.equal(again.state.character.appearance, 'female');
  assert.equal(storage.setAppearance(again.state, 'male'), true);
  assert.equal(storage.load().character.appearance, 'male');
  assert.deepEqual(storage.load().skillIds, first.state.skillIds);
  assert.equal(storage.setAppearance(again.state, 'invalid'), false);
  const another = new DiscoveryStorage(skills, items, memory(), () => 0.1).createCharacter('male');
  assert.deepEqual(another.state.skillIds, first.state.skillIds);
});

test('discovery reveals only earned IDs and prevents immediate farming', () => {
  const storage = new DiscoveryStorage(skills, items, memory(), () => 0.2);
  const { state } = storage.createCharacter('male');
  const before = storage.knownSkills(state).length;
  const now = Date.now() + 20000;
  const found = storage.discover(state, { kind: 'skill', tag: 'ward', now });
  assert.ok(found);
  assert.equal(storage.knownSkills(state).length, before + 1);
  assert.equal(storage.discover(state, { kind: 'skill', tag: 'ward', now: now + 1000 }), null);
  assert.equal(storage.load().skillIds.includes(found.id), true);
});

test('harvesting, blueprint discovery and building persist while costs are enforced', () => {
  const store = memory(), storage = new DiscoveryStorage(skills, items, store, () => 0.3);
  const { state } = storage.createCharacter('female');
  assert.equal(storage.harvest(state, 'node-a', [{ resourceId: 'wood', quantity: 2 }], 1000000), true);
  assert.equal(storage.harvest(state, 'node-a', [{ resourceId: 'wood', quantity: 2 }], 1000100), false);
  assert.equal(state.resources.wood, 2);
  const recipe = recipes.find((row) => row.id === 'wr_15_001');
  assert.equal(storage.build(state, recipe, { lat: 0.3, lon: 0.4, rotation: 0 }).ok, false);
  storage.discoverRecipe(state, recipe.id);
  assert.equal(storage.build(state, recipe, { lat: 0.3, lon: 0.4, rotation: 0 }).ok, false);
  state.resources.stone = 4;
  assert.equal(storage.build(state, recipe, { lat: 0.3, lon: 0.4, rotation: 0 }).ok, true);
  const reloaded = storage.load();
  assert.equal(reloaded.world.structures.length, 1);
  assert.equal(reloaded.resources.wood, 0);
  assert.equal(reloaded.resources.stone, 0);
});

test('damaged discovery saves do not silently reroll or erase legacy skills', () => {
  const store = memory(); store.setItem('tidebound.customSkills.v2', '[{"id":"old"}]');
  const storage = new DiscoveryStorage(skills, items, store, () => 0.4);
  assert.equal(storage.createCharacter('male').state.legacyNotice, true);
  assert.equal(store.getItem('tidebound.customSkills.v2'), '[{"id":"old"}]');
  store.setItem(DISCOVERY_KEY, '{broken');
  assert.throws(() => storage.createCharacter('female'), /damaged/);
});
