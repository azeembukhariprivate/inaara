// Playing a level: Inaara, the camera, collecting, checkpoints, getting hurt and coming back, and reaching the gate.
import { T } from './level.js';
import { Player } from './player.js';
import { box, overlap, touchingWall } from './physics.js';
import { spawn, updateLogs, updateCoconuts, updateParticles, burst } from './entities.js';

export const VIEW = { w: 1280, h: 720 };
export const GARLAND = 100; // jasmine for an extra life

export class Play {
  /** session: { lives, garland } shared between levels. */
  constructor(level, session) {
    this.level = level;
    this.session = session;
    this.world = spawn(level);
    const s = this.world.start;
    this.player = new Player(s.x, s.y);
    this.checkpoint = { x: s.x, y: s.y };
    this.hearts = 3;
    this.jasmine = 0;
    this.lotus = new Set();
    this.time = 0;
    this.state = 'play'; // play, won, lost (all lives gone), fell (coming back)
    this.stateTime = 0;
    this.events = [];
    this.shake = 0;
    this.camera = { x: 0, y: 0 };
    this.scroll = level.autoscroll ? 0 : null;
    this.snapCamera();
  }

  snapCamera() {
    const p = this.player;
    if (this.scroll !== null) this.scroll = Math.max(0, p.x - 260);
    this.camera.x = this.targetX();
    this.camera.y = this.targetY();
  }

  targetX() {
    if (this.scroll !== null) return Math.min(this.scroll, this.level.pxWidth - VIEW.w);
    const x = this.player.x - VIEW.w * 0.42 + this.player.facing * 60;
    return Math.max(0, Math.min(this.level.pxWidth - VIEW.w, x));
  }

  targetY() {
    const x = this.player.y - VIEW.h * 0.62;
    return Math.max(0, Math.min(this.level.pxHeight - VIEW.h, x));
  }

  emit(name, x, y) {
    this.events.push({ name, x, y });
  }

  update(dt, input) {
    this.time += dt;
    this.stateTime += dt;
    this.shake = Math.max(0, this.shake - dt);
    const { level, world, player } = this;
    updateLogs(world.logs, dt);
    updateParticles(world, dt);

    if (this.state === 'won' || this.state === 'lost') {
      player.update(dt, {}, level, { platforms: world.logs });
      this.followCamera(dt);
      return;
    }

    const idle = { left: false, right: false, up: false, down: false, jump: false, jumpPressed: false, spinPressed: false };
    player.update(dt, this.state === 'play' ? input : idle, level, { platforms: world.logs, updrafts: world.updrafts });
    for (const e of player.events) this.emit(e, player.x, player.y);
    if (player.events.includes('land') || player.events.includes('jump')) burst(world, player.x, player.y, 5, 'dust', { speed: 90, up: true });
    if (player.events.includes('dash')) burst(world, player.x, player.y - 50, 10, 'sparkle', { speed: 160 });
    player.events.length = 0;

    // The screen keeps moving in the boat race.
    if (this.scroll !== null) {
      this.scroll = Math.min(this.scroll + level.autoscroll * dt, level.pxWidth - VIEW.w);
      const left = this.scroll + 24;
      if (player.x < left) {
        player.x = left;
        if (touchingWall(player, level, 1)) this.fall('squeezed');
      }
    }

    // Falling into water or a pit.
    const feet = Math.floor((player.y - 6) / T), tx = Math.floor(player.x / T);
    if (player.y > level.pxHeight + 40 || level.isWater(tx, feet)) {
      if (level.isWater(tx, feet)) burst(world, player.x, player.y - 10, 14, 'splash', { speed: 260, up: true });
      this.fall('water');
      return;
    }

    const pb = box(player);
    // Thorns.
    const tl = Math.floor(pb.l / T), tr = Math.floor((pb.r - 1) / T), tt = Math.floor(pb.t / T), tb = Math.floor((pb.b - 1) / T);
    for (let y = tt; y <= tb; y++) for (let x = tl; x <= tr; x++) {
      if (level.isThorn(x, y) && pb.b > y * T + 14) this.hurt(x * T + T / 2, true);
    }

    // Jasmine, lotuses, pots, lamps.
    const grab = { l: pb.l - 6, r: pb.r + 6, t: pb.t - 6, b: pb.b + 2 };
    for (const j of world.jasmine) {
      if (!j.taken && overlap(grab, { l: j.x - 14, r: j.x + 14, t: j.y - 14, b: j.y + 14 })) {
        j.taken = true;
        this.addJasmine(1, j.x, j.y);
      }
    }
    for (const l of world.lotus) {
      if (!l.taken && overlap(grab, { l: l.x - 22, r: l.x + 22, t: l.y - 26, b: l.y + 16 })) {
        l.taken = true;
        this.lotus.add(l.id);
        burst(world, l.x, l.y, 22, 'sparkle', { speed: 260 });
        this.emit('lotus', l.x, l.y);
      }
    }
    for (const p of world.pots) {
      if (p.broken) continue;
      const potBox = { l: p.x - 20, r: p.x + 20, t: p.y - 42, b: p.y };
      if (!overlap(pb, potBox)) continue;
      const stomped = player.vy > 0 && player.prevY <= potBox.t + 14;
      if (player.state === 'dash' || stomped) {
        p.broken = true;
        if (stomped) player.bounce();
        burst(world, p.x, p.y - 20, 12, 'pot', { speed: 260, up: true });
        this.emit('pot', p.x, p.y);
        if (p.heart) {
          this.hearts = Math.min(3, this.hearts + 1);
          burst(world, p.x, p.y - 30, 8, 'heart', { speed: 120, up: true });
          this.emit('heart', p.x, p.y);
        } else this.addJasmine(3, p.x, p.y - 40);
      }
    }
    for (const l of world.lamps) {
      if (!l.lit && Math.abs(player.x - l.x) < 40 && Math.abs(player.y - l.y) < 100) {
        l.lit = true;
        this.checkpoint = { x: l.x, y: l.y };
        this.hearts = 3;
        burst(world, l.x, l.y - 90, 16, 'sparkle', { speed: 180 });
        this.emit('lamp', l.x, l.y);
      }
    }

    // Enemies: bonk them by landing on them or spinning into them; touching them otherwise hurts.
    for (const e of world.enemies) {
      e.update(dt, level, player, world);
      if (e.bonked || e.gone) continue;
      const eb = e.box;
      if (!overlap(pb, eb)) continue;
      if (player.state === 'dash') {
        e.bonk(player.x);
        this.emit('bonk', e.x, e.y);
        burst(world, e.x, e.y - e.h / 2, 10, 'star', { speed: 200 });
      } else if (player.vy > 0 && player.prevY <= eb.t + 16) {
        e.bonk(player.x);
        player.bounce();
        this.emit('stomp', e.x, e.y);
        burst(world, e.x, eb.t, 10, 'star', { speed: 200 });
      } else this.hurt(e.x);
    }
    world.enemies = world.enemies.filter(e => !e.gone);

    // The Monkey Chief and his coconuts.
    const boss = world.boss;
    if (boss) {
      boss.update(dt, level, player, world);
      for (const ev of boss.events) {
        this.emit(ev, boss.x, boss.y);
        if (ev === 'thud') this.shake = 0.25;
        if (ev === 'defeated') {
          world.gate.hidden = false;
          burst(world, boss.x, boss.y - 80, 30, 'petal', { speed: 300 });
        }
      }
      boss.events.length = 0;
      if (boss.state !== 'defeated' && overlap(pb, boss.box)) {
        const fromAbove = player.vy > 0 && player.prevY <= boss.box.t + 24;
        if ((fromAbove || player.state === 'dash') && boss.vulnerable) {
          boss.bonk();
          if (fromAbove) player.bounce();
          else player.vx = -player.facing * 300;
          burst(world, boss.x, boss.y - 120, 16, 'star', { speed: 260 });
          this.shake = 0.3;
        } else if (fromAbove) {
          player.bounce();
        } else if (boss.state !== 'hit') this.hurt(boss.x);
      }
      updateCoconuts(world, level, dt);
      for (const c of world.coconuts) {
        if (overlap(pb, { l: c.x - c.r, r: c.x + c.r, t: c.y - c.r, b: c.y + c.r })) {
          if (player.state === 'dash') {
            c.vx = -c.vx * 1.2;
            c.vy = -500;
            this.emit('bat', c.x, c.y);
          } else this.hurt(c.x);
        }
      }
    }

    // The gate at the end.
    const gate = world.gate;
    if (gate && !gate.hidden && Math.abs(player.x - gate.x) < 50 && player.y > gate.y - 220 && player.y <= gate.y + 4) {
      gate.open = true;
      this.state = 'won';
      this.stateTime = 0;
      player.state = 'win';
      burst(world, gate.x, gate.y - 140, 30, 'petal', { speed: 280 });
      this.emit('win', gate.x, gate.y);
    }

    this.followCamera(dt);
  }

  addJasmine(n, x, y) {
    this.jasmine += n;
    this.session.garland = (this.session.garland || 0) + n;
    burst(this.world, x, y, 5 * n, 'sparkle', { speed: 120 });
    this.emit('jasmine', x, y);
    while (this.session.garland >= GARLAND) {
      this.session.garland -= GARLAND;
      this.session.lives++;
      this.emit('life', x, y);
    }
  }

  /** Hit: lose a heart. With no hearts left, a life is lost and she starts again from the last lamp. */
  hurt(fromX, thorns = false) {
    if (!this.player.hurt(fromX)) return;
    if (thorns) this.player.vy = -700;
    this.hearts--;
    this.shake = 0.2;
    if (this.hearts <= 0) this.loseLife();
  }

  /** Fell in the water or a pit (or squeezed by the edge of the moving screen): lose a heart, come back. */
  fall(why) {
    this.emit(why === 'water' ? 'splash' : 'fall', this.player.x, this.player.y);
    this.hearts--;
    if (this.hearts <= 0) {
      this.loseLife();
      return;
    }
    if (this.scroll !== null) {
      this.player.respawnAt(this.checkpoint);
      this.snapCamera();
    } else {
      this.player.respawnAt(this.player.safe);
    }
  }

  loseLife() {
    this.session.lives--;
    this.emit('lifeLost', this.player.x, this.player.y);
    if (this.session.lives <= 0) {
      this.state = 'lost';
      this.stateTime = 0;
      return;
    }
    this.hearts = 3;
    this.player.respawnAt(this.checkpoint);
    this.snapCamera();
  }

  followCamera(dt) {
    const k = 1 - Math.exp(-dt * 7);
    this.camera.x += (this.targetX() - this.camera.x) * (this.scroll !== null ? 1 : k);
    this.camera.y += (this.targetY() - this.camera.y) * k;
  }

  /** For the tests: move straight to the gate. */
  warpToGate() {
    const g = this.world.gate;
    if (this.world.boss) {
      this.world.boss.hp = 0;
      this.world.boss.state = 'defeated';
      g.hidden = false;
    }
    this.player.x = g.x - 30;
    this.player.y = g.y;
    this.player.vy = 0;
    if (this.scroll !== null) this.scroll = Math.max(0, g.x - 600);
    this.snapCamera();
  }
}
