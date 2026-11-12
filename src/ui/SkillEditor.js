import { animate } from 'animejs';
import { SkillSystem, ELEMENTS } from '../combat/SkillSystem.js';
import { createSkillId } from '../data/SkillStorage.js';
import { MAX_SKILLS, parseSkillImport, serializeSkillExport } from '../data/SkillSchema.js';

const DEFAULT_FORM = { name: 'Riptide Pulse', element: 'Water', effect: 'Push', shape: 'Area', power: 5, range: 7, speed: 6, duration: 2, projectileCount: 1, spread: 0, knockback: 5, castTime: 0 };

export class SkillEditor {
  constructor(root, storage, onClose, onEquip) {
    this.root = root; this.storage = storage; this.onClose = onClose; this.onEquip = onEquip;
    this.skills = storage.load();
    this.equipSlot = 0;
    this.editingId = createSkillId();
    this.el = document.createElement('section');
    this.el.className = 'overlay skill-editor hidden';
    this.el.innerHTML = `
      <div class="editor-shell panel-cut">
        <header class="editor-header"><div><small>ARCANE WORKBENCH / 01</small><h2>FORGE A TECHNIQUE</h2><p>Combine elemental behavior with a delivery shape. Every parameter changes the live combat ability.</p></div><button class="icon-button" data-close>×</button></header>
        <div class="editor-grid">
          <form data-form>
            <label class="field wide"><span>Technique name</span><input name="name" maxlength="24" value="Riptide Pulse" /></label>
            <fieldset><legend>Element</legend><div class="choice-grid" data-element>${Object.keys(ELEMENTS).map((value, index) => `<label class="choice element-${value.toLowerCase()}"><input type="radio" name="element" value="${value}" ${index === 0 ? 'checked' : ''}><i>${value[0]}</i><span>${value}</span></label>`).join('')}</div></fieldset>
            <div class="select-row"><label class="field"><span>Effect</span><select name="effect"><option>Damage</option><option selected>Push</option><option>Pull</option><option>Shield</option><option>Heal</option></select></label><label class="field"><span>Shape</span><select name="shape"><option>Projectile</option><option selected>Area</option><option>Beam</option><option>Self</option></select></label></div>
            <div class="sliders">${[['power',5,1,10,1],['range',7,1,10,1],['speed',6,1,10,1],['duration',2,1,10,1],['projectileCount',1,1,5,1],['spread',0,0,35,1],['knockback',5,1,10,1],['castTime',0,0,1.5,.1]].map(([key,value,min,max,step]) => `<label data-advanced="${key}"><span>${key.replace(/([A-Z])/g, ' $1')}<output>${value}</output></span><input type="range" name="${key}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`).join('')}</div>
            <div class="editor-actions"><button type="button" class="ghost-button" data-new>NEW</button><button type="button" class="ghost-button" data-save>SAVE</button><button type="button" class="text-button danger" data-delete>DELETE</button><button type="button" class="text-button" data-export>EXPORT JSON</button><button type="button" class="text-button" data-import>IMPORT JSON</button><input class="hidden" data-import-file type="file" accept="application/json,.json"><select data-slot aria-label="Equip slot"><option value="0">Equip to E</option><option value="1">Equip to R</option><option value="2">Equip to F</option></select><button type="button" class="primary-button" data-equip>EQUIP</button><button type="button" class="text-button" data-unequip>UNEQUIP</button></div>
            <p class="form-feedback" data-feedback></p>
          </form>
          <aside class="skill-preview">
            <div class="preview-viewport" data-preview><div class="preview-orbit"><i></i><i></i><i></i></div><span data-preview-glyph>WP</span></div>
            <div class="cost-card"><small>PROJECTED ENERGY LOAD</small><strong data-cost>0</strong><span>/ 100 ENERGY</span><div><i data-cost-bar></i></div></div>
            <div class="rule-card"><b>BEHAVIOR RULE</b><p data-rule></p></div>
            <div class="library"><header><b>SAVED TECHNIQUES</b><span data-count></span></header><div data-library></div></div>
          </aside>
        </div>
      </div>`;
    root.append(this.el);
    this.form = this.el.querySelector('[data-form]');
    this.el.querySelector('[data-close]').onclick = () => this.close();
    this.el.querySelector('[data-new]').onclick = () => this.newSkill();
    this.el.querySelector('[data-save]').onclick = () => this.save();
    this.el.querySelector('[data-delete]').onclick = () => this.delete();
    this.el.querySelector('[data-equip]').onclick = () => this.equip();
    this.el.querySelector('[data-unequip]').onclick = () => this.unequip();
    this.el.querySelector('[data-export]').onclick = () => this.exportJSON();
    this.el.querySelector('[data-import]').onclick = () => this.el.querySelector('[data-import-file]').click();
    this.el.querySelector('[data-import-file]').onchange = (event) => this.importJSON(event.target.files?.[0]);
    this.el.querySelector('[data-slot]').onchange = (event) => { this.equipSlot = Number(event.target.value); };
    this.form.addEventListener('input', (event) => {
      if (event.target.type === 'range') event.target.closest('label').querySelector('output').textContent = event.target.value;
      this.refresh();
    });
    this.renderLibrary(); this.refresh();
  }

  value() {
    const data = new FormData(this.form);
    return { id: this.editingId, name: String(data.get('name')).trim(), element: data.get('element'), effect: data.get('effect'), shape: data.get('shape'), power: +data.get('power'), range: +data.get('range'), speed: +data.get('speed'), duration: +data.get('duration'), projectileCount: +data.get('projectileCount'), spread: +data.get('spread'), knockback: +data.get('knockback'), castTime: +data.get('castTime') };
  }

  refresh() {
    const skill = this.value();
    const error = SkillSystem.validate(skill);
    const cost = SkillSystem.cost(skill);
    this.el.querySelector('[data-cost]').textContent = cost;
    this.el.querySelector('[data-cost-bar]').style.width = `${Math.min(100, cost)}%`;
    this.el.querySelector('[data-preview-glyph]').textContent = `${skill.element[0]}${skill.effect[0]}`;
    this.el.querySelector('[data-preview]').className = `preview-viewport element-${skill.element.toLowerCase()} shape-${skill.shape.toLowerCase()}`;
    const range = SkillSystem.range(skill);
    const rules = {
      Projectile: `${skill.projectileCount} projectile${skill.projectileCount === 1 ? '' : 's'} travel at speed ${skill.speed} over ${range} metres with ${skill.spread}° spread. Each can apply ${skill.effect.toLowerCase()} once.`,
      Area: `Expands around the caster to exactly ${range} metres; each target can be affected once.`,
      Beam: `Instant body hit test over exactly ${range} metres, applying ${skill.effect.toLowerCase()} once.`,
      Self: skill.effect === 'Push' ? `Self + Push becomes a forward dash of up to ${range} metres.` : `Applies ${skill.effect.toLowerCase()} directly to the caster.`,
    };
    this.el.querySelector('[data-rule]').textContent = error || rules[skill.shape];
    this.el.querySelector('[data-feedback]').textContent = error || '';
    this.el.querySelector('[data-equip]').disabled = Boolean(error);
    this.el.querySelector('[data-delete]').disabled = !this.skills.some((item) => item.id === this.editingId);
    for (const key of ['projectileCount', 'spread']) this.form.elements[key].disabled = skill.shape !== 'Projectile';
  }

  persistCurrent() {
    const skill = this.value();
    const error = SkillSystem.validate(skill);
    if (error) { this.feedback(error, true); return null; }
    const exists = this.skills.some((item) => item.id === skill.id);
    if (!exists && this.skills.length >= MAX_SKILLS) { this.feedback(`The technique library is full (${MAX_SKILLS} maximum).`, true); return null; }
    const saved = this.storage.upsert(skill);
    this.skills = this.storage.load();
    this.editingId = saved.id;
    this.renderLibrary(); this.refresh();
    return saved;
  }

  save() {
    const saved = this.persistCurrent();
    if (saved) this.feedback(`${saved.name} ${this.skills.filter((item) => item.id === saved.id).length ? 'saved' : 'created'}.`);
  }

  equip() {
    const saved = this.persistCurrent();
    if (!saved) return;
    this.onEquip(saved, this.equipSlot);
    this.feedback(`${saved.name} equipped to ${['E', 'R', 'F'][this.equipSlot]}.`);
  }

  unequip() {
    this.onEquip(null, this.equipSlot);
    this.feedback(`${['E', 'R', 'F'][this.equipSlot]} slot cleared.`);
  }

  delete() {
    if (!this.skills.some((item) => item.id === this.editingId)) return;
    const removed = this.skills.find((item) => item.id === this.editingId);
    this.skills = this.storage.delete(this.editingId);
    this.newSkill(false);
    this.renderLibrary();
    this.feedback(`${removed.name} deleted.`);
  }

  newSkill(render = true) {
    this.editingId = createSkillId();
    this.applyForm(DEFAULT_FORM);
    if (render) this.renderLibrary();
    this.refresh();
  }

  exportJSON() {
    const blob = new Blob([serializeSkillExport(this.skills)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'tidebound-techniques.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    this.feedback(`${this.skills.length} technique${this.skills.length === 1 ? '' : 's'} exported safely.`);
  }

  async importJSON(file) {
    if (!file) return;
    try {
      if (file.size > 32 * 1024) throw new Error('Import must be smaller than 32 KB.');
      const imported = parseSkillImport(await file.text(), createSkillId);
      if (this.skills.length + imported.length > MAX_SKILLS) throw new Error(`Import would exceed the ${MAX_SKILLS}-technique limit.`);
      this.skills = this.storage.save([...this.skills, ...imported]);
      this.load(imported[0]); this.renderLibrary();
      this.feedback(`${imported.length} validated technique${imported.length === 1 ? '' : 's'} imported.`);
    } catch (error) { this.feedback(error.message || 'Import failed.', true); }
    finally { this.el.querySelector('[data-import-file]').value = ''; }
  }

  applyForm(skill) {
    for (const [key, value] of Object.entries(skill)) {
      const input = this.form.elements[key];
      if (!input) continue;
      if (key === 'element') this.form.querySelector(`[name="element"][value="${value}"]`).checked = true;
      else input.value = value;
    }
    this.form.querySelectorAll('input[type=range]').forEach((input) => { input.closest('label').querySelector('output').textContent = input.value; });
  }

  load(skill) {
    if (!skill) return;
    this.editingId = skill.id;
    this.applyForm(skill);
    this.refresh(); this.renderLibrary();
  }

  renderLibrary() {
    const list = this.el.querySelector('[data-library]');
    list.replaceChildren();
    for (const skill of [...this.skills].reverse().slice(0, 24)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.id = skill.id;
      button.className = `element-${skill.element.toLowerCase()}${skill.id === this.editingId ? ' selected' : ''}`;
      const glyph = document.createElement('i'); glyph.textContent = `${skill.element[0]}${skill.effect[0]}`;
      const copy = document.createElement('span');
      const name = document.createElement('b'); name.textContent = skill.name;
      const detail = document.createElement('small'); detail.textContent = `${skill.element} · ${skill.effect} · ${skill.shape}`;
      copy.append(name, detail); button.append(glyph, copy);
      button.onclick = () => this.load(this.skills.find((item) => item.id === skill.id));
      list.append(button);
    }
    this.el.querySelector('[data-count]').textContent = `${this.skills.length} / 24`;
  }

  feedback(text, error = false) {
    const el = this.el.querySelector('[data-feedback]'); el.textContent = text; el.classList.toggle('error', error);
    animate(el, { opacity: [0, 1], translateY: [4, 0], duration: 300 });
  }

  open() { this.skills = this.storage.load(); this.renderLibrary(); this.refresh(); this.el.classList.remove('hidden'); animate(this.el.querySelector('.editor-shell'), { opacity: [0, 1], translateY: [24, 0], duration: 450, ease: 'outExpo' }); }
  close() { this.el.classList.add('hidden'); this.onClose?.(); }
}
