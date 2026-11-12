const shapes = {
  dagger: '<path d="M12 3 8 14l4 2 4-2L12 3ZM7 17h10M12 16v5"/>',
  sword: '<path d="M12 2v14M9 4l3-2 3 2-3 12M6 16h12M12 16v6"/>',
  greatsword: '<path d="m12 2 4 4-3 10h-2L8 6l4-4ZM5 17h14M12 17v5"/>',
  axe: '<path d="M12 3v19M12 5c-4-2-7-1-9 2l3 6c3-2 5-2 6-1M12 5c4-2 7-1 9 2l-3 6c-3-2-5-2-6-1"/>',
  hammer: '<path d="M12 9v13M4 4h16v7H4zM6 4V2m12 2V2"/>',
  spear: '<path d="M12 2 9 9l3 3 3-3-3-7ZM12 12v10"/>',
  bow: '<path d="M7 3c10 2 10 16 0 18M7 3v18M7 12h12m-3-3 3 3-3 3"/>',
  staff: '<path d="M12 7v15M12 2l4 3-4 3-4-3 4-3ZM8 15h8"/>',
  wand: '<path d="m7 21 10-14M17 2v5m-3-3h6m-7 5 4 3"/>',
  gauntlets: '<path d="M7 11V5a2 2 0 0 1 4 0v4-5a2 2 0 0 1 4 0v5-3a2 2 0 0 1 4 0v9l-4 6H8l-4-6v-4a2 2 0 0 1 3 0Z"/>',
  head: '<path d="M4 14V9a8 8 0 0 1 16 0v5l-3 6H7l-3-6ZM4 13h16M9 17h6"/>',
  chest: '<path d="m7 3 5 3 5-3 4 4-3 5v9H6v-9L3 7l4-4ZM9 10h6"/>',
  hands: '<path d="M7 11V5a2 2 0 0 1 4 0v4-5a2 2 0 0 1 4 0v5-3a2 2 0 0 1 4 0v9l-4 6H8l-4-6v-4a2 2 0 0 1 3 0Z"/>',
  legs: '<path d="M5 3h14l-1 18h-5l-1-9-1 9H6L5 3ZM5 8h14"/>',
  feet: '<path d="M5 4h6v10l3 3h6v4H4v-4l1-3V4Z"/>',
  utility: '<path d="M9 3h6v4l3 3v11H6V10l3-3V3ZM9 7h6M9 14h6m-3-3v6"/>',
};

export function createItemIcon(item) {
  const icon = document.createElement('span');
  icon.className = `item-icon ${item.rarity || ''}`;
  icon.setAttribute('role', 'img');
  icon.setAttribute('aria-label', `${item.subtype || item.type} icon`);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = shapes[item.subtype] || shapes[item.type] || shapes.utility;
  icon.append(svg);
  return icon;
}
