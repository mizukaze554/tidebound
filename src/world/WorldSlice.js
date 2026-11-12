import * as THREE from 'three';
import { makeWorldAsset, alignToTerrain, disposeWorldAsset } from './kit/worldAssetFactory.js';
import { worldCatalog } from '../data/WorldCatalog.js';

const NATURAL_IDS = ['wa_01_001', 'wa_04_001', 'wa_06_001'];
const STARTER_RECIPES = ['wr_15_001', 'wr_15_006', 'wr_16_001'];

export class WorldSlice {
  constructor(world, scene, storage) {
    this.world = world; this.scene = scene; this.storage = storage;
    this.nodes = new Map(); this.structures = new Map(); this.state = null; this.preview = null;
    this.naturalByBiome = new Map();
    for (const biome of ['grassland', 'forest', 'mountain', 'desert', 'alpine', 'wetland', 'coast']) {
      this.naturalByBiome.set(biome, worldCatalog.assets.filter((asset) => ['procedural_spawn', 'terrain_feature'].includes(asset.generationMode)
        && asset.placement.biomes.includes(biome) && asset.geometryPreset !== 'mountain_mass' && asset.geometryPreset !== 'rock_mass'));
    }
  }

  setState(state) {
    this.state = state;
    this.clearStructures();
    this.updateStructures(this.world.lastStreamPosition);
    for (const node of this.nodes.values()) this.refreshNode(node);
  }

  attachChunk(key, group, latIndex, lonIndex, lat0, lon0) {
    const nearSpawn = Math.abs(lat0 - this.world.spawnLat) < this.world.chunkAngle * 1.5 && Math.abs(lon0 - this.world.spawnLon) < this.world.chunkAngle * 1.5;
    if (!nearSpawn && this.world.hash(latIndex, lonIndex + 400) < 0.7) return;
    const worldBiome = this.world.biomeAt(lat0 + this.world.chunkAngle * 0.5, lon0 + this.world.chunkAngle * 0.5);
    const catalogBiome = { highland: 'mountain', steppe: 'desert', tundra: 'alpine' }[worldBiome] || worldBiome;
    const candidates = this.naturalByBiome.get(catalogBiome) || [];
    const variation = candidates[Math.floor(this.world.hash(latIndex + 19, lonIndex + 41) * candidates.length)];
    const priority = catalogBiome === 'mountain' ? 'wa_07_006' : catalogBiome === 'coast' ? 'wa_11_001' : null;
    const scenic = ['tree', 'shrub', 'mushrooms', 'rocks', 'rock_cluster', 'flower_stems'];
    const selected = nearSpawn ? [...NATURAL_IDS, ...(variation && scenic.includes(variation.geometryPreset) ? [variation.id] : [])]
      : [...(priority ? [priority] : []), ...(variation ? [variation.id] : [])];
    selected.forEach((assetId, index) => {
      const asset = worldCatalog.assetById.get(assetId);
      const lat = lat0 + this.world.chunkAngle * (0.2 + this.world.hash(latIndex + index, lonIndex + 301) * 0.6);
      const lon = lon0 + this.world.chunkAngle * (0.2 + this.world.hash(lonIndex + index, latIndex + 203) * 0.6);
      const local = this.world.valleyCoordinates(lat, lon);
      if (Math.hypot(local.x - 7, local.z) < 20) return;
      const biome = this.world.biomeAt(lat, lon);
      const placementBiome = { highland: 'mountain', steppe: 'desert', tundra: 'alpine' }[biome] || biome;
      if (!asset.placement.biomes.includes(placementBiome)) return;
      const object = makeWorldAsset(asset);
      object.traverse((child) => { if (child.isMesh) child.userData.sharedResource = true; });
      object.position.copy(this.world.surfacePoint(lat, lon, 0.08));
      alignToTerrain(object, object.position);
      (group.userData.detailGroups?.resourceGroup || group).add(object);
      const id = `${key}:${assetId}:${index}`;
      const node = { id, asset, object, key };
      this.nodes.set(id, node);
      (group.userData.worldNodes ||= []).push(node);
      this.refreshNode(node);
    });
  }

  detachChunk(group) {
    for (const node of group.userData.worldNodes || []) { this.nodes.delete(node.id); disposeWorldAsset(node.object); }
  }

  refreshNode(node, now = Date.now()) {
    const harvestedAt = this.state?.world.harvested[node.id] || 0;
    node.object.visible = !harvestedAt || now - harvestedAt >= 300000;
  }

  nearestNode(position, maxDistance = 3.8) {
    let best = null, distance = maxDistance;
    for (const node of this.nodes.values()) {
      if (!node.object.visible || !node.asset.physics.harvestable) continue;
      const d = node.object.position.distanceTo(position);
      if (d < distance) { best = node; distance = d; }
    }
    return best;
  }

  harvest(position) {
    const node = this.nearestNode(position);
    if (!node) return { ok: false, message: 'Move close to grass, a tree, or a stone pile.' };
    if (!this.storage.harvest(this.state, node.id, node.asset.harvestDrops)) return { ok: false, message: 'This resource is regrowing.' };
    this.refreshNode(node);
    const count = this.state.progress.harvests;
    const recipeId = STARTER_RECIPES[count >= 8 ? 2 : count >= 3 ? 1 : 0];
    const learned = this.storage.discoverRecipe(this.state, recipeId);
    const hasSand = node.asset.harvestDrops.some((drop) => drop.resourceId === 'sand');
    const hasIron = node.asset.harvestDrops.some((drop) => drop.resourceId === 'iron_ore');
    const regional = hasSand ? this.storage.discoverRecipe(this.state, 'wr_14_001') : hasIron ? this.storage.discoverRecipe(this.state, 'wr_17_006') : false;
    let bonus = false;
    if (count > 8 && count % 6 === 0) bonus = this.discoverBlueprint(count);
    return { ok: true, message: `Gathered ${node.asset.harvestDrops.map((drop) => `${drop.quantity} ${drop.resourceId}`).join(', ')}.${learned || regional || bonus ? ' New blueprint discovered!' : ''}`, recipeId: learned ? recipeId : null };
  }

  discoverBlueprint(seed) {
    const unknown = worldCatalog.recipes.filter((recipe) => !this.state.recipeIds.includes(recipe.id));
    if (!unknown.length) return false;
    const recipe = unknown[Math.floor(this.world.hash(seed, 883) * unknown.length)];
    return this.storage.discoverRecipe(this.state, recipe.id);
  }

  clearStructures() {
    for (const object of this.structures.values()) { this.scene.remove(object); disposeWorldAsset(object); }
    this.structures.clear();
  }

  showStructure(placement) {
    if (this.structures.has(placement.id)) return;
    const asset = worldCatalog.assetById.get(placement.assetId);
    if (!asset) return;
    const object = makeWorldAsset(asset);
    object.position.copy(this.world.surfacePoint(placement.lat, placement.lon, 0.08));
    alignToTerrain(object, object.position);
    object.rotateY(placement.rotation || 0);
    this.scene.add(object);
    this.structures.set(placement.id, object);
  }

  updateStructures(position) {
    if (!this.state || !position) return;
    for (const placement of this.state.world.structures) {
      const point = this.world.surfacePoint(placement.lat, placement.lon, 0.08);
      if (point.distanceTo(position) < 140) this.showStructure(placement);
      else if (point.distanceTo(position) > 170 && this.structures.has(placement.id)) {
        const object = this.structures.get(placement.id);
        this.scene.remove(object); disposeWorldAsset(object); this.structures.delete(placement.id);
      }
    }
  }

  beginPreview(recipeId) {
    this.cancelPreview();
    const recipe = worldCatalog.recipeById.get(recipeId);
    if (!recipe || !this.state?.recipeIds.includes(recipeId)) return false;
    const asset = worldCatalog.assetById.get(recipe.outputAssetId);
    const object = makeWorldAsset(asset);
    object.traverse((child) => { if (child.isMesh) { child.material = child.material.clone(); child.material.transparent = true; child.material.opacity = 0.55; } });
    this.scene.add(object);
    this.preview = { recipe, object, rotation: 0, valid: false, placement: null };
    return true;
  }

  rotatePreview() { if (this.preview) this.preview.rotation += Math.PI / 4; }

  updatePreview(player, forward) {
    if (!this.preview) return;
    const candidate = player.position.clone().addScaledVector(forward.clone().projectOnPlane(player.up).normalize(), 5);
    candidate.normalize().multiplyScalar(this.world.surfaceRadius(candidate) + 0.08);
    const { lat, lon } = this.world.coordinates(candidate);
    const epsilon = 1 / this.world.radius;
    const slope = Math.atan2(Math.max(Math.abs(this.world.heightAt(lat + epsilon, lon) - this.world.heightAt(lat - epsilon, lon)), Math.abs(this.world.heightAt(lat, lon + epsilon) - this.world.heightAt(lat, lon - epsilon))), 2) * 180 / Math.PI;
    const noCollision = [...this.structures.values()].every((object) => object.position.distanceTo(candidate) > 4)
      && [...this.nodes.values()].every((node) => !node.object.visible || node.object.position.distanceTo(candidate) > 2.5)
      && !this.world.valley?.blocksMovement(candidate, 2);
    this.preview.valid = slope <= this.preview.recipe.placementRules.terrainSlopeMaxDegrees && noCollision;
    this.preview.placement = { lat, lon, rotation: this.preview.rotation };
    this.preview.object.position.copy(candidate);
    alignToTerrain(this.preview.object, candidate);
    this.preview.object.rotateY(this.preview.rotation);
  }

  confirmPreview() {
    if (!this.preview?.valid) return { ok: false, reason: 'Choose flatter, clear ground.' };
    const { recipe, placement } = this.preview;
    const result = this.storage.build(this.state, recipe, placement);
    if (result.ok) { this.showStructure(this.state.world.structures.at(-1)); this.cancelPreview(); }
    return result;
  }

  cancelPreview() {
    if (!this.preview) return;
    this.scene.remove(this.preview.object);
    this.preview.object.traverse((child) => { if (child.isMesh) child.material.dispose(); });
    disposeWorldAsset(this.preview.object);
    this.preview = null;
  }

  blocksMovement(position, radius) {
    return [...this.structures.values()].some((object) => object.position.distanceTo(position) < 1.5 + radius)
      || [...this.nodes.values()].some((node) => node.object.visible && node.asset.physics.collidable && node.object.position.distanceTo(position) < 1 + radius);
  }

  update(position, now = Date.now()) {
    for (const node of this.nodes.values()) if (!node.object.visible) this.refreshNode(node, now);
    this.structureTimer = (this.structureTimer || 0) + 1;
    if (this.structureTimer >= 60) { this.structureTimer = 0; this.updateStructures(position); }
  }
}
