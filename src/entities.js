// Everything in a level besides the ground: jasmine, lotuses, pots, lamps, logs, enemies and the Monkey Chief.
// Enemies are never hurt: bonked ones tumble away and run off.
import { T } from './level.js';
import { moveBody } from './physics.js';

export function spawn(level) {
  const w = {
    jasmine: [], lotus: [], pots: [], lamps: [], signs: [], decos: [], logs: [], updrafts: [],
    enemies: [], coconuts: [], particles: [], gate: null, boss: null, start: null
  };
  for (const e of level.entities) {
    switch (e.type) {
      case 'start': w.start = { x: e.x, y: e.y }; break;
      case 'jasmine': w.jasmine.push({ x: e.x, y: e.y, taken: false }); break;
      case 'lotus': w.lotus.push({ x: e.x, y: e.y, id: e.id, taken: false }); break;
      case 'pot': w.pots.push({ x: e.x, y: e.y, heart: !!e.heart, broken: false }); break;
      case 'lamp': w.lamps.push({ x: e.x, y: e.y, lit: false }); break;
      case 'sign': w.signs.push({ ...e }); break;
      case 'gate': w.gate = { x: e.x, y: e.y, hidden: !!e.hidden, open: false }; break;
      case 'log': w.logs.push({ ...e, x: e.x0, dx: 0, t: e.phase || 0 }); break;
      case 'updraft': w.updrafts.push({ ...e }); break;
      case 'crab': w.enemies.push(new Crab(e.x, e.y)); break;
      case 'crow': w.enemies.push(new Crow(e.x, e.y, e.range || 3)); break;
      case 'monkey': w.enemies.push(new Monkey(e.x, e.y)); break;
      case 'boss': w.boss = new MonkeyChief(e.x, e.y); break;
      default: w.decos.push({ ...e }); break; // palms, houses, tea bushes, baskets, hornbills
    }
  }
  return w;
}

// ================================================================ moving logs

export function updateLogs(logs, dt) {
  for (const l of logs) {
    l.t += dt * l.speed;
    const nx = l.x0 + (l.x1 - l.x0) * (0.5 - 0.5 * Math.cos(l.t));
    l.dx = nx - l.x;
    l.x = nx;
  }
}

// ================================================================ enemies

class Enemy {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.t = Math.random() * 10;
    this.bonked = false;
    this.gone = false;
    this.spin = 0;
  }

  get box() {
    return { l: this.x - this.w / 2, r: this.x + this.w / 2, t: this.y - this.h, b: this.y };
  }

  /** Knocked over: tumbles up and away, off the bottom of the screen. */
  bonk(fromX) {
    this.bonked = true;
    this.vy = -520;
    this.vx = (this.x < fromX ? -1 : 1) * 200;
  }

  updateBonked(dt, level) {
    this.vy += 1800 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 10;
    if (this.y > level.pxHeight + 200) this.gone = true;
  }
}

export class Crab extends Enemy {
  constructor(x, y) {
    super(x, y, 44, 30);
    this.kind = 'crab';
    this.vx = -60;
  }

  update(dt, level) {
    this.t += dt;
    if (this.bonked) return this.updateBonked(dt, level);
    // Walk sideways; turn round at walls and edges.
    const dir = Math.sign(this.vx);
    const ahead = this.x + dir * (this.w / 2 + 2);
    const tx = Math.floor(ahead / T), ty = Math.floor((this.y - 4) / T), below = Math.floor((this.y + 4) / T);
    const wall = level.isSolid(tx, ty);
    const floor = level.isSolid(tx, below) || level.isPlank(tx, below);
    if (wall || !floor) this.vx = -this.vx;
    this.x += this.vx * dt;
  }
}

export class Crow extends Enemy {
  constructor(x, y, range) {
    super(x, y, 46, 26);
    this.kind = 'crow';
    this.x0 = x;
    this.y0 = y;
    this.range = range * T;
    this.faceRight = false;
  }

  update(dt, level) {
    this.t += dt;
    if (this.bonked) return this.updateBonked(dt, level);
    const nx = this.x0 + Math.sin(this.t * 0.8) * this.range;
    this.faceRight = nx > this.x;
    this.x = nx;
    this.y = this.y0 + Math.sin(this.t * 2.3) * 14 + 13;
  }
}

export class Monkey extends Enemy {
  constructor(x, y) {
    super(x, y, 36, 52);
    this.kind = 'monkey';
    this.hop = 1 + Math.random();
    this.faceLeft = true;
    this.onGround = true;
  }

  update(dt, level, player) {
    this.t += dt;
    if (this.bonked) return this.updateBonked(dt, level);
    this.hop -= dt;
    const dx = player.x - this.x;
    if (this.onGround) {
      this.vx = 0;
      this.faceLeft = dx < 0;
      if (this.hop <= 0 && Math.abs(dx) < 460 && Math.abs(player.y - this.y) < 260) {
        // Hop towards her, cheekily.
        this.vy = -640;
        this.vx = Math.sign(dx) * 170;
        this.hop = 1.4 + Math.random() * 0.6;
      }
    }
    this.vy = Math.min(this.vy + 2400 * dt, 1000);
    moveBody(this, level, dt);
    if (this.y > level.pxHeight + 100) this.gone = true;
  }

  get crouch() {
    return this.onGround && this.hop < 0.3 ? 6 : 0;
  }
}

// ================================================================ the Monkey Chief

export class MonkeyChief {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 84;
    this.h = 128;
    this.hp = 3;
    this.state = 'intro';
    this.timer = 2;
    this.t = 0;
    this.vx = 0;
    this.vy = 0;
    this.faceLeft = true;
    this.throws = 0;
    this.flash = 0;
    this.onGround = true;
    this.events = [];
  }

  get box() {
    return { l: this.x - this.w / 2, r: this.x + this.w / 2, t: this.y - this.h, b: this.y };
  }

  get vulnerable() {
    return this.state === 'dizzy';
  }

  get mood() {
    if (this.state === 'dizzy' || this.state === 'defeated') return 'dizzy';
    if (this.state === 'throw') return 'throw';
    return 'normal';
  }

  update(dt, level, player, world) {
    this.t += dt;
    this.timer -= dt;
    this.flash = Math.max(0, this.flash - dt);
    const fast = 3 - this.hp; // gets quicker after each bonk
    switch (this.state) {
      case 'intro':
        if (this.timer <= 0) this.toHop(level);
        break;
      case 'hop':
        if (this.onGround && this.timer <= 0) {
          this.state = 'throw';
          this.throws = 3 + fast;
          this.timer = 0.5;
        }
        break;
      case 'throw':
        this.faceLeft = player.x < this.x;
        if (this.timer <= 0) {
          if (this.throws > 0) {
            this.throwCoconut(player, world);
            this.throws--;
            this.timer = 0.55 - fast * 0.08;
          } else {
            this.state = 'dizzy';
            this.timer = 2.6 - fast * 0.4;
            this.events.push('dizzy');
          }
        }
        break;
      case 'dizzy':
        if (this.timer <= 0) this.toHop(level);
        break;
      case 'hit':
        if (this.onGround && this.timer <= 0) {
          if (this.hp <= 0) {
            this.state = 'defeated';
            this.events.push('defeated');
          } else this.toHop(level);
        }
        break;
      case 'defeated':
        this.vx = 0;
        break;
    }
    this.vy = Math.min(this.vy + 2200 * dt, 1100);
    const wasGround = this.onGround;
    moveBody(this, level, dt);
    if (this.onGround && !wasGround) {
      this.vx = 0;
      this.events.push('thud');
    }
  }

  toHop(level) {
    // Leap to the other side of the courtyard.
    this.state = 'hop';
    const target = this.x > level.pxWidth / 2 ? level.pxWidth * 0.25 : level.pxWidth * 0.75;
    this.vy = -900;
    this.vx = (target - this.x) / 0.85;
    this.faceLeft = target < this.x;
    this.timer = 0.6;
    this.onGround = false;
  }

  throwCoconut(player, world) {
    const from = { x: this.x + (this.faceLeft ? -40 : 40), y: this.y - 120 };
    const time = 0.95;
    const vx = Math.max(-560, Math.min(560, (player.x - from.x) / time));
    world.coconuts.push({ x: from.x, y: from.y, vx, vy: -720, r: 15, rot: 0 });
    this.events.push('throw');
  }

  /** Bonked while dizzy. Returns true if it counted. */
  bonk() {
    if (!this.vulnerable) return false;
    this.hp--;
    this.state = 'hit';
    this.flash = 0.8;
    this.timer = 0.8;
    this.vy = -500;
    this.vx = 0;
    this.events.push('bossHit');
    return true;
  }
}

export function updateCoconuts(world, level, dt) {
  for (const c of world.coconuts) {
    c.vy += 1500 * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += dt * 8;
    const tx = Math.floor(c.x / T), ty = Math.floor((c.y + c.r) / T);
    if (c.vy > 0 && (level.isSolid(tx, ty) || level.isPlank(tx, ty))) c.broken = true;
    if (c.y > level.pxHeight + 100) c.broken = true;
  }
  for (const c of world.coconuts.filter(k => k.broken)) burst(world, c.x, c.y + c.r, 8, 'shell');
  world.coconuts = world.coconuts.filter(k => !k.broken);
}

// ================================================================ little effects

export function burst(world, x, y, n, kind, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = opts.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2 : Math.random() * Math.PI * 2;
    const sp = (opts.speed || 220) * (0.4 + Math.random() * 0.6);
    world.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.lift || 0), life: 0, max: 0.5 + Math.random() * 0.5, kind, rot: Math.random() * 6, size: 0.6 + Math.random() * 0.8 });
  }
}

export function updateParticles(world, dt) {
  for (const p of world.particles) {
    p.life += dt;
    const g = p.kind === 'sparkle' || p.kind === 'petal' ? 200 : p.kind === 'dust' ? -40 : 900;
    p.vy += g * dt;
    p.vx *= 0.98;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += dt * 6;
  }
  world.particles = world.particles.filter(p => p.life < p.max);
}
