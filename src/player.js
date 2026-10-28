// Inaara's moves: run, jump (higher when held), wall slide and wall jump, hang on ledges and climb up,
// glide with a banana leaf, and the spin dash (ready when her hair clip glows).
import { T } from './level.js';
import { MOVE, moveBody, touchingWall, fullySupported, box } from './physics.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = MOVE.width;
    this.h = MOVE.height;
    this.facing = 1;
    this.state = 'normal'; // normal, dash, hang, climb, hurt, win
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpHeld = false;
    this.cutDone = false;
    this.wallDir = 0;
    this.wallGrace = 0;
    this.moveLock = 0;
    this.gliding = false;
    this.clip = 1;
    this.dashTime = 0;
    this.hangDir = 0;
    this.hangCooldown = 0;
    this.climbTime = 0;
    this.climbTo = null;
    this.invuln = 0;
    this.hurtTime = 0;
    this.runPhase = 0;
    this.idleTime = 0;
    this.prevY = y;
    this.platform = null;
    this.dropTime = 0;
    this.safe = { x, y };
    this.safeTime = 0;
    this.events = []; // sounds and effects for the game to play: 'jump', 'land', 'dash', ...
  }

  get box() {
    return box(this);
  }

  /** input: { left, right, up, down, jump (held), jumpPressed, spinPressed }; world: { platforms, updrafts } */
  update(dt, input, level, world = {}) {
    this.prevY = this.y;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hangCooldown = Math.max(0, this.hangCooldown - dt);
    this.clip = Math.min(1, this.clip + dt / MOVE.clipRecharge);
    if (input.jumpPressed) this.jumpBuffer = MOVE.buffer;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.jumpHeld = input.jump;
    const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    if (this.state === 'win') {
      this.vx *= 0.9;
      this.vy = Math.min(this.vy + MOVE.gravity * dt, MOVE.maxFall);
      moveBody(this, level, dt, world.platforms);
      return;
    }

    if (this.state === 'climb') {
      this.climbTime -= dt;
      if (this.climbTime <= 0) {
        this.x = this.climbTo.x;
        this.y = this.climbTo.y;
        this.state = 'normal';
        this.vx = 0;
        this.vy = 0;
      }
      return;
    }

    if (this.state === 'hang') {
      this.vx = 0;
      this.vy = 0;
      const d = this.hangDir;
      if (input.jumpPressed && move === -d) {
        this.wallJump(-d);
      } else if (input.jumpPressed || input.up) {
        // Climb up onto the ledge if there's room.
        const tx = Math.floor((this.x + d * (this.w / 2 + 2)) / T), ty = Math.round(this.y - this.h + 6) / T;
        const row = Math.round(ty);
        if (!level.isSolid(tx, row - 1) && !level.isSolid(tx, row - 2)) {
          this.state = 'climb';
          this.climbTime = 0.16;
          this.climbTo = { x: d > 0 ? tx * T + this.w / 2 + 2 : (tx + 1) * T - this.w / 2 - 2, y: row * T };
          this.jumpBuffer = 0;
          this.events.push('climb');
        } else {
          this.wallJump(-d);
        }
      } else if (input.down || move === -d) {
        this.state = 'normal';
        this.hangCooldown = 0.35;
      }
      return;
    }

    if (this.state === 'hurt') {
      this.hurtTime -= dt;
      if (this.hurtTime <= 0) this.state = 'normal';
    }

    if (this.state === 'dash') {
      this.dashTime -= dt;
      this.vx = this.facing * MOVE.dash;
      this.vy = 0;
      moveBody(this, level, dt, world.platforms, false);
      if (this.hitWall || this.dashTime <= 0) {
        this.state = 'normal';
        this.vx = this.facing * MOVE.run * (this.hitWall ? 0 : 1);
      }
      this.afterMove(dt, level);
      return;
    }

    // Running.
    const control = this.state === 'normal' && this.moveLock <= 0;
    this.moveLock = Math.max(0, this.moveLock - dt);
    if (control) {
      const target = move * MOVE.run;
      const accel = this.onGround ? (move !== 0 && Math.sign(move) === Math.sign(this.vx || move) ? MOVE.accelGround : MOVE.brakeGround) : MOVE.accelAir;
      if (this.vx < target) this.vx = Math.min(target, this.vx + accel * dt);
      else if (this.vx > target) this.vx = Math.max(target, this.vx - accel * dt);
      if (move !== 0) this.facing = move;
    }

    // Walls: slide down slowly when pushing against one in the air.
    const wl = touchingWall(this, level, -1), wr = touchingWall(this, level, 1);
    this.wallDir = !this.onGround ? (wr && move > 0 ? 1 : wl && move < 0 ? -1 : 0) : 0;
    if (!this.onGround && (wl || wr)) this.wallGrace = 0.08;
    else this.wallGrace = Math.max(0, this.wallGrace - dt);
    const lastWall = wr ? 1 : wl ? -1 : 0;

    // Jumping.
    if (this.jumpBuffer > 0 && this.state === 'normal') {
      if (this.onGround || this.coyote > 0) {
        this.vy = -MOVE.jump;
        this.onGround = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.cutDone = false;
        this.events.push('jump');
      } else if (this.wallGrace > 0 && lastWall !== 0) {
        this.wallJump(-lastWall);
      }
    }
    if (!this.jumpHeld && this.vy < 0 && !this.cutDone && this.state === 'normal') {
      this.vy *= MOVE.jumpCut;
      this.cutDone = true;
    }

    // The spin dash.
    if (input.spinPressed && this.clip >= 1 && this.state === 'normal') {
      this.state = 'dash';
      this.dashTime = MOVE.dashTime;
      this.clip = 0;
      this.events.push('dash');
    }

    // Falling, sliding down walls, gliding.
    this.vy = Math.min(this.vy + MOVE.gravity * dt, MOVE.maxFall);
    // Gliding starts when falling with jump held, and lasts while it's held (even when the mist lifts her up).
    this.gliding = !this.onGround && this.jumpHeld && this.wallDir === 0 && this.state === 'normal' && (this.vy > 0 || this.gliding);
    if (this.wallDir !== 0 && this.vy > MOVE.wallSlide) this.vy = MOVE.wallSlide;
    if (this.gliding) {
      if (this.vy > MOVE.glideFall) this.vy = MOVE.glideFall;
      if (world.updrafts) {
        for (const u of world.updrafts) {
          if (this.x > u.x && this.x < u.x + u.w && this.y > u.y && this.y - this.h < u.y + u.h) {
            this.vy = Math.max(MOVE.updraftTop, this.vy - MOVE.updraft * dt);
          }
        }
      }
    }

    const wasGround = this.onGround;
    // Down while standing on a plank or log drops through it.
    if (input.down && this.onGround) this.dropTime = 0.22;
    else this.dropTime = Math.max(0, this.dropTime - dt);
    moveBody(this, level, dt, world.platforms, this.dropTime > 0);
    if (this.onGround && !wasGround && this.prevY < this.y + 0.01 && this.vy === 0) this.events.push('land');
    this.afterMove(dt, level);

    // Grabbing a ledge while falling past it.
    if (!this.onGround && this.vy >= 0 && move !== 0 && this.hangCooldown <= 0 && this.state === 'normal') this.tryHang(move, level);
  }

  afterMove(dt, level) {
    if (this.onGround) {
      this.coyote = MOVE.coyote;
      // Remember a safe place to come back to after a fall.
      if (!this.platform && fullySupported(this, level)) {
        this.safeTime += dt;
        if (this.safeTime > 0.25) this.safe = { x: this.x, y: this.y };
      } else this.safeTime = 0;
      this.runPhase += Math.abs(this.vx) * dt * 0.045;
      this.idleTime = Math.abs(this.vx) < 5 ? this.idleTime + dt : 0;
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
      this.safeTime = 0;
      this.idleTime = 0;
    }
    if (this.onGround && this.platform) this.x += this.platform.dx || 0;
  }

  wallJump(away) {
    this.state = 'normal';
    this.vx = away * MOVE.wallJumpX;
    this.vy = -MOVE.wallJumpY;
    this.facing = away;
    this.moveLock = MOVE.wallJumpLock;
    this.jumpBuffer = 0;
    this.cutDone = false;
    this.wallGrace = 0;
    this.hangCooldown = 0.2;
    this.events.push('walljump');
  }

  tryHang(d, level) {
    if (!touchingWall(this, level, d)) return;
    const tx = Math.floor((this.x + d * (this.w / 2 + 2)) / T);
    const handY = this.y - this.h + 6;
    const ty = Math.floor(handY / T);
    const below = handY - ty * T;
    const ptx = Math.floor(this.x / T);
    if (below < 18 && level.isSolid(tx, ty) && !level.isSolid(tx, ty - 1) && !level.isSolid(ptx, ty - 1)) {
      this.state = 'hang';
      this.hangDir = d;
      this.facing = d;
      this.y = ty * T + this.h - 6;
      this.vx = 0;
      this.vy = 0;
      this.events.push('grab');
    }
  }

  /** Bounce off something stomped on. */
  bounce() {
    this.vy = -(this.jumpHeld ? MOVE.stompHigh : MOVE.stomp);
    this.cutDone = !this.jumpHeld;
    this.state = 'normal';
  }

  /** Hit by an enemy or thorns: knocked back, and can't be hurt again for a moment. Returns false if already blinking. */
  hurt(fromX) {
    if (this.invuln > 0 || this.state === 'win') return false;
    this.invuln = 1.4;
    this.state = 'hurt';
    this.hurtTime = 0.35;
    this.vx = (this.x < fromX ? -1 : 1) * 280;
    this.vy = -520;
    this.events.push('hurt');
    return true;
  }

  /** Back to a safe place (after falling into water or a pit). */
  respawnAt(p) {
    this.x = p.x;
    this.y = p.y;
    this.vx = 0;
    this.vy = 0;
    this.state = 'normal';
    this.invuln = 1.4;
    this.prevY = p.y;
  }

  /** What to draw: idle, run, jump, spin, wall, hang, glide, hurt, cheer. */
  get look() {
    if (this.state === 'win') return 'cheer';
    if (this.state === 'dash') return 'spin';
    if (this.state === 'hang' || this.state === 'climb') return 'hang';
    if (this.state === 'hurt') return 'hurt';
    if (this.gliding) return 'glide';
    if (!this.onGround) return this.wallDir !== 0 ? 'wall' : 'jump';
    return Math.abs(this.vx) > 20 ? 'run' : 'idle';
  }
}
