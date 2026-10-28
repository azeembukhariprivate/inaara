// The whole game: the title, the map of Kerala, level cards, playing, pausing, settings and the ending.
import { buildLevels } from './levels.js';
import { Play, VIEW, GARLAND } from './play.js';
import { Renderer, ACCENT, TOUCH_BUTTONS } from './render.js';
import { Backdrop, vignette } from './backgrounds.js';
import { load, store, recordLevel } from './save.js';
import { vgrad, ellipse, roundRect, label, motes, sparkle, FONT, rng } from './gfx.js';
import * as art from './art.js';
import { FACES, faceBadge, drawInaara, poseFor } from './hero.js';

const W = VIEW.w, H = VIEW.h, STEP = 1 / 120;

/** Splits text into lines that fit a width. */
function wrapText(ctx, text, width, size, weight = 500) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > width && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Where each level sits on the map (a rough Kerala, north at the top).
const MAP_SPOTS = [[560, 560], [700, 470], [600, 370], [720, 280], [610, 190], [700, 110]];

export class Game {
  constructor(input, audio) {
    this.input = input;
    this.audio = audio;
    this.levels = buildLevels();
    this.totals = this.levels.map(l => ({
      jasmine: l.entities.filter(e => e.type === 'jasmine').length,
      lotus: l.entities.filter(e => e.type === 'lotus').length
    }));
    this.save = load();
    this.audio.setVolumes(this.save.settings.music, this.save.settings.sound);
    this.res = 1;
    this.t = 0;
    this.acc = 0;
    this.titleBack = null;
    this.mapPick = Math.min(this.save.unlocked, this.levels.length) - 1;
    this.installPrompt = null;
    this.fullscreen = null; // set by main.js: { available, active(), toggle() }
    this.go('title');
  }

  // ================================================================ moving between screens

  go(screen, opts = {}) {
    this.screen = screen;
    this.screenTime = 0;
    this.pick = opts.pick || 0;
    this.returnTo = opts.returnTo || this.returnTo;
    if (screen === 'title' || screen === 'map' || screen === 'settings' || screen === 'about') {
      if (screen !== 'settings' || !this.play) this.audio.play('title');
    }
    if (screen === 'ending') this.audio.play('ending');
  }

  startLevel(index, fresh = false) {
    if (fresh || !this.session) this.session = { lives: 3, garland: 0 };
    this.levelIndex = index;
    const level = this.levels[index];
    this.play = new Play(level, this.session);
    this.renderer = new Renderer(level, this.res);
    this.paused = false;
    this.recorded = false;
    this.audio.play(level.music);
    this.go('intro');
  }

  leaveLevel() {
    this.play = null;
    this.renderer = null;
    this.mapPick = this.levelIndex;
    this.go('map');
  }

  // ================================================================ each frame

  frame(dt) {
    const input = this.input;
    this.t += dt;
    this.screenTime += dt;
    input.touchButtons = this.screen === 'play' && !this.paused && input.touchMode ? TOUCH_BUTTONS : [];
    if (this.portraitBlock) {
      input.takePointer();
      return;
    }
    switch (this.screen) {
      case 'play': this.framePlay(dt); break;
      case 'intro':
        this.stepWorld(dt, false);
        if (this.screenTime > 0.4 && (input.pressed.jump || input.pressed.confirm || input.takePointer())) {
          this.audio.sfxPlay('confirm');
          this.go('play');
        }
        break;
      default:
        this.menu(dt);
    }
  }

  /** Runs the level in small fixed steps so it plays the same at any frame rate. */
  stepWorld(dt, controls) {
    this.acc = Math.min(this.acc + dt, 0.1);
    let first = true;
    while (this.acc >= STEP) {
      this.play.update(STEP, controls ? this.input.game(first) : {});
      first = false;
      this.acc -= STEP;
    }
    if (this.renderer.update(dt)) setTimeout(() => this.audio.sfxPlay('thunder'), 300);
    this.handleEvents();
  }

  handleEvents() {
    const p = this.play;
    for (const e of p.events) {
      this.audio.sfxPlay(e.name);
      if (e.name === 'life') this.renderer.float('Extra life!', e.x, e.y, '#ffe08a');
      if (e.name === 'lotus') this.renderer.float('Golden lotus!', e.x, e.y + 60, '#ffd23a');
      if (e.name === 'lamp') this.renderer.float('Lamp lit!', e.x, e.y, '#fff3c4');
      if (e.name === 'heart') this.renderer.float('+1 heart', e.x, e.y, '#ffb0a8');
    }
    p.events.length = 0;
  }

  framePlay(dt) {
    const input = this.input, p = this.play;
    if (this.paused) {
      this.menu(dt);
      return;
    }
    if (input.pressed.pause || input.pressed.back) {
      this.pause();
      return;
    }
    input.takePointer(); // taps during play are for the touch buttons only
    this.stepWorld(dt, true);
    if (p.state === 'won' && p.stateTime > 1.6) {
      if (!this.recorded) {
        recordLevel(this.save, p.level.id, p.jasmine, [...p.lotus], this.levels.length);
        this.recorded = true;
        this.audio.sfxPlay('win');
      }
      this.go('won');
    } else if (p.state === 'lost' && p.stateTime > 1.2) {
      this.go('lost');
    }
  }

  pause() {
    this.paused = true;
    this.pick = 0;
    this.audio.sfxPlay('select');
  }

  // ================================================================ menus

  /** The buttons on the current screen: [{ text, x, y, w, h, act, kind }]. */
  buttons() {
    const b = [], s = this.screen;
    const col = (items, y0, w = 360, gap = 62) => items.forEach(([text, act], i) => b.push({ text, act, x: W / 2 - w / 2, y: y0 + i * gap, w, h: 50 }));
    if (s === 'title') {
      const items = [['Play', () => this.go('map')], ['Settings', () => this.go('settings', { returnTo: 'title' })], ['About', () => this.go('about')]];
      if (this.installPrompt) items.push(['Install on this device', () => this.install()]);
      col(items, 330);
    } else if (s === 'map') {
      const n = this.levels.length;
      for (let i = 0; i < n; i++) {
        const [x, y] = MAP_SPOTS[i];
        b.push({ kind: 'spot', index: i, x: x - 34, y: y - 34, w: 68, h: 68, act: () => this.choose(i) });
      }
      b.push({ text: 'Play', x: 860, y: 560, w: 200, h: 54, act: () => this.choose(this.mapPick, true), main: true });
      b.push({ text: 'Back', x: 1080, y: 560, w: 150, h: 54, act: () => this.go('title') });
    } else if (s === 'settings') {
      b.push({ kind: 'slider', key: 'music', text: 'Music', x: W / 2 - 230, y: 250, w: 460, h: 56 });
      b.push({ kind: 'slider', key: 'sound', text: 'Sounds', x: W / 2 - 230, y: 330, w: 460, h: 56 });
      if (this.fullscreen && this.fullscreen.available) {
        b.push({ text: this.fullscreen.active() ? 'Full screen: on' : 'Full screen: off', x: W / 2 - 230, y: 410, w: 460, h: 50, act: () => this.fullscreen.toggle() });
      }
      b.push({ text: 'Back', x: W / 2 - 120, y: 500, w: 240, h: 50, act: () => this.back() });
    } else if (s === 'about' || (s === 'ending' && this.screenTime > 6.2)) {
      b.push({ text: s === 'ending' ? 'Back to the start' : 'Back', x: W / 2 - 150, y: 610, w: 300, h: 50, act: () => this.go('title') });
    } else if (s === 'won') {
      const last = this.levelIndex === this.levels.length - 1;
      if (last) col([['Carry on', () => this.go('ending')]], 520);
      else col([['Next level', () => this.startLevel(this.levelIndex + 1)], ['Map', () => this.leaveLevel()]], 500);
    } else if (s === 'lost') {
      col([['Try again', () => this.startLevel(this.levelIndex, true)], ['Map', () => this.leaveLevel()]], 440);
    } else if (s === 'play' && this.paused) {
      col([
        ['Carry on playing', () => { this.paused = false; }],
        ['Start the level again', () => this.startLevel(this.levelIndex, false)],
        ['Settings', () => this.go('settings', { returnTo: 'pause' })],
        ['Leave the level', () => this.leaveLevel()]
      ], 280);
    }
    return b;
  }

  back() {
    if (this.screen === 'settings' && this.returnTo === 'pause' && this.play) {
      this.screen = 'play';
      this.paused = true;
      this.pick = 2;
    } else if (this.screen === 'settings') this.go('title', { pick: 1 });
    else if (this.screen === 'map' || this.screen === 'about') this.go('title');
    else if (this.screen === 'play' && this.paused) this.paused = false;
  }

  choose(i, play = false) {
    if (i >= this.save.unlocked) {
      this.audio.sfxPlay('hurt');
      return;
    }
    if (i === this.mapPick || play) {
      this.audio.sfxPlay('confirm');
      this.startLevel(i, true);
    } else {
      this.mapPick = i;
      this.audio.sfxPlay('select');
    }
  }

  setVolume(key, v) {
    this.save.settings[key] = Math.round(Math.max(0, Math.min(1, v)) * 10) / 10;
    this.audio.setVolumes(this.save.settings.music, this.save.settings.sound);
    store(this.save);
    if (key === 'sound') this.audio.sfxPlay('jasmine');
  }

  menu(dt) {
    const input = this.input, list = this.buttons();
    if (this.screen === 'play') this.renderer.update(dt);
    const tap = input.takePointer();
    if (tap) {
      for (const b of list) {
        if (tap.x >= b.x && tap.x <= b.x + b.w && tap.y >= b.y && tap.y <= b.y + b.h) {
          if (b.kind === 'slider') this.setVolume(b.key, (tap.x - (b.x + 160)) / (b.w - 190));
          else {
            this.audio.sfxPlay('confirm');
            b.act();
          }
          return;
        }
      }
      return;
    }
    if (this.screen === 'map') return this.mapKeys();
    const n = list.length;
    if (!n || this.screenTime < 0.25) return;
    if (input.pressed.down) {
      this.pick = (this.pick + 1) % n;
      this.audio.sfxPlay('select');
    }
    if (input.pressed.up) {
      this.pick = (this.pick + n - 1) % n;
      this.audio.sfxPlay('select');
    }
    const cur = list[Math.min(this.pick, n - 1)];
    if (cur.kind === 'slider') {
      if (input.pressed.left) this.setVolume(cur.key, this.save.settings[cur.key] - 0.1);
      if (input.pressed.right) this.setVolume(cur.key, this.save.settings[cur.key] + 0.1);
    } else if (input.pressed.confirm || input.pressed.jump) {
      this.audio.sfxPlay('confirm');
      cur.act();
      return;
    }
    if (input.pressed.back || input.pressed.pause) this.back();
  }

  mapKeys() {
    const input = this.input, n = this.levels.length;
    if (this.screenTime < 0.25) return;
    if (input.pressed.right || input.pressed.up) {
      if (this.mapPick < Math.min(n, this.save.unlocked) - 1) {
        this.mapPick++;
        this.audio.sfxPlay('select');
      }
    }
    if (input.pressed.left || input.pressed.down) {
      if (this.mapPick > 0) {
        this.mapPick--;
        this.audio.sfxPlay('select');
      }
    }
    if (input.pressed.confirm || input.pressed.jump) this.choose(this.mapPick, true);
    if (input.pressed.back || input.pressed.pause) this.go('title');
  }

  async install() {
    const p = this.installPrompt;
    if (!p) return;
    this.installPrompt = null;
    p.prompt();
    try {
      await p.userChoice;
    } catch {
      // The person closed the box.
    }
  }

  // ================================================================ drawing

  draw(ctx) {
    switch (this.screen) {
      case 'title': this.drawTitle(ctx); break;
      case 'map': this.drawMap(ctx); break;
      case 'settings':
        if (this.returnTo === 'pause' && this.play) this.drawLevel(ctx, true);
        else this.drawTitleBack(ctx);
        this.drawSettings(ctx);
        break;
      case 'about': this.drawTitleBack(ctx); this.drawAbout(ctx); break;
      case 'ending': this.drawEnding(ctx); break;
      case 'intro': this.drawLevel(ctx, true); this.drawIntro(ctx); break;
      case 'play':
        this.drawLevel(ctx, this.paused);
        if (this.paused) this.drawPause(ctx);
        break;
      case 'won': this.drawLevel(ctx, true); this.drawWon(ctx); break;
      case 'lost': this.drawLevel(ctx, true); this.drawLost(ctx); break;
    }
    if (this.portraitBlock) this.drawTurn(ctx);
  }

  drawLevel(ctx, dim) {
    this.renderer.draw(ctx, this.play, this.input, { noHud: this.screen === 'intro' });
    if (dim) {
      ctx.fillStyle = 'rgba(10,8,20,0.45)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawButtons(ctx, list) {
    list.forEach((b, i) => {
      if (b.kind === 'spot') return;
      const on = i === this.pick && !this.input.touchMode || b.main;
      if (b.kind === 'slider') {
        roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
        ctx.fillStyle = 'rgba(30,14,6,0.6)';
        ctx.fill();
        if (i === this.pick && !this.input.touchMode) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffe08a';
          ctx.stroke();
        }
        label(ctx, b.text, b.x + 28, b.y + b.h / 2, 24, { fill: '#ffeccc' });
        const v = this.save.settings[b.key], bx = b.x + 160, bw = b.w - 190;
        roundRect(ctx, bx, b.y + b.h / 2 - 6, bw, 12, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
        roundRect(ctx, bx, b.y + b.h / 2 - 6, Math.max(12, bw * v), 12, 6);
        ctx.fillStyle = vgrad(ctx, b.y, b.y + b.h, [[0, '#ffcf5a'], [1, '#e0821c']]);
        ctx.fill();
        art.jasmine(ctx, bx + bw * v, b.y + b.h / 2, 0.9, 0);
        return;
      }
      roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
      ctx.fillStyle = on ? vgrad(ctx, b.y, b.y + b.h, [[0, '#ffcf5a'], [1, '#e0821c']]) : 'rgba(30,14,6,0.6)';
      ctx.fill();
      if (on) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff1c2';
        ctx.stroke();
      }
      label(ctx, b.text, b.x + b.w / 2, b.y + b.h / 2 + 1, 24, { align: 'center', fill: on ? '#4a1c04' : '#ffeccc' });
    });
  }

  card(ctx, x, y, w, h) {
    roundRect(ctx, x, y, w, h, 28);
    ctx.fillStyle = 'rgba(28,14,8,0.82)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,214,140,0.7)';
    ctx.stroke();
  }

  padlock(ctx, x, y) {
    ctx.strokeStyle = '#d8d0c0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(x, y - 4, 7, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#d8d0c0';
    roundRect(ctx, x - 11, y - 4, 22, 16, 3);
    ctx.fill();
  }

  title(ctx, text, y, size, x = W / 2) {
    ctx.save();
    ctx.shadowColor = 'rgba(60,20,0,0.55)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    const g = vgrad(ctx, y - size / 2, y + size / 2, [[0, '#fff6d6'], [0.5, '#ffcf5e'], [1, '#e88a2a']]);
    label(ctx, text, x, y, size, { align: 'center', weight: 700, fill: g, stroke: '#4a1c06', strokeW: size * 0.11 });
    ctx.restore();
  }

  drawTitleBack(ctx) {
    if (!this.titleBack) this.titleBack = new Backdrop('backwaters');
    this.titleBack.draw(ctx, this.t * 14, 0, 0, this.t);
    const t = this.t;
    art.houseboat(ctx, 260 + Math.sin(t * 0.3) * 20, 560, 1.0);
    art.fishingNet(ctx, 1240, 560, 1.0, 'rgba(40,24,20,0.9)');
    art.palm(ctx, 60, 720, 1.4, 0.55, { trunk: '#3a2a1e', ring: 'rgba(0,0,0,0.3)', frond: '#2a4a22', nut: '#4a3a1a' });
    // A grassy bank on the right for her to stand on.
    ctx.fillStyle = vgrad(ctx, 610, 720, [[0, '#5aa040'], [0.12, '#5a3a22'], [1, '#22140a']]);
    ctx.beginPath();
    ctx.moveTo(780, 720);
    ctx.quadraticCurveTo(800, 626, 860, 622);
    ctx.lineTo(1280, 616);
    ctx.lineTo(1280, 720);
    ctx.fill();
    ctx.fillStyle = 'rgba(184,224,122,0.8)';
    ctx.fillRect(840, 616, 440, 6);
    motes(ctx, 50, 5, 'rgba(255,240,190,0.8)', [0, 200, W, 400], [0.8, 2], 4);
  }

  drawTitle(ctx) {
    this.drawTitleBack(ctx);
    const full = FACES['full-front'];
    if (full) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ellipse(ctx, 1010, 622, 60, 9);
      ctx.fill();
      const fw = 150, fh = fw * full.height / full.width, bob = Math.sin(this.t * 2) * 2;
      ctx.drawImage(full, 1010 - fw / 2, 624 - fh * 0.985 + bob, fw, fh);
    }
    this.title(ctx, 'INAARA', 160, 132);
    art.jasmine(ctx, 400, 104, 1.1, this.t);
    art.jasmine(ctx, 882, 214, 0.9, this.t);
    label(ctx, 'A KERALA ADVENTURE', W / 2, 252, 30, { align: 'center', fill: '#fff6dc', stroke: 'rgba(74,28,6,0.85)', strokeW: 7 });
    this.drawButtons(ctx, this.buttons());
    vignette(ctx, 0.4);
    if (this.screenTime < 0.6) {
      ctx.fillStyle = `rgba(0,0,0,${1 - this.screenTime / 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawMap(ctx) {
    // Sea on the left, Kerala's green strip of land, the backwaters and the hills.
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#2a6a9a'], [1, '#14466e']]);
    ctx.fillRect(0, 0, W, H);
    const r = rng(3);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const x = r() * 520, y = r() * H, s = Math.sin(this.t + i) * 6;
      ctx.beginPath();
      ctx.moveTo(x + s, y);
      ctx.quadraticCurveTo(x + 12 + s, y - 5, x + 24 + s, y);
      ctx.stroke();
    }
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#6a9a4a'], [1, '#4a8a3a']]);
    ctx.beginPath();
    ctx.moveTo(520, H + 10);
    ctx.bezierCurveTo(500, 520, 520, 300, 560, 160);
    ctx.bezierCurveTo(580, 80, 600, 20, 620, -10);
    ctx.lineTo(W + 10, -10);
    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(220,200,150,0.85)';
    ctx.beginPath();
    ctx.moveTo(520, H + 10);
    ctx.bezierCurveTo(500, 520, 520, 300, 560, 160);
    ctx.bezierCurveTo(580, 80, 600, 20, 620, -10);
    ctx.lineTo(632, -10);
    ctx.bezierCurveTo(612, 20, 592, 80, 572, 160);
    ctx.bezierCurveTo(532, 300, 512, 520, 532, H + 10);
    ctx.fill();
    // Hills along the east.
    for (let i = 0; i < 9; i++) {
      const x = 880 + (i % 3) * 120 + r() * 40, y = 60 + i * 72;
      ctx.fillStyle = 'rgba(50,100,40,0.7)';
      ctx.beginPath();
      ctx.moveTo(x - 70, y + 40);
      ctx.quadraticCurveTo(x, y - 40, x + 70, y + 40);
      ctx.fill();
    }
    // Backwaters near the coast.
    ctx.strokeStyle = 'rgba(80,160,200,0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(560, 680);
    ctx.bezierCurveTo(600, 620, 540, 560, 600, 500);
    ctx.stroke();
    // A dotted path between the places.
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = 'rgba(255,240,200,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    MAP_SPOTS.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'Arabian Sea', 250, 380, 30, { align: 'center', fill: 'rgba(255,255,255,0.45)', weight: 500 });
    this.title(ctx, 'KERALA', 70, 56, 260);

    MAP_SPOTS.forEach(([x, y], i) => {
      const open = i < this.save.unlocked, best = this.save.best[i + 1], picked = i === this.mapPick;
      ctx.beginPath();
      ctx.arc(x, y, picked ? 32 : 26, 0, Math.PI * 2);
      ctx.fillStyle = open ? vgrad(ctx, y - 30, y + 30, [[0, '#ffcf5a'], [1, '#e0821c']]) : 'rgba(60,50,40,0.85)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = picked ? '#fff' : 'rgba(255,240,200,0.8)';
      ctx.stroke();
      if (open) label(ctx, String(i + 1), x, y + 2, 28, { align: 'center', fill: '#4a1c04', weight: 700 });
      else this.padlock(ctx, x, y);
      if (best && best.lotus.length) {
        for (let k = 0; k < best.lotus.length; k++) art.goldenLotus(ctx, x - 20 + k * 20, y + 44, 0.42, 0);
      }
    });
    const [px, py] = MAP_SPOTS[this.mapPick];
    faceBadge(ctx, px + 46, py - 40 + Math.sin(this.t * 4) * 5, 26, 'happy');

    // The chosen place.
    const lv = this.levels[this.mapPick], tot = this.totals[this.mapPick], best = this.save.best[lv.id];
    this.card(ctx, 830, 160, 420, 380);
    label(ctx, 'Level ' + lv.id, 1040, 205, 22, { align: 'center', fill: '#ffd88a' });
    label(ctx, lv.name, 1040, 245, 34, { align: 'center', fill: '#fff6dc', weight: 700 });
    const lines = wrapText(ctx, lv.intro, 360, 19);
    lines.slice(0, 5).forEach((l, i) => label(ctx, l, 1040, 300 + i * 28, 19, { align: 'center', fill: '#f4e2c4', weight: 500 }));
    if (tot.jasmine) {
      art.jasmine(ctx, 920, 470, 0.9, this.t);
      label(ctx, `${best ? best.jasmine : 0} / ${tot.jasmine}`, 945, 471, 22, { fill: '#fff6dc' });
    }
    if (tot.lotus) {
      for (let k = 0; k < tot.lotus; k++) {
        ctx.globalAlpha = best && best.lotus.length > k ? 1 : 0.3;
        art.goldenLotus(ctx, 1080 + k * 38, 474, 0.6, 0);
      }
      ctx.globalAlpha = 1;
    }
    this.drawButtons(ctx, this.buttons());
    if (this.save.finished) label(ctx, 'You finished the adventure!', 1040, 640, 22, { align: 'center', fill: '#ffe08a', stroke: 'rgba(40,20,0,0.7)', strokeW: 5 });
  }

  drawIntro(ctx) {
    const lv = this.play.level;
    this.card(ctx, 250, 150, 780, 400);
    faceBadge(ctx, W / 2, 210, 44, 'excited');
    label(ctx, 'Level ' + lv.id, W / 2, 290, 24, { align: 'center', fill: '#ffd88a' });
    label(ctx, lv.name, W / 2, 336, 48, { align: 'center', fill: '#fff6dc', weight: 700 });
    wrapText(ctx, lv.intro, 680, 23).forEach((l, i) => label(ctx, l, W / 2, 400 + i * 32, 23, { align: 'center', fill: '#f4e2c4', weight: 500 }));
    const a = 0.6 + 0.4 * Math.sin(this.t * 4);
    ctx.globalAlpha = a;
    label(ctx, this.input.touchMode ? 'Tap to start' : 'Press jump to start', W / 2, 515, 24, { align: 'center', fill: '#ffe08a', weight: 700 });
    ctx.globalAlpha = 1;
  }

  drawPause(ctx) {
    this.card(ctx, 380, 160, 520, 400);
    label(ctx, 'Paused', W / 2, 220, 40, { align: 'center', fill: '#fff6dc', weight: 700 });
    this.drawButtons(ctx, this.buttons());
  }

  drawWon(ctx) {
    const p = this.play, tot = this.totals[this.levelIndex];
    const last = this.levelIndex === this.levels.length - 1;
    this.card(ctx, 330, 130, 620, last ? 470 : 500);
    this.title(ctx, last ? 'You did it!' : 'Well done!', 200, 62);
    if (last) {
      wrapText(ctx, 'The Monkey Chief gives back the festival garland. The temple festival can begin!', 520, 24).forEach((l, i) => label(ctx, l, W / 2, 290 + i * 34, 24, { align: 'center', fill: '#f4e2c4', weight: 500 }));
    } else {
      art.jasmine(ctx, 520, 300, 1.4, this.t);
      label(ctx, `${p.jasmine} of ${tot.jasmine} jasmine`, 560, 302, 30, { fill: '#fff6dc' });
      for (let k = 0; k < tot.lotus; k++) {
        const got = [...p.lotus].length > k;
        ctx.globalAlpha = got ? 1 : 0.3;
        art.goldenLotus(ctx, 560 + k * 64, 392, 1, this.t);
      }
      ctx.globalAlpha = 1;
      label(ctx, `${p.lotus.size} of ${tot.lotus} golden lotuses`, W / 2, 450, 22, { align: 'center', fill: '#ffd88a' });
    }
    const pose = poseFor('cheer', this.t, 0, 0);
    drawInaara(ctx, 420, 600, 0.9, pose, 'playful', 1, { noShadow: true });
    this.drawButtons(ctx, this.buttons());
  }

  drawLost(ctx) {
    this.card(ctx, 380, 170, 520, 400);
    this.title(ctx, 'Oh no!', 240, 60);
    label(ctx, 'Inaara has run out of tries.', W / 2, 320, 26, { align: 'center', fill: '#f4e2c4', weight: 500 });
    label(ctx, `Every ${GARLAND} jasmine makes a garland: one more try.`, W / 2, 365, 19, { align: 'center', fill: '#ffd88a', weight: 500 });
    this.drawButtons(ctx, this.buttons());
  }

  drawSettings(ctx) {
    this.card(ctx, 360, 150, 560, 430);
    label(ctx, 'Settings', W / 2, 200, 40, { align: 'center', fill: '#fff6dc', weight: 700 });
    this.drawButtons(ctx, this.buttons());
  }

  credits(ctx, y) {
    const lines = [
      ['INAARA', 56, '#ffcf5e', 700],
      ['A Kerala adventure', 26, '#fff6dc', 500],
      ['', 20],
      ['Every picture and every note of music is made by the game itself as you play.', 20, '#f4e2c4', 500],
      ['Font: Fredoka (SIL Open Font License)', 20, '#f4e2c4', 500],
      ['Free and open source (MIT licence)', 20, '#f4e2c4', 500]
    ];
    lines.forEach(([text, size, fill, weight], i) => {
      if (text) label(ctx, text, W / 2, y + i * 40, size, { align: 'center', fill, weight, stroke: 'rgba(30,10,0,0.6)', strokeW: size * 0.16 });
    });
    // The credit line, with the heart in the accent colour.
    const cy = y + lines.length * 40 + 20, text = 'Made by Azeem, with Claude and ';
    ctx.font = `600 26px ${FONT}`;
    const tw = ctx.measureText(text).width, hw = ctx.measureText('♥').width, x0 = W / 2 - (tw + hw) / 2;
    label(ctx, text, x0, cy, 26, { fill: '#fff6dc', stroke: 'rgba(30,10,0,0.6)', strokeW: 4 });
    label(ctx, '♥', x0 + tw, cy, 26, { fill: ACCENT, stroke: 'rgba(30,10,0,0.6)', strokeW: 4 });
  }

  drawAbout(ctx) {
    this.card(ctx, 200, 70, 880, 610);
    const portrait = FACES.portrait;
    if (portrait) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, 170, 74, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe9c4';
      ctx.fill();
      ctx.clip();
      const pw = 180;
      ctx.drawImage(portrait, W / 2 - pw / 2, 96, pw, pw * portrait.height / portrait.width);
      ctx.restore();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ffe08a';
      ctx.beginPath();
      ctx.arc(W / 2, 170, 74, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.credits(ctx, 290);
    this.drawButtons(ctx, this.buttons());
  }

  drawEnding(ctx) {
    // The temple festival at night: lamps, petals and Inaara cheering.
    if (!this.endBack) this.endBack = new Backdrop('boss');
    this.endBack.draw(ctx, this.t * 10, 0, 0, this.t);
    this.endBack.drawFront(ctx, this.t);
    ctx.fillStyle = 'rgba(20,8,30,0.35)';
    ctx.fillRect(0, 0, W, H);
    const pose = poseFor('cheer', this.t, 0, 0);
    drawInaara(ctx, 200, 690, 1.2, pose, 'playful', 1, {});
    for (let i = 0; i < 6; i++) sparkle(ctx, 200 + Math.cos(this.t * 2 + i) * 90, 470 + Math.sin(this.t * 3 + i) * 40, 8);
    const y = Math.max(90, 760 - this.screenTime * 110);
    this.credits(ctx, y);
    if (y === 90) this.drawButtons(ctx, this.buttons());
    vignette(ctx, 0.4);
  }

  drawTurn(ctx) {
    ctx.fillStyle = 'rgba(20,10,4,0.95)';
    ctx.fillRect(0, 0, W, H);
    faceBadge(ctx, W / 2, 260, 80, 'playful');
    label(ctx, 'Turn your phone sideways to play', W / 2, 420, 44, { align: 'center', fill: '#fff6dc', weight: 700 });
    label(ctx, '⟳', W / 2, 520, 80, { align: 'center', fill: '#ffcf5e' });
  }
}
