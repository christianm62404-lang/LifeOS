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
  /** "hold" fires every tick the button is down; "tap" fires once per press. */
  readonly mode: "hold" | "tap";
  /** Ticks between shots (tap powers). */
  readonly cooldown: number;
  readonly color: readonly [number, number, number];
  fire(ctx: PowerCtx): void;
}

/** Normalised aim direction from the hero to the cursor. */
function aimDir(ctx: PowerCtx): { dx: number; dy: number; len: number } {
  const dx = ctx.aimX - ctx.hero.cx;
  const dy = ctx.aimY - ctx.hero.cy;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len, len };
}

/** March from the hero toward the aim, calling `fn` per cell until blocked. */
function march(
  ctx: PowerCtx,
  maxLen: number,
  fn: (x: number, y: number) => boolean,
): { x: number; y: number } {
  const { dx, dy } = aimDir(ctx);
  let x = ctx.hero.cx;
  let y = ctx.hero.cy;
  for (let s = 0; s < maxLen; s++) {
    x += dx;
    y += dy;
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (!ctx.world.inBounds(cx, cy)) break;
    if (!fn(cx, cy)) break;
  }
  return { x: Math.round(x), y: Math.round(y) };
}

const HEAT_BEAM: Power = {
  name: "Heat Beam",
  mode: "hold",
  cooldown: 0,
  color: [255, 120, 40],
  fire(ctx) {
    const end = march(ctx, 90, (x, y) => {
      const i = ctx.world.idx(x, y);
      ctx.world.temp[i] += 55;
      ctx.world.touch(x, y);
      // Stop at a strong solid (after heating it so it eventually melts).
      const m = ctx.world.mat[i];
      return !(material(m).state === State.Solid && material(m).strength > 40);
    });
    ctx.effects.line(ctx.hero.cx, ctx.hero.cy, end.x, end.y, HEAT_BEAM.color, 2);
  },
};

const FREEZE_BREATH: Power = {
  name: "Freeze Breath",
  mode: "hold",
  cooldown: 0,
  color: [150, 230, 255],
  fire(ctx) {
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
    ctx.effects.line(ctx.hero.cx, ctx.hero.cy, end.x, end.y, FREEZE_BREATH.color, 2);
  },
};

const WATER_JET: Power = {
  name: "Water Jet",
  mode: "hold",
  cooldown: 0,
  color: [70, 150, 230],
  fire(ctx) {
    const { dx, dy } = aimDir(ctx);
    for (let k = 0; k < 3; k++) {
      const spread = (ctx.rng.next() - 0.5) * 0.3;
      ctx.particles.spawn(
        ctx.hero.cx + dx * 6,
        ctx.hero.cy + dy * 6,
        (dx + spread) * 4.5,
        (dy + spread) * 4.5,
        ID.WATER,
        20,
        60,
      );
    }
  },
};

const LAVA_ERUPTION: Power = {
  name: "Lava Eruption",
  mode: "tap",
  cooldown: 24,
  color: [230, 90, 30],
  fire(ctx) {
    paintBlob(ctx.world, ctx.aimX, ctx.aimY, 6, ID.LAVA);
    addShake(0.25);
  },
};

const EARTH_RAISE: Power = {
  name: "Earth Raise",
  mode: "tap",
  cooldown: 20,
  color: [150, 110, 70],
  fire(ctx) {
    // Raise a rock pillar centred on the aim, only filling empty space.
    const half = 2;
    const height = 26;
    for (let x = ctx.aimX - half; x <= ctx.aimX + half; x++) {
      for (let y = ctx.aimY - (height >> 1); y <= ctx.aimY + (height >> 1); y++) {
        if (!ctx.world.inBounds(x, y)) continue;
        if (ctx.world.mat[ctx.world.idx(x, y)] === ID.AIR) {
          ctx.world.paint(x, y, ID.ROCK);
        }
      }
    }
    ctx.collapse.markRegion(ctx.aimX - half - 1, ctx.aimY - 14, ctx.aimX + half + 1, ctx.aimY + 14);
    addShake(0.2);
  },
};

const QUAKE: Power = {
  name: "Quake",
  mode: "tap",
  cooldown: 45,
  color: [170, 140, 90],
  fire(ctx) {
    // Destabilise a wide band around the aim so unsupported structures fall.
    const w = 60;
    for (let x = ctx.aimX - w; x <= ctx.aimX + w; x += 10) {
      ctx.collapse.markRegion(x - 6, 0, x + 6, ctx.world.h - 1);
    }
    addShake(0.8);
  },
};

const LIGHTNING: Power = {
  name: "Lightning",
  mode: "tap",
  cooldown: 18,
  color: [230, 240, 255],
  fire(ctx) {
    const hit = march(ctx, 120, (x, y) => {
      const m = ctx.world.mat[ctx.world.idx(x, y)];
      // Travels through air/gas/liquid; stops on solids.
      return material(m).state !== State.Solid;
    });
    ctx.effects.line(ctx.hero.cx, ctx.hero.cy, hit.x, hit.y, LIGHTNING.color, 3);
    conduct(ctx, hit.x, hit.y);
    addShake(0.3);
  },
};

/** Flood heat through connected conductive cells (metal, water) from a point. */
function conduct(ctx: PowerCtx, sx: number, sy: number): void {
  const { world } = ctx;
  if (!world.inBounds(sx, sy)) return;
  const isConductive = (m: number) =>
    m === ID.METAL || m === ID.MOLTEN_METAL || m === ID.WATER;
  if (!isConductive(world.mat[world.idx(sx, sy)])) {
    world.temp[world.idx(sx, sy)] += 300; // still scorch the impact point
    world.touch(sx, sy);
    return;
  }
  const stack: number[] = [world.idx(sx, sy)];
  const seen = new Set<number>(stack);
  let budget = 600;
  while (stack.length > 0 && budget-- > 0) {
    const i = stack.pop()!;
    const x = i % world.w;
    const y = (i / world.w) | 0;
    world.temp[i] += 220;
    world.touch(x, y);
    if (ctx.rng.next() < 0.08) ctx.effects.line(x, y, x, y, LIGHTNING.color, 2);
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
  mode: "hold",
  cooldown: 0,
  color: [200, 220, 220],
  fire(ctx) {
    const { dx, dy } = aimDir(ctx);
    // In a cone ahead of the hero, lift loose cells into wind-blown particles.
    let budget = 40;
    for (let s = 4; s < 40 && budget > 0; s += 1) {
      const bx = Math.round(ctx.hero.cx + dx * s);
      const by = Math.round(ctx.hero.cy + dy * s);
      const spread = (s / 40) * 6;
      for (let o = -spread; o <= spread; o += 2) {
        const px = Math.round(bx - dy * o);
        const py = Math.round(by + dx * o);
        if (!ctx.world.inBounds(px, py)) continue;
        const i = ctx.world.idx(px, py);
        const st = material(ctx.world.mat[i]).state;
        if (st === State.Powder || st === State.Liquid || st === State.Gas) {
          if (ctx.world.mat[i] === ID.AIR) continue;
          ctx.particles.spawn(
            px + 0.5,
            py + 0.5,
            dx * 3.5 + (ctx.rng.next() - 0.5),
            dy * 3.5 - 0.5,
            ctx.world.mat[i],
            ctx.world.temp[i],
            30,
          );
          ctx.world.convert(i, ID.AIR);
          if (--budget <= 0) break;
        }
      }
    }
  },
};

const GROUND_SLAM: Power = {
  name: "Ground Slam",
  mode: "tap",
  cooldown: 22,
  color: [240, 210, 120],
  fire(ctx) {
    // Kinetic blast (no fire) just ahead of the hero toward the aim.
    const { dx, dy } = aimDir(ctx);
    const bx = Math.round(ctx.hero.cx + dx * 8);
    const by = Math.round(ctx.hero.cy + dy * 8);
    explode(ctx.world, ctx.particles, bx, by, 14, 80, ctx.rng, 0.05);
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

function paintBlob(world: World, cx: number, cy: number, r: number, matId: number): void {
  world.paintCircle(cx, cy, r, matId);
}
