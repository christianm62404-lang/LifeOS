import { World } from "../sim/world.ts";
import { Particles } from "../sim/particles.ts";
import { CollapseSystem } from "../sim/collapse.ts";
import { explode } from "../sim/explosion.ts";
import { ID, State, material } from "../sim/materials.ts";
import { Rng } from "../core/rng.ts";
import { Effects } from "../core/effects.ts";
import { addShake } from "../core/fx.ts";
import { Hero } from "./hero.ts";

export interface PowerCtx {
  world: World;
  particles: Particles;
  collapse: CollapseSystem;
  effects: Effects;
  rng: Rng;
  hero: Hero;
  aimX: number;
  aimY: number;
}

export interface Power {
  readonly name: string;
  readonly color: readonly [number, number, number];
  fire(ctx: PowerCtx): void;
}

/** How far beyond the hero's body a power originates, so it never hits him. */
const MUZZLE = 10;

function aimDir(ctx: PowerCtx): { dx: number; dy: number; len: number } {
  const dx = ctx.aimX - ctx.hero.cx;
  const dy = ctx.aimY - ctx.hero.cy;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len, len };
}

/** The muzzle point: just outside the hero toward the aim. */
function muzzle(ctx: PowerCtx): { mx: number; my: number; dx: number; dy: number } {
  const { dx, dy } = aimDir(ctx);
  return { mx: ctx.hero.cx + dx * MUZZLE, my: ctx.hero.cy + dy * MUZZLE, dx, dy };
}

/** March from the muzzle toward the aim, calling `fn` per cell until it stops. */
function march(
  ctx: PowerCtx,
  maxLen: number,
  fn: (x: number, y: number) => boolean,
): { x: number; y: number } {
  const { mx, my, dx, dy } = muzzle(ctx);
  let x = mx;
  let y = my;
  let lastX = Math.round(mx);
  let lastY = Math.round(my);
  for (let s = 0; s < maxLen; s++) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (!ctx.world.inBounds(cx, cy)) break;
    lastX = cx;
    lastY = cy;
    if (!fn(cx, cy)) break;
    x += dx;
    y += dy;
  }
  return { x: lastX, y: lastY };
}

const HEAT_BEAM: Power = {
  name: "Heat Beam",
  color: [255, 120, 40],
  fire(ctx) {
    const { mx, my } = muzzle(ctx);
    const end = march(ctx, 90, (x, y) => {
      const i = ctx.world.idx(x, y);
      ctx.world.temp[i] += 55;
      ctx.world.touch(x, y);
      const m = ctx.world.mat[i];
      return !(material(m).state === State.Solid && material(m).strength > 40);
    });
    ctx.effects.line(mx, my, end.x, end.y, HEAT_BEAM.color, 2);
  },
};

const FREEZE_BREATH: Power = {
  name: "Freeze Breath",
  color: [150, 230, 255],
  fire(ctx) {
    const { mx, my } = muzzle(ctx);
    const end = march(ctx, 70, (x, y) => {
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (!ctx.world.inBounds(nx, ny)) continue;
          const i = ctx.world.idx(nx, ny);
          ctx.world.temp[i] = Math.max(-40, ctx.world.temp[i] - 45);
          ctx.world.touch(nx, ny);
        }
      }
      return material(ctx.world.mat[ctx.world.idx(x, y)]).state !== State.Solid;
    });
    ctx.effects.line(mx, my, end.x, end.y, FREEZE_BREATH.color, 2);
  },
};

const WATER_JET: Power = {
  name: "Water Jet",
  color: [70, 150, 230],
  fire(ctx) {
    const { mx, my, dx, dy } = muzzle(ctx);
    for (let k = 0; k < 3; k++) {
      const spread = (ctx.rng.next() - 0.5) * 0.3;
      ctx.particles.spawn(mx, my, (dx + spread) * 4.5, (dy + spread) * 4.5, ID.WATER, 20, 60);
    }
  },
};

const LAVA_ERUPTION: Power = {
  name: "Lava Eruption",
  color: [230, 90, 30],
  fire(ctx) {
    ctx.world.paintCircle(ctx.aimX, ctx.aimY, 6, ID.LAVA);
    addShake(0.25);
  },
};

const EARTH_RAISE: Power = {
  name: "Earth Raise",
  color: [150, 110, 70],
  fire(ctx) {
    const half = 2;
    const height = 26;
    for (let x = ctx.aimX - half; x <= ctx.aimX + half; x++) {
      for (let y = ctx.aimY - (height >> 1); y <= ctx.aimY + (height >> 1); y++) {
        if (!ctx.world.inBounds(x, y)) continue;
        if (ctx.world.mat[ctx.world.idx(x, y)] === ID.AIR) ctx.world.paint(x, y, ID.ROCK);
      }
    }
    ctx.collapse.markRegion(ctx.aimX - half - 1, ctx.aimY - 14, ctx.aimX + half + 1, ctx.aimY + 14);
    addShake(0.2);
  },
};

const QUAKE: Power = {
  name: "Quake",
  color: [170, 140, 90],
  fire(ctx) {
    const w = 60;
    // Destabilise a wide band so unsupported structures fall...
    for (let x = ctx.aimX - w; x <= ctx.aimX + w; x += 8) {
      ctx.collapse.markRegion(x - 5, 0, x + 5, ctx.world.h - 1);
    }
    // ...and kick up visible dust/debris from the topmost solids in range.
    for (let k = 0; k < 24; k++) {
      const x = ctx.aimX - w + ctx.rng.int(2 * w);
      if (x < 0 || x >= ctx.world.w) continue;
      for (let y = 0; y < ctx.world.h; y++) {
        if (material(ctx.world.mat[ctx.world.idx(x, y)]).state === State.Solid) {
          ctx.particles.spawn(
            x + 0.5,
            y + 0.5,
            (ctx.rng.next() - 0.5) * 2,
            -ctx.rng.next() * 2 - 0.5,
            ctx.world.mat[ctx.world.idx(x, y)],
            ctx.world.temp[ctx.world.idx(x, y)],
            20 + ctx.rng.int(20),
          );
          break;
        }
      }
    }
    addShake(0.9);
  },
};

const LIGHTNING: Power = {
  name: "Lightning",
  color: [230, 240, 255],
  fire(ctx) {
    const { mx, my } = muzzle(ctx);
    const hit = march(ctx, 120, (x, y) => material(ctx.world.mat[ctx.world.idx(x, y)]).state !== State.Solid);
    drawBolt(ctx, mx, my, hit.x, hit.y);
    // Scorch / ignite the impact point.
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const nx = hit.x + ox;
        const ny = hit.y + oy;
        if (!ctx.world.inBounds(nx, ny)) continue;
        const i = ctx.world.idx(nx, ny);
        ctx.world.temp[i] += 240;
        if (ctx.world.mat[i] === ID.AIR && ctx.rng.next() < 0.3) ctx.world.convert(i, ID.FIRE);
        ctx.world.touch(nx, ny);
      }
    }
    conduct(ctx, hit.x, hit.y);
    addShake(0.3);
  },
};

/** Draw a jagged lightning bolt as several offset segments. */
function drawBolt(ctx: PowerCtx, x0: number, y0: number, x1: number, y1: number): void {
  const segs = 6;
  let px = x0;
  let py = y0;
  for (let s = 1; s <= segs; s++) {
    const t = s / segs;
    const nx = x0 + (x1 - x0) * t + (s < segs ? (ctx.rng.next() - 0.5) * 8 : 0);
    const ny = y0 + (y1 - y0) * t + (s < segs ? (ctx.rng.next() - 0.5) * 8 : 0);
    ctx.effects.line(px, py, nx, ny, LIGHTNING.color, 4);
    px = nx;
    py = ny;
  }
}

/** Flood heat through connected conductive cells (metal, water) from a point. */
function conduct(ctx: PowerCtx, sx: number, sy: number): void {
  const { world } = ctx;
  if (!world.inBounds(sx, sy)) return;
  const isConductive = (m: number) => m === ID.METAL || m === ID.MOLTEN_METAL || m === ID.WATER;
  if (!isConductive(world.mat[world.idx(sx, sy)])) return;
  const stack: number[] = [world.idx(sx, sy)];
  const seen = new Set<number>(stack);
  let budget = 800;
  while (stack.length > 0 && budget-- > 0) {
    const i = stack.pop()!;
    const x = i % world.w;
    const y = (i / world.w) | 0;
    world.temp[i] += 220;
    world.touch(x, y);
    if (ctx.rng.next() < 0.06) ctx.effects.line(x - 1, y - 1, x + 1, y + 1, LIGHTNING.color, 3);
    const nb = [i - 1, i + 1, i - world.w, i + world.w];
    for (const j of nb) {
      if (j < 0 || j >= world.mat.length || seen.has(j)) continue;
      if (isConductive(world.mat[j])) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
}

const WIND_GUST: Power = {
  name: "Wind Gust",
  color: [200, 220, 220],
  fire(ctx) {
    const { mx, my, dx, dy } = muzzle(ctx);
    // Visible gust streaks.
    for (let k = 0; k < 3; k++) {
      const off = (ctx.rng.next() - 0.5) * 10;
      const ox = mx - dy * off;
      const oy = my + dx * off;
      ctx.effects.line(ox, oy, ox + dx * 34, oy + dy * 34, WIND_GUST.color, 2);
    }
    // Lift loose cells in a cone ahead of the hero into wind-blown particles.
    let budget = 50;
    for (let s = 2; s < 40 && budget > 0; s++) {
      const bx = Math.round(mx + dx * s);
      const by = Math.round(my + dy * s);
      const spread = (s / 40) * 7;
      for (let o = -spread; o <= spread; o += 2) {
        const px = Math.round(bx - dy * o);
        const py = Math.round(by + dx * o);
        if (!ctx.world.inBounds(px, py)) continue;
        const i = ctx.world.idx(px, py);
        const m = ctx.world.mat[i];
        if (m === ID.AIR) continue;
        const st = material(m).state;
        if (st === State.Powder || st === State.Liquid || st === State.Gas) {
          ctx.particles.spawn(px + 0.5, py + 0.5, dx * 3.8 + (ctx.rng.next() - 0.5), dy * 3.8 - 0.4, m, ctx.world.temp[i], 30);
          ctx.world.convert(i, ID.AIR);
          if (--budget <= 0) break;
        }
      }
    }
  },
};

const GROUND_SLAM: Power = {
  name: "Ground Slam",
  color: [240, 210, 120],
  fire(ctx) {
    const { dx, dy } = aimDir(ctx);
    const bx = Math.round(ctx.hero.cx + dx * (MUZZLE + 6));
    const by = Math.round(ctx.hero.cy + dy * (MUZZLE + 6));
    // Visible shockwave ring.
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      ctx.effects.line(bx, by, bx + Math.cos(ang) * 14, by + Math.sin(ang) * 14, GROUND_SLAM.color, 3);
    }
    explode(ctx.world, ctx.particles, bx, by, 14, 85, ctx.rng, 0.05); // kinetic (no fire)
    ctx.collapse.markRegion(bx - 16, by - 16, bx + 16, by + 16);
  },
};

/** Ordered power list (selected with number keys / wheel). */
export const POWERS: readonly Power[] = [
  HEAT_BEAM,
  FREEZE_BREATH,
  WATER_JET,
  LAVA_ERUPTION,
  EARTH_RAISE,
  QUAKE,
  LIGHTNING,
  WIND_GUST,
  GROUND_SLAM,
];
