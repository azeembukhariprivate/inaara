// Playing a level: collecting, lamps, losing hearts and lives, the garland's extra life, and saving.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevels } from '../src/levels.js';
import { Play, GARLAND } from '../src/play.js';
import { recordLevel } from '../src/save.js';

const idle = { left: false, right: false, up: false, down: false, jump: false, jumpPressed: false, spinPressed: false };

test('every 100 jasmine gives an extra life', () => {
  const session = { lives: 3, garland: GARLAND - 2 };
  const play = new Play(buildLevels()[0], session);
  play.addJasmine(3, 0, 0);
  assert.equal(session.lives, 4);
  assert.equal(session.garland, 1);
  assert.equal(play.jasmine, 3);
});

test('falling in the water costs a heart; with no hearts left a life is lost', () => {
  const session = { lives: 2, garland: 0 };
  const play = new Play(buildLevels()[0], session);
  play.fall('water');
  assert.equal(play.hearts, 2);
  play.fall('water');
  play.fall('water');
  assert.equal(session.lives, 1);
  assert.equal(play.hearts, 3);
  play.hearts = 1;
  play.fall('water');
  assert.equal(session.lives, 0);
  assert.equal(play.state, 'lost');
});

test('reaching the gate finishes the level', () => {
  for (const level of buildLevels()) {
    const play = new Play(level, { lives: 3, garland: 0 });
    play.warpToGate();
    for (let i = 0; i < 240 && play.state === 'play'; i++) play.update(1 / 120, { ...idle, right: true });
    assert.equal(play.state, 'won', level.name);
  }
});

test('the Monkey Chief can only be bonked while dizzy, and three bonks beat him', () => {
  const level = buildLevels()[5];
  const play = new Play(level, { lives: 3, garland: 0 });
  const boss = play.world.boss;
  assert.equal(boss.bonk(), false);
  for (let k = 0; k < 3; k++) {
    boss.state = 'dizzy';
    assert.equal(boss.bonk(), true);
  }
  assert.equal(boss.hp, 0);
  for (let i = 0; i < 600 && boss.state !== 'defeated'; i++) play.update(1 / 120, idle);
  assert.equal(boss.state, 'defeated');
  assert.equal(play.world.gate.hidden, false, 'the gate appears');
});

test('finishing a level opens the next one and keeps the best result', () => {
  globalThis.localStorage = { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = v; } };
  const save = { unlocked: 1, best: {}, settings: { music: 0.6, sound: 0.8 }, finished: false };
  recordLevel(save, 1, 30, [1], 6);
  recordLevel(save, 1, 20, [3], 6);
  assert.equal(save.unlocked, 2);
  assert.deepEqual(save.best[1], { jasmine: 30, lotus: [1, 3] });
  recordLevel(save, 6, 0, [], 6);
  assert.equal(save.finished, true);
  assert.ok(JSON.parse(localStorage.store['inaara-save-v1']));
});
