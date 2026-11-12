import { animate } from 'animejs';

export class Menu {
  constructor(root, handlers) {
    this.root = root; this.handlers = handlers;
    this.main = this.make('main-menu', `
      <div class="menu-vignette"></div><div class="brand-block"><div class="brand-kicker"><img class="brand-icon" src="/assets/tidebound-icon-192.png" alt=""><small>WORLD DISCOVERIES</small></div><h1>TIDE<span>BOUND</span></h1><p>Explore, discover, build, and meet wildling packs.</p><div class="menu-actions"><button class="primary-button" data-explore>ENTER WORLD <i>→</i></button><button class="ghost-button" data-skills>DISCOVERY JOURNAL</button><button class="ghost-button hidden" data-install>INSTALL TIDEBOUND</button><button class="text-button" data-help>HOW TO PLAY</button><button class="text-button" data-settings>SETTINGS</button></div></div><div class="menu-footer"><span>v1.5.1 · WORLD DISCOVERIES</span><span>OFFLINE READY · DISCOVERIES</span></div>`);
    this.main.querySelector('[data-explore]').onclick = () => {
      if (handlers.hasCharacter?.()) handlers.start(handlers.characterAppearance(), 'explore');
      else this.showCharacter('explore');
    };
    if (handlers.hasCharacter?.()) this.main.querySelector('[data-explore]').innerHTML = 'CONTINUE WORLD <i>→</i>';
    this.main.querySelector('[data-help]').onclick = () => this.showHelp();
    this.main.querySelector('[data-skills]').onclick = handlers.skills;
    this.main.querySelector('[data-settings]').onclick = () => this.showSettings();

    this.character = this.make('character-select hidden', `
      <div class="screen-heading"><small>CHOOSE YOUR VESSEL</small><h2>THE CURRENT TAKES MANY FORMS</h2><p>Appearance only — combat statistics and skills remain equal.</p></div><div class="character-cards"><button type="button" class="selected" aria-pressed="true" data-gender="male"><div class="avatar male"><img src="/assets/characters/wayfarer-male.png" alt="Male wayfarer appearance"></div><strong>MALE WAYFARER</strong><small>AZURE COAT</small></button><button type="button" aria-pressed="false" data-gender="female"><div class="avatar female"><img src="/assets/characters/wayfarer-female.png" alt="Female wayfarer appearance"></div><strong>FEMALE WAYFARER</strong><small>IVORY ARMOR</small></button></div><button type="button" class="primary-button character-confirm" data-confirm>ENTER WORLD AS MALE <i>→</i></button><button type="button" class="text-button back" data-back>← BACK</button>`);
    this.selectedGender = 'male';
    this.character.querySelectorAll('[data-gender]').forEach((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.selectedGender = el.dataset.gender;
        this.character.querySelectorAll('[data-gender]').forEach((card) => {
          const selected = card === el;
          card.classList.toggle('selected', selected);
          card.setAttribute('aria-pressed', String(selected));
        });
        this.character.querySelector('[data-confirm]').innerHTML = `${this.selectedMode === 'explore' ? 'EXPLORE' : 'ENTER WORLD'} AS ${this.selectedGender.toUpperCase()} <i>→</i>`;
      });
    });
    this.character.querySelector('[data-confirm]').addEventListener('click', (event) => {
      event.preventDefault();
      const button = event.currentTarget;
      if (button.disabled) return;
      button.disabled = true;
      try {
        handlers.start(this.selectedGender, this.selectedMode);
      } catch (error) {
        button.disabled = false;
        console.error('Unable to start TIDEBOUND match:', error);
        this.showStartError(error);
      }
    });
    this.character.querySelector('[data-back]').onclick = () => this.showMain();

    this.pause = this.make('pause-menu hidden', `<div class="pause-panel panel-cut"><small>GAME PAUSED</small><h2>PAUSED</h2><button class="primary-button" data-resume>RESUME CURRENT</button><button class="ghost-button" data-help>HOW TO PLAY</button><button class="ghost-button" data-skills>DISCOVERY JOURNAL</button><button class="ghost-button" data-restart>RETURN TO SANCTUARY</button><button class="ghost-button" data-settings>SETTINGS</button><button class="text-button" data-main>RETURN TO TITLE</button></div>`);
    this.pause.querySelector('[data-resume]').onclick = handlers.resume;
    this.pause.querySelector('[data-restart]').onclick = handlers.restart;
    this.pause.querySelector('[data-main]').onclick = handlers.main;
    this.pause.querySelector('[data-skills]').onclick = handlers.skills;
    this.pause.querySelector('[data-help]').onclick = () => this.showHelp();
    this.pause.querySelector('[data-settings]').onclick = () => this.showSettings();

    this.result = this.make('result-screen hidden', `<div class="result-panel panel-cut"><small data-kicker>THE CURRENT SETTLES</small><h2 data-title>VICTORY</h2><p data-copy></p><div class="result-stats"><div><strong data-duration>00:00</strong><span>DUEL TIME</span></div><div><strong data-dealt>0</strong><span>DAMAGE DEALT</span></div><div><strong data-received>0</strong><span>DAMAGE RECEIVED</span></div><div><strong data-hits>0</strong><span>HITS</span></div><div><strong data-blocks>0</strong><span>BLOCKS</span></div><div><strong data-dodges>0</strong><span>DODGES</span></div><div><strong data-used>0</strong><span>SKILLS USED</span></div></div><button class="primary-button" data-restart>FIGHT AGAIN</button><button class="text-button" data-main>RETURN TO TITLE</button></div>`);
    this.result.querySelector('[data-restart]').onclick = handlers.restart;
    this.result.querySelector('[data-main]').onclick = handlers.main;

    this.settings = this.make('settings-screen hidden', `<div class="settings-panel panel-cut"><button class="icon-button" data-close>×</button><small>SYSTEM / COMBAT</small><h2>SETTINGS</h2><label><span>AI DIFFICULTY</span><select data-difficulty><option value="easy">Easy — forgiving</option><option value="normal" selected>Normal — balanced</option><option value="hard">Hard — aggressive</option></select></label><label><span>GRAPHICS PRESET</span><select data-graphics><option value="high">High</option><option value="balanced" selected>Medium</option><option value="low">Low</option></select></label><label><span>RENDER SCALE</span><select data-scale><option value="1">Native</option><option value="0.8" selected>Balanced</option><option value="0.65">Performance</option></select></label><label><span>CAMERA SENSITIVITY <output data-sensitivity-output>100%</output></span><input data-sensitivity type="range" min="40" max="180" value="100"></label><label><span>MUSIC VOLUME <output data-music-output>45%</output></span><input data-music type="range" min="0" max="100" value="45"></label><label><span>SFX VOLUME <output data-sfx-output>70%</output></span><input data-sfx type="range" min="0" max="100" value="70"></label><label class="toggle-setting"><span>CAMERA SHAKE</span><input data-shake type="checkbox" checked></label><label class="toggle-setting"><span>PERFORMANCE DISPLAY</span><input data-performance type="checkbox"></label><label class="toggle-setting"><span>MUTE ALL</span><input data-mute type="checkbox"></label><button type="button" class="ghost-button fullscreen-button" data-fullscreen>TOGGLE FULLSCREEN</button><p>Audio begins after the first interaction. Mobile devices start with a conservative graphics preset.</p></div>`);
    this.settings.querySelector('[data-close]').onclick = () => this.settings.classList.add('hidden');
    this.settings.querySelector('[data-difficulty]').onchange = (e) => handlers.difficulty(e.target.value);
    this.settings.querySelector('[data-scale]').onchange = (e) => handlers.scale(Number(e.target.value));
    this.settings.querySelector('[data-graphics]').onchange = (e) => handlers.graphics(e.target.value);
    this.settings.querySelector('[data-music]').oninput = (e) => { this.settings.querySelector('[data-music-output]').textContent = `${e.target.value}%`; handlers.music(Number(e.target.value) / 100); };
    this.settings.querySelector('[data-sfx]').oninput = (e) => { this.settings.querySelector('[data-sfx-output]').textContent = `${e.target.value}%`; handlers.sfx(Number(e.target.value) / 100); };
    this.settings.querySelector('[data-mute]').onchange = (e) => handlers.mute(e.target.checked);
    this.settings.querySelector('[data-sensitivity]').oninput = (e) => { this.settings.querySelector('[data-sensitivity-output]').textContent = `${e.target.value}%`; handlers.sensitivity(Number(e.target.value) / 100); };
    this.settings.querySelector('[data-shake]').onchange = (e) => handlers.shake(e.target.checked);
    this.settings.querySelector('[data-performance]').onchange = (e) => handlers.performance(e.target.checked);
    this.settings.querySelector('[data-fullscreen]').onclick = handlers.fullscreen;
    this.help = this.make('help-screen hidden', `<div class="help-panel panel-cut"><button class="icon-button" data-close aria-label="Close help">×</button><small>FIELD GUIDE</small><h2>HOW TO PLAY</h2><p>Explore freely without a timer. Gather grass, trees, and stones for materials. New blueprints and skills appear in your Discovery Journal. Wildlings travel in packs and attack when they see you nearby. Move within striking distance to hit them.</p><div class="help-columns"><div><h3>KEYBOARD & MOUSE</h3><p>WASD move · Shift sprint · Space jump<br>G gather · J journal · B blueprints<br>Left click or C attack · Right click or hold V block<br>Q dodge · X heavy · E / R / F skills · Esc pause</p></div><div><h3>MOBILE LANDSCAPE</h3><p>Left stick moves · Drag the right side to look<br>Round buttons jump, attack, dodge, and block<br>E / R / F use skills · Ⅱ pauses<br>Gather and Journal buttons are at the top.</p></div></div><p>Sound starts after your first tap or key press. Adjust music and effects in Settings.</p></div>`);
    this.help.querySelector('[data-close]').onclick = () => this.help.classList.add('hidden');
  }

  make(className, html) { const el = document.createElement('section'); el.className = `overlay ${className}`; el.innerHTML = html; this.root.append(el); return el; }
  allScreens() { return [this.main, this.character, this.pause, this.result]; }
  show(el) { this.allScreens().forEach((s) => s.classList.add('hidden')); el.classList.remove('hidden'); animate(el.children, { opacity: [0, 1], delay: (_, i) => i * 70, duration: 500, ease: 'outExpo' }); }
  showMain() { this.show(this.main); }
  setHasCharacter() { this.main.querySelector('[data-explore]').innerHTML = 'CONTINUE WORLD <i>→</i>'; }
  showCharacter(mode = 'duel') {
    this.selectedMode = mode;
    this.character.querySelector('.screen-heading small').textContent = 'CHOOSE YOUR APPEARANCE';
    this.character.querySelector('[data-confirm]').innerHTML = `${mode === 'explore' ? 'EXPLORE' : 'ENTER WORLD'} AS ${this.selectedGender.toUpperCase()} <i>→</i>`;
    this.character.querySelector('[data-confirm]').disabled = false;
    this.character.querySelector('[data-start-error]')?.remove();
    this.show(this.character);
  }
  showPause() { this.show(this.pause); }
  hideAll() { this.allScreens().forEach((s) => s.classList.add('hidden')); }
  showSettings() { this.settings.classList.remove('hidden'); animate(this.settings.querySelector('.settings-panel'), { opacity: [0, 1], scale: [0.96, 1], duration: 300 }); }
  showHelp() { this.help.classList.remove('hidden'); }
  setAudioSettings(audio) {
    const music = this.settings.querySelector('[data-music]');
    const sfx = this.settings.querySelector('[data-sfx]');
    music.value = Math.round(audio.musicVolume * 100); sfx.value = Math.round(audio.sfxVolume * 100);
    this.settings.querySelector('[data-music-output]').textContent = `${music.value}%`;
    this.settings.querySelector('[data-sfx-output]').textContent = `${sfx.value}%`;
    this.settings.querySelector('[data-mute]').checked = audio.muted;
  }
  setGameSettings({ graphics, sensitivity, shake, performance }) {
    this.settings.querySelector('[data-graphics]').value = graphics;
    this.settings.querySelector('[data-sensitivity]').value = Math.round(sensitivity * 100);
    this.settings.querySelector('[data-sensitivity-output]').textContent = `${Math.round(sensitivity * 100)}%`;
    this.settings.querySelector('[data-shake]').checked = shake;
    this.settings.querySelector('[data-performance]').checked = performance;
  }
  configureInstall(label, handler) { const button = this.main.querySelector('[data-install]'); button.textContent = label; button.onclick = handler; button.classList.remove('hidden'); }
  hideInstall() { this.main.querySelector('[data-install]').classList.add('hidden'); }
  showResult(outcome, stats, duration = 0) {
    const title = { victory: 'VICTORY', defeat: 'DEFEAT', draw: 'DRAW' }[outcome] || 'DRAW';
    this.result.querySelector('[data-title]').textContent = title;
    this.result.querySelector('[data-title]').className = outcome;
    this.result.querySelector('[data-copy]').textContent = outcome === 'victory' ? 'The Crimson Echo breaks against your current.' : outcome === 'defeat' ? 'The world claims this tide. Return stronger.' : 'Neither current yields before time expires.';
    this.result.querySelector('[data-dealt]').textContent = Math.round(stats.dealt);
    this.result.querySelector('[data-received]').textContent = Math.round(stats.received);
    this.result.querySelector('[data-used]').textContent = stats.skills;
    this.result.querySelector('[data-hits]').textContent = stats.hits;
    this.result.querySelector('[data-blocks]').textContent = stats.blocks;
    this.result.querySelector('[data-dodges]').textContent = stats.dodges;
    this.result.querySelector('[data-duration]').textContent = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;
    this.show(this.result);
  }

  showStartError(error) {
    let message = this.character.querySelector('[data-start-error]');
    if (!message) {
      message = document.createElement('p');
      message.dataset.startError = '';
      message.className = 'start-error';
      this.character.querySelector('.character-cards').after(message);
    }
    message.textContent = `The arena could not start: ${error?.message || 'unknown error'}`;
  }
}
