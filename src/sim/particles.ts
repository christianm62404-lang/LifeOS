import { World } from "./world.ts";
import { blocksFalling } from "./materials.ts";
import { MAX_PARTICLES, PARTICLE_GRAVITY } from "./constants.ts";

/**
 * Airborne debris thrown by explosions and impacts, as a fixed typed-array pool
 * (structure-of-arrays, zero per-particle allocation / GC). Particles fly in
 * continuous space, then re-enter the grid: when one hits a non-air cell it
 * deposits its material into the last empty cell it occupied.
 */
export class Particles {
  readonly x = new Float32Array(MAX_PARTICLES);
  readonly y = new Float32Array(MAX_PARTICLES);
  readonly vx = new Float32Array(MAX_PARTICLES);
  readonly vy = new Float32Array(MAX_PARTICLES);
  readonly mat = new Uint8Array(MAX_PARTICLES);
  readonly temp = new Float32Array(MAX_PARTICLES);
  readonly life = new Int16Array(MAX_PARTICLES);
  readonly alive = new Uint8Array(MAX_PARTICLES);
  count = 0;

  private cursor = 0;

  reset(): void {
    this.alive.fill(0);
    this.count = 0;
    this.cursor = 0;
  }

  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    matId: number,
    temp: number,
    life: number,
  ): void {
    // Linear probe for a free slot; the pool is a ring so old debris is reused.
    for (let tries = 0; tries < MAX_PARTICLES; tries++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      if (!this.alive[i]) {
        this.x[i] = x;
        this.y[i] = y;
        this.vx[i] = vx;
        this.vy[i] = vy;
        this.mat[i] = matId;
        this.temp[i] = temp;
        this.life[i] = life;
        this.alive[i] = 1;
        return;
      }
    }
  }

  /** Advance all particles; deposit settled ones back into the grid. */
  update(world: World): void {
    let active = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this.alive[i]) continue;

      this.vy[i] += PARTICLE_GRAVITY;
      this.life[i]--;

      const steps = Math.max(
        1,
        Math.ceil(Math.max(Math.abs(this.vx[i]), Math.abs(this.vy[i]))),
      );
      const sx = this.vx[i] / steps;
      const sy = this.vy[i] / steps;

      let px = this.x[i];
      let py = this.y[i];
      let settled = false;

      for (let s = 0; s < steps; s++) {
        const nx = px + sx;
        const ny = py + sy;
        const cx = Math.floor(nx);
        const cy = Math.floor(ny);

        if (cx < 0 || cy < 0 || cx >= world.w || cy >= world.h) {
          this.alive[i] = 0;
          settled = true;
          break;
        }

        const cell = world.mat[world.idx(cx, cy)];
        // Debris sinks through air, gas and liquid; only solids/powders stop it.
        if (blocksFalling(cell)) {
          this.deposit(world, Math.floor(px), Math.floor(py), i);
          settled = true;
          break;
        }
        px = nx;
        py = ny;
      }

      if (settled) continue;

      this.x[i] = px;
      this.y[i] = py;
      if (this.life[i] <= 0) {
        this.deposit(world, Math.floor(px), Math.floor(py), i);
        continue;
      }
      active++;
    }
    this.count = active;
  }

  private deposit(world: World, cx: number, cy: number, i: number): void {
    this.alive[i] = 0;
    if (cx < 0 || cy < 0 || cx >= world.w || cy >= world.h) return;
    const idx = world.idx(cx, cy);
    // Settle into any non-blocking cell (air, gas, or liquid it sank through).
    if (!blocksFalling(world.mat[idx])) {
      world.convert(idx, this.mat[i], this.temp[i]);
    }
  }
}
