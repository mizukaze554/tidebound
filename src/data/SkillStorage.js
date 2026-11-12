const KEY = 'tidebound.customSkills.v2';
const LEGACY_KEY = 'tidebound.customSkills.v1';
const EQUIPPED_KEY = 'tidebound.equippedSkills.v1';

export const DEFAULT_SKILLS = [
  { id: 'water-push', name: 'Tidal Ring', element: 'Water', effect: 'Push', shape: 'Area', power: 5, range: 7, speed: 6, duration: 2 },
  { id: 'fire-bolt', name: 'Ember Lance', element: 'Fire', effect: 'Damage', shape: 'Projectile', power: 6, range: 10, speed: 8, duration: 1 },
  { id: 'earth-guard', name: 'Stone Aegis', element: 'Earth', effect: 'Shield', shape: 'Self', power: 7, range: 1, speed: 1, duration: 5 },
];

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createSkillId() {
  return globalThis.crypto?.randomUUID?.() || `skill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeSkills(skills) {
  const used = new Set();
  return skills.map((skill, index) => {
    let id = typeof skill.id === 'string' && skill.id.trim() ? skill.id : `skill-migrated-${hashString(`${index}:${JSON.stringify(skill)}`)}`;
    while (used.has(id)) id = `${id}-${index}`;
    used.add(id);
    return { ...skill, id };
  });
}

export class SkillStorage {
  constructor(store = globalThis.localStorage) { this.store = store; }

  load() {
    try {
      const raw = this.store?.getItem(KEY) || this.store?.getItem(LEGACY_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const skills = normalizeSkills(Array.isArray(parsed) ? parsed : DEFAULT_SKILLS.map((skill) => ({ ...skill })));
      this.save(skills); // Persists migrated IDs once so subsequent edits are stable.
      return skills;
    } catch { return DEFAULT_SKILLS.map((skill) => ({ ...skill })); }
  }

  save(skills) {
    const normalized = normalizeSkills(skills);
    this.store?.setItem(KEY, JSON.stringify(normalized));
    return normalized;
  }

  upsert(skill) {
    const skills = this.load();
    const normalized = { ...skill, id: skill.id || createSkillId() };
    const index = skills.findIndex((item) => item.id === normalized.id);
    if (index >= 0) skills[index] = normalized; else skills.push(normalized);
    this.save(skills);
    return normalized;
  }

  delete(id) {
    const next = this.load().filter((skill) => skill.id !== id);
    this.save(next);
    try {
      const equipped = JSON.parse(this.store?.getItem(EQUIPPED_KEY));
      if (Array.isArray(equipped)) this.store?.setItem(EQUIPPED_KEY, JSON.stringify(equipped.map((equippedId) => equippedId === id ? null : equippedId)));
    } catch { /* malformed legacy equip data is ignored */ }
    return next;
  }

  loadEquipped(skills) {
    try {
      const ids = JSON.parse(this.store?.getItem(EQUIPPED_KEY));
      if (Array.isArray(ids)) return [0, 1, 2].map((i) => ids[i] === null ? null : skills.find((skill) => skill.id === ids[i]) || skills[i] || DEFAULT_SKILLS[i]);
    } catch { /* use defaults */ }
    return [0, 1, 2].map((i) => skills[i] || DEFAULT_SKILLS[i]);
  }

  saveEquipped(skills) { this.store?.setItem(EQUIPPED_KEY, JSON.stringify(skills.map((skill) => skill?.id || null))); }
}
