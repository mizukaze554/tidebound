const DOT = new Set(['burn', 'bleed', 'poison', 'scorch']);
const SLOW = new Set(['slow', 'root', 'stagger', 'daze', 'disorient']);
const WEAK = new Set(['blind', 'weaken', 'obscure', 'drain']);
const VULNERABLE = new Set(['armor_break', 'mark', 'pierce', 'soak', 'shock']);
const ATTACK_BUFF = new Set(['heat', 'charge', 'amplify', 'empower', 'resonate']);
const DEFENSE_BUFF = new Set(['fortify', 'reinforce', 'anchor', 'reflect', 'veil']);
const SPEED_BUFF = new Set(['flow', 'momentum', 'evade', 'conceal', 'chill']);
const HEAL_BUFF = new Set(['regenerate', 'restore', 'mend', 'entangle', 'erode']);

export function modifier(kind, id, magnitude = 0.15) {
  if (kind === 'status') return { dot: DOT.has(id) ? 2 : 0, speed: SLOW.has(id) ? (id === 'root' ? 0 : 0.72) : 1, attack: WEAK.has(id) ? 0.8 : 1, defense: VULNERABLE.has(id) ? 0.75 : 1 };
  return { attack: ATTACK_BUFF.has(id) ? 1 + magnitude : 1, defense: DEFENSE_BUFF.has(id) ? 1 + magnitude : 1, speed: SPEED_BUFF.has(id) ? 1 + magnitude : 1, healing: HEAL_BUFF.has(id) ? magnitude : 0 };
}
