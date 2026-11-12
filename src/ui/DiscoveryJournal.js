import { createItemIcon } from './ItemIcon.js';

export class DiscoveryJournal {
  constructor(root, storage, worldCatalog, handlers = {}) {
    this.storage = storage; this.worldCatalog = worldCatalog; this.handlers = handlers;
    this.el = document.createElement('section');
    this.el.className = 'overlay discovery-journal hidden';
    this.el.innerHTML = `<div class="journal-shell"><header><div><small>THE KNOWN WORLD</small><h2>DISCOVERY JOURNAL</h2></div><button type="button" class="icon-button" data-close aria-label="Close journal">×</button></header><p data-notice></p><nav><button data-tab="skills">SKILLS DISCOVERED</button><button data-tab="items">INVENTORY</button><button data-tab="build">BLUEPRINTS</button></nav><p data-summary></p><div class="journal-list" data-list></div></div>`;
    root.append(this.el);
    this.el.querySelector('[data-close]').onclick = () => this.close();
    this.el.querySelectorAll('[data-tab]').forEach((button) => button.onclick = () => { this.tab = button.dataset.tab; this.render(); });
    this.tab = 'skills';
  }

  open(state) { this.state = state; this.render(); this.el.classList.remove('hidden'); }
  close() { this.el.classList.add('hidden'); this.handlers.close?.(); }

  render() {
    const list = this.el.querySelector('[data-list]'); list.replaceChildren();
    this.el.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('selected', button.dataset.tab === this.tab));
    const state = this.state;
    if (!state) {
      this.el.querySelector('[data-summary]').textContent = 'Create a character to begin discovering the world.';
      this.el.querySelector('[data-notice]').textContent = '';
      return;
    }
    this.el.querySelector('[data-notice]').textContent = state.legacyNotice ? 'Your previous technique save is preserved in local storage as a legacy backup. It is separate from this fixed discovery catalog.' : '';
    if (this.tab === 'skills') {
      const skills = this.storage.knownSkills(state);
      this.el.querySelector('[data-summary]').textContent = `${skills.length} skills discovered · only discovered skills appear here.`;
      for (const skill of skills) {
        const row = this.row(skill.name, `${skill.domain} · Rank ${skill.rank} · ${skill.description}`);
        for (let slot = 0; slot < 3; slot++) {
          const button = document.createElement('button'); button.textContent = state.equippedSkills[slot] === skill.id ? `${['E','R','F'][slot]} EQUIPPED` : `EQUIP ${['E','R','F'][slot]}`;
          button.onclick = () => { this.handlers.equipSkill?.(skill.id, slot); this.render(); };
          row.append(button);
        }
        list.append(row);
      }
    } else if (this.tab === 'items') {
      const items = this.storage.knownItems(state);
      const resources = Object.entries(state.resources || {}).filter(([, count]) => count > 0).map(([name, count]) => `${name}: ${count}`).join(' · ');
      this.el.querySelector('[data-summary]').textContent = `${items.length} items found · ${resources || 'No materials gathered yet'}`;
      for (const item of items) {
        const row = this.row(item.name, `${item.type} · ${item.description}`);
        row.prepend(createItemIcon(item));
        if (item.type !== 'utility') {
          const button = document.createElement('button'); button.textContent = Object.values(state.equipment).includes(item.id) ? 'EQUIPPED' : 'EQUIP';
          button.onclick = () => { this.handlers.equipItem?.(item.id); this.render(); };
          row.append(button);
        }
        list.append(row);
      }
    } else {
      const recipes = (state.recipeIds || []).map((id) => this.worldCatalog.recipeById.get(id)).filter(Boolean);
      this.el.querySelector('[data-summary]').textContent = `${recipes.length} blueprints discovered · gather materials and build near your character.`;
      for (const recipe of recipes) {
        const asset = this.worldCatalog.assetById.get(recipe.outputAssetId);
        const row = this.row(asset.name, recipe.materials.map((material) => `${material.quantity} ${material.resourceId}`).join(' · '));
        const button = document.createElement('button'); button.textContent = 'PREVIEW';
        button.onclick = () => { this.handlers.previewBuild?.(recipe.id); this.close(); };
        row.append(button); list.append(row);
      }
    }
  }

  row(name, detail) {
    const row = document.createElement('div'); row.className = 'journal-row';
    const text = document.createElement('div'); const title = document.createElement('b'); title.textContent = name;
    const description = document.createElement('small'); description.textContent = detail;
    text.append(title, description); row.append(text); return row;
  }
}
