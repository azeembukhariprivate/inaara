// Every level can be finished, and every golden lotus and every jasmine flower can be reached.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevels } from '../src/levels.js';
import { TILE } from '../src/level.js';
import { explore } from './reach.mjs';

const levels = buildLevels();

test('there are six levels, numbered in order, with a start and a gate', () => {
  assert.equal(levels.length, 6);
  levels.forEach((l, i) => {
    assert.equal(l.id, i + 1);
    assert.ok(l.find('start'), `${l.name} has a start`);
    assert.ok(l.find('gate'), `${l.name} has a gate`);
    assert.ok(l.name && l.intro && l.music && l.theme);
    assert.equal(l.tiles.length, l.width * l.height);
  });
});

test('levels 1 to 5 each hide three golden lotuses; the last level has the Monkey Chief', () => {
  for (const l of levels.slice(0, 5)) {
    const ids = l.entities.filter(e => e.type === 'lotus').map(e => e.id).sort();
    assert.deepEqual(ids, [1, 2, 3], l.name);
  }
  assert.ok(levels[5].find('boss'));
  assert.ok(levels[5].find('gate').hidden, 'the gate only shows once the chief is beaten');
});

test('nothing to collect is stuck inside the ground', () => {
  for (const l of levels) {
    for (const e of l.entities.filter(k => k.type === 'jasmine' || k.type === 'lotus')) {
      const t = l.tile(Math.floor(e.x / 48), Math.floor(e.y / 48));
      assert.ok(t !== TILE.SOLID && t !== TILE.ROCK, `${l.name}: ${e.type} at ${e.x},${e.y}`);
    }
  }
});

for (const l of levels) {
  test(`${l.name}: the gate, every lotus and every jasmine can be reached`, () => {
    if (l.find('boss')) {
      // The gate appears where she can walk to once the chief is beaten.
      l.find('gate').hidden = false;
    }
    const r = explore(l);
    assert.ok(r.goal, 'the gate can be reached');
    assert.equal(r.lotusFound.length, r.lotusTotal, 'every golden lotus');
    assert.equal(r.jasmineFound, r.jasmineTotal, `every jasmine (missed: ${JSON.stringify(r.missedJasmine.slice(0, 5))})`);
  });
}
