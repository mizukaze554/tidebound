const KEY = 'tidebound.customSkills.v1';
const EQUIPPED_KEY = 'tidebound.equippedSkills.v1';

export const DEFAULT_SKILLS = [
  { id: 'water-push', name: 'Tidal Ring', element: 'Water', effect: 'Push', shape: 'Area', power: 5, range: 7, speed: 6, duration: 2 },
  { id: 'fire-bolt', name: 'Ember Lance', element: 'Fire', effect: 'Damage', shape: 'Projectile', power: 6, range: 12, speed: 11, duration: 1 },
  { id: 'earth-guard', name: 'Stone Aegis', element: 'Earth', effect: 'Shield', shape: 'Self', power: 7, range: 1, speed: 1, duration: 5 },
];

export class SkillStorage {
  load() {
    try {
      const skills = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(skills) && skills.length ? skills : [...DEFAULT_SKILLS];
    } catch { return [...DEFAULT_SKILLS]; }
  }
  save(skills) { localStorage.setItem(KEY, JSON.stringify(skills)); }
  loadEquipped(skills) {
    try {
      const ids = JSON.parse(localStorage.getItem(EQUIPPED_KEY));
      if (Array.isArray(ids)) return [0, 1, 2].map((i) => skills.find((s) => s.id === ids[i]) || skills[i] || DEFAULT_SKILLS[i]);
    } catch { /* use defaults */ }
    return [0, 1, 2].map((i) => skills[i] || DEFAULT_SKILLS[i]);
  }
  saveEquipped(skills) { localStorage.setItem(EQUIPPED_KEY, JSON.stringify(skills.map((s) => s?.id))); }
}
