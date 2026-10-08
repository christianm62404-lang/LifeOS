import { World } from "../sim/world.ts";
import { Particles } from "../sim/particles.ts";
import { CollapseSystem } from "../sim/collapse.ts";
import { ID, blocksFalling } from "../sim/materials.ts";
import { Rng } from "../core/rng.ts";

/**
 * The player: a small flying superhero ("Emberkin"). He flies with momentum and
 * *plows through* the world — solids he passes through shatter into debris and
 * the surrounding structure is flagged for collapse, so he tunnels destruction
 * as he moves. Health is drained by heat, lava/fire, drowning and crushing.
 */
export const HERO_W = 8;
export const HERO_H = 12;

const ACCEL = 0.5;
const DAMP = 0.9;
const MAX_SPEED = 4.2;
const MAX_HEALTH = 100;

export class Hero {
  cx: number;
  cy: number;
  vx = 0;
  vy = 0;
  health = MAX_HEALTH;
  facing = 1; // +1 right, -1 left
  animTime = 0;
  moving = false;

  private spawnX: number;
  private spawnY: number;
  private safeTicks = 0;

  constructor(
    private readonly world: World,
    private readonly particles: Particles,
    private readonly collapse: CollapseSystem,
    private readonly rng: Rng,
    x: number,
    y: number,
  ) {
    this.cx = x;
    this.cy = y;
    this.spawnX = x;
    this.spawnY = y;
  }

  get hw(): number {
    return HERO_W / 2;
  }
  get hh(): number {
    return HERO_H / 2;
  }

  /** Apply movement input (unit-ish vector) and advance physics one tick. */
  update(moveX: number, moveY: number, aimX: number): void {
    this.animTime++;
    this.vx = (this.vx + moveX * ACCEL) * DAMP;
    this.vy = (this.vy + moveY * ACCEL) * DAMP;
    this.vx = clamp(this.vx, -MAX_SPEED, MAX_SPEED);
    this.vy = clamp(this.vy, -MAX_SPEED, MAX_SPEED);
    this.moving = Math.hypot(this.vx, this.vy) > 0.35;
    if (aimX < this.cx - 1) this.facing = -1;
    else if (aimX > this.cx + 1) this.facing = 1;

    // Fly freely; clamp only to the world bounds.
    this.cx = clamp(this.cx + this.vx, this.hw, this.world.w - this.hw);
    this.cy = clamp(this.cy + this.vy, this.hh, this.world.h - this.hh);

    this.carve();
    this.applyEnvironment();
  }

  /** Shatter solids/powders the hero overlaps and flag the area to collapse. */
  private carve(): void {
    const { world } = this;
    const left = Math.max(0, Math.floor(this.cx - this.hw));
    const right = Math.min(world.w - 1, Math.ceil(this.cx + this.hw) - 1);
    const top = Math.max(0, Math.floor(this.cy - this.hh));
    const bottom = Math.min(world.h - 1, Math.ceil(this.cy + this.hh) - 1);

    let carved = false;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const i = world.idx(x, y);
        const m = world.mat[i];
        if (!blocksFalling(m)) continue;
        carved = true;
        if (this.rng.next() < 0.3) {
          this.particles.spawn(
            x + 0.5,
            y + 0.5,
            this.vx * 0.5 + (this.rng.next() - 0.5) * 1.5,
            this.vy * 0.5 - this.rng.next() * 1.2,
            m,
            world.temp[i],
            24 + this.rng.int(24),
          );
        }
        world.convert(i, ID.AIR);
      }
    }
    if (carved) {
      this.collapse.markRegion(left - 2, top - 2, right + 2, bottom + 2);
    }
  }

  /** Sample surroundings for heat / drowning damage, and regenerate if safe. */
  private applyEnvironment(): void {
    const { world } = this;
    const left = Math.max(0, Math.floor(this.cx - this.hw));
    const right = Math.min(world.w - 1, Math.ceil(this.cx + this.hw) - 1);
    const top = Math.max(0, Math.floor(this.cy - this.hh));
    const bottom = Math.min(world.h - 1, Math.ceil(this.cy + this.hh) - 1);

    let maxTemp = -Infinity;
    let water = 0;
    let lavaOrFire = 0;
    let cells = 0;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const m = world.mat[world.idx(x, y)];
        const t = world.temp[world.idx(x, y)];
        if (t > maxTemp) maxTemp = t;
        if (m === ID.WATER) water++;
        if (m === ID.LAVA || m === ID.FIRE || m === ID.MOLTEN_METAL) lavaOrFire++;
        cells++;
      }
    }

    let damage = 0;
    if (lavaOrFire > 0) damage += 1.2 + lavaOrFire * 0.15; // burning
    else if (maxTemp > 110) damage += (maxTemp - 110) * 0.008; // ambient heat
    if (water > cells * 0.6) damage += 0.35; // drowning

    if (damage > 0) {
      this.health = Math.max(0, this.health - damage);
      this.safeTicks = 0;
    } else {
      this.safeTicks++;
      if (this.safeTicks > 120 && this.health < MAX_HEALTH) {
        this.health = Math.min(MAX_HEALTH, this.health + 0.08);
      }
    }

    if (this.health <= 0) this.respawn();
  }

  /** External crushing damage (e.g. a rigid body landing on the hero). */
  hurt(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.safeTicks = 0;
    if (this.health <= 0) this.respawn();
  }

  private respawn(): void {
    this.cx = this.spawnX;
    this.cy = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.health = MAX_HEALTH;
    this.safeTicks = 0;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
