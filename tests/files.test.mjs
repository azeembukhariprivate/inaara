// The offline copy (sw.js) lists every file the game needs, and its version matches package.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const listed = [...sw.matchAll(/^\s+'([^']+)',?$/gm)].map(m => m[1]);

test('every game file is kept for playing offline', () => {
  const need = [
    ...readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js')).map(f => 'src/' + f),
    ...readdirSync(new URL('assets/faces/', root)).map(f => 'assets/faces/' + f),
    ...readdirSync(new URL('assets/icons/', root)).map(f => 'assets/icons/' + f),
    'assets/fonts/Fredoka.ttf', 'index.html', 'manifest.webmanifest'
  ];
  for (const f of need) assert.ok(listed.includes(f), `${f} is in sw.js`);
  for (const f of listed) if (f !== './') assert.ok(existsSync(new URL(f, root)), `${f} exists`);
});

test('the offline copy is renewed with each version', () => {
  const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  assert.match(sw, new RegExp(`const VERSION = '${pkg.version.replace(/\./g, '\\.')}'`));
});

test('the credit line is in the game', () => {
  const game = readFileSync(new URL('src/game.js', root), 'utf8');
  assert.ok(game.includes("'Made by Azeem, with Claude and '"));
});
