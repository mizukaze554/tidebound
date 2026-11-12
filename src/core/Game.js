import * as THREE from 'three';
import { Input } from './Input.js';
import { ThirdPersonCamera } from './Camera.js';
import { PlanetWorld } from '../world/PlanetWorld.js';
import { Character } from '../entities/Character.js';
import { EnemyAI } from '../entities/EnemyAI.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { SkillSystem } from '../combat/SkillSystem.js';
import { Effects } from '../effects/Effects.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';
import { SkillEditor } from '../ui/SkillEditor.js';
import { SkillStorage, DEFAULT_SKILLS } from '../data/SkillStorage.js';
import { AudioManager } from './AudioManager.js';
import { resolveMatchOutcome } from '../combat/MatchRules.js';
import { MobileControls } from '../ui/MobileControls.js';

export class Game {
  constructor(container, uiRoot) {
    this.container = container; this.uiRoot = uiRoot;
    this.state = 'menu'; this.difficulty = 'normal'; this.renderScale = 1;
    this.locked = true; this.matchTime = 180; this.matchElapsed = 0; this.resultPending = 0; this.gender = 'male';
    this.matchOutcome = null; this.hitStop = 0; this.footstepTimer = 0;
    this.clock = new THREE.Clock();
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 2200);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.container.append(this.renderer.domElement);

    this.world = new PlanetWorld(this.scene);
    this.input = new Input(this.renderer.domElement);
    this.mobileControls = new MobileControls(this.uiRoot, this.input);
    this.followCamera = new ThirdPersonCamera(this.camera);
    this.audio = new AudioManager();
    this.modelLoaderPromise = import('../entities/ModelLoader.js').then(({ ModelLoader }) => new ModelLoader());
    this.effects = new Effects(this.scene, this.camera, this.uiRoot, this.audio);
    this.storage = new SkillStorage();
    this.skills = this.storage.loadEquipped(this.storage.load());
    this.hud = new HUD(this.uiRoot);
    this.skillEditor = new SkillEditor(this.uiRoot, this.storage, () => {
      this.skills = this.storage.loadEquipped(this.storage.load());
      this.hud.setSkills(this.skills);
    }, (skill, slot) => this.equipSkill(skill, slot));
    // Combat services must exist before menu callbacks can start a match. This
    // also prevents stale Vite HMR instances from reaching an uninitialized
    // skill runtime during character selection.
    this.skillSystem = new SkillSystem(this.scene, this.effects, (target, result) => this.onDamage(target, result));
    this.combat = new CombatSystem(this.effects, (target, result) => this.onDamage(target, result));
    this.menu = new Menu(this.uiRoot, {
      start: (gender, mode) => this.start(gender, mode),
      skills: () => this.skillEditor.open(),
      resume: () => this.resume(),
      restart: () => this.start(this.gender, this.mode),
      main: () => this.returnToMenu(),
      difficulty: (value) => { this.difficulty = value; this.ai?.setDifficulty(value); },
      scale: (value) => { this.renderScale = value; this.resize(); },
      graphics: (value) => this.setGraphics(value),
      music: (value) => this.audio.setMusicVolume(value),
      sfx: (value) => this.audio.setSfxVolume(value),
      mute: (value) => this.audio.setMuted(value),
      sensitivity: (value) => { this.followCamera.sensitivity = value; localStorage.setItem('tidebound.sensitivity', String(value)); },
      shake: (value) => { this.followCamera.shakeEnabled = value; localStorage.setItem('tidebound.cameraShake', String(value)); },
      performance: (value) => { this.hud.setPerformanceVisible(value); localStorage.setItem('tidebound.performanceDisplay', String(value)); },
      fullscreen: () => this.toggleFullscreen(),
    });
    this.menu.showMain();
    this.exploreHud = document.createElement('section');
    this.exploreHud.className = 'explore-hud hidden';
    this.exploreHud.innerHTML = '<b>PEACEFUL EXPLORE</b><span>Roam freely · creatures are friendly</span><button type="button" data-help>?</button><button type="button" data-pause>Ⅱ</button>';
    this.exploreHud.querySelector('[data-help]').onclick = () => { this.pause(); this.menu.showHelp(); };
    this.exploreHud.querySelector('[data-pause]').onclick = () => this.pause();
    this.uiRoot.append(this.exploreHud);
    this.menu.setAudioSettings(this.audio);
    this.hud.setSkills(this.skills);
    const mobile = matchMedia('(pointer: coarse)').matches || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    const preset = localStorage.getItem('tidebound.graphics') || (mobile ? 'low' : 'balanced');
    this.followCamera.sensitivity = Number(localStorage.getItem('tidebound.sensitivity') || 1);
    this.followCamera.shakeEnabled = localStorage.getItem('tidebound.cameraShake') !== 'false';
    const performanceVisible = localStorage.getItem('tidebound.performanceDisplay') === 'true';
    this.hud.setPerformanceVisible(performanceVisible);
    this.setGraphics(preset);
    this.menu.setGameSettings({ graphics: preset, sensitivity: this.followCamera.sensitivity, shake: this.followCamera.shakeEnabled, performance: performanceVisible });
    const unlockAudio = () => { this.audio.unlock(); this.audio.playMusic(this.state === 'playing' ? 'combat' : 'menu'); };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    this.uiRoot.addEventListener('click', (event) => { if (event.target.closest('button')) this.audio.playSfx('ui'); });

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('scroll', () => this.resize());
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && !e.repeat) this.togglePause(); });
    window.addEventListener('blur', () => { if (this.state === 'playing') this.pause(); });
    this.animate();
  }

  start(gender = this.gender, mode = 'duel') {
    this.gender = gender; this.mode = mode;
    this.clearCharacters();
    this.effects?.clear?.();
    this.skillSystem?.clear?.();
    const spawn = this.world.spawnPositions();
    this.player = new Character(this.scene, { color: 0x267bb4, accent: 0x5ee3ff, name: 'Wayfarer', position: spawn.player, gender });
    this.enemy = mode === 'duel' ? new Character(this.scene, { color: 0xa83a3a, accent: 0xff765f, name: 'Crimson Echo', position: spawn.enemy, gender: 'male', enemy: true }) : null;
    const player = this.player, enemy = this.enemy;
    this.modelLoaderPromise.then((loader) => {
      if (this.player === player) loader.applyToCharacter(player, `/assets/models/wayfarer-${gender}.glb`);
      if (enemy && this.enemy === enemy) loader.applyToCharacter(enemy, '/assets/models/crimson-echo.glb');
    });
    this.world.updateUp(this.player);
    if (this.enemy) this.world.updateUp(this.enemy);
    this.ai = this.enemy ? new EnemyAI(this.enemy, this.player, this, this.difficulty) : null;
    this.enemySkills = [DEFAULT_SKILLS[1], DEFAULT_SKILLS[0], DEFAULT_SKILLS[2]];
    this.player.face(spawn.enemy.clone().sub(this.player.position));
    if (this.enemy) this.enemy.face(this.player.position.clone().sub(this.enemy.position));
    this.followCamera.groundForward.copy(spawn.enemy).sub(this.player.position).projectOnPlane(this.player.up).normalize();
    this.followCamera.position.copy(this.player.position).addScaledVector(this.player.up, 4).addScaledVector(this.followCamera.groundForward, -9);
    this.followCamera.lookAt.copy(this.player.position).addScaledVector(this.player.up, 1.5);
    this.matchTime = 180; this.matchElapsed = 0; this.resultPending = 0; this.matchOutcome = null; this.hitStop = 0; this.locked = mode === 'duel';
    this.world.setCreaturesVisible(mode === 'explore');
    this.uiRoot.classList.toggle('exploring', mode === 'explore');
    this.state = 'playing'; this.input.enabled = true; this.input.reset();
    this.menu.hideAll(); this.menu.settings.classList.add('hidden'); this.menu.help.classList.add('hidden');
    this.hud.setSkills(this.skills);
    if (mode === 'duel') { this.exploreHud.classList.add('hidden'); this.hud.show(); this.hud.message('DUEL BEGIN', 'good'); }
    else { this.hud.hide(); this.exploreHud.classList.remove('hidden'); }
    this.mobileControls.show();
    this.audio.playMusic(mode === 'duel' ? 'combat' : 'exploration');
    this.clock.getDelta();
  }

  clearCharacters() {
    for (const character of [this.player, this.enemy]) {
      if (!character) continue;
      this.scene.remove(character.group);
      character.dispose();
    }
    this.player = this.enemy = null;
    this.ai = null;
  }

  equipSkill(skill, slot) {
    this.skills[slot] = skill;
    this.storage.saveEquipped(this.skills);
    this.hud.setSkills(this.skills);
  }

  useSkill(caster, slot) {
    if (this.mode === 'explore') return;
    const enemyCaster = caster === this.enemy;
    const skill = (enemyCaster ? this.enemySkills : this.skills)[slot];
    if (!skill) return;
    const result = this.skillSystem.activate(caster, enemyCaster ? this.player : this.enemy, skill, slot);
    if (!enemyCaster) this.hud.message(result.ok ? skill.name.toUpperCase() : result.error, result.ok ? 'good' : 'bad');
  }

  onDamage(target, result = {}) {
    const flash = target === this.player ? document.body : this.hud.el;
    flash.classList.remove('hit-flash'); void flash.offsetWidth; flash.classList.add('hit-flash');
    this.hitStop = Math.max(this.hitStop, result.blocked ? 0.025 : result.critical ? 0.075 : 0.055);
    this.followCamera.addShake(result.blocked ? 0.08 : Math.min(result.critical ? 0.34 : 0.28, 0.1 + (result.damage || 0) * 0.006));
    if (result.blocked) this.effects.blockBurst(target, result.perfect);
    if (result.perfect) this.hud.message('PERFECT GUARD', 'good');
    if (!target.alive && !this.resultPending) {
      this.matchOutcome = target === this.player ? 'defeat' : 'victory';
      this.resultPending = 1.8;
    }
  }

  updatePlayer(dt) {
    if (this.input.consume('Escape')) { this.pause(); return 0; }
    let move = new THREE.Vector3();
    if (this.input.down('KeyW')) move.add(this.followCamera.forward());
    if (this.input.down('KeyS')) move.sub(this.followCamera.forward());
    if (this.input.down('KeyD')) move.add(this.followCamera.right());
    if (this.input.down('KeyA')) move.sub(this.followCamera.right());
    if (this.input.consume('Space') && this.player.jump()) this.audio.playSfx('jump');
    if (this.input.consume('KeyQ') && this.player.dodge(move)) { this.audio.playSfx('dodge'); this.effects.windTrail(this.player.position, move.lengthSq() ? move.clone().normalize() : this.player.facing.clone().negate(), 0xa5ffd8); }
    if (this.input.consume('Mouse0') && this.player.startAttack()) this.audio.playSfx('swing');
    if (this.input.consume('KeyX') && this.player.startHeavyAttack()) { this.audio.playSfx('swing'); this.hud.message('HEAVY CURRENT', 'good'); }
    this.player.setBlock(this.input.button(2));
    if (this.input.consume('KeyE')) this.useSkill(this.player, 0);
    if (this.input.consume('KeyR')) this.useSkill(this.player, 1);
    if (this.input.consume('KeyF')) this.useSkill(this.player, 2);
    if (this.input.consume('Tab')) { this.locked = !this.locked; this.hud.message(this.locked ? 'TARGET LOCKED' : 'FREE CAMERA'); }
    if (this.locked && this.enemy?.alive && move.lengthSq() < 0.01) this.player.face(this.enemy.position.clone().sub(this.player.position), dt);
    const movement = this.player.move(move, dt, this.input.down('ShiftLeft') || this.input.down('ShiftRight'));
    return movement;
  }

  update(dt, time) {
    if (this.state !== 'playing' || !this.player) return;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      this.followCamera.update(dt * 0.25, this.player, this.enemy, this.input, this.locked);
      return;
    }
    this.world.update(time, dt, this.player);
    if (this.mode === 'explore') {
      this.player.capturePreviousPosition();
      const movement = this.updatePlayer(dt);
      if (this.state !== 'playing') return;
      this.player.update(dt, movement);
      this.world.constrain(this.player);
      this.effects.update(dt);
      this.followCamera.update(dt, this.player, null, this.input, false);
      return;
    }
    this.matchTime = Math.max(0, this.matchTime - dt);
    this.matchElapsed += dt;
    this.player.capturePreviousPosition(); this.enemy.capturePreviousPosition();
    const playerMovement = this.updatePlayer(dt);
    if (this.state !== 'playing') return;
    const enemyMovement = this.ai.update(dt);
    const playerWasGrounded = this.player.grounded;
    this.player.update(dt, playerMovement);
    this.enemy.update(dt, enemyMovement);
    this.world.constrain(this.player); this.world.constrain(this.enemy);
    if (!playerWasGrounded && this.player.grounded) { this.player.landingTimer = 0.18; this.audio.playSfx('landing'); }
    this.footstepTimer -= dt;
    if (playerMovement && this.player.grounded && this.footstepTimer <= 0) {
      this.audio.playSfx('footsteps');
      this.footstepTimer = playerMovement === 2 ? 0.28 : 0.42;
    }
    this.combat.update(this.player, this.enemy);
    this.combat.update(this.enemy, this.player);
    this.skillSystem.update(dt);
    this.effects.update(dt);
    this.separateCharacters();
    this.followCamera.update(dt, this.player, this.enemy, this.input, this.locked);
    this.hud.update(this.player, this.enemy, this.ai.state, this.skills, dt, this.locked, this.matchTime, this.world, this.renderer, this.effects);

    if (this.matchTime <= 0 && !this.resultPending) {
      this.matchOutcome = resolveMatchOutcome(this.player.health, this.enemy.health);
      this.resultPending = 1.2;
    }
    if (this.resultPending > 0) {
      this.resultPending -= dt;
      if (this.resultPending <= 0) this.endMatch(this.matchOutcome || (this.player.alive ? 'victory' : 'defeat'));
    }
  }

  separateCharacters() {
    if (!this.player.alive || !this.enemy.alive) return;
    const offset = this.enemy.position.clone().sub(this.player.position).projectOnPlane(this.player.up);
    const minimum = this.player.radius + this.enemy.radius;
    const distance = offset.length();
    if (distance > 0.001 && distance < minimum) {
      const correction = offset.normalize().multiplyScalar((minimum - distance) * 0.5);
      this.player.position.addScaledVector(correction, -1);
      this.enemy.position.add(correction);
    }
  }

  endMatch(outcome) {
    this.state = 'result'; this.input.enabled = false;
    document.exitPointerLock?.(); this.hud.hide();
    this.mobileControls.hide();
    this.menu.showResult(outcome, this.player.stats, this.matchElapsed);
    this.audio.playMusic({ victory: 'victory', defeat: 'defeat', draw: 'draw' }[outcome] || 'draw');
  }

  togglePause() { if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume(); }
  pause() { this.state = 'paused'; this.input.enabled = false; this.mobileControls.hide(); document.exitPointerLock?.(); this.menu.showPause(); }
  resume() { this.state = 'playing'; this.input.enabled = true; this.input.reset(); this.mobileControls.show(); this.menu.hideAll(); this.clock.getDelta(); }
  returnToMenu() { this.state = 'menu'; this.input.enabled = false; this.mobileControls.hide(); document.exitPointerLock?.(); this.hud.hide(); this.exploreHud.classList.add('hidden'); this.uiRoot.classList.remove('exploring'); this.world.setCreaturesVisible(false); this.clearCharacters(); this.skillSystem?.clear?.(); this.effects?.clear?.(); this.audio.playMusic('menu'); this.menu.help.classList.add('hidden'); this.menu.showMain(); }

  setGraphics(preset) {
    const settings = { high: { scale: 1, shadows: true }, balanced: { scale: 0.8, shadows: true }, low: { scale: 0.65, shadows: false } }[preset] || { scale: 0.8, shadows: true };
    this.renderScale = settings.scale;
    this.renderer.shadowMap.enabled = settings.shadows;
    this.world.setQuality(preset);
    this.effects.setQuality(preset);
    localStorage.setItem('tidebound.graphics', preset);
    this.resize();
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  }

  resize() {
    const viewport = window.visualViewport;
    const width = Math.round(viewport?.width || innerWidth);
    const height = Math.round(viewport?.height || innerHeight);
    document.documentElement.style.setProperty('--app-width', `${width}px`);
    document.documentElement.style.setProperty('--app-height', `${height}px`);
    document.documentElement.style.setProperty('--app-left', `${viewport?.offsetLeft || 0}px`);
    document.documentElement.style.setProperty('--app-top', `${viewport?.offsetTop || 0}px`);
    this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio * this.renderScale, 1.75));
    this.renderer.setSize(width, height);
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt, performance.now() / 1000);
    if (this.state === 'menu' && !this.player) {
      const target = this.world.surfacePoint(this.world.spawnLat, this.world.spawnLon, 2);
      const up = target.clone().normalize();
      const east = new THREE.Vector3(-Math.sin(this.world.spawnLon), 0, Math.cos(this.world.spawnLon));
      const drift = Math.sin(performance.now() * 0.00015) * 12;
      this.camera.position.copy(target).addScaledVector(up, 34).addScaledVector(east, 48 + drift);
      this.camera.up.copy(up); this.camera.lookAt(target);
    }
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  };
}
