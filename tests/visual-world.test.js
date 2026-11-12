import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import * as THREE from 'three';
import { PlanetWorld } from '../src/world/PlanetWorld.js';
import { EnvironmentAssetRegistry } from '../src/world/EnvironmentAssetRegistry.js';

test('Azure Valley terrain remains seeded, spherical, and clear at spawn', () => {
  const world = new PlanetWorld(new THREE.Scene());
  const lat = world.spawnLat, lon = world.spawnLon;
  assert.equal(world.heightAt(lat, lon), world.heightAt(lat, lon));
  assert.ok(Math.abs(world.surfacePoint(lat, lon).length() - world.surfaceRadius(world.surfacePoint(lat, lon))) < 0.001);
  assert.equal(world.valley.blocksMovement(world.spawnPositions().player), false);
  assert.equal(world.biomeAt(lat, lon), 'grassland');
  assert.equal(world.biomeAt(lat - 14 / world.radius, lon - 34 / (world.radius * Math.cos(lat))), 'wetland');
  assert.ok(world.valley.group.children.some((object) => object.name === 'Azure River'));
  assert.ok(world.valley.waterfall);
  const seam = world.heightAt(lat, Math.PI) - world.heightAt(lat, -Math.PI);
  assert.ok(Math.abs(seam) < 1e-7);
  assert.ok(world.chunks.size > 0);
});

test('optional environment art has a safe procedural fallback', async () => {
  const registry = new EnvironmentAssetRegistry();
  const fallback = new THREE.Group();
  assert.equal(await registry.create('missing', () => fallback), fallback);
  assert.equal(await registry.load('missing'), null);
  const manifest = JSON.parse(await readFile(new URL('../public/assets/models/environment/manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest, {});
});

test('optimized owner models and supplied exploration audio are in the production output', async () => {
  for (const name of ['male', 'female']) {
    const path = new URL(`../dist/assets/models/wayfarer-${name}.glb`, import.meta.url);
    const size = (await stat(path)).size;
    assert.ok(size > 1_000_000 && size < 5_000_000, `${name} model size ${size}`);
    const header = await readFile(path);
    assert.equal(header.toString('ascii', 0, 4), 'glTF');
  }
  const music = await stat(new URL('../dist/assets/audio/kulakovka-action-game-620581.mp3', import.meta.url));
  assert.ok(music.size > 100_000);
});
