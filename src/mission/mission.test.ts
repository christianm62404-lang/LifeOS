import { describe, it, expect } from "vitest";
import { World } from "../sim/world.ts";
import { ID } from "../sim/materials.ts";
import { Particles } from "../sim/particles.ts";
import { CollapseSystem } from "../sim/collapse.ts";
import { Hero } from "../entity/hero.ts";
import { Rng } from "../core/rng.ts";
import { MISSIONS, missionById, type Mission } from "./missions.ts";
import { MissionController } from "./runtime.ts";
import { evaluateObjective, type MissionRuntime } from "./objectives.ts";

function fillRegion(world: World, r: { x0: number; y0: number; x1: number; y1: number }, mat: number): void {
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) world.paint(x, y, mat);
}

function makeHero(world: World): Hero {
  return new Hero(world, new Particles(), new CollapseSystem(world), new Rng(1), 0, 0);
}

describe("objective evaluation", () => {
  const rt: MissionRuntime = { elapsed: 0, civilians: [], baselines: [0] };

  it("fill completes when the region reaches the threshold", () => {
    const world = new World(16, 16, 32, 1);
    const region = { x0: 0, y0: 0, x1: 9, y1: 9 };
    const obj = { kind: "fill" as const, label: "", region, material: ID.WATER, min: 0.5 };
    expect(evaluateObjective(obj, 0, world, rt).done).toBe(false);
    fillRegion(world, region, ID.WATER);
    expect(evaluateObjective(obj, 0, world, rt).done).toBe(true);
  });

  it("survive tracks elapsed time", () => {
    const obj = { kind: "survive" as const, label: "", seconds: 1 };
    expect(evaluateObjective(obj, 0, new World(8, 8, 32, 1), { ...rt, elapsed: 0.5 }).progress).toBeCloseTo(0.5, 1);
    expect(evaluateObjective(obj, 0, new World(8, 8, 32, 1), { ...rt, elapsed: 1.2 }).done).toBe(true);
  });
});

describe("mission registry", () => {
  it("ships exactly 6 missions with unique ids", () => {
    expect(MISSIONS.length).toBe(6);
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(6);
  });
  it("missionById resolves known and unknown ids", () => {
    expect(missionById("evacuation")!.name).toBe("Evacuation");
    expect(missionById("nope")).toBeUndefined();
  });
});

describe("mission controller", () => {
  const demolishMission: Mission = {
    id: "t",
    name: "T",
    blurb: "",
    spawn: { x: 0, y: 0 },
    generate: () => [],
    objectives: [{ kind: "demolish", label: "", region: { x0: 0, y0: 0, x1: 9, y1: 9 }, max: 0.2 }],
    fail: [],
    timeLimit: 0,
  };

  it("wins a demolish mission once the region is cleared", () => {
    const world = new World(16, 16, 32, 1);
    fillRegion(world, { x0: 0, y0: 0, x1: 9, y1: 9 }, ID.ROCK);
    const ctrl = new MissionController(demolishMission, [], world);
    const hero = makeHero(world);
    ctrl.update(world, hero);
    expect(ctrl.status).toBe("active");
    fillRegion(world, { x0: 0, y0: 0, x1: 9, y1: 9 }, ID.AIR); // demolished
    ctrl.update(world, hero);
    expect(ctrl.status).toBe("won");
  });

  it("loses when a fail condition triggers", () => {
    const protectMission: Mission = {
      id: "p",
      name: "P",
      blurb: "",
      spawn: { x: 0, y: 0 },
      generate: () => [],
      objectives: [{ kind: "survive", label: "", seconds: 999 }],
      fail: [{ kind: "materialIn", label: "flooded", region: { x0: 0, y0: 0, x1: 4, y1: 4 }, material: ID.WATER }],
      timeLimit: 0,
    };
    const world = new World(16, 16, 32, 1);
    const ctrl = new MissionController(protectMission, [], world);
    const hero = makeHero(world);
    world.paint(2, 2, ID.WATER);
    ctrl.update(world, hero);
    expect(ctrl.status).toBe("lost");
    expect(ctrl.failReason).toBe("flooded");
  });

  it("rescues a civilian when the hero reaches it, and wins", () => {
    const world = new World(64, 64, 32, 1);
    const rescueMission: Mission = {
      id: "r",
      name: "R",
      blurb: "",
      spawn: { x: 0, y: 0 },
      generate: () => [{ x: 30, y: 30, rescued: false, lost: false }],
      objectives: [{ kind: "rescue", label: "" }],
      fail: [],
      timeLimit: 0,
    };
    const civs = rescueMission.generate(world, new Rng(1));
    const ctrl = new MissionController(rescueMission, civs, world);
    const hero = makeHero(world);
    hero.cx = 30;
    hero.cy = 30; // right on the civilian
    ctrl.update(world, hero);
    expect(ctrl.civilians[0].rescued).toBe(true);
    expect(ctrl.status).toBe("won");
  });
});
