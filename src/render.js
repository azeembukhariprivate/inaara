// Drawing a level being played: scenery, ground, everything in it, Inaara, and the counters on top.
import { T } from './level.js';
import { VIEW } from './play.js';
import { Backdrop, vignette } from './backgrounds.js';
import { Tiles } from './tiles.js';
import { rng, vgrad, ellipse, roundRect, sparkle, label, heart, glow, FONT } from './gfx.js';
import * as art from './art.js';
import { drawInaara, poseFor, faceBadge, hairClip } from './hero.js';

export const HERO_SCALE = 0.8;
export const ACCENT = '#ff9f1c'; // marigold

const PALMS = {
  monsoon: { trunk: '#2a2030', ring: 'rgba(0,0,0,0.3)', frond: '#1e3a2e', nut: '#2a2418' },
  boss: { trunk: '#3a2430', ring: 'rgba(0,0,0,0.3)', frond: '#2a3a2a', nut: '#3a2a18' },
  default: { trunk: '#5a4030', ring: 'rgba(0,0,0,0.3)', frond: '#3e7a32', nut: '#6a5222' }
};

/** Which face from the sheet suits what she's doing. */
export function faceFor(player) {
  switch (player.look) {
    case 'jump': case 'glide': return 'excited';
    case 'hurt': case 'wall': return 'surprised';
    case 'cheer': return 'playful';
    case 'idle': return player.idleTime > 4 ? 'shy' : 'happy';
    default: return 'happy';
  }
}

export class Renderer {
  constructor(level, res = 1) {
    this.level = level;
    this.backdrop = new Backdrop(level.theme);
    this.tiles = new Tiles(level, res);
    this.floaters = [];
  }

  /** A little rising message ("Extra life!") in the world. */
  float(text, x, y, color = '#fff6d0') {
    this.floaters.push({ text, x, y, t: 0, color });
  }

  update(dt) {
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter(f => f.t < 1.4);
    return this.backdrop.update(dt);
  }

  draw(ctx, play, input, opts = {}) {
    const { level } = this, w = play.world, t = play.time;
    const maxY = Math.max(0, level.pxHeight - VIEW.h);
    let cx = play.camera.x, cy = play.camera.y;
    if (play.shake > 0) {
      cx += (Math.random() - 0.5) * 12 * play.shake / 0.3;
      cy += (Math.random() - 0.5) * 12 * play.shake / 0.3;
    }
    this.backdrop.draw(ctx, cx, cy, maxY, t);

    ctx.save();
    ctx.translate(-Math.round(cx), -Math.round(cy));
    const inView = (x, m = 200) => x > cx - m && x < cx + VIEW.w + m;

    for (const u of w.updrafts) if (inView(u.x, u.w)) this.updraft(ctx, u, t);
    for (const d of w.decos) if (inView(d.x, 260)) this.deco(ctx, d, t);
    this.tiles.draw(ctx, cx, VIEW.w);
    for (const s of w.signs) if (inView(s.x)) this.sign(ctx, s, input && input.touchMode);
    for (const l of w.lamps) if (inView(l.x)) art.lamp(ctx, l.x, l.y, 0.9, l.lit, t);
    if (w.gate && !w.gate.hidden && inView(w.gate.x, 300)) art.gate(ctx, w.gate.x, w.gate.y, 0.9, t, w.gate.open);
    for (const p of w.pots) if (!p.broken && inView(p.x)) art.clayPot(ctx, p.x, p.y, 1);
    for (const l of w.logs) if (inView(l.x, l.w + 50)) art.log(ctx, l.x, l.y, l.w, l.h);
    for (const l of w.lotus) {
      if (l.taken || !inView(l.x)) continue;
      glow(ctx, l.x, l.y, 46, 'rgba(255,210,90,0.45)');
      art.goldenLotus(ctx, l.x, l.y + Math.sin(t * 2.5 + l.x) * 4, 1, t);
    }
    for (const j of w.jasmine) if (!j.taken && inView(j.x, 40)) art.jasmine(ctx, j.x, j.y, 1, t);

    for (const e of w.enemies) if (inView(e.x)) this.enemy(ctx, e);
    if (w.boss) this.boss(ctx, w.boss);
    for (const c of w.coconuts) art.coconut(ctx, c.x, c.y, c.r, c.rot);

    this.player(ctx, play.player, t);
    this.particles(ctx, w.particles);
    this.tiles.drawWater(ctx, cx, cy, VIEW.w, VIEW.h, t);
    for (const f of this.floaters) {
      const a = Math.min(1, (1.4 - f.t) * 2);
      ctx.globalAlpha = a;
      label(ctx, f.text, f.x, f.y - 120 - f.t * 50, 26, { align: 'center', fill: f.color, stroke: 'rgba(40,20,0,0.75)', strokeW: 6, weight: 700 });
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    this.backdrop.drawFront(ctx, t);
    vignette(ctx, level.theme === 'monsoon' ? 0.55 : 0.32);
    if (!opts.noHud) this.hud(ctx, play, input);
  }

  updraft(ctx, u, t) {
    ctx.save();
    ctx.fillStyle = vgrad(ctx, u.y, u.y + u.h, [[0, 'rgba(255,255,255,0)'], [0.4, 'rgba(230,255,250,0.14)'], [1, 'rgba(230,255,250,0.28)']]);
    ctx.fillRect(u.x, u.y, u.w, u.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const r = rng(Math.floor(u.x));
    ctx.beginPath();
    for (let i = 0; i < u.w / 10; i++) {
      const x = u.x + r() * u.w, sp = 120 + r() * 120, y = u.y + u.h - ((r() * u.h + t * sp) % u.h);
      ctx.moveTo(x + Math.sin(t * 2 + i) * 4, y);
      ctx.lineTo(x + Math.sin(t * 2 + i + 0.5) * 4, y - 18);
    }
    ctx.stroke();
    ctx.restore();
  }

  deco(ctx, d, t) {
    const theme = this.level.theme;
    switch (d.type) {
      case 'palm': {
        const r = rng(Math.floor(d.x));
        art.palm(ctx, d.x, d.y + 4, 0.95 + r() * 0.15, (r() - 0.5) * 0.8, PALMS[theme] || PALMS.default);
        break;
      }
      case 'house':
        if (theme === 'monsoon') art.keralaHouse(ctx, d.x, d.y + 2, 0.95, '#4a4060', '#2a2440');
        else art.keralaHouse(ctx, d.x, d.y + 2, 0.95, '#efe2c4', '#b4482a');
        break;
      case 'teabush': {
        const r = rng(Math.floor(d.x));
        for (let k = 0; k < 7; k++) {
          ctx.fillStyle = k % 2 ? '#3e8a32' : '#2e6a26';
          ellipse(ctx, d.x - 36 + k * 12, d.y - 16 - Math.sin(k / 6 * Math.PI) * 14 - r() * 4, 16, 14);
          ctx.fill();
        }
        ctx.fillStyle = '#7cc85a';
        for (let k = 0; k < 8; k++) {
          ellipse(ctx, d.x - 34 + r() * 68, d.y - 30 - r() * 14, 3, 2, r());
          ctx.fill();
        }
        break;
      }
      case 'basket':
        ctx.fillStyle = vgrad(ctx, d.y - 40, d.y, [[0, '#c8a060'], [1, '#8a6430']]);
        ctx.beginPath();
        ctx.moveTo(d.x - 26, d.y - 40);
        ctx.lineTo(d.x + 26, d.y - 40);
        ctx.lineTo(d.x + 20, d.y);
        ctx.lineTo(d.x - 20, d.y);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,50,20,0.5)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(d.x - 25 + i, d.y - 34 + i * 7);
          ctx.lineTo(d.x + 25 - i, d.y - 34 + i * 7);
          ctx.stroke();
        }
        ctx.fillStyle = '#4a9a3c';
        for (let k = 0; k < 5; k++) {
          ellipse(ctx, d.x - 16 + k * 8, d.y - 42, 6, 4, k);
          ctx.fill();
        }
        break;
      case 'hornbill':
        art.hornbill(ctx, d.x + Math.sin(t * 0.5) * 30, d.y + Math.sin(t * 1.3) * 10, 0.9, t);
        break;
      default:
        break;
    }
  }

  sign(ctx, s, touch) {
    const text = (touch && s.touchText) || s.text;
    ctx.font = `600 17px ${FONT}`;
    const tw = Math.max(80, ctx.measureText(text).width + 26);
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(s.x - 3, s.y - 56, 6, 56);
    ctx.fillStyle = vgrad(ctx, s.y - 92, s.y - 56, [[0, '#d8a868'], [1, '#a8763e']]);
    roundRect(ctx, s.x - tw / 2, s.y - 94, tw, 38, 8);
    ctx.fill();
    ctx.strokeStyle = '#5a3a20';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    label(ctx, text, s.x, s.y - 74, 17, { align: 'center', fill: '#3a1c08' });
  }

  enemy(ctx, e) {
    ctx.save();
    if (e.bonked) {
      ctx.translate(e.x, e.y - e.h / 2);
      ctx.rotate(e.spin);
      ctx.translate(-e.x, -(e.y - e.h / 2));
    }
    if (e.kind === 'crab') art.crab(ctx, e.x, e.y, 1, e.t);
    else if (e.kind === 'crow') art.crow(ctx, e.x, e.y, 1, e.t, e.faceRight);
    else if (e.kind === 'monkey') art.monkey(ctx, e.x, e.y, 1, e.t, e.faceLeft, e.crouch);
    ctx.restore();
    if (e.bonked) for (let k = 0; k < 3; k++) this.star(ctx, e.x + Math.cos(e.spin + k * 2.1) * 24, e.y - e.h - 10 + Math.sin(e.spin + k * 2.1) * 8, 6);
  }

  boss(ctx, b) {
    ctx.save();
    if (b.flash > 0 && Math.floor(b.flash * 16) % 2) ctx.globalAlpha = 0.45;
    art.monkeyChief(ctx, b.x, b.y, 1, b.t, b.faceLeft, b.mood);
    ctx.restore();
    if (b.state === 'dizzy' || b.state === 'defeated') {
      for (let k = 0; k < 4; k++) {
        const a = b.t * 4 + k * Math.PI / 2;
        this.star(ctx, b.x + Math.cos(a) * 40, b.y - b.h - 18 + Math.sin(a) * 10, 8);
      }
    }
  }

  star(ctx, x, y, r) {
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  player(ctx, p, t) {
    const look = p.look;
    let x = p.x, y = p.y;
    if (p.state === 'climb' && p.climbTo) {
      const k = 1 - Math.max(0, p.climbTime) / 0.16;
      x += (p.climbTo.x - x) * k;
      y += (p.climbTo.y - y) * k;
    }
    const pose = poseFor(look, t, p.runPhase, p.vy);
    const opts = { clipGlow: p.clip >= 1 };
    if (p.invuln > 0 && p.state !== 'win' && Math.floor(p.invuln * 14) % 2) opts.alpha = 0.35;
    if (!p.onGround) opts.noShadow = true;
    if (look === 'glide') opts.leaf = (c, lx, ly) => art.bananaLeaf(c, lx, ly, 1, t);
    if (look === 'spin') {
      glow(ctx, x, y - 50, 70, 'rgba(255,210,120,0.35)');
    }
    drawInaara(ctx, x, y, HERO_SCALE, pose, faceFor(p), p.facing, opts);
  }

  particles(ctx, list) {
    for (const p of list) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, a);
      switch (p.kind) {
        case 'dust': art.puff(ctx, p.x, p.y, 6 * p.size + p.life * 14, 0.5 * a); break;
        case 'sparkle': sparkle(ctx, p.x, p.y, 7 * p.size * a + 2); break;
        case 'splash':
          ctx.fillStyle = 'rgba(220,240,255,0.85)';
          ellipse(ctx, p.x, p.y, 3 * p.size, 4.5 * p.size);
          ctx.fill();
          break;
        case 'pot': art.shard(ctx, p.x, p.y, p.size, p.rot, '#b8582e'); break;
        case 'shell': art.shard(ctx, p.x, p.y, p.size * 0.8, p.rot, '#6a4a24'); break;
        case 'heart': heart(ctx, p.x, p.y, 0.6 * p.size, true); break;
        case 'star': this.star(ctx, p.x, p.y, 6 * p.size); break;
        case 'petal':
          ctx.fillStyle = p.size > 1 ? '#ffb02e' : '#ffd84a';
          ellipse(ctx, p.x, p.y, 5 * p.size, 3 * p.size, p.rot);
          ctx.fill();
          break;
        default: break;
      }
    }
    ctx.globalAlpha = 1;
  }

  // ================================================================ counters on top

  hud(ctx, play, input) {
    const W = VIEW.w, panel = 'rgba(10,20,10,0.45)', stroke = { stroke: 'rgba(10,30,10,0.7)', strokeW: 5 };
    const pill = (x, y, w, h) => {
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fillStyle = panel;
      ctx.fill();
    };
    pill(20, 18, 170, 46);
    for (let i = 0; i < 3; i++) heart(ctx, 48 + i * 34, 42, 1.25, i < play.hearts);
    pill(202, 18, 150, 46);
    art.jasmine(ctx, 230, 41, 0.9, 0);
    label(ctx, '× ' + play.jasmine, 254, 42, 24, stroke);
    // The three golden lotuses.
    const ids = play.world.lotus.map(l => l.id).sort();
    if (ids.length) pill(364, 18, 136, 46);
    ids.forEach((id, i) => {
      const x = 396 + i * 36;
      if (play.lotus.has(id)) art.goldenLotus(ctx, x, 44, 0.62, 0);
      else {
        ctx.globalAlpha = 0.3;
        art.goldenLotus(ctx, x, 44, 0.62, 0);
        ctx.globalAlpha = 1;
      }
    });
    pill(540, 18, 300, 46);
    label(ctx, play.level.name, 690, 42, 22, { align: 'center', ...stroke });
    pill(W - 150, 18, 130, 46);
    faceBadge(ctx, W - 125, 41, 19, 'happy');
    label(ctx, '× ' + play.session.lives, W - 98, 42, 24, stroke);
    // The clip meter: the spin is ready when the clip glows.
    const p = play.player;
    pill(20, 74, 130, 26);
    hairClip(ctx, 40, 87, 0.9, 0, p.clip >= 1);
    roundRect(ctx, 62, 82, 78, 10, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    roundRect(ctx, 62, 82, Math.max(10, 78 * p.clip), 10, 5);
    ctx.fillStyle = vgrad(ctx, 82, 92, [[0, '#ffe08a'], [1, '#e0a030']]);
    ctx.fill();
    // The chief's garlands left.
    const b = play.world.boss;
    if (b && b.state !== 'intro') {
      pill(W / 2 - 110, 80, 220, 40);
      label(ctx, 'Chief', W / 2 - 60, 100, 20, { align: 'center', ...stroke });
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = i < b.hp ? 1 : 0.25;
        this.garland(ctx, W / 2 + i * 32, 100);
      }
      ctx.globalAlpha = 1;
    }
    if (input && input.touchMode) this.touchButtons(ctx, input);
  }

  garland(ctx, x, y) {
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      ctx.fillStyle = k % 2 ? ACCENT : '#ffd23a';
      ellipse(ctx, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 4.5, 4.5);
      ctx.fill();
    }
  }

  touchButtons(ctx, input) {
    for (const b of input.touchButtons) {
      const down = input.held[b.name];
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = down ? 'rgba(255,220,140,0.45)' : 'rgba(255,255,255,0.16)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
      const sym = { left: '◀', right: '▶', down: '▼', jump: 'JUMP', spin: 'SPIN', pause: 'II' }[b.name];
      const size = sym.length > 2 ? b.r * 0.42 : b.r * 0.62;
      label(ctx, sym, b.x, b.y + 1, size, { align: 'center', fill: 'rgba(255,255,255,0.85)', weight: 700 });
    }
  }
}

/** Where the touch buttons go during play. */
export const TOUCH_BUTTONS = [
  { name: 'left', x: 100, y: 622, r: 62 },
  { name: 'right', x: 250, y: 622, r: 62 },
  { name: 'down', x: 352, y: 660, r: 38 },
  { name: 'jump', x: 1168, y: 600, r: 74 },
  { name: 'spin', x: 1010, y: 650, r: 54 },
  { name: 'pause', x: 1236, y: 116, r: 28 }
];
