// Inaara: her real face from the character sheet, on a body drawn with shapes so it can move in every pose.
// The dress, shoes, necklace and clip use the sheet's colours.
import { rng, vgrad, rgrad, ellipse, roundRect, lerp, glow } from './gfx.js';

export const PAL = {
  skin: '#dba277', skinShade: '#c08660', dress: '#17161a', flower: '#efe6cf', flowerMid: '#d8b25a',
  shoe: '#f3eee4', shoeLine: '#cfc6b6', gold: '#e2bf6e', pearl: '#9c9a98', hair: '#151313'
};

/** Pictures cut from the sheet, set once they've loaded: head-happy, head-excited, head-playful, head-surprised, head-shy. */
export const FACES = {};

// Flowers printed on the dress: drawn once into a small pattern.
let pattern = null;
function dressPattern(ctx) {
  if (pattern) return pattern;
  const c = document.createElement('canvas');
  c.width = 40;
  c.height = 40;
  const p = c.getContext('2d');
  p.fillStyle = PAL.dress;
  p.fillRect(0, 0, 40, 40);
  const r = rng(7);
  for (let i = 0; i < 9; i++) {
    const fx = r() * 40, fy = r() * 40, fs = 1.2 + r() * 0.9;
    for (const [ox, oy] of [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]]) {
      p.fillStyle = PAL.flower;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.2566 + r();
        p.beginPath();
        p.arc(fx + ox + Math.cos(a) * fs, fy + oy + Math.sin(a) * fs, fs * 0.75, 0, Math.PI * 2);
        p.fill();
      }
      p.fillStyle = PAL.flowerMid;
      p.beginPath();
      p.arc(fx + ox, fy + oy, fs * 0.45, 0, Math.PI * 2);
      p.fill();
    }
  }
  pattern = ctx.createPattern(c, 'repeat');
  return pattern;
}

/** The pose for what she's doing. `t` is the time, `phase` the running cycle (it grows with distance run). */
export function poseFor(state, t, phase, vy) {
  const s = Math.sin(phase), c = Math.cos(phase);
  switch (state) {
    case 'run':
      return {
        legs: [[s * 15, -Math.max(0, c) * 9], [-s * 15, -Math.max(0, -c) * 9]],
        arms: [[-s * 16 - 2, -52 - Math.abs(s) * 4], [s * 16 + 4, -52 - Math.abs(s) * 4]],
        skirt: 1.1 + Math.abs(s) * 0.05, bob: -Math.abs(c) * 3, tilt: 0.06
      };
    case 'jump':
      return vy < 0
        ? { legs: [[-12, -14], [12, -22]], arms: [[-24, -86], [22, -84]], skirt: 1.2, bob: -4, tilt: 0 }
        : { legs: [[-10, -8], [12, -12]], arms: [[-28, -72], [28, -74]], skirt: 1.3, bob: -2, tilt: 0 };
    case 'spin':
      return { legs: [[-8, -4], [9, -6]], arms: [[-30, -66], [30, -66]], skirt: 1.7, bob: -2, tilt: 0, spin: t * 30 };
    case 'wall':
      return { legs: [[-12, -4], [8, -18]], arms: [[-20, -96], [18, -70]], skirt: 1.15, bob: 0, tilt: 0 };
    case 'hang':
      return { legs: [[-6, -2], [6, 0]], arms: [[-8, -128], [14, -128]], skirt: 1.05, bob: 0, tilt: 0, armsUp: true };
    case 'glide':
      return { legs: [[-8, -8], [8, -4]], arms: [[-30, -140], [34, -142]], skirt: 1.35 + Math.sin(t * 12) * 0.05, bob: 0, tilt: 0.06, armsUp: true };
    case 'cheer':
      return { legs: [[-8, Math.min(0, Math.sin(t * 9) * 6)], [8, Math.min(0, Math.sin(t * 9 + 1) * 6)]], arms: [[-24, -110], [26, -112]], skirt: 1.1, bob: 0, tilt: 0, armsUp: true };
    case 'hurt':
      return { legs: [[-14, -10], [10, -6]], arms: [[-28, -90], [26, -92]], skirt: 1.25, bob: -2, tilt: -0.2 };
    case 'idle':
    default:
      return { legs: [[-6, 0], [7, 0]], arms: [[-14, -50], [16, -50 + Math.sin(t * 2) * 1.5]], skirt: 1, bob: Math.sin(t * 2.4) * 0.8, tilt: 0 };
  }
}

/**
 * Draws Inaara with her feet at (x, y). `face` is which expression from the sheet; `facing` is 1 (right) or -1.
 * Options: leaf (gliding), clipGlow (spin ready), alpha (blinking after being hurt).
 */
export function drawInaara(ctx, x, y, s, pose, face = 'happy', facing = 1, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (!opts.noShadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ellipse(ctx, 0, 2 + (opts.shadowDrop || 0), 22 * s, 5 * s);
    ctx.fill();
  }
  ctx.scale(s * facing, s);
  if (pose.tilt) ctx.rotate(pose.tilt);
  const bob = pose.bob, hipY = -40 + bob;
  ctx.lineCap = 'round';

  if (pose.spin !== undefined) {
    // Spinning: swirls of the dress around her.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(255,${220 - k * 20},${140 - k * 30},${0.55 - k * 0.15})`;
      ctx.lineWidth = 5 - k;
      ctx.beginPath();
      ctx.ellipse(0, -46, 50 + k * 8, 16 + k * 3, 0, pose.spin + k, pose.spin + k + Math.PI * 1.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Legs and shoes.
  pose.legs.forEach(([fx, fy], i) => {
    ctx.strokeStyle = i === 0 ? PAL.skinShade : PAL.skin;
    ctx.lineWidth = 7;
    const hx = i === 0 ? -4 : 4;
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.quadraticCurveTo((fx + hx) / 2 + 2, (hipY + fy) / 2, fx, fy - 4);
    ctx.stroke();
    ctx.fillStyle = PAL.shoe;
    ellipse(ctx, fx + 3, fy - 2, 7.5, 4.2);
    ctx.fill();
    ctx.strokeStyle = PAL.shoeLine;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  const arm = (sx, sy, [hx, hy], col) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + hx) / 2 - 4, (sy + hy) / 2 + 6, hx, hy);
    ctx.stroke();
    ctx.fillStyle = col;
    ellipse(ctx, hx, hy, 4.2, 4.2);
    ctx.fill();
  };
  if (!pose.armsUp) arm(0, -70 + bob, pose.arms[0], PAL.skinShade);

  // Skirt.
  const fl = pose.skirt, top = -64 + bob, hem = hipY + 10;
  ctx.beginPath();
  ctx.moveTo(-11, top);
  ctx.quadraticCurveTo(-18 * fl, hem - 10, -24 * fl, hem);
  for (let i = 0; i <= 6; i++) {
    const tt = i / 6;
    ctx.quadraticCurveTo(lerp(-24 * fl, 24 * fl, tt) - 4 * fl, hem + 4, lerp(-24 * fl, 24 * fl, tt), hem);
  }
  ctx.quadraticCurveTo(18 * fl, hem - 10, 11, top);
  ctx.closePath();
  ctx.fillStyle = dressPattern(ctx);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ellipse(ctx, -6, top + 10, 8, 20);
  ctx.fill();
  // Bodice and sleeve.
  roundRect(ctx, -11, -80 + bob, 22, 20, 6);
  ctx.fillStyle = dressPattern(ctx);
  ctx.fill();
  ellipse(ctx, 6, -74 + bob, 8, 6.5);
  ctx.fill();
  if (!pose.armsUp) arm(6, -72 + bob, pose.arms[1], PAL.skin);
  // Neck and pearl necklace.
  ctx.fillStyle = PAL.skinShade;
  roundRect(ctx, -3, -88 + bob, 8, 10, 3);
  ctx.fill();
  ctx.fillStyle = PAL.pearl;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.15 + i * 0.09);
    ellipse(ctx, 1 + Math.cos(a) * 10, -82 + bob + Math.sin(a) * 6, 1.6, 1.6);
    ctx.fill();
  }
  if (pose.armsUp) {
    arm(-10, -72 + bob, pose.arms[0], PAL.skinShade);
    arm(10, -72 + bob, pose.arms[1], PAL.skin);
  }
  if (opts.leaf) {
    // The banana leaf is drawn above her hands (in her own coordinates, so it tilts with her).
    opts.leaf(ctx, 2, -150);
  }

  // Her face from the sheet, chin resting on the neck.
  const img = FACES['head-' + face] || FACES['head-happy'];
  if (img) {
    const fw = 58, fh = fw * img.height / img.width, chinAt = (face === 'playful' ? 0.84 : 0.75) * fh;
    if (opts.clipGlow) glow(ctx, -16, -84 + bob - chinAt * 0.72, 18, 'rgba(255,220,120,0.75)');
    ctx.drawImage(img, -fw / 2 + 2, -84 + bob - chinAt, fw, fh);
  } else {
    // Before the pictures load: a simple head.
    ctx.fillStyle = PAL.hair;
    ellipse(ctx, 0, -110 + bob, 26, 28);
    ctx.fill();
    ctx.fillStyle = PAL.skin;
    ellipse(ctx, 6, -104 + bob, 18, 19);
    ctx.fill();
  }
  ctx.restore();
}

/** Her face in a gold ring (the lives counter and menus). */
export function faceBadge(ctx, x, y, r, face = 'happy') {
  const img = FACES['head-' + face];
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#2a1a10';
  ctx.fill();
  if (img) {
    ctx.clip();
    const w = r * 2.7;
    ctx.drawImage(img, x - w / 2, y - r * 1.15, w, w * img.height / img.width);
  }
  ctx.restore();
  ctx.strokeStyle = '#ffe08a';
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

/** The gold flower clip on its own (the spin meter). */
export function hairClip(ctx, x, y, s, rot, lit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  if (lit) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgrad(ctx, 4, 0, 0, 20, [[0, 'rgba(255,220,120,0.8)'], [1, 'rgba(255,200,80,0)']]);
    ellipse(ctx, 4, 0, 20, 20);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(-6, 0, 13, 3.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PAL.gold;
  for (let k = 0; k < 5; k++) {
    const a = k * 1.2566;
    ellipse(ctx, 8 + Math.cos(a) * 3.6, Math.sin(a) * 3.6, 2.8, 2.8);
    ctx.fill();
  }
  ctx.fillStyle = '#fff3c8';
  ellipse(ctx, 8, 0, 1.8, 1.8);
  ctx.fill();
  ctx.restore();
}

/** Loads the face pictures. */
export function loadFaces(base = 'assets/faces/') {
  const names = ['head-happy', 'head-excited', 'head-playful', 'head-surprised', 'head-shy', 'full-front', 'portrait'];
  return Promise.all(names.map(n => new Promise(ok => {
    const i = new Image();
    i.onload = () => { FACES[n] = i; ok(); };
    i.onerror = () => ok();
    i.src = base + n + '.png';
  })));
}
