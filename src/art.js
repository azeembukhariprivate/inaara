// Kerala scenery, creatures and things to collect, all drawn with shapes.
import { rng, vgrad, rgrad, ellipse, roundRect, sparkle, glow } from './gfx.js';

// ================================================================ scenery

/** A coconut palm: a curved ringed trunk and drooping fronds. */
export function palm(ctx, x, y, s, lean, col) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const tx = lean * 120, ty = -240;
  ctx.strokeStyle = col.trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * 10, -140, tx, ty);
  ctx.stroke();
  if (col.ring) {
    ctx.strokeStyle = col.ring;
    ctx.lineWidth = 2;
    for (let t = 0.05; t < 0.95; t += 0.07) {
      const px = 2 * (1 - t) * t * lean * 10 + t * t * tx, py = 2 * (1 - t) * t * -140 + t * t * ty;
      ctx.beginPath();
      ctx.moveTo(px - 6, py);
      ctx.lineTo(px + 6, py + 1);
      ctx.stroke();
    }
  }
  const r = rng(Math.round(Math.abs(x) * 3 + y));
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + i * (Math.PI / 8) + (r() - 0.5) * 0.2, len = 80 + r() * 30, droop = 40 + r() * 30;
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.5 + droop;
    const cx = tx + Math.cos(a) * len * 0.5, cy = ty + Math.sin(a) * len * 0.5 - 10;
    ctx.strokeStyle = col.frond;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    ctx.lineWidth = 2.2;
    for (let t = 0.15; t < 1; t += 0.08) {
      const px = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * cx + t * t * ex;
      const py = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * cy + t * t * ey;
      const L = 22 * (1 - t * 0.6);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a + 1.3) * L * 0.4, py + L);
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a - 1.3) * L * 0.4 - 4, py + L * 0.9);
      ctx.stroke();
    }
  }
  if (col.nut) {
    ctx.fillStyle = col.nut;
    [[-6, 6], [6, 8], [0, 12]].forEach(([dx, dy]) => {
      ellipse(ctx, tx + dx, ty + dy, 6, 7);
      ctx.fill();
    });
  }
  ctx.restore();
}

/** A houseboat (kettuvallam): curved wooden hull and an arched woven roof. */
export function houseboat(ctx, x, y, s, col = '#3a2412', roof = '#c69a52', lit = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-150, -34);
  ctx.quadraticCurveTo(-120, 4, -60, 6);
  ctx.lineTo(70, 6);
  ctx.quadraticCurveTo(140, 2, 160, -30);
  ctx.quadraticCurveTo(120, -10, 60, -12);
  ctx.lineTo(-60, -12);
  ctx.quadraticCurveTo(-120, -14, -150, -34);
  ctx.fill();
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-90, -12);
  ctx.quadraticCurveTo(-80, -70, 0, -72);
  ctx.quadraticCurveTo(80, -70, 90, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,50,20,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = -80; i <= 80; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, -14);
    ctx.quadraticCurveTo(i * 0.95, -50, i * 0.9, -66 + Math.abs(i) * 0.1);
    ctx.stroke();
  }
  if (lit) {
    ctx.fillStyle = 'rgba(255,200,110,0.85)';
    for (let i = -60; i <= 50; i += 28) {
      roundRect(ctx, i, -36, 16, 14, 4);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A Kochi fishing net: a cantilever of poles with the net hanging off the end. */
export function fishingNet(ctx, x, y, s, col) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-120, -150);
  ctx.moveTo(10, 0);
  ctx.lineTo(-60, -180);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-120, -150);
  ctx.lineTo(-210, -40);
  ctx.moveTo(-60, -180);
  ctx.lineTo(-250, -70);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-210, -40);
  ctx.quadraticCurveTo(-240, -10, -250, -70);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(-210 - i * 5, -40 - i * 4);
    ctx.lineTo(-232 - i * 2, -16 - i * 6);
    ctx.stroke();
  }
  ctx.restore();
}

/** A Kerala house: white walls and a steep sloping tiled roof with a small gable. */
export function keralaHouse(ctx, x, y, s, wall, roof, window = 'rgba(255,200,110,0.9)') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = wall;
  ctx.fillRect(-60, -50, 120, 50);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-90, -42);
  ctx.lineTo(-40, -90);
  ctx.lineTo(40, -90);
  ctx.lineTo(90, -42);
  ctx.lineTo(70, -38);
  ctx.lineTo(-70, -38);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-26, -90);
  ctx.lineTo(0, -116);
  ctx.lineTo(26, -90);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1.5;
  for (let i = -80; i <= 80; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i, -42);
    ctx.lineTo(i * 0.5, -88);
    ctx.stroke();
  }
  ctx.fillStyle = window;
  roundRect(ctx, -12, -36, 24, 36, 3);
  ctx.fill();
  ctx.restore();
}

/** A long snake boat (chundan vallam) with rowers and a golden umbrella at the raised stern. */
export function snakeBoat(ctx, x, y, s, rowers, t = 0, col = '#24140a') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-260, -6);
  ctx.lineTo(160, -6);
  ctx.quadraticCurveTo(230, -20, 250, -110);
  ctx.quadraticCurveTo(262, -112, 258, -96);
  ctx.quadraticCurveTo(240, -10, 170, 6);
  ctx.lineTo(-250, 6);
  ctx.quadraticCurveTo(-270, 4, -260, -6);
  ctx.fill();
  ctx.strokeStyle = '#d8b25a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-250, 0);
  ctx.lineTo(160, 0);
  ctx.quadraticCurveTo(220, -10, 246, -96);
  ctx.stroke();
  for (let i = 0; i < rowers; i++) {
    const rx = -230 + i * (380 / rowers);
    const stroke = Math.sin(t * 9 + i * 0.15);
    ctx.fillStyle = '#f4efe2';
    ellipse(ctx, rx, -16, 5, 8);
    ctx.fill();
    ctx.fillStyle = '#2a1a10';
    ellipse(ctx, rx + 1 + stroke, -27, 4, 4);
    ctx.fill();
    ctx.fillStyle = '#c8202a';
    ctx.fillRect(rx - 4 + stroke, -32, 8, 2);
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx + 2, -18);
    ctx.lineTo(rx - 10 - stroke * 6, 14);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8b83a';
  ctx.beginPath();
  ctx.moveTo(196, -70);
  ctx.quadraticCurveTo(212, -96, 228, -70);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e8b83a';
  ctx.beginPath();
  ctx.moveTo(212, -70);
  ctx.lineTo(212, -10);
  ctx.stroke();
  ctx.restore();
}

export function hornbill(ctx, x, y, s, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const flap = Math.sin(t * 6) * 14;
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-50, -40 + flap, -90, -20 + flap);
  ctx.quadraticCurveTo(-50, -10, -10, 8);
  ctx.fill();
  ctx.fillStyle = '#f2efe6';
  ctx.beginPath();
  ctx.moveTo(-60, -20 + flap * 0.8);
  ctx.quadraticCurveTo(-75, -24 + flap, -90, -20 + flap);
  ctx.quadraticCurveTo(-75, -16 + flap, -60, -16 + flap * 0.8);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ellipse(ctx, 0, 4, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#f2efe6';
  ellipse(ctx, -24, 10, 16, 5);
  ctx.fill();
  ctx.fillStyle = '#f2e6a8';
  ellipse(ctx, 22, -2, 9, 8);
  ctx.fill();
  ctx.fillStyle = '#f2c43a';
  ctx.beginPath();
  ctx.moveTo(26, -6);
  ctx.quadraticCurveTo(52, -6, 62, 8);
  ctx.quadraticCurveTo(44, 2, 28, 4);
  ctx.fill();
  ctx.fillStyle = '#e8a02a';
  ctx.beginPath();
  ctx.moveTo(26, -8);
  ctx.quadraticCurveTo(44, -18, 52, -6);
  ctx.lineTo(28, -4);
  ctx.fill();
  ctx.fillStyle = '#c8202a';
  ellipse(ctx, 24, -4, 2, 2);
  ctx.fill();
  ctx.restore();
}

// ================================================================ things to collect and touch

/** A jasmine flower: five white petals with a soft glow. */
export function jasmine(ctx, x, y, s = 1, t = 0) {
  y += Math.sin(t * 3 + x * 0.05) * 3;
  glow(ctx, x, y, 24 * s, 'rgba(255,255,220,0.5)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(Math.sin(t * 1.5 + x) * 0.2);
  for (let k = 0; k < 5; k++) {
    ctx.save();
    ctx.rotate(k * 1.2566 + 0.3);
    ctx.fillStyle = '#fbf8ee';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-5, -4, -4, -11, 0, -12);
    ctx.bezierCurveTo(4, -11, 5, -4, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,120,60,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#f0d86a';
  ellipse(ctx, 0, 0, 2.2, 2.2);
  ctx.fill();
  ctx.restore();
  if (Math.sin(t * 4 + x) > 0.6) sparkle(ctx, x + 9 * s, y - 10 * s, 5 * s);
}

/** A golden lotus: three are hidden in every level. */
export function goldenLotus(ctx, x, y, s = 1, t = 0) {
  y += Math.sin(t * 2.4) * 4;
  glow(ctx, x, y, 46 * s, 'rgba(255,200,80,0.55)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const petal = (a, len, w, col) => {
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-w, -len * 0.3, -w * 0.5, -len, 0, -len);
    ctx.bezierCurveTo(w * 0.5, -len, w, -len * 0.3, 0, 6);
    ctx.fill();
    ctx.restore();
  };
  [-1.1, 1.1].forEach(a => petal(a, 18, 9, '#e0a020'));
  [-0.55, 0.55].forEach(a => petal(a, 22, 9, '#f2bf34'));
  petal(0, 24, 10, '#ffd75a');
  ctx.fillStyle = '#3e8a3a';
  ctx.beginPath();
  ctx.ellipse(0, 9, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  sparkle(ctx, x + 14 * s, y - 20 * s, 6 * s * (0.6 + 0.4 * Math.sin(t * 5)));
}

/** A brass oil lamp (nilavilakku): the checkpoint. Lit once touched. */
export function lamp(ctx, x, y, s, lit, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const brass = vgrad(ctx, -90, 0, [[0, '#ffe08a'], [0.5, '#d8a438'], [1, '#8a5a18']]);
  ctx.fillStyle = brass;
  ellipse(ctx, 0, -4, 22, 6);
  ctx.fill();
  ctx.fillRect(-4, -70, 8, 66);
  ellipse(ctx, 0, -40, 9, 4);
  ctx.fill();
  ellipse(ctx, 0, -72, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#8a5a18';
  ctx.fillRect(-1, -96, 2, 22);
  ellipse(ctx, 0, -98, 4, 4);
  ctx.fill();
  if (lit) {
    for (const fx of [-14, 0, 14]) {
      const fl = 1 + Math.sin(t * 14 + fx) * 0.15;
      glow(ctx, fx, -84, 30, 'rgba(255,170,60,0.5)');
      ctx.fillStyle = vgrad(ctx, -96, -76, [[0, '#fff6c0'], [0.6, '#ffb030'], [1, '#e05010']]);
      ctx.beginPath();
      ctx.moveTo(fx, -98 * fl + 2);
      ctx.quadraticCurveTo(fx + 5, -84, fx, -76);
      ctx.quadraticCurveTo(fx - 5, -84, fx, -98 * fl + 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#5a3a14';
    for (const fx of [-14, 0, 14]) {
      ctx.fillRect(fx - 1, -80, 2, 5);
    }
  }
  ctx.restore();
}

/** The end of a level: a carved wooden temple gate with a hanging bell and garlands. */
export function gate(ctx, x, y, s, t = 0, open = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const wood = vgrad(ctx, -230, 0, [[0, '#8a4a24'], [1, '#4a2410']]);
  ctx.fillStyle = wood;
  ctx.fillRect(-90, -200, 22, 200);
  ctx.fillRect(68, -200, 22, 200);
  // Sloping tiled roof.
  ctx.fillStyle = '#a63a22';
  ctx.beginPath();
  ctx.moveTo(-130, -190);
  ctx.lineTo(-60, -250);
  ctx.lineTo(60, -250);
  ctx.lineTo(130, -190);
  ctx.lineTo(110, -184);
  ctx.lineTo(-110, -184);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-30, -250);
  ctx.lineTo(0, -278);
  ctx.lineTo(30, -250);
  ctx.fill();
  ctx.fillStyle = '#e8b83a';
  ellipse(ctx, 0, -282, 5, 5);
  ctx.fill();
  ctx.fillStyle = '#6a3418';
  ctx.fillRect(-90, -192, 180, 14);
  // Garlands of marigold and jasmine.
  for (let i = 0; i < 9; i++) {
    const gx = -80 + i * 20, gy = -170 + Math.sin(i / 8 * Math.PI) * 18;
    ctx.fillStyle = i % 2 ? '#ffb020' : '#fbf6e6';
    ellipse(ctx, gx, gy, 6, 6);
    ctx.fill();
  }
  // The bell.
  const swing = Math.sin(t * 3) * (open ? 0.5 : 0.12);
  ctx.save();
  ctx.translate(0, -178);
  ctx.rotate(swing);
  ctx.strokeStyle = '#6a4a20';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 30);
  ctx.stroke();
  ctx.fillStyle = vgrad(ctx, 30, 60, [[0, '#ffe08a'], [1, '#b07a20']]);
  ctx.beginPath();
  ctx.moveTo(-12, 56);
  ctx.quadraticCurveTo(-12, 30, 0, 30);
  ctx.quadraticCurveTo(12, 30, 12, 56);
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, 0, 58, 3, 3);
  ctx.fill();
  ctx.restore();
  glow(ctx, 0, -120, 120, open ? 'rgba(255,220,140,0.35)' : 'rgba(255,220,140,0.15)');
  ctx.restore();
}

/** A clay pot that breaks with a spin. */
export function clayPot(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = vgrad(ctx, -40, 0, [[0, '#d8784a'], [1, '#8a3e1e']]);
  ctx.beginPath();
  ctx.moveTo(-10, -40);
  ctx.lineTo(10, -40);
  ctx.quadraticCurveTo(26, -28, 22, -10);
  ctx.quadraticCurveTo(14, 2, 0, 2);
  ctx.quadraticCurveTo(-14, 2, -22, -10);
  ctx.quadraticCurveTo(-26, -28, -10, -40);
  ctx.fill();
  ctx.fillStyle = '#6a2a10';
  ellipse(ctx, 0, -40, 10, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,180,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, -22);
  ctx.lineTo(18, -22);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ellipse(ctx, -9, -26, 4, 8);
  ctx.fill();
  ctx.restore();
}

export function shard(ctx, x, y, s, rot, col) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(0, -10);
  ctx.lineTo(10, -2);
  ctx.lineTo(2, 8);
  ctx.fill();
  ctx.restore();
}

/** A banana leaf held over the head to glide. */
export function bananaLeaf(ctx, x, y, s, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const flap = Math.sin(t * 18) * 3;
  ctx.fillStyle = vgrad(ctx, -30, 20, [[0, '#7cc84e'], [1, '#2e7a2a']]);
  ctx.beginPath();
  ctx.moveTo(-70, 10 + flap);
  ctx.quadraticCurveTo(-60, -30, 0, -32);
  ctx.quadraticCurveTo(64, -30, 76, 6 - flap);
  ctx.quadraticCurveTo(40, -6, 0, -4);
  ctx.quadraticCurveTo(-40, -4, -70, 10 + flap);
  ctx.fill();
  ctx.strokeStyle = '#d8eaa0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-70, 10 + flap);
  ctx.quadraticCurveTo(0, -24, 76, 6 - flap);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,80,20,0.5)';
  ctx.lineWidth = 1.2;
  for (let i = -60; i <= 66; i += 10) {
    const yy = -16 + Math.abs(i) * 0.22;
    ctx.beginPath();
    ctx.moveTo(i, yy);
    ctx.lineTo(i + 6, yy + 12 - Math.abs(i) * 0.05);
    ctx.stroke();
  }
  ctx.restore();
}

/** A floating log to ride on. */
export function log(ctx, x, y, w, h) {
  ctx.fillStyle = vgrad(ctx, y, y + h, [[0, '#9a6a40'], [1, '#4a2a14']]);
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#c08a58';
  ellipse(ctx, x + w - 4, y + h / 2, 6, h / 2 - 1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,10,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + h * 0.4);
  ctx.lineTo(x + w * 0.6, y + h * 0.4);
  ctx.stroke();
  ctx.fillStyle = '#3e8a3a';
  ellipse(ctx, x + w * 0.3, y + 2, 8, 3);
  ctx.fill();
}

// ================================================================ creatures

/** A red crab that scuttles sideways. */
export function crab(ctx, x, y, s, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#a8321c';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i += 2) {
    for (let k = 0; k < 3; k++) {
      const step = Math.sin(t * 16 + k * 2 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(i * 10, -8);
      ctx.lineTo(i * (20 + k * 4), -2 + k * 2 + step);
      ctx.lineTo(i * (24 + k * 5), 4);
      ctx.stroke();
    }
  }
  ctx.fillStyle = vgrad(ctx, -24, 0, [[0, '#ff7a4a'], [1, '#c23a1c']]);
  ellipse(ctx, 0, -10, 20, 12);
  ctx.fill();
  const claw = Math.sin(t * 5) * 3;
  ctx.fillStyle = '#e04a26';
  ellipse(ctx, -24, -20 - claw, 7, 6);
  ctx.fill();
  ellipse(ctx, 24, -20 + claw, 7, 6);
  ctx.fill();
  ctx.strokeStyle = '#c23a1c';
  ctx.beginPath();
  ctx.moveTo(-8, -18);
  ctx.lineTo(-8, -26);
  ctx.moveTo(8, -18);
  ctx.lineTo(8, -26);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ellipse(ctx, -8, -28, 3.4, 3.4);
  ctx.fill();
  ellipse(ctx, 8, -28, 3.4, 3.4);
  ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, -7, -28, 1.6, 1.6);
  ctx.fill();
  ellipse(ctx, 9, -28, 1.6, 1.6);
  ctx.fill();
  ctx.restore();
}

/** A crow, flapping. Faces left unless flipped. */
export function crow(ctx, x, y, s, t = 0, faceRight = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (faceRight ? 1 : -1), s);
  const flap = Math.sin(t * 12);
  ctx.fillStyle = '#16161c';
  ctx.beginPath();
  ctx.moveTo(-26, -6);
  ctx.quadraticCurveTo(-4, -22, 16, -12);
  ctx.lineTo(28, -10);
  ctx.lineTo(18, -6);
  ctx.quadraticCurveTo(0, 4, -26, -6);
  ctx.fill();
  ctx.fillStyle = '#2a2a34';
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.quadraticCurveTo(-24, -42 * flap, -40, -30 * flap);
  ctx.quadraticCurveTo(-22, -20 * flap, -10, -8);
  ctx.fill();
  ctx.fillStyle = '#3a3a48';
  ellipse(ctx, 14, -14, 3, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, 15, -15, 1.2, 1.2);
  ctx.fill();
  ctx.restore();
}

/** A cheeky monkey holding a stolen banana. Faces right unless flipped. */
export function monkey(ctx, x, y, s, t = 0, faceLeft = false, crouch = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (faceLeft ? -1 : 1), s);
  ctx.strokeStyle = '#7a6448';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const tail = Math.sin(t * 3) * 6;
  ctx.beginPath();
  ctx.moveTo(-14, -16);
  ctx.bezierCurveTo(-40, -10, -40 + tail, -50, -24 + tail, -54);
  ctx.stroke();
  ctx.lineWidth = 6;
  [[-8, -8, -12, 0], [8, -8, 12, 0]].forEach(([a, b, c, d]) => {
    ctx.beginPath();
    ctx.moveTo(a, b + crouch);
    ctx.lineTo(c, d);
    ctx.stroke();
  });
  ctx.translate(0, crouch);
  ctx.fillStyle = '#8c7454';
  ellipse(ctx, 0, -18, 15, 14);
  ctx.fill();
  ctx.strokeStyle = '#8c7454';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(8, -24);
  ctx.lineTo(20, -36);
  ctx.stroke();
  ctx.fillStyle = '#9a8060';
  ellipse(ctx, 4, -40, 13, 12);
  ctx.fill();
  ctx.fillStyle = '#e8b8a0';
  ellipse(ctx, 9, -38, 8, 7);
  ctx.fill();
  ctx.fillStyle = '#9a8060';
  ellipse(ctx, -6, -44, 5, 6);
  ctx.fill();
  ctx.fillStyle = '#1a120c';
  ellipse(ctx, 8, -41, 1.6, 1.8);
  ctx.fill();
  ellipse(ctx, 13, -41, 1.6, 1.8);
  ctx.fill();
  ctx.strokeStyle = '#7a3a2a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(11, -35, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#f2d24a';
  ctx.beginPath();
  ctx.arc(22, -38, 7, 0.4, 2.2);
  ctx.arc(22, -36, 4, 2.2, 0.4, true);
  ctx.fill();
  ctx.restore();
}

/** The Monkey Chief: big, with a marigold crown and the stolen festival garland. */
export function monkeyChief(ctx, x, y, s, t = 0, faceLeft = false, mood = 'normal') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (faceLeft ? -1 : 1), s);
  if (mood === 'dizzy') ctx.rotate(Math.sin(t * 8) * 0.06);
  ctx.strokeStyle = '#6a5438';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-30, -30);
  ctx.bezierCurveTo(-80, -20, -80, -100, -50 + Math.sin(t * 2) * 8, -110);
  ctx.stroke();
  ctx.lineWidth = 12;
  [[-16, -14, -22, 0], [16, -14, 22, 0]].forEach(([a, b, c, d]) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  });
  ctx.fillStyle = vgrad(ctx, -80, 0, [[0, '#9a8060'], [1, '#6a5438']]);
  ellipse(ctx, 0, -40, 34, 32);
  ctx.fill();
  ctx.fillStyle = '#d8b898';
  ellipse(ctx, 6, -34, 20, 20);
  ctx.fill();
  // Arms.
  ctx.strokeStyle = '#8c7454';
  ctx.lineWidth = 9;
  const up = mood === 'throw' ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(22, -56);
  ctx.lineTo(44, -56 - 26 * (up < 0 ? 1 : -0.2));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-22, -56);
  ctx.lineTo(-40, -36);
  ctx.stroke();
  // Head.
  ctx.fillStyle = '#9a8060';
  ellipse(ctx, 6, -92, 28, 26);
  ctx.fill();
  ctx.fillStyle = '#e8b8a0';
  ellipse(ctx, 14, -86, 18, 15);
  ctx.fill();
  ctx.fillStyle = '#9a8060';
  ellipse(ctx, -18, -96, 9, 10);
  ctx.fill();
  if (mood === 'dizzy') {
    ctx.strokeStyle = '#1a120c';
    ctx.lineWidth = 2;
    for (const ex of [8, 22]) {
      ctx.beginPath();
      ctx.arc(ex, -94, 3.5, 0, Math.PI * 1.6);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + i * 2.1;
      sparkle(ctx, 8 + Math.cos(a) * 26, -128 + Math.sin(a) * 8, 6);
    }
  } else {
    ctx.fillStyle = '#1a120c';
    ellipse(ctx, 8, -95, 2.6, 3);
    ctx.fill();
    ellipse(ctx, 22, -95, 2.6, 3);
    ctx.fill();
    ctx.strokeStyle = '#1a120c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -103);
    ctx.lineTo(12, -100);
    ctx.moveTo(28, -103);
    ctx.lineTo(18, -100);
    ctx.stroke();
  }
  ctx.strokeStyle = '#7a3a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mood === 'dizzy') ctx.arc(16, -78, 4, Math.PI + 0.3, -0.3);
  else ctx.arc(16, -82, 6, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // Marigold crown.
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 ? '#ffb020' : '#ff7a10';
    ellipse(ctx, -14 + i * 7, -118 + Math.abs(i - 3) * 2, 5, 5);
    ctx.fill();
  }
  // The stolen garland around the neck.
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.1 + i * 0.08);
    ctx.fillStyle = i % 2 ? '#fbf6e6' : '#ffb020';
    ellipse(ctx, 4 + Math.cos(a) * 26, -64 + Math.sin(a) * 14, 4, 4);
    ctx.fill();
  }
  ctx.restore();
}

export function coconut(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = rgrad(ctx, -r * 0.3, -r * 0.3, 1, r, [[0, '#8a6a3a'], [1, '#4a3014']]);
  ellipse(ctx, 0, 0, r, r * 0.92);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,8,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.5, -r * 0.9);
    ctx.quadraticCurveTo(i * r * 0.8, 0, i * r * 0.5, r * 0.9);
    ctx.stroke();
  }
  ctx.fillStyle = '#2a1a08';
  [[-4, -4], [3, -5], [0, 2]].forEach(([dx, dy]) => {
    ellipse(ctx, dx * r / 12, dy * r / 12, 1.8, 1.8);
    ctx.fill();
  });
  ctx.restore();
}

/** A puff of dust or splash. */
export function puff(ctx, x, y, r, alpha, col = '255,240,220') {
  ctx.fillStyle = `rgba(${col},${alpha})`;
  ellipse(ctx, x, y, r, r * 0.7);
  ctx.fill();
}
