// Music and sounds, all made in code with the browser's Web Audio: a chenda-like drum, a flute, a drone like a
// tanpura, and temple bells. Tunes use Carnatic-style scales and are composed from a few repeating phrases.
import { rng } from './gfx.js';

const SCALES = {
  mohanam: [0, 2, 4, 7, 9], // bright and happy
  hindolam: [0, 3, 5, 8, 10], // night and rain
  madhyamavathi: [0, 2, 5, 7, 10], // the chief
  shuddha: [0, 2, 5, 7, 9]
};

const TRACKS = {
  title: { bpm: 84, scale: 'mohanam', root: 62, seed: 3, drums: 'soft', drone: true },
  backwaters: { bpm: 104, scale: 'mohanam', root: 64, seed: 11, drums: 'light', drone: true },
  tea: { bpm: 96, scale: 'shuddha', root: 62, seed: 21, drums: 'light', drone: true },
  rainforest: { bpm: 92, scale: 'hindolam', root: 60, seed: 31, drums: 'soft', drone: true },
  monsoon: { bpm: 118, scale: 'hindolam', root: 57, seed: 41, drums: 'heavy', drone: true },
  race: { bpm: 140, scale: 'mohanam', root: 64, seed: 51, drums: 'race', drone: false },
  boss: { bpm: 132, scale: 'madhyamavathi', root: 59, seed: 61, drums: 'heavy', drone: true },
  ending: { bpm: 76, scale: 'mohanam', root: 62, seed: 71, drums: 'soft', drone: true }
};

const hz = m => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.6;
    this.soundVol = 0.8;
    this.track = null;
    this.nextTime = 0;
    this.step = 0;
    this.timer = null;
    this.droneNodes = [];
  }

  /** Browsers only allow sound after the player has pressed something. */
  unlock() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.ctx = new C();
      this.music = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      this.music.connect(comp);
      this.sfx.connect(comp);
      comp.connect(this.ctx.destination);
      this.noise = this.makeNoise();
      this.setVolumes(this.musicVol, this.soundVol);
      if (this.pending) this.play(this.pending);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolumes(music, sound) {
    this.musicVol = music;
    this.soundVol = sound;
    if (this.ctx) {
      this.music.gain.value = music * 0.5;
      this.sfx.gain.value = sound * 0.7;
    }
  }

  makeNoise() {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // ================================================================ instruments

  env(node, t, a, peak, d) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  tone(out, type, f, t, a, d, peak, slideTo) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + a + d);
    this.env(g, t, a, peak, d);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + a + d + 0.05);
    return o;
  }

  noiseHit(out, t, d, peak, filter, f, q = 1) {
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), bq = this.ctx.createBiquadFilter();
    s.buffer = this.noise;
    bq.type = filter;
    bq.frequency.value = f;
    bq.Q.value = q;
    this.env(g, t, 0.002, peak, d);
    s.connect(bq).connect(g).connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + d + 0.05);
  }

  /** The chenda: a sharp stick on a tight drum. */
  chenda(t, accent) {
    this.noiseHit(this.music, t, accent ? 0.12 : 0.06, accent ? 0.5 : 0.25, 'bandpass', 900, 1.4);
    this.tone(this.music, 'sine', accent ? 210 : 260, t, 0.002, accent ? 0.12 : 0.06, accent ? 0.35 : 0.15, 120);
  }

  /** A low drum (like a maddalam). */
  bass(t) {
    this.tone(this.music, 'sine', 110, t, 0.004, 0.25, 0.6, 50);
  }

  /** Small cymbals (ilathalam). */
  cymbal(t) {
    this.noiseHit(this.music, t, 0.08, 0.12, 'highpass', 7000, 0.7);
  }

  /** A flute with a little vibrato and breath. */
  flute(m, t, len) {
    const f = hz(m), o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    lfo.frequency.value = 5.2;
    lg.gain.value = f * 0.012;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.04);
    g.gain.setValueAtTime(0.2, t + Math.max(0.05, len - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.12);
    o.connect(g).connect(this.music);
    o.start(t);
    lfo.start(t);
    o.stop(t + len + 0.2);
    lfo.stop(t + len + 0.2);
    this.noiseHit(this.music, t, 0.08, 0.025, 'bandpass', f * 2, 2);
  }

  /** A plucked string, for the lower line. */
  pluck(m, t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.value = hz(m);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.4);
    this.env(g, t, 0.003, 0.12, 0.45);
    o.connect(f).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.5);
  }

  /** A temple bell: a few out-of-tune overtones that ring on. */
  bell(t, base = 520, out = this.sfx, peak = 0.25) {
    for (const [k, p] of [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]]) this.tone(out, 'sine', base * k, t, 0.002, 1.6 / Math.sqrt(k), peak * p);
  }

  startDrone(root) {
    this.stopDrone();
    for (const [m, v] of [[root - 24, 0.05], [root - 17, 0.035], [root - 12, 0.03]]) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = hz(m);
      f.type = 'lowpass';
      f.frequency.value = 900;
      lfo.frequency.value = 0.3 + Math.random() * 0.2;
      lg.gain.value = v * 0.4;
      lfo.connect(lg).connect(g.gain);
      g.gain.value = v;
      o.connect(f).connect(g).connect(this.music);
      o.start();
      lfo.start();
      this.droneNodes.push(o, lfo, g);
    }
  }

  stopDrone() {
    for (const n of this.droneNodes) {
      try {
        if (n.stop) n.stop();
        else n.disconnect();
      } catch {
        // already stopped
      }
    }
    this.droneNodes = [];
  }

  // ================================================================ tunes

  compose(tr) {
    const r = rng(tr.seed), scale = SCALES[tr.scale];
    const note = deg => tr.root + scale[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5);
    const rhythms = [[2, 2, 2, 2], [3, 1, 2, 2], [2, 1, 1, 4], [4, 2, 2], [1, 1, 2, 2, 2], [2, 2, 4]];
    const phrase = () => {
      const notes = [];
      let deg = 2 + Math.floor(r() * 4);
      for (let bar = 0; bar < 2; bar++) {
        const rh = rhythms[Math.floor(r() * rhythms.length)];
        for (const len of rh) {
          deg += Math.floor(r() * 5) - 2;
          deg = Math.max(0, Math.min(9, deg));
          notes.push(r() < 0.12 ? { rest: true, len } : { m: note(deg), len });
        }
      }
      notes[notes.length - 1] = { m: note(r() < 0.5 ? 0 : 5), len: notes[notes.length - 1].len };
      return notes;
    };
    const a = phrase(), b = phrase(), c = phrase();
    const melody = [...a, ...b, ...a, ...c]; // in eighth notes: 8 bars
    const bassLine = [];
    for (let i = 0; i < 8; i++) bassLine.push(note([0, 0, 3, 3, 0, 0, 4, 0][i]) - 24);
    return { melody, bassLine };
  }

  play(name) {
    this.pending = name;
    if (!this.ctx || this.track === name) return;
    this.stop();
    const tr = TRACKS[name];
    if (!tr) return;
    this.track = name;
    this.tune = { ...tr, ...this.compose(tr) };
    this.step = 0;
    this.noteIndex = 0;
    this.noteLeft = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    if (tr.drone) this.startDrone(tr.root);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
    this.stopDrone();
  }

  /** Plans the next notes a little ahead (sixteenth-note steps). */
  schedule() {
    const tr = this.tune, sixteenth = 60 / tr.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const t = this.nextTime, s = this.step % 128, beat = s % 16;
      // Drums.
      const style = tr.drums;
      if (style === 'race') {
        if (s % 4 === 0) this.bass(t);
        if (s % 2 === 0) this.chenda(t, s % 8 === 4);
        else if (Math.random() < 0.5) this.chenda(t, false);
        if (s % 8 === 4) this.cymbal(t);
      } else if (style === 'heavy') {
        if (beat === 0 || beat === 6 || beat === 10) this.bass(t);
        if (s % 2 === 0 || Math.random() < 0.25) this.chenda(t, beat % 4 === 0);
        if (beat % 4 === 2) this.cymbal(t);
      } else if (style === 'light') {
        if (beat === 0 || beat === 8) this.bass(t);
        if (beat % 4 === 2 || beat === 7 || beat === 13) this.chenda(t, beat === 12);
        if (beat % 8 === 4) this.cymbal(t);
      } else {
        if (beat === 0) this.bass(t);
        if (beat === 10 || beat === 14) this.chenda(t, false);
      }
      // Lower line on the beat.
      if (s % 8 === 0 && style !== 'soft') this.pluck(tr.bassLine[Math.floor(s / 16) % 8], t);
      // The flute melody (notes are in eighths).
      if (s % 2 === 0) {
        if (this.noteLeft <= 0) {
          const n = tr.melody[this.noteIndex % tr.melody.length];
          this.noteIndex++;
          this.noteLeft = n.len;
          if (!n.rest) this.flute(n.m, t, n.len * sixteenth * 2 * 0.92);
        }
        this.noteLeft--;
      }
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  // ================================================================ sounds

  sfxPlay(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.sfx;
    switch (name) {
      case 'jump': this.tone(o, 'square', 330, t, 0.005, 0.12, 0.12, 660); break;
      case 'walljump': this.tone(o, 'square', 400, t, 0.005, 0.12, 0.12, 800); break;
      case 'land': this.noiseHit(o, t, 0.06, 0.15, 'lowpass', 500); break;
      case 'dash':
        this.noiseHit(o, t, 0.25, 0.25, 'bandpass', 1800, 0.8);
        this.tone(o, 'triangle', 500, t, 0.01, 0.25, 0.12, 1200);
        break;
      case 'jasmine': this.tone(o, 'sine', 1568 + Math.random() * 40, t, 0.002, 0.25, 0.12); this.tone(o, 'sine', 2350, t + 0.04, 0.002, 0.2, 0.06); break;
      case 'lotus': [0, 4, 7, 12, 16].forEach((k, i) => this.tone(o, 'triangle', hz(76 + k), t + i * 0.07, 0.005, 0.35, 0.16)); break;
      case 'stomp': case 'bonk': this.tone(o, 'square', 220, t, 0.004, 0.14, 0.18, 110); this.noiseHit(o, t, 0.08, 0.15, 'lowpass', 900); break;
      case 'pot': this.noiseHit(o, t, 0.18, 0.35, 'bandpass', 1400, 1.5); this.tone(o, 'triangle', 300, t, 0.003, 0.1, 0.15, 150); break;
      case 'heart': [0, 7, 12].forEach((k, i) => this.tone(o, 'sine', hz(72 + k), t + i * 0.08, 0.005, 0.25, 0.16)); break;
      case 'hurt': this.tone(o, 'sawtooth', 500, t, 0.005, 0.3, 0.14, 160); break;
      case 'splash': this.noiseHit(o, t, 0.4, 0.35, 'lowpass', 1200); break;
      case 'fall': this.tone(o, 'triangle', 600, t, 0.005, 0.5, 0.15, 120); break;
      case 'lamp': this.bell(t, 660, o, 0.22); break;
      case 'grab': this.tone(o, 'triangle', 260, t, 0.003, 0.06, 0.12); break;
      case 'climb': this.tone(o, 'triangle', 300, t, 0.003, 0.12, 0.12, 500); break;
      case 'life': [0, 4, 7, 12, 7, 12].forEach((k, i) => this.tone(o, 'square', hz(72 + k), t + i * 0.09, 0.005, 0.18, 0.1)); break;
      case 'lifeLost': [7, 4, 0].forEach((k, i) => this.tone(o, 'triangle', hz(67 + k), t + i * 0.18, 0.005, 0.3, 0.15)); break;
      case 'win':
        this.bell(t, 520, o, 0.25);
        [0, 4, 7, 12, 16, 19, 24].forEach((k, i) => this.tone(o, 'triangle', hz(64 + k), t + i * 0.08, 0.005, 0.4, 0.13));
        break;
      case 'throw': this.noiseHit(o, t, 0.15, 0.2, 'bandpass', 700, 1); break;
      case 'thud': this.tone(o, 'sine', 90, t, 0.005, 0.35, 0.4, 40); break;
      case 'dizzy': [0, 3, 0, 3].forEach((k, i) => this.tone(o, 'sine', hz(84 + k), t + i * 0.1, 0.005, 0.12, 0.08)); break;
      case 'bossHit': this.tone(o, 'square', 180, t, 0.005, 0.3, 0.2, 90); this.bell(t + 0.05, 420, o, 0.15); break;
      case 'defeated': this.bell(t, 440, o, 0.3); this.bell(t + 0.3, 660, o, 0.25); break;
      case 'bat': this.tone(o, 'square', 600, t, 0.003, 0.08, 0.15, 900); break;
      case 'select': this.tone(o, 'triangle', 880, t, 0.003, 0.08, 0.1); break;
      case 'confirm': this.tone(o, 'triangle', 660, t, 0.003, 0.1, 0.12); this.tone(o, 'triangle', 990, t + 0.06, 0.003, 0.12, 0.12); break;
      case 'thunder': this.noiseHit(o, t, 1.6, 0.4, 'lowpass', 180); break;
      default: break;
    }
  }
}
