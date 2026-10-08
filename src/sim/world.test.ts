import { describe, it, expect } from "vitest";
import { World } from "./world.ts";
import { ID } from "./materials.ts";

describe("chunk sleeping", () => {
  it("wakes the chunk a painted cell lives in", () => {
    const world = new World(64, 64, 32, 1);
    world.paint(10, 10, ID.SAND); // chunk (0,0)
    world.beginFrame();
    expect(world.isChunkActive(0, 0)).toBe(true);
    expect(world.isChunkActive(1, 1)).toBe(false);
  });

  it("wakes neighbour chunks when touching a chunk border", () => {
    const world = new World(64, 64, 32, 1);
    world.paint(31, 10, ID.SAND); // right edge of chunk (0,0)
    world.beginFrame();
    expect(world.isChunkActive(0, 0)).toBe(true);
    expect(world.isChunkActive(1, 0)).toBe(true); // neighbour to the right
  });

  it("an untouched world sleeps completely after a frame", () => {
    const world = new World(64, 64, 32, 1);
    world.beginFrame(); // nothing was touched
    expect(world.activeChunks).toBe(0);
  });

  it("activity does not persist across frames unless re-touched", () => {
    const world = new World(64, 64, 32, 1);
    world.paint(10, 10, ID.SAND);
    world.beginFrame();
    expect(world.activeChunks).toBeGreaterThan(0);
    world.beginFrame(); // no new touches
    expect(world.activeChunks).toBe(0);
  });
});

describe("world storage", () => {
  it("swap exchanges material between two cells", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(1, 1, ID.SAND);
    world.paint(1, 2, ID.WATER);
    world.beginFrame();
    world.swap(1, 1, 1, 2);
    expect(world.get(1, 1)).toBe(ID.WATER);
    expect(world.get(1, 2)).toBe(ID.SAND);
  });

  it("marks a cell as moved for the current tick after a swap", () => {
    const world = new World(8, 8, 32, 1);
    world.paint(1, 1, ID.SAND);
    world.beginFrame();
    const i = world.idx(1, 2);
    expect(world.movedThisTick(i)).toBe(false);
    world.swap(1, 1, 1, 2);
    expect(world.movedThisTick(i)).toBe(true);
  });
});
