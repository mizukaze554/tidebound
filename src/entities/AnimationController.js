import * as THREE from 'three';

const STATE_WORDS = {
  idle: ['idle'], walk: ['walk'], run: ['run'], sprint: ['sprint', 'run fast'], jump: ['jump', 'fall'], landing: ['land'],
  attack1: ['attack1', 'attack 1', 'slash1', 'slash 1'],
  attack2: ['attack2', 'attack 2', 'slash2', 'slash 2'],
  attack3: ['attack3', 'attack 3', 'slash3', 'slash 3'],
  attack: ['attack', 'slash', 'strike'], block: ['block', 'guard'], dodge: ['dodge', 'roll'],
  hit: ['hit', 'damage', 'hurt'], defeat: ['defeat', 'death', 'die'],
};

export class AnimationStateController {
  constructor(root, clips) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = new Map();
    this.current = null;
    for (const [state, words] of Object.entries(STATE_WORDS)) {
      const clip = clips.find((candidate) => words.some((word) => candidate.name.toLowerCase().includes(word)));
      if (clip) this.actions.set(state, this.mixer.clipAction(clip));
    }
  }

  setState(state) {
    const next = this.actions.get(state) || (state.startsWith('attack') ? this.actions.get('attack') : null) || this.actions.get('idle');
    if (!next || next === this.current) return;
    const previous = this.current;
    this.current = next;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (state.startsWith('attack') || state === 'hit' || state === 'dodge' || state === 'landing' || state === 'defeat') next.setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;
    else next.setLoop(THREE.LoopRepeat, Infinity);
    previous?.crossFadeTo(next, state === 'hit' ? 0.06 : 0.16, false);
  }

  update(dt, state) { this.setState(state); this.mixer.update(dt); }
  dispose() { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root); }
}
