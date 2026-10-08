import { World } from "./world.ts";
import { Particles } from "./particles.ts";
import { ID, State, blocksFalling, material } from "./materials.ts";
import { Rng } from "../core/rng.ts";
import { addShake } from "../core/fx.ts";
import {
  BODY_GRAVITY,
  BODY_MAX_FALL,
  MAX_BODIES,
  MAX_COMPONENT,
  MAX_REGIONS_PER_TICK,
} from "./constants.ts";

/** A detached rigid chunk of solid cells, falling as one body. */
export interface RigidBody {
  /** Cell offsets from the body origin, with their material/thermal state. */
  readonly dx: Int16Array;
  readonly dy: Int16Array;
  readonly mat: Uint8Array;
  readonly temp: Float32Array;
  readonly shade: Int8Array;
  readonly n: number;
  /** Bounding size (for quick culling). */
  readonly bw: number;
  readonly bh: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
}

interface Region {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Structural collapse: when solids are damaged, the affected region is checked
 * for connected-solid components that no longer reach an anchor (the world
 * floor). Floating components are lifted out of the grid into rigid bodies that
 * fall under gravity and shatter back into cells on impact.
 *
 * Cost is bounded three ways: only damaged regions are checked (never the whole
 * world), each connected component floods at most MAX_COMPONENT cells (so the
 * ground is treated as permanently anchored), and only a few regions are
 * processed per tick.
 */
export class CollapseSystem {
  readonly bodies: RigidBody[] = [];
  /** Optional hook fired on a hard landing (for sound). */
  onImpact: (() => void) | null = null;
  private regions: Region[] = [];

  // Visited stamp for flood-fill (avoids clearing a big array each pass).
  private readonly mark: Int32Array;
  private pass = 0;
  private readonly stack: Int32Array;

  constructor(private readonly world: World) {
    this.mark = new Int32Array(world.w * world.h);
    this.stack = new Int32Array(MAX_COMPONENT + 4);
  }

  reset(): void {
    this.bodies.length = 0;
    this.regions.length = 0;
    this.mark.fill(0);
    this.pass = 0;
    this.tick = 0;
  }

  /** Queue a region (grows a little to catch neighbours of the damage). */
  markRegion(x0: number, y0: number, x1: number, y1: number): void {
    const m = 2;
    this.regions.push({
      x0: Math.max(0, Math.min(x0, x1) - m),
      y0: Math.max(0, Math.min(y0, y1) - m),
      x1: Math.min(this.world.w - 1, Math.max(x0, x1) + m),
      y1: Math.min(this.world.h - 1, Math.max(y0, y1) + m),
    });
  }

  private tick = 0;

  update(particles: Particles, rng: Rng): void {
    // Detection is relatively heavy (flood-fill); run it every other tick.
    // Bodies still fall every tick so motion stays smooth.
    if ((this.tick++ & 1) === 0 || this.regions.length > 16) {
      this.detectDetachments();
    }
    this.updateBodies(particles, rng);
  }

  // --- detection ---------------------------------------------------------

  private detectDetachments(): void {
    let processed = 0;
    while (this.regions.length > 0 && processed < MAX_REGIONS_PER_TICK) {
      const r = this.regions.shift()!;
      this.scanRegion(r);
      processed++;
    }
  }

  private scanRegion(r: Region): void {
    const { world } = this;
    const { w } = world;
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        const i = y * w + x;
        if (this.mark[i] === this.pass + 1) continue; // already flooded
        if (!isSolid(world.mat[i])) continue;
        this.floodAndMaybeDetach(x, y);
      }
    }
    this.pass++; // new stamp value for the next region/component set
  }

  /** Flood a connected solid component; if it reaches no anchor, detach it. */
  private floodAndMaybeDetach(sx: number, sy: number): void {
    const { world, stack, mark } = this;
    const { w, h } = world;
    const stamp = this.pass + 1;

    let sp = 0;
    stack[sp++] = sy * w + sx;
    mark[sy * w + sx] = stamp;

    const cells: number[] = [];
    let anchored = false;
    let overflow = false;

    while (sp > 0) {
      const i = stack[--sp];
      const x = i % w;
      const y = (i / w) | 0;
      cells.push(i);
      if (y === h - 1) anchored = true; // touches the floor = anchored
      if (cells.length > MAX_COMPONENT) {
        overflow = true;
        break;
      }

      // Push unvisited solid 4-neighbours.
      if (x > 0) sp = this.tryPush(i - 1, stamp, sp);
      if (x < w - 1) sp = this.tryPush(i + 1, stamp, sp);
      if (y > 0) sp = this.tryPush(i - w, stamp, sp);
      if (y < h - 1) sp = this.tryPush(i + w, stamp, sp);
    }

    if (overflow || anchored) {
      // Mark every popped cell visited so we don't re-flood it this pass.
      for (const i of cells) mark[i] = stamp;
      return;
    }
    if (cells.length === 0) return;
    if (this.bodies.length >= MAX_BODIES) return; // keep it as terrain for now
    this.createBody(cells);
  }

  /** If cell `i` is an unvisited solid, mark + push it; return the new stack ptr. */
  private tryPush(i: number, stamp: number, sp: number): number {
    if (this.mark[i] === stamp) return sp;
    this.mark[i] = stamp; // mark now (solid or not) so we never retest it
    if (!isSolid(this.world.mat[i])) return sp;
    if (sp >= this.stack.length) return sp; // component hit the cap
    this.stack[sp] = i;
    return sp + 1;
  }

  private createBody(cells: number[]): void {
    const { world } = this;
    const { w, mat, temp, shade } = world;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const i of cells) {
      const x = i % w;
      const y = (i / w) | 0;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const n = cells.length;
    const body: RigidBody = {
      dx: new Int16Array(n),
      dy: new Int16Array(n),
      mat: new Uint8Array(n),
      temp: new Float32Array(n),
      shade: new Int8Array(n),
      n,
      bw: maxX - minX + 1,
      bh: maxY - minY + 1,
      ox: minX,
      oy: minY,
      vx: 0,
      vy: 0.5,
    };
    for (let k = 0; k < n; k++) {
      const i = cells[k];
      const x = i % w;
      const y = (i / w) | 0;
      body.dx[k] = x - minX;
      body.dy[k] = y - minY;
      body.mat[k] = mat[i];
      body.temp[k] = temp[i];
      body.shade[k] = shade[i];
      world.convert(i, ID.AIR); // lift out of the grid
    }
    this.bodies.push(body);
  }

  // --- rigid-body motion -------------------------------------------------

  private updateBodies(particles: Particles, rng: Rng): void {
    for (let b = this.bodies.length - 1; b >= 0; b--) {
      const body = this.bodies[b];
      body.vy = Math.min(body.vy + BODY_GRAVITY, BODY_MAX_FALL);

      // Horizontal drift (rarely non-zero; from lateral impulses).
      if (body.vx !== 0) {
        const dir = body.vx > 0 ? 1 : -1;
        const stepsX = Math.min(Math.abs(body.vx) | 0, 4);
        for (let s = 0; s < stepsX; s++) {
          if (this.canPlace(body, body.ox + dir, body.oy)) body.ox += dir;
          else {
            body.vx = 0;
            break;
          }
        }
        body.vx *= 0.9;
        if (Math.abs(body.vx) < 0.2) body.vx = 0;
      }

      // Vertical fall.
      let landed = false;
      const stepsY = Math.max(1, body.vy | 0);
      for (let s = 0; s < stepsY; s++) {
        if (this.canPlace(body, body.ox, body.oy + 1)) {
          body.oy += 1;
        } else {
          landed = true;
          break;
        }
      }

      if (landed) {
        this.land(body, particles, rng);
        this.bodies.splice(b, 1);
      }
    }
  }

  /**
   * Can the body occupy origin (ox,oy)? Blocked only by walls/floor and by
   * other solids/powders — the chunk sinks through liquids and gases.
   */
  private canPlace(body: RigidBody, ox: number, oy: number): boolean {
    const { world } = this;
    const { w, h, mat } = world;
    for (let k = 0; k < body.n; k++) {
      const gx = ox + body.dx[k];
      const gy = oy + body.dy[k];
      if (gx < 0 || gx >= w || gy >= h) return false; // walls / floor
      if (gy < 0) continue; // above the top is fine
      if (blocksFalling(mat[gy * w + gx])) return false;
    }
    return true;
  }

  /** Stamp the body back into the grid; scatter debris on a hard landing. */
  /** Try to move the liquid at (x,y) to a nearby open cell so it isn't lost. */
  private shoveLiquid(x: number, y: number): void {
    const { world } = this;
    const src = world.idx(x, y);
    const liquid = world.mat[src];
    const temp = world.temp[src];
    const offs = [
      [0, -1],
      [-1, 0],
      [1, 0],
      [-1, -1],
      [1, -1],
    ];
    for (const [ox, oy] of offs) {
      const nx = x + ox;
      const ny = y + oy;
      if (!world.inBounds(nx, ny)) continue;
      if (world.mat[world.idx(nx, ny)] === ID.AIR) {
        world.convert(world.idx(nx, ny), liquid, temp);
        return;
      }
    }
    // No room: the liquid is displaced out of existence (minor volume loss).
  }

  private land(body: RigidBody, particles: Particles, rng: Rng): void {
    const { world } = this;
    const { w, h } = world;
    const hard = body.vy > 3.5;
    for (let k = 0; k < body.n; k++) {
      const gx = body.ox + body.dx[k];
      const gy = body.oy + body.dy[k];
      if (gx < 0 || gx >= w || gy < 0 || gy >= h) continue;
      const i = gy * w + gx;
      // Stamp into anything that doesn't block a falling solid (air/gas/liquid).
      // Liquid at the target is nudged aside first so it isn't simply deleted.
      if (!blocksFalling(world.mat[i])) {
        if (material(world.mat[i]).state === State.Liquid) {
          this.shoveLiquid(gx, gy);
        }
        if (hard && rng.next() < 0.18) {
          particles.spawn(
            gx + 0.5,
            gy + 0.5,
            (rng.next() * 2 - 1) * 1.5,
            -rng.next() * 1.5,
            body.mat[k],
            body.temp[k],
            25 + rng.int(25),
          );
        } else {
          world.convert(i, body.mat[k], body.temp[k]);
          world.shade[i] = body.shade[k];
        }
      }
    }
    // The impact may have undermined neighbours — re-check around it.
    this.markRegion(body.ox - 1, body.oy - 1, body.ox + body.bw, body.oy + body.bh + 1);
    if (hard) {
      addShake(Math.min(0.6, body.n / 400 + 0.1));
      this.onImpact?.();
    }
  }
}

function isSolid(matId: number): boolean {
  return material(matId).state === State.Solid;
}
