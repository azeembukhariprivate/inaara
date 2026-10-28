// Can every level be finished, and can every golden lotus be reached? This plays Inaara's real moves (the same
// code the game uses) from every place she can stand: walking, short and long jumps, glides, spin dashes, wall
// jumps and climbing ledges, and follows where each one lands.
import { Player } from '../src/player.js';
import { T } from '../src/level.js';
import { box, overlap } from '../src/physics.js';

const DT = 1 / 120;

function macros() {
  const list = [];
  for (const dir of [-1, 1, 0]) {
    for (const run of [0, 0.3]) {
      for (const hold of [0, 0.08, 0.18, 0.3, 3]) {
        if (dir === 0 && (run > 0 || hold === 0)) continue;
        list.push({ dir, run, hold, spin: null, walls: false });
        if (hold >= 0.3 && dir !== 0) {
          list.push({ dir, run, hold, spin: 0.3, walls: false });
          list.push({ dir, run, hold, spin: 0.55, walls: false });
        }
        if (dir !== 0 && hold > 0.1) list.push({ dir, run, hold, spin: null, walls: true });
      }
    }
  }
  list.push({ dir: 0, run: 0, hold: 0, spin: null, walls: false, drop: true });
  for (const dir of [-1, 1]) list.push({ dir, run: 0, hold: 0, spin: null, walls: false, drop: true });
  return list;
}

function simulate(level, start, m, world, onTouch) {
  const p = new Player(start.x, start.y);
  p.onGround = true;
  let dir = m.dir, t = 0, jumpAt = m.run, holdUntil = m.run + m.hold, left = false, nextWallJump = 0;
  const maxTime = 6;
  while (t < maxTime) {
    const input = { left: dir < 0, right: dir > 0, up: false, down: false, jump: false, jumpPressed: false, spinPressed: false };
    if (m.drop && t < 0.1) input.down = true;
    if (m.hold > 0 && t >= jumpAt && t < holdUntil) {
      input.jump = true;
      if (t - jumpAt < DT / 2) input.jumpPressed = true;
    }
    if (m.spin !== null && Math.abs(t - (jumpAt + m.spin)) < DT / 2) input.spinPressed = true;
    if (p.state === 'hang') {
      input.up = true;
      input.jumpPressed = true;
    }
    if (m.walls && !p.onGround && left && p.wallGrace > 0 && t >= nextWallJump) {
      // Jump off the wall and turn round, then keep pushing that way.
      const wallSide = p.wallDir || dir;
      dir = -wallSide;
      input.left = dir < 0;
      input.right = dir > 0;
      input.jumpPressed = true;
      input.jump = true;
      jumpAt = t;
      holdUntil = t + 0.35;
      nextWallJump = t + 0.2;
    } else if (m.walls && t < holdUntil && t > jumpAt) input.jump = true;
    p.update(DT, input, level, world);
    p.events.length = 0;
    t += DT;
    onTouch(box(p));
    if (!p.onGround && p.state !== 'hang' && p.state !== 'climb') left = true;
    if (p.y > level.pxHeight + 50) return null;
    const ty = Math.floor((p.y - 4) / T), tx = Math.floor(p.x / T);
    if (level.isWater(tx, ty) || level.isWater(tx, Math.floor(p.y / T))) return null;
    if (left && p.onGround && t > m.run + 0.05) return { x: p.x, y: p.y };
    if (!left && t > m.run + m.hold + 0.6) return { x: p.x, y: p.y };
  }
  return p.onGround ? { x: p.x, y: p.y } : null;
}

/** Explores a level. Returns whether the gate was reached, which lotuses and how much jasmine could be reached. */
export function explore(level) {
  const platforms = level.entities.filter(e => e.type === 'log').map(e => ({ x: e.x0, y: e.y, w: e.x1 - e.x0 + e.w, h: e.h, dx: 0 }));
  const updrafts = level.entities.filter(e => e.type === 'updraft');
  const world = { platforms, updrafts };
  const start = level.find('start');
  const gate = level.find('gate');
  const gateBox = gate ? { l: gate.x - 40, r: gate.x + 40, t: gate.y - 200, b: gate.y } : null;
  const pickups = level.entities.filter(e => e.type === 'jasmine' || e.type === 'lotus').map(e => ({ e, b: { l: e.x - 18, r: e.x + 18, t: e.y - 18, b: e.y + 18 }, got: false }));
  let goal = false;
  const touch = b => {
    if (gateBox && overlap(b, gateBox)) goal = true;
    for (const k of pickups) if (!k.got && overlap(b, k.b)) k.got = true;
  };
  const seen = new Set();
  const key = s => `${Math.round(s.x / 16)},${Math.round(s.y)}`;
  const queue = [{ x: start.x, y: start.y }];
  seen.add(key(queue[0]));
  const list = macros();
  let sims = 0;
  while (queue.length) {
    const s = queue.shift();
    for (const m of list) {
      sims++;
      const end = simulate(level, s, m, world, touch);
      if (!end) continue;
      const k = key(end);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push(end);
    }
  }
  const lotus = pickups.filter(k => k.e.type === 'lotus');
  const jas = pickups.filter(k => k.e.type === 'jasmine');
  return {
    goal,
    places: seen.size,
    sims,
    lotusFound: lotus.filter(k => k.got).map(k => k.e.id),
    lotusTotal: lotus.length,
    jasmineFound: jas.filter(k => k.got).length,
    jasmineTotal: jas.length,
    missedJasmine: jas.filter(k => !k.got).map(k => [Math.floor(k.e.x / T), Math.floor(k.e.y / T)])
  };
}
