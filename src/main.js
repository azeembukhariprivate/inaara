// Starts the game: fits it to the screen, loads her pictures and the font, and runs the game every frame.
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Game } from './game.js';
import { loadFaces } from './hero.js';
import { VIEW } from './play.js';
import { label, FONT } from './gfx.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const audio = new Audio();
const params = new URLSearchParams(location.search);
const testing = params.has('test');

let scale = 1, ox = 0, oy = 0, dpr = 1, game = null, ready = false;

function resize() {
  const w = innerWidth, h = innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Keep the drawing size sensible on very big screens.
  while (w * h * dpr * dpr > 3000 * 1700 && dpr > 1) dpr -= 0.25;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  scale = Math.min(w / VIEW.w, h / VIEW.h);
  ox = (w - VIEW.w * scale) / 2;
  oy = (h - VIEW.h * scale) / 2;
  if (game) game.res = Math.max(1, Math.min(1.5, scale * dpr));
}
input.toGame = (x, y) => ({ x: (x - ox) / scale, y: (y - oy) / scale });
addEventListener('resize', resize);
resize();

// Sound can only start after a key press or a tap.
for (const ev of ['keydown', 'pointerdown', 'touchend']) addEventListener(ev, () => audio.unlock(), { passive: true });

// On phones, go full screen and sideways with the first tap (not when installed: it already is).
const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
const fs = {
  available: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
  active: () => !!(document.fullscreenElement || document.webkitFullscreenElement),
  toggle() {
    if (fs.active()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else fs.enter();
  },
  enter() {
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    } catch {
      // Not allowed here: carry on in the page.
    }
  }
};
let askedFullscreen = false;
canvas.addEventListener('touchend', () => {
  if (!askedFullscreen && !standalone && !testing && fs.available && !fs.active()) fs.enter();
  askedFullscreen = true;
});
// The settings button runs on the next frame, which browsers don't count as a tap: do it here instead.
canvas.addEventListener('click', e => {
  if (!game || game.screen !== 'settings') return;
  const p = input.toGame(e.clientX, e.clientY);
  const b = game.buttons().find(k => k.text && k.text.startsWith('Full screen') && p.x >= k.x && p.x <= k.x + k.w && p.y >= k.y && p.y <= k.y + k.h);
  if (b) {
    input.pointer = null;
    fs.toggle();
  }
});

addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  if (game) game.installPrompt = e;
});

// Pause when the page is hidden (another app, the screen locked).
document.addEventListener('visibilitychange', () => {
  if (!game) return;
  if (document.hidden) {
    if (game.screen === 'play' && !game.paused) game.pause();
    if (audio.ctx) audio.ctx.suspend();
  } else if (audio.ctx) audio.ctx.resume();
});

function drawLoading(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#120a06';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
  label(ctx, 'Inaara', VIEW.w / 2, VIEW.h / 2 - 20, 64, { align: 'center', fill: '#ffcf5e', weight: 700 });
  const dots = '.'.repeat(1 + Math.floor(t * 3) % 3);
  ctx.font = `500 24px ${FONT}`;
  label(ctx, 'Getting ready' + dots, VIEW.w / 2, VIEW.h / 2 + 50, 24, { align: 'center', fill: '#f4e2c4', weight: 500 });
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  if (!ready) drawLoading(now / 1000);
  else {
    input.poll();
    game.portraitBlock = input.touchMode && innerHeight > innerWidth * 1.1;
    game.frame(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VIEW.w, VIEW.h);
    ctx.clip();
    game.draw(ctx);
    ctx.restore();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

async function start() {
  await Promise.all([
    loadFaces('assets/faces/'),
    document.fonts ? document.fonts.load(`600 20px Fredoka`).catch(() => {}) : null
  ]);
  game = new Game(input, audio);
  game.fullscreen = fs;
  resize();
  ready = true;
  if (testing) {
    // For the automatic tests: a way to drive the game.
    window.inaara = {
      game,
      startLevel: i => game.startLevel(i, true),
      begin: () => game.go('play'),
      warp: () => game.play.warpToGate(),
      state: () => ({ screen: game.screen, play: game.play && game.play.state, level: game.play && game.play.level.id })
    };
  }
}
start();

if ('serviceWorker' in navigator && !testing && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
