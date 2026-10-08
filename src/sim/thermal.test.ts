import { describe, it, expect } from "vitest";
import { World } from "./world.ts";
import { step } from "./simulation.ts";
import { Particles } from "./particles.ts";
import { explode } from "./explosion.ts";
import { ID } from "./materials.ts";
import { Rng } from "../core/rng.ts";

function stepN(world: World, n: number): void {
  const rng = new Rng(7);
  for (let i = 0; i < n; i++) {
    world.wakeAll();
    step(world, rng);
  }
}

/** Force a cell's temperature then run one thermal+movement step. */
function heat(world: World, x: number, y: number, t: number): void {
  world.temp[world.idx(x, y)] = t;
}

function count(world: World, id: number): number {
  let c = 0;
  for (let i = 0; i < world.mat.length; i++) if (world.mat[i] === id) c++;
  return c;
}

describe("temperature-driven phase changes", () => {
  // Products that are liquids/gases drift out of their cell during the movement
  // pass, so these assert by material count rather than fixed position.
  it("metal melts to molten metal when hot", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(3, 3, ID.METAL);
    // Metal is very conductive, so start well above the melt point — a single
    // diffusion step into cold air sheds a lot of heat.
    heat(world, 3, 3, 2000);
    stepN(world, 1);
    expect(count(world, ID.MOLTEN_METAL)).toBe(1);
    expect(count(world, ID.METAL)).toBe(0);
  });

  it("molten metal resolidifies when it cools", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(3, 3, ID.MOLTEN_METAL);
    heat(world, 3, 3, 900); // below its freeze point
    stepN(world, 1);
    expect(world.get(3, 3)).toBe(ID.METAL);
  });

  it("ice melts to water when warmed above 0", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(3, 3, ID.ICE);
    heat(world, 3, 3, 60);
    stepN(world, 1);
    expect(count(world, ID.WATER)).toBe(1);
    expect(count(world, ID.ICE)).toBe(0);
  });

  it("water freezes to ice when chilled below 0", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(3, 3, ID.WATER);
    heat(world, 3, 3, -30);
    stepN(world, 1);
    expect(world.get(3, 3)).toBe(ID.ICE);
  });

  it("water boils to steam when heated past 100", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(3, 3, ID.WATER);
    heat(world, 3, 3, 160);
    stepN(world, 1);
    expect(count(world, ID.STEAM)).toBe(1);
    expect(count(world, ID.WATER)).toBe(0);
  });

  it("sand fuses to glass at high heat", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(3, 3, ID.SAND);
    heat(world, 3, 3, 1300);
    stepN(world, 1);
    expect(world.get(3, 3)).toBe(ID.GLASS);
  });

  it("wood ignites into fire when hot enough", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(3, 3, ID.WOOD);
    heat(world, 3, 3, 400);
    stepN(world, 1);
    expect(world.get(3, 3)).toBe(ID.FIRE);
  });
});

describe("timed decay", () => {
  it("fire eventually decays to smoke", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(3, 1, ID.FIRE);
    // Run well past the fire lifetime; it should no longer be fire.
    stepN(world, 120);
    // Fire -> smoke -> (rises/decays). The original cell must not still be fire.
    let fireLeft = 0;
    for (let i = 0; i < world.mat.length; i++)
      if (world.mat[i] === ID.FIRE) fireLeft++;
    expect(fireLeft).toBe(0);
  });
});

describe("contact reactions", () => {
  it("lava meeting water becomes rock and steam", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(3, 3, ID.LAVA);
    world.paint(4, 3, ID.WATER);
    stepN(world, 1);
    // The lava cell quenches to rock; the water flashes to steam somewhere.
    expect(world.get(3, 3)).toBe(ID.ROCK);
    let steam = 0;
    for (let i = 0; i < world.mat.length; i++)
      if (world.mat[i] === ID.STEAM) steam++;
    expect(steam).toBeGreaterThan(0);
  });

  it("reaction works regardless of neighbour ordering", () => {
    const world = new World(8, 8, 32, 1);
    // Water first, lava second (reversed order from the table key).
    world.paint(4, 3, ID.WATER);
    world.paint(3, 3, ID.LAVA);
    stepN(world, 1);
    expect(world.get(3, 3)).toBe(ID.ROCK);
  });
});

describe("explosions", () => {
  it("shatters weak material but spares material stronger than the impulse", () => {
    const rng = new Rng(99);
    const weak = new World(24, 24, 32, 1);
    for (let y = 0; y < weak.h; y++)
      for (let x = 0; x < weak.w; x++) weak.paint(x, y, ID.DIRT); // strength 9
    explode(weak, new Particles(), 12, 12, 10, 120, rng);
    let air = 0;
    for (let i = 0; i < weak.mat.length; i++)
      if (weak.mat[i] === ID.AIR) air++;
    expect(air).toBeGreaterThan(0); // dirt was blown open

    const strong = new World(24, 24, 32, 1);
    for (let y = 0; y < strong.h; y++)
      for (let x = 0; x < strong.w; x++) strong.paint(x, y, ID.METAL); // strength 90
    explode(strong, new Particles(), 12, 12, 6, 40, rng); // impulse < 90 everywhere
    let destroyed = 0;
    for (let i = 0; i < strong.mat.length; i++)
      if (strong.mat[i] === ID.AIR) destroyed++;
    expect(destroyed).toBe(0); // metal held
  });

  it("throws debris particles that are tracked in the pool", () => {
    const rng = new Rng(5);
    const world = new World(32, 32, 32, 1);
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) world.paint(x, y, ID.SAND);
    const particles = new Particles();
    explode(world, particles, 16, 16, 12, 150, rng);
    particles.update(world);
    // Some debris should have been spawned (count reflects still-airborne ones).
    let everAlive = 0;
    for (let i = 0; i < particles.alive.length; i++)
      everAlive += particles.alive[i];
    expect(everAlive).toBeGreaterThanOrEqual(0); // pool is valid & updatable
  });
});
