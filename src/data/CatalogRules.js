export const RARITIES = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
export const SHAPES = new Set(['projectile', 'melee_arc', 'area', 'barrier', 'dash']);
const TARGETS = { projectile: 'single_enemy', melee_arc: 'enemies_in_arc', area: 'enemies_in_radius', barrier: 'self', dash: 'self' };
export const EFFECTS = new Set(['damage', 'status', 'shield', 'buff', 'dash']);
export const STATUSES = new Set(['armor_break', 'bleed', 'blind', 'burn', 'daze', 'disorient', 'drain', 'mark', 'obscure', 'pierce', 'poison', 'pull', 'root', 'scorch', 'shock', 'slow', 'soak', 'stagger', 'weaken']);
export const BUFFS = new Set(['amplify', 'anchor', 'charge', 'chill', 'conceal', 'empower', 'entangle', 'erode', 'evade', 'flow', 'fortify', 'heat', 'mend', 'momentum', 'reflect', 'regenerate', 'reinforce', 'resonate', 'restore', 'veil']);
const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const text = (value) => typeof value === 'string' && value.length > 0 && value.length <= 140;

export function validateCatalog(skills, items) {
  const errors = [];
  if (!Array.isArray(skills) || skills.length !== 1000) errors.push('Expected exactly 1,000 skills.');
  if (!Array.isArray(items) || items.length !== 100) errors.push('Expected exactly 100 items.');
  if (errors.length) return errors;
  const ids = new Set(), names = new Set();
  const checkIdentity = (entry, kind) => {
    if (!text(entry?.id) || ids.has(entry.id)) errors.push(`${kind}: invalid or duplicate ID`);
    else ids.add(entry.id);
    if (!text(entry?.name) || names.has(entry.name.toLowerCase())) errors.push(`${kind}: invalid or duplicate name`);
    else names.add(entry.name.toLowerCase());
  };
  for (const skill of skills) {
    checkIdentity(skill, 'skill');
    if (!RARITIES.has(skill.rarity) || !Number.isInteger(skill.rank) || skill.rank < 1 || skill.rank > 6 || !text(skill.domain) || !text(skill.element) || !text(skill.family) || skill.schemaVersion !== 1) errors.push(`${skill.id}: invalid identity fields`);
    const combat = skill.combat;
    if (!combat || !SHAPES.has(combat.shape) || TARGETS[combat.shape] !== combat.target || !inRange(combat.castTimeSec, 0, 3) || !inRange(combat.cooldownSec, 0.1, 120) || !inRange(combat.energyCost, 0, 100) || !inRange(combat.rangeM, 0, 100) || !inRange(combat.radiusM, 0, 100) || !Array.isArray(combat.effects) || !combat.effects.length) { errors.push(`${skill.id}: invalid combat`); continue; }
    for (const effect of combat.effects) {
      if (!EFFECTS.has(effect.type)) errors.push(`${skill.id}: unsupported effect`);
      if (effect.type === 'damage' && (!inRange(effect.amount, 0, 500) || !text(effect.damageType))) errors.push(`${skill.id}: invalid damage`);
      if (effect.type === 'status' && (!STATUSES.has(effect.statusId) || !inRange(effect.chance, 0, 1) || !inRange(effect.durationSec, 0, 120))) errors.push(`${skill.id}: invalid status`);
      if (effect.type === 'buff' && (!BUFFS.has(effect.buffId) || !inRange(effect.magnitude, 0, 5) || !inRange(effect.durationSec, 0, 120))) errors.push(`${skill.id}: invalid buff`);
      if (effect.type === 'shield' && (!inRange(effect.amount, 0, 500) || !inRange(effect.durationSec, 0, 120))) errors.push(`${skill.id}: invalid shield`);
      if (effect.type === 'dash' && (!inRange(effect.distanceM, 0, 50) || !inRange(effect.invulnerableSec, 0, 5))) errors.push(`${skill.id}: invalid dash`);
    }
    if (!skill.discovery || !Array.isArray(skill.discovery.sourceTags) || !skill.discovery.sourceTags.every(text) || !inRange(skill.discovery.weight, 0, 1000) || typeof skill.discovery.starterEligible !== 'boolean' || !inRange(skill.discovery.minimumWorldAgeDays, 0, 10000)) errors.push(`${skill.id}: invalid discovery`);
    if (!skill.presentation || skill.presentation.iconKey !== `${skill.element}_${skill.family}` || skill.presentation.vfxKey !== `${skill.element}_${skill.family}` || skill.presentation.sfxKey !== `${skill.element}_cast`) errors.push(`${skill.id}: invalid presentation`);
  }
  for (const item of items) {
    checkIdentity(item, 'item');
    if (!RARITIES.has(item.rarity) || !['weapon', 'armor', 'utility'].includes(item.type) || !text(item.subtype) || !text(item.assetKey) || !item.stats || item.schemaVersion !== 1) errors.push(`${item.id}: invalid item`);
    if (item.type === 'weapon' && (!inRange(item.stats.attack, 0, 500) || !inRange(item.stats.reachM, 0, 20))) errors.push(`${item.id}: invalid weapon stats`);
    if (item.type === 'armor' && !inRange(item.stats.defense, 0, 500)) errors.push(`${item.id}: invalid armor stats`);
    if (item.type === 'utility' && (!text(item.stats.effectId) || !inRange(item.stats.uses, 0, 1000))) errors.push(`${item.id}: invalid utility stats`);
    if (item.requirements?.class != null || !inRange(item.requirements?.level, 0, 100)) errors.push(`${item.id}: invalid requirements`);
    if (!item.discovery || !inRange(item.discovery.weight, 0, 1000) || typeof item.discovery.starterEligible !== 'boolean') errors.push(`${item.id}: invalid discovery`);
  }
  return errors;
}

export function weightedPick(entries, random = Math.random) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.discovery.weight), 0);
  if (total <= 0) return null;
  let roll = Math.min(0.999999999, Math.max(0, random())) * total;
  for (const entry of entries) { roll -= Math.max(0, entry.discovery.weight); if (roll < 0) return entry; }
  return entries.at(-1);
}

export function rollStarter(skills, items, random = Math.random) {
  const eligible = skills.filter((s) => s.discovery.starterEligible && s.rank <= 2);
  const first = weightedPick(eligible, random);
  const secondPool = eligible.filter((s) => s.id !== first?.id && s.domain !== first?.domain);
  const second = random() < 0.5 ? weightedPick(secondPool.length ? secondPool : eligible.filter((s) => s.id !== first?.id), random) : null;
  const weapon = weightedPick(items.filter((i) => i.type === 'weapon' && i.discovery.starterEligible && i.requirements.class == null), random);
  if (!first || !weapon) throw new Error('Catalog has no eligible starter rewards.');
  return { skillIds: [first.id, ...(second ? [second.id] : [])], weaponId: weapon.id };
}
