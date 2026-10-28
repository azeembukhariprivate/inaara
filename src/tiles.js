// The ground of a level, drawn in strips once and then reused: grassy earth, stone, planks and thorny bushes.
// Water is drawn every frame because it moves.
import { T, TILE } from './level.js';
import { rng, vgrad, ellipse, roundRect, makeCanvas } from './gfx.js';

const STYLES = {
  backwaters: { grass: '#5aa040', light: '#b8e07a', tufts: ['#4c9a3c', '#7cc85a', '#3a7a2e'], earth: ['#6a4428', '#4a2e1a', '#2a180c'], stone: '#7a5a3e', rock: 'stone', rockCol: ['#9a8a74', '#6a5a4a'], plank: 'wood', water: ['rgba(90,150,150,0.72)', 'rgba(20,60,70,0.92)'], foam: 'rgba(255,240,210,0.8)' },
  tea: { grass: '#5aa040', light: '#a8e070', tufts: ['#3e8a32', '#5aa846', '#2e6a26'], earth: ['#9a5232', '#6a3420', '#3a1a0e'], stone: '#7a4a32', rock: 'stone', rockCol: ['#a08a78', '#6e5a4c'], plank: 'wood', water: ['rgba(90,150,170,0.72)', 'rgba(30,70,80,0.92)'], foam: 'rgba(255,255,255,0.8)' },
  rainforest: { grass: '#4a8a3e', light: '#9ad070', tufts: ['#3c8a3c', '#6cb85a', '#2a6a2e'], earth: ['#5a5a4c', '#3e3e34', '#22221c'], stone: '#6a6a5e', rock: 'mossy', rockCol: ['#7a7a6c', '#4a4a40'], plank: 'wood', water: ['rgba(100,170,170,0.7)', 'rgba(20,60,60,0.92)'], foam: 'rgba(255,255,255,0.85)' },
  monsoon: { grass: '#3a6a4a', light: '#7ab090', tufts: ['#2e5a3e', '#4a8a5e'], earth: ['#8a3a22', '#5a2012', '#2a100a'], stone: '#6a2a18', rock: 'laterite', rockCol: ['#9a4a2a', '#5a2414'], plank: 'wood', water: ['rgba(60,80,130,0.72)', 'rgba(15,20,45,0.94)'], foam: 'rgba(200,215,255,0.7)' },
  boatrace: { grass: '#5aa040', light: '#b8e07a', tufts: ['#4c9a3c', '#7cc85a'], earth: ['#6a4428', '#4a2e1a', '#2a180c'], stone: '#7a5a3e', rock: 'post', rockCol: ['#8a5a30', '#4a2a14'], plank: 'bamboo', water: ['rgba(80,140,170,0.7)', 'rgba(20,60,80,0.92)'], foam: 'rgba(255,255,255,0.85)' },
  boss: { grass: '#d8c09a', light: '#f4e0b8', tufts: null, earth: ['#a88a66', '#7a5e44', '#4a3424'], stone: '#8a6a4a', rock: 'temple', rockCol: ['#8a6a54', '#4a3428'], plank: 'carved', water: ['rgba(80,120,150,0.7)', 'rgba(20,40,60,0.9)'], foam: 'rgba(255,255,255,0.8)' }
};

const CHUNK = 16; // tiles per strip
const KEEP = 6; // strips kept ready at once

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r1, g1, b1] = ch(pa), [r2, g2, b2] = ch(pb);
  const f = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${f(r1, r2)},${f(g1, g2)},${f(b1, b2)})`;
}

export class Tiles {
  constructor(level, res = 1) {
    this.level = level;
    this.style = STYLES[level.theme] || STYLES.backwaters;
    this.res = res;
    this.chunks = new Map();
    this.water = this.findWater();
  }

  /** Water surfaces as runs of columns: { x0, x1 (pixels), y (surface), b (bottom) }. */
  findWater() {
    const L = this.level, runs = [];
    let cur = null;
    for (let x = 0; x < L.width; x++) {
      let top = -1;
      for (let y = 0; y < L.height; y++) {
        if (L.isWater(x, y) && !L.isWater(x, y - 1)) {
          top = y;
          break;
        }
      }
      if (top >= 0 && cur && cur.top === top && cur.tx1 === x - 1) cur.tx1 = x;
      else if (top >= 0) {
        cur = { top, tx0: x, tx1: x };
        runs.push(cur);
      } else cur = null;
    }
    return runs.map(r => ({ x0: r.tx0 * T, x1: (r.tx1 + 1) * T, y: r.top * T + 8, b: L.pxHeight }));
  }

  chunk(i) {
    let c = this.chunks.get(i);
    if (c) {
      this.chunks.delete(i);
      this.chunks.set(i, c); // most recently used last
      return c;
    }
    c = this.render(i);
    this.chunks.set(i, c);
    while (this.chunks.size > KEEP) this.chunks.delete(this.chunks.keys().next().value);
    return c;
  }

  /** Draws the ground in view (and gets the next strip ready). */
  draw(ctx, camX, viewW) {
    const w = CHUNK * T, first = Math.floor(camX / w), last = Math.floor((camX + viewW) / w);
    for (let i = first; i <= last; i++) {
      if (i < 0 || i * w >= this.level.pxWidth) continue;
      ctx.drawImage(this.chunk(i), i * w, -T, w, this.level.pxHeight + T);
    }
    const ahead = last + 1;
    if (ahead * w < this.level.pxWidth && !this.chunks.has(ahead)) this.chunk(ahead);
  }

  render(i) {
    const L = this.level, s = this.style, res = this.res, w = CHUNK * T, h = L.pxHeight + T;
    const c = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
    const ctx = c.getContext('2d');
    ctx.scale(res, res);
    ctx.translate(-i * w, T); // one tile of room above row 0 for grass
    const x0 = i * CHUNK - 1, x1 = (i + 1) * CHUNK;
    // Earth and stone first, then the tops (grass hangs over the neighbours).
    for (let y = 0; y < L.height; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || x >= L.width) continue;
        const t = L.tiles[y * L.width + x];
        if (t === TILE.SOLID) this.earth(ctx, x, y);
        else if (t === TILE.ROCK) this.rock(ctx, x, y);
      }
    }
    for (let y = 0; y < L.height; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || x >= L.width) continue;
        const t = L.tiles[y * L.width + x];
        if (t === TILE.SOLID && !L.isSolid(x, y - 1)) this.grassTop(ctx, x, y);
        else if (t === TILE.PLANK) this.plank(ctx, x, y);
        else if (t === TILE.THORN) this.thorn(ctx, x, y);
        else if (t === TILE.ROCK && s.rock === 'mossy' && !L.isSolid(x, y - 1)) this.moss(ctx, x, y);
      }
    }
    return c;
  }

  depth(x, y) {
    let d = 0;
    while (d < 6 && y - d - 1 >= 0 && this.level.tile(x, y - d - 1) === TILE.SOLID) d++;
    return d;
  }

  earth(ctx, x, y) {
    const s = this.style, L = this.level, px = x * T, py = y * T, d = this.depth(x, y);
    const col = k => (k < 2 ? mix(s.earth[0], s.earth[1], k / 2) : mix(s.earth[1], s.earth[2], Math.min(1, (k - 2) / 4)));
    ctx.fillStyle = vgrad(ctx, py, py + T, [[0, col(d)], [1, col(d + 1)]]);
    ctx.fillRect(px, py, T + 0.5, T + 0.5);
    const r = rng(x * 7919 + y * 104729);
    // Layers and stones in the earth.
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = d % 2 ? '#000' : '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const ly = py + 14 + r() * 20;
    ctx.moveTo(px, ly);
    ctx.quadraticCurveTo(px + T / 2, ly + (r() - 0.5) * 8, px + T, ly + (r() - 0.5) * 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let k = 0; k < 2; k++) {
      if (r() < 0.55) {
        const sx = px + 6 + r() * (T - 12), sy = py + 8 + r() * (T - 14), sr = 2.5 + r() * 5;
        ctx.fillStyle = s.stone;
        ellipse(ctx, sx, sy, sr * 1.4, sr);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ellipse(ctx, sx - sr * 0.3, sy - sr * 0.35, sr * 0.6, sr * 0.3);
        ctx.fill();
      }
    }
    // Shaded sides and bottom where the ground ends.
    if (!L.isSolid(x - 1, y)) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(px, py, 5, T);
    }
    if (!L.isSolid(x + 1, y)) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(px + T - 6, py, 6, T);
    }
    if (!L.isSolid(x, y + 1) && y + 1 < L.height) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(px, py + T - 6, T, 6);
      // Little roots hanging down.
      ctx.strokeStyle = mix(s.earth[1], '#000000', 0.3);
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 2; k++) {
        const rx = px + 8 + r() * (T - 16);
        ctx.beginPath();
        ctx.moveTo(rx, py + T - 2);
        ctx.quadraticCurveTo(rx + 4, py + T + 6, rx - 2, py + T + 10 + r() * 6);
        ctx.stroke();
      }
    }
  }

  grassTop(ctx, x, y) {
    const s = this.style, L = this.level, px = x * T, py = y * T, r = rng(x * 31 + y * 977);
    const openL = !L.isSolid(x - 1, y), openR = !L.isSolid(x + 1, y);
    if (!s.tufts) {
      // Paving stones on the temple courtyard.
      ctx.fillStyle = vgrad(ctx, py - 2, py + 16, [[0, s.light], [1, s.grass]]);
      ctx.fillRect(px, py - 2, T, 16);
      ctx.strokeStyle = 'rgba(90,60,30,0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 0.5, py - 1.5, T - 1, 15);
      return;
    }
    ctx.fillStyle = vgrad(ctx, py - 4, py + 18, [[0, s.light], [0.45, s.grass], [1, mix(s.grass, '#000000', 0.25)]]);
    ctx.beginPath();
    ctx.moveTo(px - (openL ? 2 : 0), py + (openL ? 2 : -2));
    ctx.lineTo(px + T + (openR ? 2 : 0), py + (openR ? 2 : -2));
    // A wavy edge where the grass meets the earth.
    for (let k = 4; k >= 0; k--) {
      const xx = px + (k / 4) * T;
      ctx.quadraticCurveTo(xx + T / 8, py + 18 + r() * 4, xx, py + 12 + r() * 3);
    }
    ctx.closePath();
    ctx.fill();
    // Tufts.
    for (let k = 0; k < 9; k++) {
      const bx = px + r() * T, hh = 6 + r() * 10, lean = (r() - 0.4) * 8;
      ctx.strokeStyle = s.tufts[Math.floor(r() * s.tufts.length)];
      ctx.lineWidth = 1.6 + r();
      ctx.beginPath();
      ctx.moveTo(bx, py + 3);
      ctx.quadraticCurveTo(bx + lean * 0.3, py - hh * 0.6, bx + lean, py - hh);
      ctx.stroke();
    }
    if (r() < 0.18) {
      // A tiny flower.
      const fx = px + 8 + r() * (T - 16);
      ctx.fillStyle = ['#ffef9a', '#ff9fb8', '#ffffff'][Math.floor(r() * 3)];
      ellipse(ctx, fx, py - 6, 2.6, 2.6);
      ctx.fill();
    }
    if (openL) {
      ctx.fillStyle = s.grass;
      ellipse(ctx, px, py + 6, 5, 7);
      ctx.fill();
    }
    if (openR) {
      ctx.fillStyle = mix(s.grass, '#000000', 0.15);
      ellipse(ctx, px + T, py + 6, 5, 7);
      ctx.fill();
    }
  }

  rock(ctx, x, y) {
    const s = this.style, L = this.level, px = x * T, py = y * T, r = rng(x * 13 + y * 7);
    const top = !L.isSolid(x, y - 1), bottom = !L.isSolid(x, y + 1);
    switch (s.rock) {
      case 'post': {
        // A wooden post standing in the water.
        ctx.fillStyle = vgrad(ctx, py, py + T, [[0, s.rockCol[0]], [1, s.rockCol[1]]]);
        ctx.fillRect(px + 8, py, T - 16, T + 1);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(px + 12, py, 5, T);
        ctx.strokeStyle = 'rgba(30,15,5,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 24);
        ctx.lineTo(px + T - 8, py + 26);
        ctx.stroke();
        if (top) {
          ctx.fillStyle = '#c8202a';
          roundRect(ctx, px + 4, py - 6, T - 8, 10, 4);
          ctx.fill();
        }
        return;
      }
      case 'laterite': {
        ctx.fillStyle = vgrad(ctx, py, py + T, [[0, s.rockCol[0]], [1, s.rockCol[1]]]);
        ctx.fillRect(px, py, T + 0.5, T + 0.5);
        ctx.fillStyle = 'rgba(30,8,4,0.45)';
        for (let k = 0; k < 9; k++) {
          ellipse(ctx, px + r() * T, py + r() * T, 1.5 + r() * 2.5, 1.2 + r() * 2);
          ctx.fill();
        }
        // Mortar between the blocks, staggered row by row.
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py + 1);
        ctx.lineTo(px + T, py + 1);
        ctx.moveTo(px, py + T / 2);
        ctx.lineTo(px + T, py + T / 2);
        ctx.moveTo(px + 1 + (y % 2 ? T / 2 : 0), py);
        ctx.lineTo(px + 1 + (y % 2 ? T / 2 : 0), py + T / 2);
        ctx.moveTo(px + 1 + (y % 2 ? 0 : T / 2), py + T / 2);
        ctx.lineTo(px + 1 + (y % 2 ? 0 : T / 2), py + T);
        ctx.stroke();
        if (top) {
          ctx.fillStyle = 'rgba(255,190,150,0.3)';
          ctx.fillRect(px, py, T, 4);
        }
        if (!L.isSolid(x + 1, y)) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(px + T - 5, py, 5, T);
        }
        return;
      }
      case 'temple': {
        ctx.fillStyle = vgrad(ctx, py, py + T, [[0, s.rockCol[0]], [1, s.rockCol[1]]]);
        ctx.fillRect(px, py, T + 0.5, T + 0.5);
        ctx.strokeStyle = 'rgba(30,15,10,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, T - 4, T - 4);
        ctx.strokeStyle = 'rgba(255,220,170,0.18)';
        ctx.beginPath();
        ctx.arc(px + T / 2, py + T / 2, 10, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }
      default: {
        // Rounded stone blocks (with moss in the rainforest).
        ctx.fillStyle = mix(s.rockCol[1], '#000000', 0.35);
        ctx.fillRect(px, py, T + 0.5, T + 0.5);
        ctx.fillStyle = vgrad(ctx, py, py + T, [[0, s.rockCol[0]], [1, s.rockCol[1]]]);
        roundRect(ctx, px + 1.5, py + 1.5, T - 3, T - 3, 9);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        roundRect(ctx, px + 5, py + 4, T * 0.5, 6, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const cx = px + 10 + r() * 28;
        ctx.moveTo(cx, py + 10);
        ctx.lineTo(cx + 5, py + 22);
        ctx.lineTo(cx + 1, py + 32);
        ctx.stroke();
        if (bottom && y + 1 < L.height) {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(px, py + T - 5, T, 5);
        }
      }
    }
  }

  moss(ctx, x, y) {
    const px = x * T, py = y * T, r = rng(x * 3 + y * 5);
    ctx.fillStyle = '#4a8a3e';
    roundRect(ctx, px, py - 2, T, 9, 4);
    ctx.fill();
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = k % 2 ? '#6cb85a' : '#3c7a34';
      ellipse(ctx, px + 6 + r() * (T - 12), py + 6 + r() * 6, 4 + r() * 3, 3);
      ctx.fill();
    }
  }

  plank(ctx, x, y) {
    const s = this.style, L = this.level, px = x * T, py = y * T;
    const endL = !L.isPlank(x - 1, y), endR = !L.isPlank(x + 1, y);
    if (s.plank === 'bamboo') {
      // Floating bamboo barrier.
      ctx.fillStyle = vgrad(ctx, py, py + 16, [[0, '#e8d078'], [1, '#8a6a2a']]);
      roundRect(ctx, px + (endL ? 2 : 0), py, T - (endL ? 2 : 0) - (endR ? 2 : 0), 16, endL || endR ? 8 : 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,20,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + T / 2, py + 1);
      ctx.lineTo(px + T / 2, py + 15);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(px + 2, py + 3, T - 4, 2);
      return;
    }
    const top = s.plank === 'carved' ? ['#c89a5a', '#7a4a20'] : ['#b07a44', '#5a3418'];
    ctx.fillStyle = vgrad(ctx, py, py + 14, [[0, top[0]], [1, top[1]]]);
    ctx.fillRect(px, py, T + 0.5, 14);
    ctx.fillStyle = 'rgba(255,230,180,0.3)';
    ctx.fillRect(px, py, T, 2);
    ctx.strokeStyle = 'rgba(40,20,5,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 0.75, py);
    ctx.lineTo(px + 0.75, py + 14);
    ctx.moveTo(px + 6, py + 7);
    ctx.lineTo(px + T * 0.6, py + 7);
    ctx.stroke();
    // Brackets underneath at the ends.
    if (endL || endR) {
      ctx.fillStyle = top[1];
      const bx = endL ? px + 6 : px + T - 12;
      ctx.beginPath();
      ctx.moveTo(bx, py + 14);
      ctx.lineTo(bx + 6, py + 14);
      ctx.lineTo(bx + 3, py + 26);
      ctx.fill();
    }
    ctx.fillStyle = '#d8c090';
    ellipse(ctx, px + 8, py + 7, 1.6, 1.6);
    ctx.fill();
  }

  thorn(ctx, x, y) {
    const px = x * T, py = y * T, r = rng(x * 17 + y * 3);
    ctx.fillStyle = '#1e3a1c';
    for (let k = 0; k < 4; k++) {
      ellipse(ctx, px + 8 + k * 11, py + T - 12 - r() * 6, 12, 14);
      ctx.fill();
    }
    ctx.strokeStyle = '#d8d0b0';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 9; k++) {
      const sx = px + 4 + r() * (T - 8), sy = py + 18 + r() * 20, a = -Math.PI / 2 + (r() - 0.5) * 2.2;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * 12, sy + Math.sin(a) * 12);
    }
    ctx.stroke();
    ctx.fillStyle = '#d63a3a';
    for (let k = 0; k < 3; k++) {
      ellipse(ctx, px + 8 + r() * (T - 16), py + 24 + r() * 16, 2.5, 2.5);
      ctx.fill();
    }
  }

  /** Water, drawn over everything in it. */
  drawWater(ctx, camX, camY, viewW, viewH, t) {
    const s = this.style;
    for (const w of this.water) {
      if (w.x1 < camX || w.x0 > camX + viewW) continue;
      const x0 = Math.max(w.x0, camX - 10), x1 = Math.min(w.x1, camX + viewW + 10), b = Math.min(w.b, camY + viewH + 10);
      ctx.fillStyle = vgrad(ctx, w.y, w.y + 140, [[0, s.water[0]], [1, s.water[1]]]);
      ctx.beginPath();
      ctx.moveTo(x0, b);
      for (let x = x0; x <= x1; x += 16) ctx.lineTo(x, w.y + Math.sin(x * 0.03 + t * 2.4) * 3);
      ctx.lineTo(x1, w.y + Math.sin(x1 * 0.03 + t * 2.4) * 3);
      ctx.lineTo(x1, b);
      ctx.closePath();
      ctx.fill();
      // The bright top edge and ripples.
      ctx.strokeStyle = s.foam;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 16) {
        const yy = w.y + Math.sin(x * 0.03 + t * 2.4) * 3;
        if (x === x0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const r = rng(Math.floor(w.x0));
      for (let k = 0; k < (x1 - x0) / 40; k++) {
        const rx = w.x0 + ((r() * (w.x1 - w.x0) + t * 20) % (w.x1 - w.x0)), ry = w.y + 16 + r() * 60;
        if (rx < x0 || rx > x1 - 30) continue;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + 14 + r() * 20, ry);
      }
      ctx.stroke();
    }
  }
}
