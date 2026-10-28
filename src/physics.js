// Moving things through the tile grid: run into walls, land on ground and planks, bump heads.
// Bodies are boxes measured from the middle of their feet: x is the centre, y the bottom.
import { T } from './level.js';

/** How Inaara moves (pixels and seconds). */
export const MOVE = {
  gravity: 2800,
  maxFall: 1000,
  run: 330,
  accelGround: 3200,
  brakeGround: 3800,
  accelAir: 2200,
  jump: 980, // about 3.5 tiles high
  jumpCut: 0.45, // letting go early makes a smaller jump
  coyote: 0.1, // can still jump just after running off an edge
  buffer: 0.12, // a jump pressed just before landing still counts
  wallSlide: 150,
  wallJumpX: 400,
  wallJumpY: 900,
  wallJumpLock: 0.16,
  glideFall: 110,
  updraft: 4400,
  updraftTop: -380,
  dash: 640,
  dashTime: 0.28,
  clipRecharge: 1.3,
  stomp: 620,
  stompHigh: 920,
  width: 30,
  height: 88
};

export function box(b) {
  return { l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y - b.h, b: b.y };
}

export function overlap(a, b) {
  return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
}

/**
 * Moves a body by its speed for dt seconds and stops it at walls and floors.
 * Sets body.onGround, body.hitWall (-1, 0, 1), body.bumped, body.platform.
 * Planks and moving platforms only hold you from above, and not while dropping through.
 */
export function moveBody(b, level, dt, platforms = null, dropThrough = false) {
  const prevY = b.y;
  b.onGround = false;
  b.hitWall = 0;
  b.bumped = false;
  b.platform = null;

  // Across.
  b.x += b.vx * dt;
  const top = b.y - b.h, bottom = b.y - 0.01;
  const ty0 = Math.floor(top / T), ty1 = Math.floor(bottom / T);
  if (b.vx > 0 || b.vx === 0) {
    const tx = Math.floor((b.x + b.w / 2 - 0.001) / T);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (level.isSolid(tx, ty)) {
        b.x = tx * T - b.w / 2;
        if (b.vx > 0) b.vx = 0;
        b.hitWall = 1;
        break;
      }
    }
  }
  if (b.vx < 0 || b.vx === 0) {
    const tx = Math.floor((b.x - b.w / 2) / T);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (level.isSolid(tx, ty)) {
        b.x = (tx + 1) * T + b.w / 2;
        if (b.vx < 0) b.vx = 0;
        b.hitWall = -1;
        break;
      }
    }
  }

  // Up and down.
  b.y += b.vy * dt;
  const tx0 = Math.floor((b.x - b.w / 2 + 0.5) / T), tx1 = Math.floor((b.x + b.w / 2 - 0.5) / T);
  if (b.vy >= 0) {
    const ty = Math.floor((b.y - 0.001) / T);
    const rowTop = ty * T;
    for (let tx = tx0; tx <= tx1; tx++) {
      const solid = level.isSolid(tx, ty);
      const plank = !dropThrough && level.isPlank(tx, ty) && prevY <= rowTop + 0.5;
      if ((solid && prevY <= rowTop + 12) || plank) {
        b.y = rowTop;
        b.vy = 0;
        b.onGround = true;
        break;
      }
    }
    if (!b.onGround && platforms && !dropThrough) {
      for (const p of platforms) {
        if (b.x + b.w / 2 > p.x && b.x - b.w / 2 < p.x + p.w && prevY <= p.y + 0.5 + Math.max(0, p.dy || 0) && b.y >= p.y) {
          b.y = p.y;
          b.vy = 0;
          b.onGround = true;
          b.platform = p;
          break;
        }
      }
    }
  } else {
    const ty = Math.floor((b.y - b.h) / T);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (level.isSolid(tx, ty)) {
        b.y = (ty + 1) * T + b.h;
        b.vy = 0;
        b.bumped = true;
        break;
      }
    }
  }
}

/** Whether there's a wall right beside the body on that side (-1 left, 1 right). */
export function touchingWall(b, level, dir) {
  const tx = Math.floor((dir > 0 ? b.x + b.w / 2 + 1 : b.x - b.w / 2 - 1) / T);
  const ty0 = Math.floor((b.y - b.h + 8) / T), ty1 = Math.floor((b.y - 8) / T);
  for (let ty = ty0; ty <= ty1; ty++) if (level.isSolid(tx, ty)) return true;
  return false;
}

/** Whether there's ground (or a plank) under both sides of the feet. */
export function fullySupported(b, level) {
  const ty = Math.floor((b.y + 1) / T);
  const l = Math.floor((b.x - b.w / 2 + 2) / T), r = Math.floor((b.x + b.w / 2 - 2) / T);
  const held = tx => level.isSolid(tx, ty) || level.isPlank(tx, ty);
  return held(l) && held(r);
}
