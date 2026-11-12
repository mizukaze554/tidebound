import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CatalogSkillSystem } from '../src/combat/CatalogSkillSystem.js';
import { PlanetWorld } from '../src/world/PlanetWorld.js';
import { WorldSlice } from '../src/world/WorldSlice.js';
import { DiscoveryStorage } from '../src/data/DiscoveryStorage.js';
import { skills, items } from '../src/data/Catalog.js';

const store = () => { const data = new Map(); return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) }; };

test('catalog combat spends energy once and applies damage, status, shield, buff and terrain-clamped dash', () => {
  const scene = new THREE.Scene();
  const calls = { damage: 0, shield: 0, dash: 0 };
  const effects = { sound() {}, slash() {}, damageNumber() {}, impact() {}, elementBurst() {}, barrier() { calls.shield++; }, windTrail() { calls.dash++; } };
  const world = { constrain(character) { character.position.normalize().multiplyScalar(700); }, blocksMovement: () => false };
  const system = new CatalogSkillSystem(scene, effects, world, () => { calls.damage++; });
  const caster = { position: new THREE.Vector3(700, 0, 0), up: new THREE.Vector3(1, 0, 0), facing: new THREE.Vector3(0, 0, 1), energy: 100, cooldowns: [0], stats: { skills: 0 }, attackPower: 10, alive: true, actionTimer: 0, invulnerable: 0, shield: 0, shieldTimer: 0, face() {}, addBuff(id) { this.buff = id; } };
  const target = { position: new THREE.Vector3(700, 0, 2), up: caster.up, radius: 0.7, alive: true, velocity: new THREE.Vector3(), takeDamage(amount) { this.health = (this.health || 100) - amount; return { hit: true, damage: amount, blocked: false }; }, addStatus(id) { this.status = id; } };
  const melee = { element: 'fire', combat: { shape: 'melee_arc', energyCost: 11, cooldownSec: 3, castTimeSec: 0, rangeM: 3, radiusM: 1.7, effects: [{ type: 'damage', amount: 12, damageType: 'fire' }, { type: 'status', statusId: 'burn', chance: 1, durationSec: 2 }] } };
  assert.equal(system.activate(caster, target, melee, 0).ok, true);
  assert.equal(caster.energy, 89);
  assert.equal(calls.damage, 1);
  assert.equal(target.status, 'burn');
  assert.equal(system.activate(caster, target, melee, 0).ok, false);
  const barrier = { element: 'earth', combat: { shape: 'barrier', energyCost: 1, cooldownSec: 1, castTimeSec: 0, effects: [{ type: 'shield', amount: 25, durationSec: 3 }, { type: 'buff', buffId: 'fortify', magnitude: 0.1, durationSec: 3 }] } };
  caster.cooldowns[0] = 0;
  assert.equal(system.activate(caster, target, barrier, 0).ok, true);
  assert.equal(caster.shield, 25);
  assert.equal(caster.buff, 'fortify');
  assert.equal(calls.shield, 1);
  const dash = { element: 'wind', combat: { shape: 'dash', energyCost: 1, cooldownSec: 1, castTimeSec: 0, effects: [{ type: 'dash', distanceM: 3, invulnerableSec: 0.12 }] } };
  caster.cooldowns[0] = 0;
  assert.equal(system.activate(caster, null, dash, 0).ok, true);
  assert.ok(caster.position.distanceTo(new THREE.Vector3(700, 0, 0)) > 2);
  assert.ok(Math.abs(caster.position.length() - 700) < 0.01);
  assert.equal(calls.dash, 1);
});

test('seeded grassland resources can be harvested and remain depleted after chunk regeneration', () => {
  const scene = new THREE.Scene();
  const world = new PlanetWorld(scene);
  const storage = new DiscoveryStorage(skills, items, store(), () => 0.2);
  const { state } = storage.createCharacter('male');
  const slice = new WorldSlice(world, scene, storage);
  world.worldSlice = slice;
  slice.setState(state);
  for (const [key, group] of world.chunks) {
    const [latIndex, lonIndex] = key.split(':').map(Number);
    slice.attachChunk(key, group, latIndex, lonIndex, latIndex * world.chunkAngle - Math.PI / 2, lonIndex * world.chunkAngle - Math.PI);
  }
  const node = [...slice.nodes.values()].find((entry) => entry.asset.id === 'wa_04_001');
  assert.ok(node, 'spawn grassland contains a harvestable tree');
  assert.equal(slice.harvest(node.object.position).ok, true);
  assert.equal(node.object.visible, false);
  assert.ok(state.resources.wood >= 3);
  assert.equal(storage.harvest(state, node.id, node.asset.harvestDrops), false);
  const id = node.id;
  const chunk = world.chunks.get(node.key);
  world.removeChunk(node.key, chunk);
  const [latIndex, lonIndex] = node.key.split(':').map(Number);
  world.generateChunk(latIndex, lonIndex, node.key);
  assert.equal(slice.nodes.get(id).object.visible, false);
  assert.equal(world.hash(7, 11), world.hash(7, 11));
});

test('a known blueprint previews, spends resources once, and restores the structure', () => {
  const scene = new THREE.Scene(), world = new PlanetWorld(scene);
  const storage = new DiscoveryStorage(skills, items, store(), () => 0.2);
  const { state } = storage.createCharacter('male');
  const slice = new WorldSlice(world, scene, storage); slice.setState(state);
  storage.discoverRecipe(state, 'wr_15_001');
  state.resources = { wood: 2, stone: 4 };
  assert.equal(slice.beginPreview('wr_15_001'), true);
  const playerPosition = world.spawnPositions().player;
  const forward = new THREE.Vector3(-Math.sin(world.spawnLon), 0, Math.cos(world.spawnLon));
  slice.updatePreview({ position: playerPosition, up: playerPosition.clone().normalize() }, forward);
  assert.equal(slice.preview.valid, true);
  assert.equal(slice.confirmPreview().ok, true);
  assert.equal(state.world.structures.length, 1);
  assert.equal(state.resources.wood, 0);
  assert.equal(slice.structures.size, 1);
  const restored = new WorldSlice(world, scene, storage); restored.setState(storage.load());
  assert.equal(restored.structures.size, 1);
  assert.equal(restored.beginPreview('wr_15_001'), true);
  restored.updatePreview({ position: playerPosition, up: playerPosition.clone().normalize() }, forward);
  assert.equal(restored.preview.valid, false, 'overlapping placement is blocked');
});

test('coast sand and mountain iron reveal the road and watchtower blueprints', () => {
  const scene = new THREE.Scene(), world = new PlanetWorld(scene);
  const storage = new DiscoveryStorage(skills, items, store(), () => 0.2);
  const { state } = storage.createCharacter('male');
  const slice = new WorldSlice(world, scene, storage); slice.setState(state);
  const findChunk = (biome) => {
    for (let latIndex = 25; latIndex < 115; latIndex++) for (let lonIndex = 0; lonIndex < 288; lonIndex++) {
      const lat0 = latIndex * world.chunkAngle - Math.PI / 2;
      const lon0 = lonIndex * world.chunkAngle - Math.PI;
      if (world.biomeAt(lat0 + world.chunkAngle / 2, lon0 + world.chunkAngle / 2) === biome && world.hash(latIndex, lonIndex + 400) >= 0.7) return { latIndex, lonIndex, lat0, lon0 };
    }
    throw new Error(`No ${biome} chunk found`);
  };
  for (const [biome, resource, recipeId] of [['coast', 'sand', 'wr_14_001'], ['highland', 'iron_ore', 'wr_17_006']]) {
    const found = findChunk(biome), group = new THREE.Group();
    slice.attachChunk(`${found.latIndex}:${found.lonIndex}`, group, found.latIndex, found.lonIndex, found.lat0, found.lon0);
    const node = (group.userData.worldNodes || []).find((entry) => entry.asset.harvestDrops.some((drop) => drop.resourceId === resource));
    assert.ok(node, `${biome} has ${resource}`);
    assert.equal(slice.harvest(node.object.position).ok, true);
    assert.equal(state.recipeIds.includes(recipeId), true);
  }
});
