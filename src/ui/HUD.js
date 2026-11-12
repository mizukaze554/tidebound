import { animate } from 'animejs';

export class HUD {
  constructor(root) {
    this.root = root;
    this.el = document.createElement('section');
    this.el.className = 'hud hidden';
    this.el.innerHTML = `
      <div class="top-hud">
        <div class="fighter-card player-card">
          <div class="fighter-meta"><span class="sigil blue">P1</span><div><b>WAYFARER</b><small>THE AZURE CURRENT</small></div></div>
          <div class="bar health"><i data-player-health></i><span data-player-health-text></span></div>
          <div class="bar stamina"><i data-player-stamina></i></div>
          <div class="bar energy"><i data-player-energy></i></div>
        </div>
        <div class="match-status"><span>DUEL</span><b data-timer>03:00</b><small data-ai-state>AI · IDLE</small></div>
        <div class="fighter-card enemy-card">
          <div class="fighter-meta"><div><b>CRIMSON ECHO</b><small>ARENA WARDEN</small></div><span class="sigil red">AI</span></div>
          <div class="bar health"><i data-enemy-health></i><span data-enemy-health-text></span></div>
        </div>
      </div>
      <div class="target-reticle" data-reticle><i></i><i></i><i></i><i></i></div>
      <div class="combat-message" data-message></div>
      <div class="bottom-hud">
        <div class="controls-card"><b>COMBAT INPUT</b><span>WASD Move · Shift Sprint · Space Jump</span><span>LMB Combo · X Heavy · RMB Guard · Q Evade · Tab Lock</span></div>
        <div class="skill-dock" data-skills></div>
        <div class="performance-panel hidden" data-performance-panel><b><i data-fps>60</i> FPS</b><span><i data-draws>0</i> DRAWS</span><span><i data-triangles>0</i> TRIS</span><span><i data-particles>0</i> FX</span></div>
      </div>`;
    root.append(this.el);
    this.refs = Object.fromEntries(
      [...this.el.querySelectorAll('[data-player-health], [data-player-health-text], [data-player-stamina], [data-player-energy], [data-enemy-health], [data-enemy-health-text], [data-ai-state], [data-fps], [data-draws], [data-triangles], [data-particles], [data-performance-panel], [data-skills], [data-reticle], [data-message], [data-timer]')]
        .map((el) => [Object.keys(el.dataset)[0], el]),
    );
    this.fpsTime = 0; this.frames = 0; this.messageTimer = null;
  }

  show() { this.el.classList.remove('hidden'); animate(this.el, { opacity: [0, 1], duration: 450 }); }
  hide() { this.el.classList.add('hidden'); }
  setPerformanceVisible(value) { this.refs.performancePanel.classList.toggle('hidden', !value); }

  setSkills(skills) {
    this.refs.skills.replaceChildren();
    skills.forEach((skill, index) => {
      const slot = document.createElement('div');
      slot.className = `skill-slot ${skill ? `element-${skill.element.toLowerCase()}` : 'empty'}`;
      slot.dataset.slot = String(index);
      const key = document.createElement('kbd'); key.textContent = ['E', 'R', 'F'][index];
      const glyph = document.createElement('i'); glyph.className = 'skill-glyph'; glyph.textContent = skill ? `${skill.element[0]}${skill.effect[0]}` : '—';
      const copy = document.createElement('div');
      const name = document.createElement('b'); name.textContent = skill?.name || 'Empty slot';
      const detail = document.createElement('small'); detail.textContent = skill ? `${skill.element} · ${skill.shape}` : 'Equip in Skill Creator';
      copy.append(name, detail);
      const cooldown = document.createElement('span'); cooldown.className = 'cooldown';
      const cooldownText = document.createElement('em'); cooldownText.className = 'cooldown-text';
      slot.append(key, glyph, copy, cooldown, cooldownText);
      this.refs.skills.append(slot);
    });
  }

  message(text, tone = '') {
    this.refs.message.textContent = text;
    this.refs.message.className = `combat-message show ${tone}`;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.refs.message.classList.remove('show'), 1300);
  }

  update(player, enemy, aiState, skills, dt, locked, timeLeft, world = null, renderer = null, effects = null) {
    const percent = (value, max) => `${Math.max(0, value / max * 100)}%`;
    this.refs.playerHealth.style.width = percent(player.health, player.maxHealth);
    this.refs.playerHealthText.textContent = `${Math.ceil(player.health)} / ${player.maxHealth}`;
    this.refs.playerStamina.style.width = percent(player.stamina, player.maxStamina);
    this.refs.playerEnergy.style.width = percent(player.energy, player.maxEnergy);
    this.refs.enemyHealth.style.width = percent(enemy.health, enemy.maxHealth);
    this.refs.enemyHealthText.textContent = `${Math.ceil(enemy.health)} / ${enemy.maxHealth}`;
    const location = world ? world.coordinates(player.position) : null;
    this.refs.aiState.textContent = world
      ? `AI · ${aiState} · ${world.weather} · ${Math.abs(location.lat * 180 / Math.PI).toFixed(1)}°${location.lat >= 0 ? 'N' : 'S'}`
      : `AI · ${aiState}`;
    this.refs.reticle.classList.toggle('active', locked && enemy.alive);
    const min = Math.floor(timeLeft / 60), sec = Math.floor(timeLeft % 60);
    this.refs.timer.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    [...this.refs.skills.children].forEach((slot, i) => {
      const total = skills[i] ? 2.2 + skills[i].power * 0.18 + skills[i].duration * 0.2 + (skills[i].shape === 'Area' ? 0.8 : 0) : 1;
      const remaining = player.cooldowns[i];
      slot.querySelector('.cooldown').style.setProperty('--cooldown', `${remaining / total * 100}%`);
      slot.querySelector('.cooldown-text').textContent = remaining > 0 ? remaining.toFixed(1) : '';
      if (slot.dataset.wasCooling === 'true' && remaining <= 0) {
        slot.classList.remove('ready'); void slot.offsetWidth; slot.classList.add('ready');
      }
      slot.dataset.wasCooling = String(remaining > 0);
      slot.classList.toggle('cooling', remaining > 0);
    });
    this.frames++; this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.refs.fps.textContent = Math.round(this.frames / this.fpsTime);
      this.refs.draws.textContent = renderer?.info.render.calls ?? 0;
      this.refs.triangles.textContent = this.compact(renderer?.info.render.triangles ?? 0);
      this.refs.particles.textContent = effects?.activeParticles ?? 0;
      this.fpsTime = 0; this.frames = 0;
    }
  }

  compact(value) { return value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value); }
}
