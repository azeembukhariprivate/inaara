// The levels, built from simple pieces: ground, rock, planks, water, thorns, and things placed on top.
// Positions are in tiles; x grows to the right, y downwards (row 0 is the top).
import { Level, TILE, T } from './level.js';

class Builder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = new Uint8Array(width * height);
    this.entities = [];
  }

  set(x, y, t) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) this.tiles[y * this.width + x] = t;
  }

  get(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height ? this.tiles[y * this.width + x] : TILE.EMPTY;
  }

  fill(x0, y0, x1, y1, t) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t);
    return this;
  }

  /** Ground from column x0 to x1, its top at row `top`, down to the bottom. */
  ground(x0, x1, top, t = TILE.SOLID) {
    return this.fill(x0, top, x1, this.height - 1, t);
  }

  rock(x0, y0, x1, y1) {
    return this.fill(x0, y0, x1, y1, TILE.ROCK);
  }

  plank(x0, x1, y) {
    for (let x = x0; x <= x1; x++) if (this.get(x, y) === TILE.EMPTY) this.set(x, y, TILE.PLANK);
    return this;
  }

  /** Water from column x0 to x1, its surface at row `surface`. */
  water(x0, x1, surface) {
    for (let y = surface; y < this.height; y++) for (let x = x0; x <= x1; x++) if (this.get(x, y) === TILE.EMPTY) this.set(x, y, TILE.WATER);
    return this;
  }

  thorns(x0, x1, y) {
    return this.fill(x0, y, x1, y, TILE.THORN);
  }

  /** Something standing on the ground in cell (x, y): its feet at the bottom of that cell. */
  put(type, x, y, extra = {}) {
    this.entities.push({ type, x: x * T + T / 2, y: (y + 1) * T, ...extra });
    return this;
  }

  /** Something floating in the middle of cell (x, y). */
  float(type, x, y, extra = {}) {
    this.entities.push({ type, x: x * T + T / 2, y: y * T + T / 2, ...extra });
    return this;
  }

  jasmineRow(x0, x1, y) {
    for (let x = x0; x <= x1; x++) this.float('jasmine', x, y);
    return this;
  }

  /** Jasmine in an arc from x0 to x1, starting at row y and rising `h` rows in the middle. */
  jasmineArc(x0, x1, y, h) {
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / Math.max(1, x1 - x0);
      this.entities.push({ type: 'jasmine', x: x * T + T / 2, y: y * T + T / 2 - Math.sin(t * Math.PI) * h * T });
    }
    return this;
  }

  /** A floating log moving between columns x0 and x1 (its left end), its top at row y. */
  log(x0, x1, y, len = 3, speed = 0.5, phase = 0) {
    this.entities.push({ type: 'log', x0: x0 * T, x1: x1 * T, y: y * T + 10, w: len * T, h: 26, speed, phase });
    return this;
  }

  /** Rising mist: gliding inside it carries you up. */
  updraft(x0, x1, y0, y1) {
    this.entities.push({ type: 'updraft', x: x0 * T, y: y0 * T, w: (x1 - x0 + 1) * T, h: (y1 - y0 + 1) * T });
    return this;
  }

  sign(x, y, text, touchText) {
    return this.put('sign', x, y, { text, touchText });
  }

  build(meta) {
    return new Level({ ...meta, width: this.width, height: this.height, tiles: this.tiles, entities: this.entities });
  }
}

// ================================================================ 1. Backwaters

function backwaters() {
  const b = new Builder(176, 15);
  b.put('start', 3, 11);
  b.ground(0, 30, 12);
  b.put('palm', 1, 11).put('house', 9, 11);
  b.sign(6, 11, '← →  to run', 'Use ◀ ▶ to run');
  b.jasmineRow(8, 13, 10);
  b.sign(15, 11, 'Space / ▲ to jump', 'Tap JUMP to jump');
  b.ground(18, 30, 10);
  b.jasmineArc(16, 20, 9, 1.5);
  b.ground(22, 30, 8);
  b.put('pot', 26, 7);
  b.sign(24, 7, 'Hold jump to jump higher', 'Hold JUMP to jump higher');
  // A canal to jump over.
  b.water(31, 34, 13);
  b.jasmineArc(30, 35, 7, 1.5);
  b.ground(35, 56, 12);
  b.put('crab', 42, 11);
  b.sign(38, 11, 'Jump on crabs to bonk them', 'Jump on crabs to bonk them');
  b.plank(46, 50, 8);
  b.jasmineRow(46, 50, 7);
  b.put('palm', 53, 11);
  // A wider canal with a floating log.
  b.water(57, 64, 13);
  b.log(57, 61, 12, 3, 0.45);
  b.jasmineRow(58, 63, 10);
  b.ground(65, 84, 12);
  b.sign(66, 11, 'X / Shift to spin', 'Tap SPIN to spin');
  b.put('pot', 69, 11).put('pot', 71, 11, { heart: true }).put('pot', 73, 11);
  b.put('lamp', 77, 11);
  b.ground(80, 84, 10);
  b.ground(83, 84, 8);
  // Glide over the next canal.
  b.sign(81, 9, 'Keep holding jump to glide', 'Keep holding JUMP to glide');
  b.water(85, 91, 13);
  b.jasmineArc(85, 91, 8, 1);
  b.ground(92, 116, 12);
  b.put('house', 95, 11);
  b.put('crab', 100, 11).put('crab', 108, 11);
  b.float('crow', 104, 7, { range: 3 });
  b.plank(102, 105, 9).plank(107, 110, 6);
  b.float('lotus', 108, 4, { id: 1 });
  // Two logs over a wide stretch of water.
  b.water(117, 128, 13);
  b.log(117, 120, 12, 3, 0.5);
  b.log(122, 126, 12, 3, 0.5, Math.PI);
  b.jasmineRow(118, 127, 10);
  b.ground(129, 175, 12);
  b.put('lamp', 131, 11);
  // A tall wall: jump and grab the top, then climb up.
  b.sign(134, 11, 'Grab ledges, then ▲ to climb', 'Jump at a ledge to grab it, JUMP to climb');
  b.ground(137, 141, 7, TILE.ROCK);
  b.jasmineRow(137, 141, 6);
  // A shaft to wall-jump up for a lotus.
  b.rock(145, 2, 145, 11).rock(149, 4, 149, 11);
  b.sign(143, 11, 'Jump off walls', 'Jump off walls: JUMP while sliding');
  b.float('lotus', 147, 1, { id: 2 });
  b.jasmineRow(146, 148, 4);
  b.put('monkey', 156, 11);
  b.put('crab', 160, 11);
  b.plank(162, 165, 9);
  b.float('lotus', 170, 3, { id: 3 });
  b.plank(166, 167, 6).plank(169, 171, 4);
  b.jasmineRow(162, 165, 8);
  b.put('palm', 166, 11);
  b.put('gate', 172, 11);
  return b.build({
    id: 1, name: 'Backwaters', theme: 'backwaters', music: 'backwaters',
    intro: 'The Monkey Chief has stolen the jasmine garlands for the boat race festival! Follow the canals and gather jasmine on the way.'
  });
}

// ================================================================ 2. Munnar tea hills

function teaHills() {
  const b = new Builder(192, 15);
  b.put('start', 3, 11);
  b.ground(0, 12, 12);
  b.jasmineRow(5, 10, 10);
  // Terraces climbing the hill.
  b.ground(13, 20, 10).ground(21, 28, 8).ground(29, 35, 6);
  b.put('basket', 31, 5).put('teabush', 15, 9).put('teabush', 24, 7);
  b.jasmineArc(13, 20, 8, 0.8).jasmineArc(21, 28, 6, 0.8);
  b.put('monkey', 33, 5);
  // Down the other side, over a thorny dip.
  b.ground(36, 40, 9);
  b.ground(41, 43, 12).thorns(41, 43, 11);
  b.jasmineArc(40, 44, 7, 1.2);
  b.ground(44, 50, 9);
  b.put('monkey', 48, 8);
  // A gap with a plank to step on.
  b.plank(53, 54, 9);
  b.jasmineRow(52, 55, 7);
  b.ground(57, 70, 10);
  b.put('pot', 60, 9).put('pot', 62, 9, { heart: true });
  b.put('lamp', 65, 9);
  b.float('crow', 68, 5, { range: 4 });
  // The high terrace.
  b.ground(71, 74, 8).ground(75, 78, 6).ground(79, 82, 4);
  b.put('teabush', 76, 5);
  b.plank(86, 88, 5);
  b.float('lotus', 87, 2, { id: 1 });
  b.jasmineRow(84, 90, 3);
  b.ground(91, 96, 7);
  b.ground(97, 102, 10).thorns(99, 100, 9);
  b.ground(103, 121, 12);
  b.plank(106, 109, 8).jasmineRow(106, 109, 7);
  b.float('crow', 111, 6, { range: 3 }).float('crow', 117, 8, { range: 2 });
  b.put('monkey', 114, 11);
  b.put('lamp', 120, 11);
  // A tall rock: grab the top edge and climb.
  b.ground(124, 127, 6, TILE.ROCK);
  b.float('lotus', 126, 3, { id: 2 });
  b.ground(128, 140, 12);
  b.thorns(131, 136, 11);
  b.plank(130, 137, 8);
  b.jasmineRow(130, 137, 7);
  b.ground(141, 145, 10).ground(146, 150, 8);
  b.put('pot', 148, 7, { heart: true });
  // A wide gap: glide over it.
  b.ground(156, 166, 10);
  b.jasmineArc(150, 156, 7, 1);
  b.put('monkey', 162, 9);
  b.plank(168, 170, 7).plank(172, 174, 5);
  b.float('lotus', 173, 3, { id: 3 });
  b.ground(167, 191, 12);
  b.put('monkey', 178, 11).put('crow', 182, 7, { range: 3, float: true });
  b.put('teabush', 184, 11);
  b.put('gate', 188, 11);
  fixFloats(b);
  return b.build({
    id: 2, name: 'Munnar Tea Hills', theme: 'tea', music: 'tea',
    intro: 'Up in the misty tea hills, the monkeys are hiding the jasmine. Spin to break the clay pots!'
  });
}

// ================================================================ 3. Rainforest falls (a tall level)

function rainforest() {
  const b = new Builder(156, 24);
  b.put('start', 3, 20);
  b.ground(0, 15, 21);
  b.water(16, 33, 22);
  b.jasmineRow(6, 12, 19);
  // Stepping stones across the river.
  b.rock(16, 19, 18, 23).rock(20, 17, 22, 23).rock(24, 15, 26, 23);
  b.jasmineRow(16, 18, 17).jasmineRow(20, 22, 15).jasmineRow(24, 26, 13);
  b.put('crab', 21, 16);
  b.ground(27, 34, 13, TILE.ROCK);
  b.put('lamp', 31, 12);
  // The great waterfall: mist rises from the pool; glide into it and it carries you up.
  b.water(35, 50, 22);
  b.updraft(36, 49, 6, 21);
  b.plank(40, 42, 12);
  b.float('lotus', 43, 4, { id: 1 });
  b.jasmineRow(37, 48, 9);
  b.sign(33, 12, 'Glide into the mist to rise', 'Glide into the mist to rise');
  b.ground(51, 60, 14, TILE.ROCK);
  b.float('crow', 56, 9, { range: 3 });
  b.put('lamp', 58, 13);
  // A climb up through the trees.
  b.ground(61, 71, 21);
  b.water(61, 61, 22);
  b.plank(63, 66, 18).plank(68, 71, 15).plank(63, 66, 12).plank(68, 71, 9);
  b.jasmineRow(63, 66, 17).jasmineRow(68, 71, 8);
  b.ground(72, 90, 6, TILE.ROCK);
  b.put('monkey', 80, 5).put('pot', 84, 5).put('pot', 86, 5, { heart: true });
  b.put('hornbill', 76, 3);
  // Down to the forest floor.
  b.ground(91, 120, 21);
  b.jasmineArc(91, 97, 14, 2);
  b.put('crab', 100, 20);
  b.thorns(96, 98, 20);
  // A shaft to wall-jump up for a lotus.
  b.rock(104, 8, 104, 20).rock(108, 10, 108, 20);
  b.float('lotus', 106, 7, { id: 2 });
  b.jasmineRow(105, 107, 12);
  b.put('lamp', 112, 20);
  b.put('crab', 116, 20);
  // A deep pool with rising mist.
  b.water(121, 128, 22);
  b.updraft(121, 128, 5, 21);
  b.float('lotus', 125, 4, { id: 3 });
  b.jasmineRow(121, 128, 10);
  b.ground(129, 135, 12, TILE.ROCK);
  b.ground(136, 140, 15).ground(141, 145, 18).ground(146, 155, 21);
  b.put('monkey', 143, 17);
  b.put('gate', 151, 20);
  return b.build({
    id: 3, name: 'Rainforest Falls', theme: 'rainforest', music: 'rainforest',
    intro: 'Deep in the Western Ghats, a great waterfall roars. Hold a banana leaf and let the mist lift you up!'
  });
}

// ================================================================ 4. Monsoon night

function monsoon() {
  const b = new Builder(150, 22);
  b.put('start', 3, 18);
  b.ground(0, 14, 19);
  b.jasmineRow(6, 11, 17);
  // Up the laterite cliff: a step, then grab the edge.
  b.rock(13, 16, 14, 21);
  b.ground(15, 26, 13, TILE.ROCK);
  b.put('crab', 20, 12);
  // A shaft to climb with wall jumps.
  b.rock(27, 2, 27, 9).rock(31, 5, 31, 21);
  b.rock(28, 13, 30, 21);
  b.jasmineRow(28, 30, 9).jasmineRow(28, 30, 6);
  b.ground(32, 44, 5, TILE.ROCK);
  b.float('crow', 38, 2, { range: 3 });
  b.put('lamp', 42, 4);
  // A broken bridge high up.
  b.rock(48, 5, 52, 6).rock(56, 5, 59, 6);
  b.jasmineArc(44, 48, 3, 1).jasmineArc(52, 56, 3, 1);
  b.float('lotus', 54, 1, { id: 1 });
  b.rock(60, 5, 62, 21);
  // Down into the flooded paddy field, crossed on logs.
  b.ground(63, 66, 12);
  b.ground(63, 66, 12);
  b.water(67, 86, 20);
  b.ground(63, 70, 19);
  b.log(70, 74, 18, 3, 0.45);
  b.log(76, 80, 18, 3, 0.5, Math.PI);
  b.ground(83, 84, 17, TILE.ROCK);
  b.jasmineRow(71, 82, 16);
  b.ground(87, 110, 19);
  b.thorns(92, 93, 18);
  b.put('monkey', 97, 18).put('crab', 103, 18);
  b.float('crow', 100, 13, { range: 4 });
  b.put('lamp', 106, 18);
  // A tall laterite wall with a lotus on a ledge.
  b.ground(111, 115, 13, TILE.ROCK);
  b.rock(113, 8, 113, 12);
  b.float('lotus', 114, 9, { id: 2 });
  b.plank(108, 110, 15);
  b.ground(116, 130, 19);
  b.thorns(119, 121, 18);
  b.plank(118, 122, 15).jasmineRow(118, 122, 14);
  b.put('crab', 126, 18);
  // A last climb, and a lotus high on the right.
  b.ground(131, 136, 16).ground(137, 149, 13);
  b.rock(142, 4, 142, 9).rock(146, 4, 146, 12);
  b.float('lotus', 144, 3, { id: 3 });
  b.put('gate', 140, 12);
  return b.build({
    id: 4, name: 'Monsoon Night', theme: 'monsoon', music: 'monsoon',
    intro: 'The monsoon has come! Rain pours on the red laterite cliffs. Jump from wall to wall to climb them.'
  });
}

// ================================================================ 5. The boat race (the screen keeps moving)

function boatRace() {
  const b = new Builder(206, 15);
  b.put('start', 4, 10);
  b.ground(0, 9, 11);
  b.water(10, 195, 12);
  // Floating bamboo barriers along the course, with gaps.
  const runs = [[10, 22], [25, 34], [38, 44], [52, 60], [64, 70], [79, 88], [92, 99], [108, 116], [120, 126], [135, 144], [148, 154], [163, 170], [174, 182], [186, 195]];
  for (const [x0, x1] of runs) b.plank(x0, x1, 11);
  // Posts to jump over, logs over the wider gaps.
  b.rock(30, 9, 30, 10).rock(56, 8, 56, 10).rock(84, 9, 84, 10).rock(112, 8, 112, 10).rock(140, 9, 140, 10).rock(178, 8, 178, 10);
  b.log(45, 48, 11, 3, 0.7);
  b.log(72, 75, 11, 3, 0.7, 1);
  b.log(100, 104, 11, 3, 0.7, 2);
  b.log(127, 131, 11, 3, 0.7);
  b.log(156, 159, 11, 3, 0.7, 2.5);
  // Jasmine all along, and crows overhead.
  b.jasmineRow(12, 20, 9).jasmineArc(34, 38, 8, 1).jasmineRow(52, 55, 9).jasmineRow(57, 59, 9).jasmineArc(88, 92, 8, 1);
  b.jasmineRow(108, 111, 9).jasmineRow(113, 115, 9).jasmineArc(144, 148, 8, 1).jasmineRow(163, 169, 9).jasmineArc(182, 186, 8, 1);
  b.float('crow', 66, 7, { range: 2 }).float('crow', 95, 6, { range: 2 }).float('crow', 122, 7, { range: 2 }).float('crow', 151, 6, { range: 2 }).float('crow', 176, 6, { range: 2 });
  b.plank(40, 42, 7).float('lotus', 41, 5, { id: 1 });
  b.plank(117, 119, 6).float('lotus', 118, 4, { id: 2 });
  b.plank(171, 173, 6).float('lotus', 172, 4, { id: 3 });
  b.put('lamp', 66, 10).put('lamp', 136, 10);
  b.ground(196, 205, 11);
  b.put('gate', 201, 10);
  return b.build({
    id: 5, name: 'The Boat Race', theme: 'boatrace', music: 'race', autoscroll: 165,
    intro: 'The snake boats are racing! Run along the floating barriers and keep ahead of them.'
  });
}

// ================================================================ 6. The Monkey Chief

function boss() {
  const b = new Builder(27, 15);
  b.rock(0, 0, 0, 14).rock(26, 0, 26, 14);
  b.ground(1, 25, 12);
  b.plank(3, 6, 8).plank(20, 23, 8);
  b.put('start', 3, 11);
  b.put('boss', 18, 11);
  b.put('gate', 13, 11, { hidden: true });
  return b.build({
    id: 6, name: 'The Monkey Chief', theme: 'boss', music: 'boss',
    intro: 'There he is, on the temple courtyard with all the garlands! Wait until he is dizzy, then bonk him.'
  });
}

/** Some things were placed with put() but fly: move them up to float in their cell. */
function fixFloats(b) {
  for (const e of b.entities) if (e.float) e.y -= T / 2;
}

export function buildLevels() {
  return [backwaters(), teaHills(), rainforest(), monsoon(), boatRace(), boss()];
}
