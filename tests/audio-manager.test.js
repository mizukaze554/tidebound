import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager, AUDIO_FILES } from '../src/core/AudioManager.js';

class Store {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test('audio settings persist independently and draw has its own track', () => {
  const store = new Store();
  const audio = new AudioManager(store);
  audio.setMusicVolume(0.25); audio.setSfxVolume(0.8); audio.setMuted(true);
  const restored = new AudioManager(store);
  assert.equal(restored.musicVolume, 0.25);
  assert.equal(restored.sfxVolume, 0.8);
  assert.equal(restored.muted, true);
  assert.match(AUDIO_FILES.music.draw, /draw-music\.mp3$/);
});

test('music stops when gameplay ends and stays stopped after unlock', () => {
  const audio = new AudioManager(new Store());
  let pauses = 0;
  audio.currentMusic = { pause() { pauses++; } };
  audio.currentMusicName = 'exploration';
  audio.stopMusic();
  audio.unlock();
  assert.equal(pauses, 1);
  assert.equal(audio.currentMusic, null);
  assert.equal(audio.currentMusicName, null);
});
