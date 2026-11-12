export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.buttons = new Set();
    this.virtualKeys = new Set();
    this.virtualButtons = new Set();
    this.virtualPressed = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.enabled = false;

    window.addEventListener('keydown', (event) => {
      if (!this.enabled || event.repeat || this.isTyping(event)) return;
      if (['Space', 'Tab', 'KeyQ', 'KeyE', 'KeyR', 'KeyF'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      this.pressed.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.reset());
    canvas.addEventListener('mousedown', (event) => {
      if (!this.enabled) return;
      event.preventDefault();
      this.buttons.add(event.button);
      if (event.button === 0) this.pressed.add('Mouse0');
      if (event.button === 2) this.pressed.add('Mouse2');
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    });
    window.addEventListener('mouseup', (event) => this.buttons.delete(event.button));
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement === canvas && this.enabled) {
        this.mouseDelta.x += event.movementX;
        this.mouseDelta.y += event.movementY;
      }
    });
  }

  isTyping(event) {
    return ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName);
  }

  down(code) { return this.keys.has(code) || this.virtualKeys.has(code); }
  button(button) { return this.buttons.has(button) || this.virtualButtons.has(button); }
  consume(code) {
    const value = this.pressed.has(code) || this.virtualPressed.has(code);
    this.pressed.delete(code);
    this.virtualPressed.delete(code);
    return value;
  }
  setVirtual(code, active) { active ? this.virtualKeys.add(code) : this.virtualKeys.delete(code); }
  setVirtualButton(button, active) { active ? this.virtualButtons.add(button) : this.virtualButtons.delete(button); }
  pulse(code) { this.virtualPressed.add(code); }
  addLookDelta(x, y) { this.mouseDelta.x += x; this.mouseDelta.y += y; }
  endFrame() {
    this.pressed.clear();
    this.virtualPressed.clear();
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }
  reset() {
    // Vite can retain an older Input instance during hot updates. Recreate any
    // missing collections instead of blocking entry into a match.
    if (!(this.keys instanceof Set)) this.keys = new Set();
    else this.keys.clear();
    if (!(this.pressed instanceof Set)) this.pressed = new Set();
    else this.pressed.clear();
    if (!(this.buttons instanceof Set)) this.buttons = new Set();
    else this.buttons.clear();
    if (!(this.virtualKeys instanceof Set)) this.virtualKeys = new Set();
    else this.virtualKeys.clear();
    if (!(this.virtualButtons instanceof Set)) this.virtualButtons = new Set();
    else this.virtualButtons.clear();
    if (!(this.virtualPressed instanceof Set)) this.virtualPressed = new Set();
    else this.virtualPressed.clear();
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }
}
