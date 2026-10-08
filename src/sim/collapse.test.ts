import { describe, it, expect } from "vitest";
import { World } from "./world.ts";
import { CollapseSystem } from "./collapse.ts";
import { Particles } from "./particles.ts";
import { ID } from "./materials.ts";
import { Rng } from "../core/rng.ts";

function fillFloor(world: World): void {
  for (let x = 0; x < world.w; x++) world.paint(x, world.h - 1, ID.ROCK);
}

function countMat(world: World, id: number): number {
  let c = 0;
  for (let i = 0; i < world.mat.length; i++) if (world.mat[i] === id) c++;
  return c;
}

describe("structural collapse", () => {
  it("detaches a floating solid component into a rigid body", () => {
    const world = new World(32, 64, 32, 1);
    fillFloor(world);
    // A 3x3 rock block floating in mid-air (not touching the floor).
    for (let y = 5; y < 8; y++) for (let x = 10; x < 13; x++) world.paint(x, y, ID.ROCK);

    const collapse = new CollapseSystem(world);
    const particles = new Particles();
    const rng = new Rng(1);

    collapse.markRegion(9, 4, 13, 8);
    collapse.update(particles, rng);

    // The block became a body and was lifted out of the grid.
    expect(collapse.bodies.length).toBe(1);
    expect(collapse.bodies[0].n).toBe(9);
    for (let y = 5; y < 8; y++)
      for (let x = 10; x < 13; x++) expect(world.get(x, y)).toBe(ID.AIR);
  });

  it("does NOT detach a component anchored to the floor", () => {
    const world = new World(32, 64, 32, 1);
    fillFloor(world);
    // A column resting on the floor.
    for (let y = world.h - 10; y < world.h - 1; y++) world.paint(15, y, ID.ROCK);
    const before = countMat(world, ID.ROCK);

    const collapse = new CollapseSystem(world);
    collapse.markRegion(14, world.h - 11, 16, world.h - 1);
    collapse.update(new Particles(), new Rng(1));

    expect(collapse.bodies.length).toBe(0);
    expect(countMat(world, ID.ROCK)).toBe(before);
  });

  it("collapses the top of a tower when its base is removed", () => {
    const world = new World(32, 64, 32, 1);
    fillFloor(world);
    // A tower standing on the floor.
    for (let y = world.h - 20; y < world.h - 1; y++) world.paint(16, y, ID.METAL);

    const collapse = new CollapseSystem(world);
    // Blow out the base (two cells just above the floor).
    world.paint(16, world.h - 2, ID.AIR);
    world.paint(16, world.h - 3, ID.AIR);
    collapse.markRegion(15, world.h - 20, 17, world.h - 1);
    collapse.update(new Particles(), new Rng(1));

    // The disconnected upper section should now be a falling body.
    expect(collapse.bodies.length).toBe(1);
  });

  it("a fallen body lands and re-enters the grid as cells", () => {
    const world = new World(32, 64, 32, 1);
    fillFloor(world);
    for (let y = 4; y < 7; y++) for (let x = 10; x < 13; x++) world.paint(x, y, ID.ROCK);

    const collapse = new CollapseSystem(world);
    const particles = new Particles();
    const rng = new Rng(1);
    collapse.markRegion(9, 3, 13, 7);

    // Run long enough for the body to fall to the floor and settle.
    for (let i = 0; i < 400 && collapse.bodies.length >= 0; i++) {
      collapse.update(particles, rng);
      if (collapse.bodies.length === 0 && i > 2) break;
    }
    expect(collapse.bodies.length).toBe(0);
    // The 9 rock cells (minus any thrown as debris) landed above the floor.
    const rockNearFloor = (() => {
      let c = 0;
      for (let y = world.h - 6; y < world.h - 1; y++)
        for (let x = 0; x < world.w; x++) if (world.get(x, y) === ID.ROCK) c++;
      return c;
    })();
    expect(rockNearFloor).toBeGreaterThan(0);
  });
});
