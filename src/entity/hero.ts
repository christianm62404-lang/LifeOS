import { World } from "../sim/world.ts";
import { ID, State, material } from "../sim/materials.ts";

/**
 * The player: a small flying superhero ("Emberkin") with momentum-based flight,
 * AABB collision against solid cells, and health affected by heat, drowning and
 * crushing. The hero acts on the world only through powers (see powers.ts); this
 * class owns movement, collision and survival.
 */
export const HERO_W = 8;
export const HERO_H = 12;

const ACCEL = 0.45;
const DAMP = 0.88;
const MAX_SPEED = 3.6;
const MAX_HEALTH = 100;

export class Hero {
  cx: number;
  cy: number;
  vx = 0;
  vy = 0;
  health = MAX_HEALTH;
  facing = 1; // +1 right, -1 left
  private spawnX: number;
  private spawnY: number;
  private safeTicks = 0;

  constructor(
    private readonly world: World,
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
    this.vx = (this.vx + moveX * ACCEL) * DAMP;
    this.vy = (this.vy + moveY * ACCEL) * DAMP;
    this.vx = clamp(this.vx, -MAX_SPEED, MAX_SPEED);
    this.vy = clamp(this.vy, -MAX_SPEED, MAX_SPEED);
    if (aimX < this.cx - 1) this.facing = -1;
    else if (aimX > this.cx + 1) this.facing = 1;

    this.moveAxis(this.vx, 0);
    this.moveAxis(0, this.vy);

    this.applyEnvironment();
  }

  /** Move along one axis in 1px steps, stopping against solids. */
  private moveAxis(dx: number, dy: number): void {
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
    if (steps === 0) return;
    const sx = dx / steps;
    const sy = dy / steps;
    for (let s = 0; s < steps; s++) {
      const nx = this.cx + sx;
      const ny = this.cy + sy;
      if (this.collides(nx, ny)) {
        if (dx !== 0) this.vx = 0;
        if (dy !== 0) this.vy = 0;
        return;
      }
      this.cx = nx;
      this.cy = ny;
    }
  }

  /** True if the hero's AABB at (cx,cy) overlaps any solid cell. */
  private collides(cx: number, cy: number): boolean {
    const { world } = this;
    const left = Math.floor(cx - this.hw);
    const right = Math.ceil(cx + this.hw) - 1;
    const top = Math.floor(cy - this.hh);
    const bottom = Math.ceil(cy + this.hh) - 1;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (x < 0 || y < 0 || x >= world.w || y >= world.h) {
          if (x < 0 || x >= world.w || y >= world.h) return true; // walls/floor
          continue;
        }
        if (material(world.mat[world.idx(x, y)]).state === State.Solid) return true;
      }
    }
    return false;
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
    else if (maxTemp > 90) damage += (maxTemp - 90) * 0.01; // ambient heat
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
