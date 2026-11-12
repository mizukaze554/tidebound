const AUDIO_FILES = {
  music: {
    menu: '/assets/audio/menu-music.mp3',
    exploration: '/assets/audio/exploration-music.mp3',
    combat: '/assets/audio/combat-music.mp3',
    victory: '/assets/audio/victory-music.mp3',
    defeat: '/assets/audio/defeat-music.mp3',
    draw: '/assets/audio/draw-music.mp3',
  },
  sfx: {
    hit: '/assets/audio/sword-hit.mp3',
    block: '/assets/audio/block.mp3',
    perfectBlock: '/assets/audio/perfect-block.mp3',
    skill: '/assets/audio/skill.mp3',
    ui: '/assets/audio/ui-click.mp3',
    swing: '/assets/audio/sword-swing.mp3',
    dodge: '/assets/audio/dodge.mp3',
    footsteps: '/assets/audio/footstep.mp3',
    jump: '/assets/audio/jump.mp3',
    landing: '/assets/audio/landing.mp3',
    fire: '/assets/audio/fire-skill.mp3',
    water: '/assets/audio/water-skill.mp3',
    wind: '/assets/audio/wind-skill.mp3',
    earth: '/assets/audio/earth-skill.mp3',
  },
};

export class AudioManager {
  constructor(store = globalThis.localStorage) {
    this.store = store;
    this.musicVolume = Number(store?.getItem('tidebound.musicVolume') ?? 0.45);
    this.sfxVolume = Number(store?.getItem('tidebound.sfxVolume') ?? 0.7);
    this.muted = store?.getItem('tidebound.muted') === 'true';
    this.unlocked = false;
    this.context = null;
    this.currentMusic = null;
    this.previousMusic = null;
    this.currentMusicName = null;
    this.missing = new Set();
    this.lastSfx = new Map();
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (Context) { this.context ||= new Context(); this.context.resume?.(); }
    if (this.currentMusicName) this.playMusic(this.currentMusicName);
  }

  playMusic(name) {
    this.currentMusicName = name;
    if (!this.unlocked || this.missing.has(`music:${name}`) || typeof Audio === 'undefined') return;
    if (this.currentMusic?.dataset.track === name) return;
    const previous = this.currentMusic;
    this.previousMusic = previous;
    const audio = new Audio(AUDIO_FILES.music[name]);
    audio.dataset.track = name;
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audio.addEventListener('error', () => this.missing.add(`music:${name}`), { once: true });
    this.currentMusic = audio;
    audio.play().then(() => {
      const started = performance.now();
      const fade = () => {
        if (this.currentMusic !== audio) { audio.pause(); return; }
        const progress = Math.min(1, (performance.now() - started) / 650);
        audio.volume = this.muted ? 0 : this.musicVolume * progress;
        if (previous) previous.volume = this.muted ? 0 : this.musicVolume * (1 - progress);
        if (progress < 1) requestAnimationFrame(fade);
        else { previous?.pause(); if (this.previousMusic === previous) this.previousMusic = null; }
      };
      fade();
    }).catch(() => { /* unlock or optional file may be unavailable */ });
  }

  stopMusic() {
    this.currentMusic?.pause();
    this.previousMusic?.pause();
    this.currentMusic = null;
    this.previousMusic = null;
    this.currentMusicName = null;
  }

  playSfx(name) {
    if (!this.unlocked || this.muted) return;
    const now = performance.now();
    const minimumGap = name === 'footsteps' ? 90 : name === 'ui' ? 45 : 22;
    if (now - (this.lastSfx.get(name) || 0) < minimumGap) return;
    this.lastSfx.set(name, now);
    const file = AUDIO_FILES.sfx[name];
    if (file && !this.missing.has(`sfx:${name}`) && typeof Audio !== 'undefined') {
      const audio = new Audio(file);
      audio.volume = this.sfxVolume;
      let usedFallback = false;
      const fallback = () => { if (usedFallback) return; usedFallback = true; this.missing.add(`sfx:${name}`); this.synth(name); };
      audio.addEventListener('error', fallback, { once: true });
      audio.play().catch(fallback);
      return;
    }
    this.synth(name);
  }

  synth(name) {
    if (!this.context || this.muted) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    const frequencies = { hit: [100, 42], block: [180, 85], perfectBlock: [720, 180], skill: [280, 620], ui: [460, 580], swing: [180, 75], dodge: [320, 120], footsteps: [75, 55], jump: [220, 340], landing: [95, 50], fire: [190, 620], water: [420, 180], wind: [640, 260], earth: [120, 48] };
    const [start, end] = frequencies[name] || frequencies.hit;
    oscillator.type = name === 'skill' || name === 'ui' ? 'sine' : name === 'block' ? 'square' : 'sawtooth';
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + 0.12);
    gain.gain.setValueAtTime(0.06 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now); oscillator.stop(now + 0.15);
  }

  setMusicVolume(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value)));
    this.store?.setItem('tidebound.musicVolume', String(this.musicVolume));
    if (this.currentMusic) this.currentMusic.volume = this.muted ? 0 : this.musicVolume;
  }

  setSfxVolume(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value)));
    this.store?.setItem('tidebound.sfxVolume', String(this.sfxVolume));
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this.store?.setItem('tidebound.muted', String(this.muted));
    if (this.currentMusic) this.currentMusic.volume = this.muted ? 0 : this.musicVolume;
  }

  toggleMute() { this.setMuted(!this.muted); return this.muted; }
}

export { AUDIO_FILES };
