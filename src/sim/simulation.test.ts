import { describe, it, expect } from "vitest";
import { World } from "./world.ts";
import { step } from "./simulation.ts";
import { ID } from "./materials.ts";
import { Rng } from "../core/rng.ts";

/**
 * A tiny deterministic world for unit tests. 32-wide so it is a single chunk
 * column; we wake everything each step so chunk sleeping never hides a bug.
 */
function makeWorld(w = 8, h = 16): World {
  return new World(w, h, 32, 1);
}

function stepN(world: World, n: number): void {
  const rng = new Rng(42);
  for (let i = 0; i < n; i++) {
    world.wakeAll();
    step(world, rng);
  }
}

describe("powder physics", () => {
  it("sand falls straight down through air until it lands", () => {
    const world = makeWorld();
    world.paint(3, 0, ID.SAND);
    stepN(world, 20);
    expect(world.get(3, world.h - 1)).toBe(ID.SAND);
    expect(world.get(3, 0)).toBe(ID.AIR);
  });

  it("sand piles up instead of overlapping", () => {
    const world = makeWorld();
    // Drop several grains into the same column.
    for (let i = 0; i < 4; i++) world.paint(3, i, ID.SAND);
    stepN(world, 40);
    let count = 0;
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) if (world.get(x, y) === ID.SAND) count++;
    }
    // Conservation: no grains destroyed or duplicated.
    expect(count).toBe(4);
  });

  it("sand forms a slope off a single pillar (diagonal fall)", () => {
    const world = makeWorld(9, 12);
    // Floor of rock.
    for (let x = 0; x < world.w; x++) world.paint(x, world.h - 1, ID.ROCK);
    // Pour many grains onto the same top cell.
    for (let i = 0; i < 12; i++) {
      world.paint(4, 0, ID.SAND);
      stepN(world, 6);
    }
    // The pile should have spread beyond the single source column.
    const bottomRow = world.h - 2;
    let width = 0;
    for (let x = 0; x < world.w; x++) {
      if (world.get(x, bottomRow) === ID.SAND) width++;
    }
    expect(width).toBeGreaterThan(1);
  });
});

describe("liquid physics", () => {
  it("water spreads sideways to find its level", () => {
    const world = makeWorld(9, 10);
    // Rock floor.
    for (let x = 0; x < world.w; x++) world.paint(x, world.h - 1, ID.ROCK);
    // A column of water in the middle.
    for (let y = 2; y < world.h - 1; y++) world.paint(4, y, ID.WATER);
    stepN(world, 60);
    // Water should now occupy cells left and right of the original column.
    const floor = world.h - 2;
    let width = 0;
    for (let x = 0; x < world.w; x++) {
      if (world.get(x, floor) === ID.WATER) width++;
    }
    expect(width).toBeGreaterThan(1);
  });

  it("conserves water volume while spreading", () => {
    const world = makeWorld(9, 10);
    for (let x = 0; x < world.w; x++) world.paint(x, world.h - 1, ID.ROCK);
    let before = 0;
    for (let y = 2; y < world.h - 1; y++) {
      world.paint(4, y, ID.WATER);
      before++;
    }
    stepN(world, 60);
    let after = 0;
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++)
        if (world.get(x, y) === ID.WATER) after++;
    expect(after).toBe(before);
  });
});

describe("density displacement", () => {
  it("sand sinks through lighter water and swaps upward", () => {
    // A sealed 1-wide well so the displaced water can't escape sideways and we
    // can assert the swap directly.
    const world = makeWorld(5, 10);
    for (let x = 0; x < world.w; x++) world.paint(x, world.h - 1, ID.ROCK); // floor
    for (let y = 1; y < world.h - 1; y++) {
      world.paint(1, y, ID.ROCK); // left wall
      world.paint(3, y, ID.ROCK); // right wall
    }
    for (let y = 2; y < world.h - 1; y++) world.paint(2, y, ID.WATER); // water
    world.paint(2, 1, ID.SAND); // grain on top, inside the well
    stepN(world, 40);
    // Sand (denser) sinks to the bottom of the well...
    expect(world.get(2, world.h - 2)).toBe(ID.SAND);
    // ...and water is pushed up to the top cell it vacated.
    expect(world.get(2, 1)).toBe(ID.WATER);
  });

  it("does not let sand pass through a solid rock floor", () => {
    const world = makeWorld(5, 8);
    const floor = 5;
    for (let x = 0; x < world.w; x++) world.paint(x, floor, ID.ROCK);
    world.paint(2, 0, ID.SAND);
    stepN(world, 20);

    // Floor is intact — sand never overwrote rock.
    for (let x = 0; x < world.w; x++) expect(world.get(x, floor)).toBe(ID.ROCK);

    // Exactly one grain survives, resting on or above the floor.
    let count = 0;
    let sandY = -1;
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        if (world.get(x, y) === ID.SAND) {
          count++;
          sandY = y;
        }
      }
    }
    expect(count).toBe(1);
    expect(sandY).toBeLessThan(floor);

    // Nothing leaked below the floor.
    for (let y = floor + 1; y < world.h; y++)
      for (let x = 0; x < world.w; x++) expect(world.get(x, y)).toBe(ID.AIR);
  });
});
