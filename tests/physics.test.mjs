// Inaara's moves: how high she jumps, standing on ground and planks, walls, and the spin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Level, TILE, T } from '../src/level.js';
import { Player } from '../src/player.js';
import { MOVE } from '../src/physics.js';

const DT = 1 / 120;
const none = { left: false, right: false, up: false, down: false, jump: false, jumpPressed: false, spinPressed: false };

function flat(width = 30, height = 12, edit) {
  const tiles = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) tiles[(height - 1) * width + x] = TILE.SOLID;
  if (edit) edit((x, y, t) => (tiles[y * width + x] = t));
  return new Level({ id: 0, name: 'test', theme: 'backwaters', width, height, tiles, entities: [] });
}

function run(p, level, seconds, input = none, first = null) {
  for (let i = 0; i < seconds / DT; i++) p.update(DT, i === 0 && first ? { ...input, ...first } : input, level, {});
}

test('she stands on the ground', () => {
  const level = flat(), p = new Player(5 * T, 11 * T - 20);
  run(p, level, 1);
  assert.ok(p.onGround);
  assert.equal(p.y, 11 * T);
});

test('a held jump goes about three and a half tiles high, a tap much less', () => {
  const level = flat(), high = new Player(5 * T, 11 * T), low = new Player(5 * T, 11 * T);
  run(high, level, 0.2);
  run(low, level, 0.2);
  let top = high.y;
  for (let i = 0; i < 120; i++) {
    high.update(DT, { ...none, jump: true, jumpPressed: i === 0 }, level, {});
    top = Math.min(top, high.y);
  }
  const rise = (11 * T - top) / T;
  assert.ok(rise > 3.2 && rise < 3.9, `held jump rises ${rise} tiles`);
  let lowTop = low.y;
  for (let i = 0; i < 120; i++) {
    low.update(DT, { ...none, jump: i < 4, jumpPressed: i === 0 }, level, {});
    lowTop = Math.min(lowTop, low.y);
  }
  assert.ok((11 * T - lowTop) / T < rise * 0.6, 'a short tap jumps lower');
});

test('she can jump up through a plank and stand on it, and drop down through it', () => {
  const level = flat(30, 12, set => { for (let x = 3; x < 9; x++) set(x, 8, TILE.PLANK); });
  const p = new Player(5 * T, 11 * T);
  run(p, level, 0.1);
  run(p, level, 0.6, { ...none, jump: true }, { jumpPressed: true });
  run(p, level, 1);
  assert.equal(p.y, 8 * T, 'standing on the plank');
  run(p, level, 0.6, { ...none, down: true });
  run(p, level, 1);
  assert.equal(p.y, 11 * T, 'back on the ground');
});

test('she slides slowly down a wall and can jump away from it', () => {
  const level = flat(30, 12, set => { for (let y = 0; y < 11; y++) set(10, y, TILE.ROCK); });
  const p = new Player(9 * T, 4 * T);
  p.onGround = false;
  run(p, level, 0.5, { ...none, right: true });
  assert.ok(p.wallDir === 1 && p.vy <= MOVE.wallSlide + 1, 'sliding');
  run(p, level, 0.05, { ...none, right: true, jump: true }, { jumpPressed: true });
  assert.ok(p.vx < 0 && p.vy < 0, 'jumped away from the wall');
});

test('the spin needs the clip to be ready and goes fast', () => {
  const level = flat(), p = new Player(5 * T, 11 * T);
  run(p, level, 0.2);
  run(p, level, DT, none, { spinPressed: true });
  assert.equal(p.state, 'dash');
  assert.equal(p.clip, 0);
  run(p, level, MOVE.dashTime + 0.05);
  assert.equal(p.state, 'normal');
  run(p, level, DT, none, { spinPressed: true });
  assert.notEqual(p.state, 'dash', 'not ready again straight away');
  run(p, level, MOVE.clipRecharge + 0.05);
  run(p, level, DT, none, { spinPressed: true });
  assert.equal(p.state, 'dash', 'ready again once the clip glows');
});

test('getting hurt makes her blink, so a second hit straight away does nothing', () => {
  const p = new Player(5 * T, 11 * T);
  assert.equal(p.hurt(6 * T), true);
  assert.equal(p.hurt(6 * T), false);
});
