export class MobileControls {
  constructor(root, input) {
    this.input = input;
    this.el = document.createElement('section');
    this.el.className = 'mobile-controls hidden';
    this.el.innerHTML = `
      <div class="mobile-look" data-look aria-label="Drag to rotate camera"></div>
      <div class="mobile-stick" data-stick><i data-knob></i></div>
      <div class="mobile-actions">
        <button data-code="KeyQ">Q<small>DODGE</small></button>
        <button data-code="Space">↑<small>JUMP</small></button>
        <button class="mobile-attack" data-code="Mouse0">⚔<small>ATTACK</small></button>
        <button data-hold="block">◇<small>BLOCK</small></button>
      </div>
      <div class="mobile-skills"><button data-code="KeyE">E</button><button data-code="KeyR">R</button><button data-code="KeyF">F</button><button data-code="Tab">◎</button><button data-code="Escape">Ⅱ</button></div>`;
    root.append(this.el);
    this.bindStick(); this.bindLook();
    this.el.querySelectorAll('[data-code]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => { event.preventDefault(); this.input.pulse(button.dataset.code); });
    });
    const block = this.el.querySelector('[data-hold="block"]');
    const setBlock = (active) => { this.input.setVirtualButton(2, active); block.classList.toggle('active', active); };
    block.addEventListener('pointerdown', (event) => { event.preventDefault(); block.setPointerCapture(event.pointerId); setBlock(true); });
    block.addEventListener('pointerup', () => setBlock(false));
    block.addEventListener('pointercancel', () => setBlock(false));
  }

  show() { this.el.classList.remove('hidden'); }
  hide() { this.el.classList.add('hidden'); }

  bindStick() {
    const stick = this.el.querySelector('[data-stick]');
    const knob = stick.querySelector('[data-knob]');
    const release = () => {
      ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft'].forEach((code) => this.input.setVirtual(code, false));
      knob.style.transform = 'translate(-50%, -50%)';
    };
    const move = (event) => {
      const rect = stick.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.5);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.5);
      const magnitude = Math.hypot(dx, dy);
      const length = Math.max(1, magnitude);
      const x = dx / length, y = dy / length;
      knob.style.transform = `translate(calc(-50% + ${x * 34}px), calc(-50% + ${y * 34}px))`;
      this.input.setVirtual('KeyA', x < -0.28); this.input.setVirtual('KeyD', x > 0.28);
      this.input.setVirtual('KeyW', y < -0.28); this.input.setVirtual('KeyS', y > 0.28);
      this.input.setVirtual('ShiftLeft', magnitude > 0.82);
    };
    stick.addEventListener('pointerdown', (event) => { event.preventDefault(); stick.setPointerCapture(event.pointerId); move(event); });
    stick.addEventListener('pointermove', (event) => { if (stick.hasPointerCapture(event.pointerId)) move(event); });
    stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release);
  }

  bindLook() {
    const look = this.el.querySelector('[data-look]');
    let last = null;
    look.addEventListener('pointerdown', (event) => { look.setPointerCapture(event.pointerId); last = { x: event.clientX, y: event.clientY }; });
    look.addEventListener('pointermove', (event) => {
      if (!last || !look.hasPointerCapture(event.pointerId)) return;
      this.input.addLookDelta((event.clientX - last.x) * 1.3, (event.clientY - last.y) * 1.3);
      last = { x: event.clientX, y: event.clientY };
    });
    const release = () => { last = null; };
    look.addEventListener('pointerup', release); look.addEventListener('pointercancel', release);
  }
}
