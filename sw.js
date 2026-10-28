// Keeps the game on the device so it opens without the internet after the first visit.
// It answers from the saved copy straight away and fetches any newer copy for next time.
const VERSION = '1.0.1';
const CACHE = 'inaara-' + VERSION;
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/art.js',
  'src/audio.js',
  'src/backgrounds.js',
  'src/entities.js',
  'src/game.js',
  'src/gfx.js',
  'src/hero.js',
  'src/input.js',
  'src/level.js',
  'src/levels.js',
  'src/main.js',
  'src/physics.js',
  'src/play.js',
  'src/player.js',
  'src/render.js',
  'src/save.js',
  'src/tiles.js',
  'assets/fonts/Fredoka.ttf',
  'assets/faces/full-front.png',
  'assets/faces/head-excited.png',
  'assets/faces/head-happy.png',
  'assets/faces/head-playful.png',
  'assets/faces/head-shy.png',
  'assets/faces/head-surprised.png',
  'assets/faces/portrait.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  'assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('inaara-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => saved);
    if (saved) {
      e.waitUntil(fresh);
      return saved;
    }
    return fresh;
  }));
});
