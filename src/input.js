// Controls: keyboard, game controllers, and on-screen touch buttons, all read into one set of buttons.

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
  KeyX: 'spin', ShiftLeft: 'spin', ShiftRight: 'spin', KeyJ: 'spin',
  Escape: 'pause', KeyP: 'pause',
  Enter: 'confirm'
};

const BUTTONS = ['left', 'right', 'up', 'down', 'jump', 'spin', 'pause', 'confirm', 'back'];

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.taps = new Set(); // pressed since the last frame, even if already let go
    this.held = {};
    this.prev = {};
    this.pressed = {};
    this.touches = new Map(); // touch id -> button
    this.touchMode = false;
    this.pointer = null; // a click or tap for menus, in game coordinates
    this.touchButtons = [];
    this.lastDevice = 'keyboard';
    this.toGame = (x, y) => ({ x, y });

    addEventListener('keydown', e => {
      const b = KEYS[e.code];
      if (b) {
        this.keys.add(b);
        this.taps.add(b);
        e.preventDefault();
      }
      if (e.code === 'Backspace') {
        this.keys.add('back');
        this.taps.add('back');
      }
      this.lastDevice = 'keyboard';
      this.touchMode = false;
    });
    addEventListener('keyup', e => {
      const b = KEYS[e.code];
      if (b) this.keys.delete(b);
      if (e.code === 'Backspace') this.keys.delete('back');
    });
    addEventListener('blur', () => this.keys.clear());

    const touch = e => {
      e.preventDefault();
      this.touchMode = true;
      this.lastDevice = 'touch';
      this.touches.clear();
      for (const t of e.touches) {
        const p = this.toGame(t.clientX, t.clientY);
        const btn = this.touchButtons.find(b => Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.25);
        if (btn) {
          this.touches.set(t.identifier, btn.name);
          if (e.type === 'touchstart') this.taps.add(btn.name);
        }
      }
      if (e.type === 'touchstart') {
        const t = e.changedTouches[0];
        const p = this.toGame(t.clientX, t.clientY);
        if (!this.touchButtons.some(b => Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.25)) this.pointer = p;
      }
    };
    canvas.addEventListener('touchstart', touch, { passive: false });
    canvas.addEventListener('touchmove', touch, { passive: false });
    canvas.addEventListener('touchend', touch, { passive: false });
    canvas.addEventListener('touchcancel', touch, { passive: false });
    canvas.addEventListener('mousedown', e => {
      if (this.touchMode) return;
      this.pointer = this.toGame(e.clientX, e.clientY);
    });
  }

  /** Reads everything once per frame. */
  poll() {
    const now = {};
    for (const b of BUTTONS) now[b] = this.keys.has(b);
    for (const b of this.touches.values()) now[b] = true;
    for (const b of this.taps) now[b] = true;
    this.taps.clear();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const btn = i => pad.buttons[i] && pad.buttons[i].pressed;
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      const any = btn(0) || btn(1) || btn(2) || btn(3) || btn(9) || btn(12) || btn(13) || btn(14) || btn(15) || Math.abs(ax) > 0.4 || Math.abs(ay) > 0.4;
      if (any) {
        this.lastDevice = 'gamepad';
        this.touchMode = false;
      }
      now.left = now.left || btn(14) || ax < -0.4;
      now.right = now.right || btn(15) || ax > 0.4;
      now.up = now.up || btn(12) || ay < -0.5;
      now.down = now.down || btn(13) || ay > 0.5;
      now.jump = now.jump || btn(0);
      now.spin = now.spin || btn(2) || btn(1) || btn(5) || btn(7);
      now.pause = now.pause || btn(9);
      now.confirm = now.confirm || btn(0);
      now.back = now.back || btn(1);
    }
    for (const b of BUTTONS) {
      this.pressed[b] = now[b] && !this.prev[b];
      this.prev[b] = now[b];
    }
    this.held = now;
  }

  /** The buttons Inaara reacts to. Pressed buttons count once only. */
  game(first) {
    return {
      left: this.held.left, right: this.held.right, up: this.held.up, down: this.held.down,
      jump: this.held.jump,
      jumpPressed: first && this.pressed.jump,
      spinPressed: first && this.pressed.spin
    };
  }

  takePointer() {
    const p = this.pointer;
    this.pointer = null;
    return p;
  }
}
