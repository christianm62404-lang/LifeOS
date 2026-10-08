import { describe, it, expect } from "vitest";
import { World } from "../sim/world.ts";
import { ID } from "../sim/materials.ts";
import {
  applyLevel,
  decodeCells,
  decodeLevel,
  encodeCells,
  encodeLevel,
  levelFromWorld,
  levelToMission,
  type CustomLevel,
} from "./level.ts";

function buildWorld(): World {
  const world = new World();
  for (let x = 100; x < 200; x++) for (let y = 150; y < 200; y++) world.paint(x, y, ID.ROCK);
  for (let x = 120; x < 160; x++) for (let y = 120; y < 150; y++) world.paint(x, y, ID.WATER);
  return world;
}

describe("RLE cell codec", () => {
  it("round-trips an arbitrary material grid", () => {
    const world = buildWorld();
    const encoded = encodeCells(world.mat);
    const out = new Uint8Array(world.mat.length);
    decodeCells(encoded, out);
    expect(Array.from(out)).toEqual(Array.from(world.mat));
  });

  it("compresses a mostly-empty world well", () => {
    const world = new World();
    world.paint(10, 10, ID.ROCK);
    // A near-empty world should encode to only a couple of runs.
    expect(encodeCells(world.mat).split(".").length).toBeLessThan(5);
  });
});

describe("level share string", () => {
  it("round-trips a full level through base64", () => {
    const world = buildWorld();
    const level = levelFromWorld(world, {
      name: "Test",
      spawn: { x: 50, y: 40 },
      civilians: [{ x: 10, y: 20 }],
      goal: { kind: "fill-water", zone: { x0: 0, y0: 0, x1: 50, y1: 50 }, seconds: 20 },
      timeLimit: 30,
    });
    const str = encodeLevel(level);
    const back = decodeLevel(str);
    expect(back.name).toBe("Test");
    expect(back.spawn).toEqual({ x: 50, y: 40 });
    expect(back.civilians.length).toBe(1);
    expect(back.goal?.kind).toBe("fill-water");
    expect(back.timeLimit).toBe(30);
  });

  it("rejects a corrupt string", () => {
    expect(() => decodeLevel("not-valid-base64!!!")).toThrow();
  });
});

describe("applyLevel / levelToMission", () => {
  it("applyLevel reconstructs the authored grid", () => {
    const src = buildWorld();
    const level = levelFromWorld(src, { name: "L", spawn: { x: 0, y: 0 }, civilians: [], timeLimit: 0 });
    const dst = new World();
    applyLevel(level, dst);
    expect(Array.from(dst.mat)).toEqual(Array.from(src.mat));
  });

  it("levelToMission carries civilians and objectives", () => {
    const world = buildWorld();
    const level: CustomLevel = {
      ...levelFromWorld(world, {
        name: "M",
        spawn: { x: 5, y: 5 },
        civilians: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
        goal: { kind: "rescue", zone: { x0: 0, y0: 0, x1: 1, y1: 1 } },
        timeLimit: 45,
      }),
    };
    const mission = levelToMission(level);
    expect(mission.timeLimit).toBe(45);
    expect(mission.objectives[0].kind).toBe("rescue");
    const dst = new World();
    const civs = mission.generate(dst, { next: () => 0, int: () => 0, sign: () => 1 } as never);
    expect(civs.length).toBe(2);
  });
});
