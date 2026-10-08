import { describe, it, expect } from "vitest";
import { World } from "./world.ts";
import { WORLDS, worldById } from "./worldgen.ts";
import { Rng } from "../core/rng.ts";
import { ID } from "./materials.ts";

describe("world generators", () => {
  for (const def of WORLDS) {
    it(`${def.name} fills the world and spawns the hero in bounds`, () => {
      const world = new World();
      def.generate(world, new Rng(1));
      // Not empty: some non-air cells were placed.
      let solidish = 0;
      for (let i = 0; i < world.mat.length; i++) if (world.mat[i] !== ID.AIR) solidish++;
      expect(solidish).toBeGreaterThan(world.mat.length * 0.05);
      // Spawn point inside the world.
      expect(def.spawn.x).toBeGreaterThanOrEqual(0);
      expect(def.spawn.x).toBeLessThan(world.w);
      expect(def.spawn.y).toBeGreaterThanOrEqual(0);
      expect(def.spawn.y).toBeLessThan(world.h);
    });
  }

  it("worldById falls back to the first world for an unknown id", () => {
    expect(worldById("nope")).toBe(WORLDS[0]);
    expect(worldById("frozen").id).toBe("frozen");
  });
});
