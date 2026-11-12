const ELEMENTS = ['Water', 'Fire', 'Wind', 'Earth'];
const EFFECTS = ['Damage', 'Push', 'Pull', 'Shield', 'Heal'];
const SHAPES = ['Projectile', 'Area', 'Beam', 'Self'];
const MAX_IMPORT_BYTES = 32 * 1024;
const MAX_SKILLS = 24;

const number = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export function normalizeSkillDefinition(skill = {}) {
  return {
    ...(typeof skill.id === 'string' && skill.id.trim() ? { id: skill.id.trim().slice(0, 80) } : {}),
    name: typeof skill.name === 'string' ? skill.name.trim().slice(0, 24) : '',
    element: ELEMENTS.includes(skill.element) ? skill.element : 'Water',
    effect: EFFECTS.includes(skill.effect) ? skill.effect : 'Damage',
    shape: SHAPES.includes(skill.shape) ? skill.shape : 'Projectile',
    power: number(skill.power, 5, 1, 10),
    range: number(skill.range, 7, 1, 10),
    speed: number(skill.speed, 6, 1, 10),
    duration: number(skill.duration, 2, 1, 10),
    projectileCount: Math.round(number(skill.projectileCount, 1, 1, 5)),
    spread: number(skill.spread, 0, 0, 35),
    knockback: number(skill.knockback, 5, 1, 10),
    castTime: number(skill.castTime, 0, 0, 1.5),
  };
}

export function validateSkillSchema(skill) {
  if (!skill || typeof skill !== 'object' || Array.isArray(skill)) return 'Each technique must be an object.';
  if (typeof skill.name !== 'string' || !skill.name.trim() || skill.name.length > 24) return 'Technique names must contain 1–24 characters.';
  if (!ELEMENTS.includes(skill.element)) return 'Invalid element.';
  if (!EFFECTS.includes(skill.effect)) return 'Invalid effect.';
  if (!SHAPES.includes(skill.shape)) return 'Invalid shape.';
  const limits = { power: [1, 10], range: [1, 10], speed: [1, 10], duration: [1, 10], projectileCount: [1, 5], spread: [0, 35], knockback: [1, 10], castTime: [0, 1.5] };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (skill[key] == null && ['projectileCount', 'spread', 'knockback', 'castTime'].includes(key)) continue;
    if (!Number.isFinite(Number(skill[key])) || Number(skill[key]) < min || Number(skill[key]) > max) return `${key} must be from ${min} to ${max}.`;
  }
  if (skill.id != null && (typeof skill.id !== 'string' || skill.id.length > 80)) return 'Invalid technique ID.';
  return null;
}

export function parseSkillImport(text, createId) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('Import must be a JSON file smaller than 32 KB.');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('The selected file is not valid JSON.'); }
  const rawSkills = Array.isArray(parsed) ? parsed : parsed?.skills;
  if (!Array.isArray(rawSkills) || rawSkills.length < 1 || rawSkills.length > MAX_SKILLS) throw new Error('Import must contain 1–24 techniques.');
  return rawSkills.map((raw) => {
    const error = validateSkillSchema(raw);
    if (error) throw new Error(error);
    return { ...normalizeSkillDefinition(raw), id: createId() };
  });
}

export function serializeSkillExport(skills) {
  return JSON.stringify({ format: 'tidebound-skills', version: 1, exportedAt: new Date().toISOString(), skills: skills.map(normalizeSkillDefinition) }, null, 2);
}

export { MAX_SKILLS };
