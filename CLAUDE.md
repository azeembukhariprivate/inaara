# INAARA

A free platform game for the browser, set in Kerala: Inaara runs, jumps, spins and glides through five levels and a
boss. Her face comes from her real picture sheet, shared by her parent for this public game.
Part of the KUDU family of free, open-source (MIT) apps by Azeem Bukhari.

## Working with Azeem (the owner)

- **Branches:** work on `main` and push to `main`. Ask before creating any other branch.
- **New features:** first say what you understood, and ask your doubts and suggestions, one question at a time.
  Only start building when Azeem says "build".
- **Look:** keep the game's current look. No redesigns unless asked.
- **Credit:** the About screen and the ending say "Made by Azeem, with Claude and ♥" (the heart in the accent colour,
  marigold `ACCENT`). Keep it.
- **Commits:** author `Azeem Bukhari <12558389+azeembukhariprivate@users.noreply.github.com>`. Clear messages that say
  what changed and why. Don't put AI model names or versions in commits, code or docs.
- **Words:** the game's text, README and release notes use plain everyday words, not technical jargon.
- **Before pushing:** run the tests locally, and re-read the diff. After pushing, watch the GitHub Actions
  build until it's green; fix failures, never skip or disable a test to get green.

## How the game is built

- Plain JavaScript modules in `src/`, no build step, drawn on one canvas (1280×720, scaled to fit). Every picture,
  tune and sound is made in code (`art.js`, `hero.js`, `backgrounds.js`, `tiles.js`, `audio.js`). The only files
  are Inaara's faces (`assets/faces`, cut by `tools/cut_faces.py`), the icons and the Fredoka font.
- Inaara's faces: use only the pictures from her sheet; never draw, change or make up her face.
- Game rules: `physics.js` (the `MOVE` numbers), `player.js` (her moves), `play.js` (a level being played),
  `entities.js` (jasmine, lotuses, pots, lamps, creatures, the Monkey Chief). Creatures are never hurt, only bonked.
- Levels are built in `levels.js`. `tests/reach.mjs` plays her real moves from every place she can stand: every level
  must be finishable and every lotus and jasmine reachable. It plays as a careful player, not a perfect one (`CAREFUL`:
  lower jumps, a narrow ledge grab, a pause before wall jumps), so nothing needs pixel-perfect timing; keep it that way.
  Change a level, run the tests.
- Screens and menus: `game.js`; start-up, screen fitting and the test hook (`?test`): `main.js`.
- Plays offline: `sw.js` lists every file, and its `VERSION` must match `package.json` (a test checks both).
- Progress and settings are kept in the browser (`save.js`, key `inaara-save-v1`).

```
npm test               # rules, physics, every level finishable
npm run test:browser   # plays it in Chromium; screenshots in screenshots/
npm run serve          # http://localhost:8080/
```

## Releasing

1. Raise `version` in `package.json` and `VERSION` in `sw.js` (so phones fetch the new copy).
2. Commit and push to `main`.
3. GitHub Actions (`.github/workflows/build.yml`) tests the game, plays it in a browser and puts it online at
   https://azeembukhariprivate.github.io/inaara/ (GitHub Pages).
