// Small drawing helpers shared by all the art: gradients, shapes, glows and text.

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function rgrad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

/** A soft glow, added on top of what's there. */
export function glow(ctx, x, y, r, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgrad(ctx, x, y, 0, r, [[0, color], [1, 'rgba(0,0,0,0)']]);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

export function sparkle(ctx, x, y, s, alpha = 0.95) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,255,230,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
  ctx.restore();
}

/** Rays of light from a point. */
export function rays(ctx, x, y, n, len, color, seed) {
  const r = rng(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.08, w = 0.02 + r() * 0.05, l = len * (0.6 + r() * 0.4);
    const g = ctx.createRadialGradient(x, y, 0, x, y, l);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - w) * l, y + Math.sin(a - w) * l);
    ctx.lineTo(x + Math.cos(a + w) * l, y + Math.sin(a + w) * l);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export const FONT = 'Fredoka, "Trebuchet MS", sans-serif';

/** Text with a rounded outline, as used everywhere in the game. */
export function label(ctx, text, x, y, size, opts = {}) {
  ctx.font = `${opts.weight || 600} ${size}px ${FONT}`;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = 'middle';
  if (opts.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = opts.strokeW || size * 0.18;
    ctx.strokeStyle = opts.stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = opts.fill || '#fff';
  ctx.fillText(text, x, y);
}

export function heart(ctx, x, y, s, full) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-14, -4, -8, -14, 0, -7);
  ctx.bezierCurveTo(8, -14, 14, -4, 0, 6);
  ctx.closePath();
  ctx.fillStyle = full ? vgrad(ctx, -12, 6, [[0, '#ff8a7a'], [1, '#d6312b']]) : 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(40,20,10,0.6)';
  ctx.stroke();
  if (full) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ellipse(ctx, -4, -6, 2.5, 1.6, -0.5);
    ctx.fill();
  }
  ctx.restore();
}

/** Small glowing specks (dust, fireflies, sparks) spread over an area. */
export function motes(ctx, n, seed, color, area, size = [1, 3], glowSize = 0) {
  const r = rng(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = area[0] + r() * area[2], y = area[1] + r() * area[3], s = size[0] + r() * (size[1] - size[0]);
    if (glowSize) {
      ctx.fillStyle = rgrad(ctx, x, y, 0, s * glowSize, [[0, color], [1, 'rgba(0,0,0,0)']]);
      ctx.beginPath();
      ctx.arc(x, y, s * glowSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5 + r() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** A canvas to draw into once and reuse (backgrounds, tiles). */
export function makeCanvas(w, h) {
  if (typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
