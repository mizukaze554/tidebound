import { rollStarter, weightedPick } from './CatalogRules.js';
import { planCraft } from '../world/kit/crafting.js';

// One-time rewards and cryptographic unit rolls adapt the kit's discovery.js
// to the existing single-record local save, keeping legacy skill keys intact.

export const DISCOVERY_KEY = 'tidebound.discovery.v1';
const LEGACY_KEY = 'tidebound.customSkills.v2';
const DEFAULT_EQUIPMENT = { weapon: null, head: null, chest: null, hands: null, legs: null, feet: null };
const unitRandom = () => {
  if (!globalThis.crypto?.getRandomValues) return Math.random();
  const value = new Uint32Array(1); globalThis.crypto.getRandomValues(value); return value[0] / 4294967296;
};

export class DiscoveryStorage {
  constructor(skills, items, store = globalThis.localStorage, random = unitRandom) {
    this.skills = skills; this.items = items; this.store = store; this.random = random;
    this.skillById = new Map(skills.map((skill) => [skill.id, skill]));
    this.itemById = new Map(items.map((item) => [item.id, item]));
  }

  load() {
    const raw = this.store?.getItem(DISCOVERY_KEY);
    if (!raw) return null;
    let state;
    try { state = JSON.parse(raw); } catch { throw new Error('Discovery save is damaged. Your old save was left untouched.'); }
    if (state?.version !== 1 || !Array.isArray(state.skillIds) || !Array.isArray(state.itemIds) || !state.character) throw new Error('Discovery save is incompatible. Your old save was left untouched.');
    state.skillIds = [...new Set(state.skillIds.filter((id) => this.skillById.has(id)))];
    state.itemIds = [...new Set(state.itemIds.filter((id) => this.itemById.has(id)))];
    state.equippedSkills = [0, 1, 2].map((index) => state.skillIds.includes(state.equippedSkills?.[index]) ? state.equippedSkills[index] : null);
    state.equipment = { ...DEFAULT_EQUIPMENT, ...state.equipment };
    for (const [slot, id] of Object.entries(state.equipment)) if (!state.itemIds.includes(id)) state.equipment[slot] = null;
    state.progress ||= { distance: 0, casts: 0, blocks: 0, dodges: 0, lastDiscoveryAt: 0 };
    state.resources ||= {};
    state.recipeIds ||= [];
    state.world ||= { harvested: {}, structures: [] };
    return state;
  }

  save(state) { this.store?.setItem(DISCOVERY_KEY, JSON.stringify(state)); return state; }

  createCharacter(appearance) {
    const existing = this.load();
    if (existing) return { state: existing, newRewards: null };
    const rewards = rollStarter(this.skills, this.items, this.random);
    const state = {
      version: 1,
      character: { appearance, createdAt: Date.now() },
      skillIds: rewards.skillIds,
      itemIds: [rewards.weaponId],
      equippedSkills: [rewards.skillIds[0], rewards.skillIds[1] || null, null],
      equipment: { ...DEFAULT_EQUIPMENT, weapon: rewards.weaponId },
      progress: { distance: 0, casts: 0, blocks: 0, dodges: 0, lastDiscoveryAt: 0 },
      resources: {},
      recipeIds: [],
      world: { harvested: {}, structures: [] },
      legacyNotice: Boolean(this.store?.getItem(LEGACY_KEY) || this.store?.getItem('tidebound.customSkills.v1')),
    };
    this.save(state);
    return { state, newRewards: rewards };
  }

  knownSkills(state) { return state.skillIds.map((id) => this.skillById.get(id)).filter(Boolean); }
  knownItems(state) { return state.itemIds.map((id) => this.itemById.get(id)).filter(Boolean); }
  equippedSkills(state) { return state.equippedSkills.map((id) => this.skillById.get(id) || null); }
  equippedWeapon(state) { return this.itemById.get(state.equipment.weapon) || null; }

  setAppearance(state, appearance) {
    if (!['male', 'female'].includes(appearance)) return false;
    state.character.appearance = appearance;
    this.save(state);
    return true;
  }

  equipSkill(state, id, slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot > 2 || (id !== null && !state.skillIds.includes(id))) return false;
    state.equippedSkills = state.equippedSkills.map((value) => value === id ? null : value);
    state.equippedSkills[slot] = id;
    this.save(state); return true;
  }

  equipItem(state, id) {
    if (!state.itemIds.includes(id)) return false;
    const item = this.itemById.get(id);
    const slot = item.type === 'weapon' ? 'weapon' : item.type === 'armor' ? item.subtype : null;
    if (!slot || !(slot in state.equipment)) return false;
    state.equipment[slot] = id;
    this.save(state); return true;
  }

  harvest(state, nodeId, drops, now = Date.now()) {
    if (now - (state.world.harvested[nodeId] || 0) < 300000) return false;
    state.world.harvested[nodeId] = now;
    for (const drop of drops) state.resources[drop.resourceId] = Math.min(9999, (state.resources[drop.resourceId] || 0) + drop.quantity);
    state.progress.harvests = (state.progress.harvests || 0) + 1;
    this.save(state); return true;
  }

  discoverRecipe(state, recipeId) {
    if (state.recipeIds.includes(recipeId)) return false;
    state.recipeIds.push(recipeId); this.save(state); return true;
  }

  build(state, recipe, placement) {
    if (!state.recipeIds.includes(recipe.id)) return { ok: false, reason: 'Blueprint undiscovered.' };
    const plan = planCraft(recipe, state.resources);
    if (!plan.ok) return plan;
    state.resources = plan.inventory;
    state.world.structures.push({ id: globalThis.crypto?.randomUUID?.() || `built-${Date.now()}-${Math.random()}`, assetId: recipe.outputAssetId, ...placement });
    this.save(state);
    return { ok: true };
  }

  discover(state, { kind, tag, now = Date.now() }) {
    const progress = state.progress;
    if (now - progress.lastDiscoveryAt < 15000) return null;
    const ageDays = Math.max(0, (now - state.character.createdAt) / 86400000);
    const skillCandidates = this.skills.filter((s) => !state.skillIds.includes(s.id) && s.rank <= Math.min(6, 2 + Math.floor(state.skillIds.length / 12)) && s.discovery.minimumWorldAgeDays <= ageDays && s.discovery.sourceTags.includes(tag));
    const itemCandidates = this.items.filter((i) => !state.itemIds.includes(i.id) && i.discovery.weight > 0 && i.rarity !== 'legendary');
    const item = kind === 'item' ? weightedPick(itemCandidates, this.random) : null;
    const skill = kind === 'skill' ? weightedPick(skillCandidates, this.random) : null;
    if (!skill && !item) return null;
    if (skill) state.skillIds.push(skill.id);
    if (item) state.itemIds.push(item.id);
    progress.lastDiscoveryAt = now;
    this.save(state);
    return skill || item;
  }
}
