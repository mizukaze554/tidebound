import { animate } from 'animejs';
import { SkillSystem, ELEMENTS } from '../combat/SkillSystem.js';

export class SkillEditor {
  constructor(root, storage, onClose, onEquip) {
    this.root = root; this.storage = storage; this.onClose = onClose; this.onEquip = onEquip;
    this.skills = storage.load();
    this.equipSlot = 0;
    this.el = document.createElement('section');
    this.el.className = 'overlay skill-editor hidden';
    this.el.innerHTML = `
      <div class="editor-shell panel-cut">
        <header class="editor-header"><div><small>ARCANE WORKBENCH / 01</small><h2>FORGE A TECHNIQUE</h2><p>Combine elemental behavior with a delivery shape. Every parameter changes the live combat ability.</p></div><button class="icon-button" data-close>×</button></header>
        <div class="editor-grid">
          <form data-form>
            <label class="field wide"><span>Technique name</span><input name="name" maxlength="24" value="Riptide Pulse" /></label>
            <fieldset><legend>Element</legend><div class="choice-grid" data-element>${Object.keys(ELEMENTS).map((v, i) => `<label class="choice element-${v.toLowerCase()}"><input type="radio" name="element" value="${v}" ${i === 0 ? 'checked' : ''}><i>${v[0]}</i><span>${v}</span></label>`).join('')}</div></fieldset>
            <div class="select-row"><label class="field"><span>Effect</span><select name="effect"><option>Damage</option><option selected>Push</option><option>Pull</option><option>Shield</option><option>Heal</option></select></label><label class="field"><span>Shape</span><select name="shape"><option>Projectile</option><option selected>Area</option><option>Beam</option><option>Self</option></select></label></div>
            <div class="sliders">${['power', 'range', 'speed', 'duration'].map((v, i) => `<label><span>${v}<output>${[5, 7, 6, 2][i]}</output></span><input type="range" name="${v}" min="1" max="10" value="${[5, 7, 6, 2][i]}"></label>`).join('')}</div>
            <div class="editor-actions"><button type="button" class="ghost-button" data-save>SAVE TO LIBRARY</button><select data-slot aria-label="Equip slot"><option value="0">Equip to E</option><option value="1">Equip to R</option><option value="2">Equip to F</option></select><button type="button" class="primary-button" data-equip>EQUIP</button></div>
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
    this.el.querySelector('[data-save]').onclick = () => this.save();
    this.el.querySelector('[data-equip]').onclick = () => this.equip();
    this.el.querySelector('[data-slot]').onchange = (e) => { this.equipSlot = Number(e.target.value); };
    this.form.addEventListener('input', (e) => { if (e.target.type === 'range') e.target.closest('label').querySelector('output').textContent = e.target.value; this.refresh(); });
    this.renderLibrary(); this.refresh();
  }

  value() {
    const data = new FormData(this.form);
    return { id: `skill-${Date.now()}`, name: String(data.get('name')).trim(), element: data.get('element'), effect: data.get('effect'), shape: data.get('shape'), power: +data.get('power'), range: +data.get('range'), speed: +data.get('speed'), duration: +data.get('duration') };
  }

  refresh() {
    const skill = this.value();
    const error = SkillSystem.validate(skill);
    const cost = SkillSystem.cost(skill);
    this.el.querySelector('[data-cost]').textContent = cost;
    this.el.querySelector('[data-cost-bar]').style.width = `${Math.min(100, cost)}%`;
    this.el.querySelector('[data-preview-glyph]').textContent = `${skill.element[0]}${skill.effect[0]}`;
    this.el.querySelector('[data-preview]').className = `preview-viewport element-${skill.element.toLowerCase()}`;
    const rules = {
      Projectile: `Travels forward at speed ${skill.speed}, up to range ${skill.range}, then applies ${skill.effect.toLowerCase()} once on contact.`,
      Area: `Expands around the caster to radius ${skill.range}; each target can be affected once.`,
      Beam: `Instant line trace with range ${skill.range}; applies ${skill.effect.toLowerCase()} to targets intersecting the beam.`,
      Self: skill.effect === 'Push' ? 'Self + Push becomes a forward elemental dash.' : `Applies ${skill.effect.toLowerCase()} directly to the caster.`,
    };
    this.el.querySelector('[data-rule]').textContent = error || rules[skill.shape];
    this.el.querySelector('[data-feedback]').textContent = error || '';
    this.el.querySelector('[data-equip]').disabled = Boolean(error);
  }

  save() {
    const skill = this.value();
    const error = SkillSystem.validate(skill);
    if (error) return this.feedback(error, true);
    if (this.skills.length >= 24) return this.feedback('The technique library is full (24 maximum).', true);
    this.skills.push(skill); this.storage.save(this.skills); this.renderLibrary();
    this.feedback(`${skill.name} saved to this browser.`);
  }

  equip() {
    const skill = this.value();
    const error = SkillSystem.validate(skill);
    if (error) return this.feedback(error, true);
    const existing = this.skills.find((s) => s.name.toLowerCase() === skill.name.toLowerCase());
    if (!existing && this.skills.length >= 24) return this.feedback('The technique library is full (24 maximum).', true);
    if (!existing) { this.skills.push(skill); this.storage.save(this.skills); this.renderLibrary(); }
    this.onEquip(existing || skill, this.equipSlot);
    this.feedback(`${skill.name} equipped to ${['E', 'R', 'F'][this.equipSlot]}.`);
  }

  load(skill) {
    for (const [key, value] of Object.entries(skill)) {
      const input = this.form.elements[key];
      if (!input) continue;
      if (key === 'element') this.form.querySelector(`[name="element"][value="${value}"]`).checked = true;
      else input.value = value;
    }
    this.form.querySelectorAll('input[type=range]').forEach((input) => input.closest('label').querySelector('output').textContent = input.value);
    this.refresh();
  }

  renderLibrary() {
    const list = this.el.querySelector('[data-library]');
    list.innerHTML = this.skills.slice(-5).reverse().map((s) => `<button data-id="${s.id}" class="element-${s.element.toLowerCase()}"><i>${s.element[0]}${s.effect[0]}</i><span><b>${s.name}</b><small>${s.element} · ${s.effect} · ${s.shape}</small></span></button>`).join('');
    list.querySelectorAll('button').forEach((button) => button.onclick = () => this.load(this.skills.find((s) => s.id === button.dataset.id)));
    this.el.querySelector('[data-count]').textContent = `${this.skills.length} / 24`;
  }

  feedback(text, error = false) {
    const el = this.el.querySelector('[data-feedback]'); el.textContent = text; el.classList.toggle('error', error);
    animate(el, { opacity: [0, 1], translateY: [4, 0], duration: 300 });
  }
  open() { this.el.classList.remove('hidden'); animate(this.el.querySelector('.editor-shell'), { opacity: [0, 1], translateY: [24, 0], duration: 450, ease: 'outExpo' }); }
  close() { this.el.classList.add('hidden'); this.onClose?.(); }
}
