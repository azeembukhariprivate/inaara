// Progress and settings, kept in the browser on this device.

const KEY = 'inaara-save-v1';

const fresh = () => ({ unlocked: 1, best: {}, settings: { music: 0.6, sound: 0.8 }, finished: false });

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') return { ...fresh(), ...s, settings: { ...fresh().settings, ...(s.settings || {}) } };
  } catch {
    // Storage switched off or damaged: start fresh.
  }
  return fresh();
}

export function store(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Private browsing: progress just isn't kept.
  }
}

/** Records a finished level: unlocks the next one and keeps the best jasmine count and lotuses found. */
export function recordLevel(save, id, jasmine, lotusIds, total) {
  const b = save.best[id] || { jasmine: 0, lotus: [] };
  b.jasmine = Math.max(b.jasmine, jasmine);
  b.lotus = [...new Set([...b.lotus, ...lotusIds])].sort();
  save.best[id] = b;
  save.unlocked = Math.max(save.unlocked, Math.min(total, id + 1));
  if (id === total) save.finished = true;
  store(save);
}
