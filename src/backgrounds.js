// The scenery behind each level: a sky drawn once, then layers of hills, palms and boats that slide past
// more slowly than the ground (so they look far away). Some parts move: rain, lightning, the waterfall,
// fireflies and the racing snake boats.
import { rng, vgrad, rgrad, ellipse, rays, motes, makeCanvas } from './gfx.js';
import { palm, houseboat, fishingNet, keralaHouse, snakeBoat } from './art.js';

const W = 1280, H = 720, PW = 2560; // layers repeat every PW pixels

/** Draws fn at x, and again one period away when it's near an edge, so the layer repeats without a seam. */
function wrap(x, margin, fn) {
  fn(x);
  if (x < margin) fn(x + PW);
  if (x > PW - margin) fn(x - PW);
}

/** A line of hills that repeats exactly every PW pixels. Returns the outline points. */
function hills(ctx, base, amp, seed, fill, waves = [2, 5, 11]) {
  const r = rng(seed), ph = waves.map(() => r() * 6.28), wt = waves.map((_, i) => 1 / (i + 1));
  const sum = wt.reduce((a, b) => a + b, 0);
  const pts = [];
  for (let x = 0; x <= PW; x += 16) {
    let v = 0;
    waves.forEach((k, i) => (v += Math.sin((x / PW) * Math.PI * 2 * k + ph[i]) * wt[i]));
    pts.push([x, base - amp * (0.5 + 0.5 * v / sum)]);
  }
  ctx.beginPath();
  ctx.moveTo(0, H);
  pts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(PW, H);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  return pts;
}

/** A soft band of mist with no hard edges. */
function mist(ctx, y, h, a) {
  ctx.fillStyle = vgrad(ctx, y - h / 2, y + h * 1.5, [[0, 'rgba(255,255,255,0)'], [0.5, `rgba(255,255,255,${a})`], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(0, y - h / 2, PW, h * 2);
}

function cloudBank(ctx, n, seed, y0, y1, top, bottom, w = W) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const cx = r() * w, cy = y0 + r() * (y1 - y0), cw = 140 + r() * 160;
    ctx.fillStyle = vgrad(ctx, cy - 24, cy + 20, [[0, top], [1, bottom]]);
    for (let k = 0; k < 6; k++) {
      ellipse(ctx, cx + k * cw / 6 - cw / 2, cy + Math.sin(k * 1.7) * 5, cw / 4.5, 12 + r() * 9);
      ctx.fill();
    }
  }
}

function sun(ctx, x, y, r, core, halo) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgrad(ctx, x, y, 0, r * 8, [[0, halo], [1, 'rgba(0,0,0,0)']]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.fillStyle = rgrad(ctx, x, y, 0, r, [[0, '#fffbe8'], [0.7, core], [1, 'rgba(255,220,140,0)']]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function waterBand(ctx, y, h, top, bottom, seed, shimmer, w = W) {
  ctx.fillStyle = vgrad(ctx, y, y + h, [[0, top], [1, bottom]]);
  ctx.fillRect(0, y, w, h);
  const r = rng(seed);
  ctx.strokeStyle = shimmer;
  ctx.lineCap = 'round';
  for (let i = 0; i < 110; i++) {
    const wy = y + 6 + r() * (h - 6), wx = r() * w, wl = 10 + r() * 40 * (wy - y) / h;
    ctx.lineWidth = 1 + r() * 1.5;
    ctx.globalAlpha = 0.25 + r() * 0.5;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + wl, wy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A Kerala temple seen from afar: stacked sloping copper roofs. */
function temple(ctx, x, y, s, col, lit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.fillRect(-80, -60, 160, 60);
  const roof = (w, top, h) => {
    ctx.beginPath();
    ctx.moveTo(-w, top + h);
    ctx.lineTo(-w * 0.55, top);
    ctx.lineTo(w * 0.55, top);
    ctx.lineTo(w, top + h);
    ctx.closePath();
    ctx.fill();
  };
  roof(130, -100, 44);
  ctx.fillRect(-50, -130, 100, 32);
  roof(90, -170, 42);
  ctx.beginPath();
  ctx.moveTo(-10, -170);
  ctx.lineTo(0, -200);
  ctx.lineTo(10, -170);
  ctx.fill();
  if (lit) {
    ctx.fillStyle = lit;
    for (let i = -3; i <= 3; i++) ctx.fillRect(i * 20 - 4, -44, 8, 18);
  }
  ctx.restore();
}

/** A tall brass lamp tower (deepastambham) covered in little flames. */
function lampTower(ctx, x, y, s, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = vgrad(ctx, -260, 0, [[0, '#ffe08a'], [0.5, '#c08a30'], [1, '#6a4010']]);
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-8, -240);
  ctx.lineTo(8, -240);
  ctx.lineTo(26, 0);
  ctx.fill();
  const flames = [];
  for (let k = 0; k < 9; k++) {
    const yy = -24 - k * 25, w = 34 - k * 2.6;
    ctx.fillStyle = '#d8a040';
    ellipse(ctx, 0, yy, w, 4);
    ctx.fill();
    for (let i = -3; i <= 3; i++) flames.push([i * w / 3.4, yy - 6]);
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [fx, fy] of flames) {
    const px = x + fx * s, py = y + fy * s, f = 0.8 + 0.2 * Math.sin(t * 9 + fx + fy);
    ctx.fillStyle = rgrad(ctx, px, py, 0, 8 * s, [[0, `rgba(255,220,120,${0.6 * f})`], [1, 'rgba(255,140,40,0)']]);
    ctx.fillRect(px - 8 * s, py - 8 * s, 16 * s, 16 * s);
  }
  ctx.restore();
}

function teaRows(ctx, pts, col, gap) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, H);
  pts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(PW, H);
  ctx.clip();
  ctx.strokeStyle = col;
  ctx.lineWidth = gap * 0.35;
  ctx.lineCap = 'round';
  for (let k = 1; k < 26; k++) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const yy = y + k * gap + Math.sin(x * 0.006 + k) * 5;
      if (i) ctx.lineTo(x, yy);
      else ctx.moveTo(x, yy);
    });
    ctx.stroke();
  }
  ctx.restore();
}

function silverOak(ctx, x, y, s, trunk, leaf) {
  ctx.strokeStyle = trunk;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 120 * s);
  ctx.stroke();
  ctx.fillStyle = leaf;
  for (let k = 0; k < 6; k++) {
    ellipse(ctx, x + (k % 2 ? 9 : -9) * s, y - 120 * s + k * 15 * s, 15 * s, 8 * s);
    ctx.fill();
  }
}

// ================================================================ the themes

const PALM_FAR = col => ({ trunk: col, frond: col });

const THEMES = {
  backwaters: {
    sky(ctx) {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#2c4a7a'], [0.35, '#e08a6a'], [0.55, '#f8b878'], [0.68, '#ffe0a8'], [1, '#ffe8c0']]);
      ctx.fillRect(0, 0, W, H);
      sun(ctx, 900, 330, 56, 'rgba(255,220,140,1)', 'rgba(255,180,100,0.5)');
      rays(ctx, 900, 330, 24, 800, 'rgba(255,210,140,0.08)', 5);
      cloudBank(ctx, 6, 31, 50, 220, 'rgba(140,90,130,0.5)', 'rgba(255,190,140,0.6)');
      waterBand(ctx, 440, 280, '#f0b88a', '#3a6a7a', 3, 'rgba(255,230,180,0.5)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgrad(ctx, 900, 470, 0, 130, [[0, 'rgba(255,220,150,0.5)'], [1, 'rgba(0,0,0,0)']]);
      ellipse(ctx, 900, 500, 70, 130);
      ctx.fill();
      ctx.restore();
    },
    layers: [
      { f: 0.12, draw(ctx) {
        const r = rng(41);
        for (let i = 0; i < 44; i++) {
          const x = i * 58 + r() * 30;
          wrap(x, 140, xx => palm(ctx, xx, 446, 0.42 + r() * 0.15, (r() - 0.5) * 0.6, PALM_FAR('rgba(110,80,90,0.7)')));
        }
        ctx.fillStyle = 'rgba(110,80,90,0.75)';
        ctx.fillRect(0, 438, PW, 8);
        wrap(700, 300, x => fishingNet(ctx, x, 450, 0.6, 'rgba(90,60,70,0.75)'));
        wrap(2000, 300, x => fishingNet(ctx, x, 450, 0.55, 'rgba(90,60,70,0.75)'));
      } },
      { f: 0.3, draw(ctx) {
        wrap(400, 300, x => houseboat(ctx, x, 500, 0.65, '#4a3020', '#c9a060'));
        wrap(1700, 300, x => houseboat(ctx, x, 520, 0.75, '#3a2414', '#b88a50'));
        const r = rng(52);
        for (let i = 0; i < 6; i++) {
          const x = 200 + i * 420 + r() * 100;
          wrap(x, 200, xx => palm(ctx, xx, 560, 0.75 + r() * 0.2, (r() - 0.5) * 0.9, { trunk: '#6a4a3a', frond: '#4a6a3a', nut: '#5a4022' }));
        }
      } }
    ],
    front(ctx, t) {
      motes(ctx, 30, 6 + Math.floor(t * 0.5), 'rgba(255,240,190,0.6)', [0, 120, W, 400], [0.8, 1.8], 4);
    }
  },

  tea: {
    sky(ctx) {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#8cb8d4'], [0.5, '#d4e6e0'], [1, '#eef4e6']]);
      ctx.fillRect(0, 0, W, H);
      sun(ctx, 1040, 120, 40, 'rgba(255,250,220,1)', 'rgba(255,250,220,0.35)');
      cloudBank(ctx, 7, 12, 60, 200, 'rgba(255,255,255,0.8)', 'rgba(220,230,235,0.8)');
    },
    layers: [
      { f: 0.08, draw(ctx) {
        hills(ctx, 330, 170, 3, '#8aa8b8', [1, 3, 7]);
        mist(ctx, 300, 80, 0.4);
      } },
      { f: 0.2, draw(ctx) {
        const pts = hills(ctx, 420, 130, 8, '#7aa86a');
        teaRows(ctx, pts, 'rgba(60,110,50,0.55)', 16);
        mist(ctx, 400, 60, 0.3);
      } },
      { f: 0.4, draw(ctx) {
        const pts = hills(ctx, 520, 110, 12, '#4f9442', [2, 4, 9]);
        teaRows(ctx, pts, 'rgba(36,96,34,0.85)', 20);
        const r = rng(13);
        for (let i = 0; i < 14; i++) {
          const x = i * 180 + r() * 80, p = pts[Math.min(pts.length - 1, Math.round(x / 16))];
          wrap(x, 30, xx => silverOak(ctx, xx, p[1] + 60, 1 + r() * 0.3, '#4a4038', 'rgba(70,110,70,0.9)'));
        }
      } }
    ],
    front(ctx, t) {
      // Mist drifting across.
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) {
        const x = ((i * 380 + t * 18) % (W + 600)) - 300;
        ellipse(ctx, x, 260 + i * 50, 260, 30);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  rainforest: {
    sky(ctx) {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#0e2a22'], [0.5, '#1e4a34'], [1, '#2a5a30']]);
      ctx.fillRect(0, 0, W, H);
      rays(ctx, 300, -60, 10, 700, 'rgba(200,255,180,0.07)', 8);
    },
    layers: [
      { f: 0.12, draw(ctx) {
        // Cliffs with the great waterfall in the middle of each repeat.
        ctx.fillStyle = '#20382c';
        hills(ctx, 200, 60, 4, '#20382c', [3, 6]);
        ctx.fillStyle = '#2a3a30';
        ctx.fillRect(900, 130, 640, 520);
        ctx.fillStyle = vgrad(ctx, 140, 620, [[0, 'rgba(220,240,255,0.55)'], [1, 'rgba(240,250,255,0.85)']]);
        [[920, 180], [1140, 200], [1380, 140]].forEach(([fx, fw]) => ctx.fillRect(fx, 150, fw, 480));
        ctx.fillStyle = '#1e3a26';
        ellipse(ctx, 1220, 146, 360, 34);
        ctx.fill();
        const r = rng(4);
        ctx.fillStyle = '#3f7a40';
        for (let i = 0; i < 12; i++) {
          ellipse(ctx, 880 + i * 60, 130 + r() * 10, 50, 14);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 14; i++) {
          ellipse(ctx, 920 + r() * 600, 610 + r() * 40, 70 + r() * 60, 30);
          ctx.fill();
        }
        hills(ctx, 700, 120, 9, '#183224', [2, 7, 13]);
      } },
      { f: 0.35, draw(ctx) {
        const r = rng(14);
        for (let i = 0; i < 7; i++) {
          const x = 120 + i * 370 + r() * 100, w = 40 + r() * 50;
          wrap(x, 150, xx => {
            ctx.fillStyle = '#2a2018';
            ctx.fillRect(xx, 0, w, H);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(xx + w * 0.2, 0, w * 0.15, H);
            ctx.strokeStyle = '#2f6a3a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(xx + w + 20, 0);
            ctx.quadraticCurveTo(xx + w + 50, 180, xx + w + 20, 340);
            ctx.stroke();
            ctx.fillStyle = '#3f8a48';
            for (let k = 20; k < 340; k += 34) {
              ellipse(ctx, xx + w + 32, k, 12, 5, 0.6);
              ctx.fill();
            }
          });
        }
        ctx.fillStyle = '#163a20';
        for (let i = 0; i < 60; i++) {
          const x = r() * PW, y = r() * 120;
          wrap(x, 140, xx => {
            ellipse(ctx, xx, y, 70 + r() * 60, 30 + r() * 20, r());
            ctx.fill();
          });
        }
      } }
    ],
    // The falling water shimmers.
    mid(ctx, t, ox) {
      let base = 900 - ox;
      if (base < -640) base += PW;
      if (base > W) return;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      const r = rng(4);
      for (let i = 0; i < 40; i++) {
        const fx = base + 20 + r() * 600, len = 60 + r() * 80, y = 150 + ((t * 260 + r() * 480) % 480);
        ctx.beginPath();
        ctx.moveTo(fx, y);
        ctx.lineTo(fx, Math.min(630, y + len));
        ctx.stroke();
      }
    },
    front(ctx, t) {
      // Fireflies.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = rng(12);
      for (let i = 0; i < 26; i++) {
        const bx = r() * W, by = 100 + r() * 500, sp = 0.3 + r() * 0.5, ph = r() * 6;
        const x = bx + Math.sin(t * sp + ph) * 40, y = by + Math.cos(t * sp * 1.3 + ph) * 26;
        const a = 0.5 + 0.5 * Math.sin(t * 3 + ph);
        ctx.fillStyle = rgrad(ctx, x, y, 0, 10, [[0, `rgba(210,255,120,${a})`], [1, 'rgba(0,0,0,0)']]);
        ctx.fillRect(x - 10, y - 10, 20, 20);
      }
      ctx.restore();
    }
  },

  monsoon: {
    sky(ctx) {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#0a0e22'], [0.5, '#1a2448'], [1, '#2a2e52']]);
      ctx.fillRect(0, 0, W, H);
      const r = rng(99);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = `rgba(${40 + r() * 30},${46 + r() * 30},${80 + r() * 40},0.85)`;
        ellipse(ctx, r() * W, 40 + r() * 170, 140 + r() * 140, 28 + r() * 20);
        ctx.fill();
      }
    },
    layers: [
      { f: 0.1, draw(ctx) {
        const pts = hills(ctx, 470, 90, 21, '#1c1a34', [2, 5]);
        const r = rng(22);
        for (let i = 0; i < 6; i++) {
          const x = 150 + i * 420 + r() * 80, p = pts[Math.round(x / 16)];
          wrap(x, 120, xx => {
            keralaHouse(ctx, xx, p[1] + 30, 0.6, '#3a3456', '#221e3a');
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = rgrad(ctx, xx, p[1] + 10, 0, 60, [[0, 'rgba(255,190,90,0.45)'], [1, 'rgba(0,0,0,0)']]);
            ctx.fillRect(xx - 60, p[1] - 50, 120, 120);
            ctx.restore();
          });
        }
      } },
      { f: 0.3, draw(ctx) {
        const r = rng(23);
        hills(ctx, 640, 140, 24, '#151226', [3, 8, 15]);
        for (let i = 0; i < 9; i++) {
          const x = r() * PW;
          wrap(x, 140, xx => palm(ctx, xx, 640, 0.8 + r() * 0.3, 0.5 + r() * 0.3, PALM_FAR('#0e0c1c')));
        }
      } }
    ],
    front(ctx, t, state) {
      // Heavy rain, falling at a slant.
      ctx.strokeStyle = 'rgba(180,200,255,0.35)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const r = rng(5);
      for (let i = 0; i < 260; i++) {
        const x = r() * (W + 200), sp = 900 + r() * 400, y = (r() * H + t * sp) % (H + 40) - 20;
        const xx = (x - (t * sp * 0.3) % (W + 200) + W + 200) % (W + 200) - 100;
        ctx.moveTo(xx, y);
        ctx.lineTo(xx - 7, y + 24);
      }
      ctx.stroke();
      // Lightning now and then.
      if (state.flash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(150,170,255,${state.flash * 0.35})`;
        ctx.fillRect(0, 0, W, H);
        if (state.flash > 0.5) {
          const b = rng(state.bolt);
          ctx.shadowColor = '#bcd4ff';
          ctx.shadowBlur = 24;
          ctx.strokeStyle = '#f2f6ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          let lx = 200 + b() * 880, ly = 0;
          ctx.moveTo(lx, ly);
          for (let i = 0; i < 9; i++) {
            lx += (b() - 0.5) * 70;
            ly += 34;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  },

  boatrace: {
    sky(ctx) {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#3a6aa8'], [0.5, '#9ac4e0'], [1, '#e8f0e0']]);
      ctx.fillRect(0, 0, W, H);
      sun(ctx, 220, 110, 40, 'rgba(255,250,220,1)', 'rgba(255,250,220,0.3)');
      cloudBank(ctx, 6, 51, 50, 200, 'rgba(255,255,255,0.9)', 'rgba(210,225,240,0.85)');
      waterBand(ctx, 368, 352, '#6aa0b8', '#1e4a5a', 7, 'rgba(255,255,255,0.5)');
    },
    layers: [
      { f: 0.15, draw(ctx) {
        const r = rng(51);
        for (let i = 0; i < 40; i++) {
          const x = i * 64 + r() * 30;
          wrap(x, 140, xx => palm(ctx, xx, 360, 0.5 + r() * 0.2, (r() - 0.5) * 0.6, PALM_FAR('#4e6a52')));
        }
        ctx.fillStyle = '#4a5a40';
        ctx.fillRect(0, 352, PW, 16);
        const cols = ['#f4efe2', '#c8202a', '#e8b83a', '#2a6ab0', '#f2a6c0'];
        for (let i = 0; i < 360; i++) {
          ctx.fillStyle = cols[Math.floor(r() * 5)];
          ellipse(ctx, r() * PW, 352 + r() * 10, 3, 4);
          ctx.fill();
        }
      } },
      { f: 0.5, draw(ctx) {
        // Poles with festival flags along the course.
        for (let i = 0; i < 8; i++) {
          const x = 100 + i * 320;
          wrap(x, 40, xx => {
            ctx.fillStyle = '#5a3a20';
            ctx.fillRect(xx - 3, 300, 6, 160);
            ctx.fillStyle = ['#c8202a', '#e8b83a', '#2a8a4a'][i % 3];
            ctx.beginPath();
            ctx.moveTo(xx + 3, 302);
            ctx.lineTo(xx + 46, 316);
            ctx.lineTo(xx + 3, 330);
            ctx.fill();
          });
        }
      } }
    ],
    // The snake boats racing behind her.
    mid(ctx, t) {
      const lead = 120 + Math.sin(t * 0.6) * 50;
      snakeBoat(ctx, lead - 60, 420, 0.75, 20, t);
      snakeBoat(ctx, lead - 150 + Math.sin(t * 0.8 + 1) * 30, 470, 0.9, 22, t + 0.4, '#1a0e06');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      const r = rng(Math.floor(t * 12));
      for (let i = 0; i < 40; i++) {
        ellipse(ctx, r() * (lead + 220), 420 + r() * 70, 2 + r() * 3, 1.5 + r() * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  boss: {
    sky(ctx) {
      ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#2a1a4a'], [0.45, '#a8486a'], [0.75, '#f0905a'], [1, '#ffc880']]);
      ctx.fillRect(0, 0, W, H);
      sun(ctx, 640, 420, 70, 'rgba(255,200,120,1)', 'rgba(255,150,90,0.45)');
      cloudBank(ctx, 5, 61, 60, 240, 'rgba(90,40,90,0.55)', 'rgba(250,150,120,0.6)');
      temple(ctx, 640, 560, 1.9, '#3a1c2a', 'rgba(255,190,90,0.8)');
      // Garlands strung across the top.
      for (let g = 0; g < 3; g++) {
        const y0 = 130 + g * 22;
        for (let i = 0; i <= 80; i++) {
          const x = i * 16, y = y0 + Math.sin((i / 20) * Math.PI) ** 2 * 36;
          ctx.fillStyle = i % 2 ? 'rgba(255,159,28,0.85)' : 'rgba(255,210,58,0.85)';
          ellipse(ctx, x, y, 5, 5);
          ctx.fill();
        }
      }
    },
    layers: [
      { f: 0.2, draw(ctx) {
        for (const x of [180, 1100, 1460, 2380]) wrap(x, 60, xx => lampTower(ctx, xx, 600, 1));
        for (let i = 0; i < 8; i++) {
          wrap(i * 320 + 40, 140, xx => palm(ctx, xx, 640, 0.9, (i % 2 ? 0.4 : -0.4), PALM_FAR('#2a1428')));
        }
      } }
    ],
    front(ctx, t) {
      // Marigold petals in the air.
      ctx.save();
      const r = rng(8);
      for (let i = 0; i < 18; i++) {
        const x = (r() * W + t * 30) % W, y = (r() * H + t * (40 + r() * 30)) % H;
        ctx.fillStyle = i % 2 ? 'rgba(255,170,40,0.8)' : 'rgba(255,220,80,0.8)';
        ellipse(ctx, x, y, 4, 2.5, t + i);
        ctx.fill();
      }
      ctx.restore();
    }
  }
};

export const THEME_NAMES = Object.keys(THEMES);

/** The scenery for one theme, drawn into canvases once. */
export class Backdrop {
  constructor(theme) {
    this.def = THEMES[theme] || THEMES.backwaters;
    this.theme = theme;
    this.sky = makeCanvas(W, H);
    this.def.sky(this.sky.getContext('2d'));
    this.layers = this.def.layers.map(l => {
      const c = makeCanvas(PW, H);
      l.draw(c.getContext('2d'));
      return { f: l.f, canvas: c };
    });
    this.state = { flash: 0, bolt: 1, next: 4 };
  }

  /** Lightning timing. Returns true when there's a flash (for the thunder). */
  update(dt) {
    if (this.theme !== 'monsoon') return false;
    const s = this.state;
    s.flash = Math.max(0, s.flash - dt * 2.2);
    s.next -= dt;
    if (s.next <= 0) {
      s.flash = 1;
      s.bolt = Math.floor(Math.random() * 1000);
      s.next = 5 + Math.random() * 6;
      return true;
    }
    return false;
  }

  /** Draws the sky and the far layers. camX, camY: the camera; maxY: the lowest the camera goes. */
  draw(ctx, camX, camY, maxY, t) {
    ctx.drawImage(this.sky, 0, 0);
    const def = this.def;
    this.layers.forEach((l, i) => {
      const ox = ((camX * l.f) % PW + PW) % PW, oy = (maxY - camY) * l.f * 0.8;
      ctx.drawImage(l.canvas, -ox, oy);
      if (PW - ox < W) ctx.drawImage(l.canvas, PW - ox, oy);
      if (i === 0 && def.mid) def.mid(ctx, t, camX * l.f);
    });
    if (def.mid && !this.layers.length) def.mid(ctx, t, camX);
  }

  /** Effects in front of everything (rain, mist, fireflies). */
  drawFront(ctx, t) {
    if (this.def.front) this.def.front(ctx, t, this.state);
  }
}

/** A soft dark edge around the screen, drawn once. */
let vignetteCanvas = null;
export function vignette(ctx, strength = 0.35) {
  if (!vignetteCanvas) {
    vignetteCanvas = makeCanvas(W, H);
    const v = vignetteCanvas.getContext('2d');
    v.fillStyle = rgrad(v, W / 2, H / 2, H * 0.45, W * 0.75, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
    v.fillRect(0, 0, W, H);
  }
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.drawImage(vignetteCanvas, 0, 0);
  ctx.restore();
}
