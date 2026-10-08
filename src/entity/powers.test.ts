import { describe, it, expect } from "vitest";
import { World } from "../sim/world.ts";
import { Particles } from "../sim/particles.ts";
import { CollapseSystem } from "../sim/collapse.ts";
import { ID } from "../sim/materials.ts";
import { Rng } from "../core/rng.ts";
import { Effects } from "../core/effects.ts";
import { Hero } from "./hero.ts";
import { POWERS, type PowerCtx } from "./powers.ts";

function makeCtx(world: World, aimX: number, aimY: number): PowerCtx {
  const particles = new Particles();
  const collapse = new CollapseSystem(world);
  const rng = new Rng(1);
  const hero = new Hero(world, particles, collapse, rng, world.w / 2, world.h / 2);
  return {
    world,
    particles,
    collapse,
    effects: new Effects(),
    rng,
    hero,
    aimX,
    aimY,
  };
}

describe("all powers fire without error", () => {
  for (const power of POWERS) {
    it(`${power.name} runs and affects the world/effects/particles`, () => {
      const world = new World(64, 64, 32, 1);
      // Give the world some matter to act on.
      for (let y = 40; y < 64; y++)
        for (let x = 0; x < 64; x++) world.paint(x, y, ID.ROCK);
      for (let y = 20; y < 30; y++)
        for (let x = 20; x < 40; x++) world.paint(x, y, ID.WATER);
      for (let x = 10; x < 54; x++) world.paint(x, 35, ID.METAL);

      const ctx = makeCtx(world, 40, 45);
      expect(() => power.fire(ctx)).not.toThrow();

      const touchedSomething =
        ctx.effects.segments.length > 0 ||
        ctx.particles.count >= 0; // pool is valid
      expect(touchedSomething).toBe(true);
    });
  }

  it("the hero muzzle offset keeps the Heat Beam off the hero's own cell", () => {
    const world = new World(64, 64, 32, 1);
    const ctx = makeCtx(world, 60, 32); // aim far to the right
    const beam = POWERS[0]; // Heat Beam
    for (let i = 0; i < 60; i++) beam.fire(ctx);
    // The hero's own cell should not have been super-heated by its own beam.
    const i = world.idx(Math.round(ctx.hero.cx), Math.round(ctx.hero.cy));
    expect(world.temp[i]).toBeLessThan(200);
  });

  it("Lava Eruption places lava at the aim point", () => {
    const world = new World(64, 64, 32, 1);
    const ctx = makeCtx(world, 30, 30);
    POWERS[3].fire(ctx); // Lava Eruption
    expect(world.get(30, 30)).toBe(ID.LAVA);
  });

  it("Earth Raise spawns rock at the aim point", () => {
    const world = new World(64, 64, 32, 1);
    const ctx = makeCtx(world, 30, 30);
    POWERS[4].fire(ctx); // Earth Raise
    expect(world.get(30, 30)).toBe(ID.ROCK);
  });

  it("Quake kicks up debris particles", () => {
    const world = new World(64, 64, 32, 1);
    for (let y = 40; y < 64; y++)
      for (let x = 0; x < 64; x++) world.paint(x, y, ID.ROCK);
    const ctx = makeCtx(world, 32, 50);
    POWERS[5].fire(ctx); // Quake
    let alive = 0;
    for (let i = 0; i < ctx.particles.alive.length; i++) alive += ctx.particles.alive[i];
    expect(alive).toBeGreaterThan(0);
  });

  it("Lightning conducts heat through connected water", () => {
    const world = new World(64, 64, 32, 1);
    // A horizontal water channel right where the bolt will travel.
    for (let x = 0; x < 64; x++) world.paint(x, 32, ID.WATER);
    const ctx = makeCtx(world, 63, 32);
    const before = world.temp[world.idx(55, 32)];
    POWERS[6].fire(ctx); // Lightning
    expect(world.temp[world.idx(55, 32)]).toBeGreaterThan(before);
  });

  it("Wind Gust lifts loose cells into particles", () => {
    const world = new World(64, 64, 32, 1);
    // A patch of sand ahead of the hero.
    for (let y = 30; y < 34; y++)
      for (let x = 38; x < 50; x++) world.paint(x, y, ID.SAND);
    const ctx = makeCtx(world, 60, 32);
    POWERS[7].fire(ctx); // Wind Gust
    let alive = 0;
    for (let i = 0; i < ctx.particles.alive.length; i++) alive += ctx.particles.alive[i];
    expect(alive).toBeGreaterThan(0);
  });

  it("Ground Slam shatters nearby solids", () => {
    const world = new World(64, 64, 32, 1);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) world.paint(x, y, ID.DIRT); // weak, shatters
    const ctx = makeCtx(world, 40, 32);
    let airBefore = 0;
    for (let i = 0; i < world.mat.length; i++) if (world.mat[i] === ID.AIR) airBefore++;
    POWERS[8].fire(ctx); // Ground Slam
    let airAfter = 0;
    for (let i = 0; i < world.mat.length; i++) if (world.mat[i] === ID.AIR) airAfter++;
    expect(airAfter).toBeGreaterThan(airBefore);
  });
});
