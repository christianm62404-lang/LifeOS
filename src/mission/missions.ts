import { World } from "../sim/world.ts";
import { ID } from "../sim/materials.ts";
import { Rng } from "../core/rng.ts";
import { WORLD_H, WORLD_W } from "../sim/constants.ts";
import type { Civilian, FailCond, Objective } from "./objectives.ts";

export interface Mission {
  id: string;
  name: string;
  blurb: string;
  badge?: string;
  spawn: { x: number; y: number };
  /** Build the scene; returns any civilians to rescue. */
  generate: (world: World, rng: Rng) => Civilian[];
  objectives: Objective[];
  fail: FailCond[];
  /** Seconds before the mission auto-fails (unless already won). 0 = none. */
  timeLimit: number;
}

// --- build helpers -------------------------------------------------------

function rect(world: World, x0: number, y0: number, x1: number, y1: number, mat: number): void {
  for (let y = Math.max(0, y0); y <= Math.min(WORLD_H - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(WORLD_W - 1, x1); x++) {
      world.paint(x, y, mat);
    }
  }
}

function civ(x: number, y: number): Civilian {
  return { x, y, rescued: false, lost: false };
}

// --- missions ------------------------------------------------------------

const COOL_THE_FLOW: Mission = {
  id: "cool-the-flow",
  name: "Cool the Flow",
  blurb: "Lava is pouring down the slope toward the village. Hold it back for 25 seconds.",
  badge: "VOLCANO",
  spawn: { x: 230, y: 70 },
  generate(world) {
    // Descending rock slope, high-left to low-right.
    for (let x = 0; x < WORLD_W; x++) {
      const g = Math.floor(120 + (x / WORLD_W) * 120);
      for (let y = g; y < WORLD_H; y++) world.paint(x, y, y - g < 6 ? ID.DIRT : ID.ROCK);
    }
    // Village of wood at the bottom-right.
    for (let hx = 410; hx < WORLD_W - 10; hx += 26) {
      const g = Math.floor(120 + (hx / WORLD_W) * 120);
      for (let yy = g - 18; yy < g; yy++)
        for (let xx = hx; xx < hx + 16; xx++) {
          const edge = xx === hx || xx === hx + 15 || yy === g - 18;
          if (edge) world.paint(xx, yy, ID.WOOD);
        }
    }
    // Lava reservoir at the top-left behind a lip — it spills down the slope.
    rect(world, 40, 112, 140, 128, ID.LAVA);
    world.wakeAll();
    return [];
  },
  objectives: [{ kind: "survive", label: "Keep lava out of the village for 25s", seconds: 25 }],
  fail: [
    {
      kind: "materialIn",
      label: "Lava reached the village",
      region: { x0: 405, y0: 150, x1: WORLD_W - 1, y1: 250 },
      material: ID.LAVA,
    },
  ],
  timeLimit: 0,
};

const FILL_THE_CISTERN: Mission = {
  id: "fill-the-cistern",
  name: "Fill the Cistern",
  blurb: "A dry stone cistern needs water. Fill at least 60% of it — use the Water Jet or break a reservoir.",
  badge: "WATER",
  spawn: { x: 120, y: 60 },
  generate(world) {
    // A big rock block with a hollow cistern and an open top.
    rect(world, 180, 120, 340, 250, ID.ROCK);
    rect(world, 196, 128, 324, 244, ID.AIR); // hollow
    rect(world, 240, 120, 280, 127, ID.AIR); // open mouth at the top
    // A primed reservoir above with a thin plug the player can break.
    rect(world, 120, 60, 240, 95, ID.WATER);
    rect(world, 120, 96, 240, 100, ID.ROCK); // plug
    world.wakeAll();
    return [];
  },
  objectives: [
    {
      kind: "fill",
      label: "Fill the cistern with water (60%)",
      region: { x0: 196, y0: 128, x1: 324, y1: 244 },
      material: ID.WATER,
      min: 0.6,
    },
  ],
  fail: [],
  timeLimit: 0,
};

const STILL_THE_SURGE: Mission = {
  id: "still-the-surge",
  name: "Still the Surge",
  blurb: "A surging flood fills the basin. Freeze it solid — turn at least half of it to ice.",
  badge: "ICE",
  spawn: { x: 256, y: 50 },
  generate(world) {
    // A broad basin brimming with water.
    rect(world, 0, 240, WORLD_W - 1, WORLD_H - 1, ID.ROCK); // floor
    rect(world, 60, 60, 110, 240, ID.ROCK); // left wall
    rect(world, WORLD_W - 110, 60, WORLD_W - 60, 240, ID.ROCK); // right wall
    rect(world, 111, 120, WORLD_W - 111, 239, ID.WATER); // the surge
    world.wakeAll();
    return [];
  },
  objectives: [
    {
      kind: "fill",
      label: "Freeze the flood to ice (50%)",
      region: { x0: 111, y0: 120, x1: WORLD_W - 111, y1: 239 },
      material: ID.ICE,
      min: 0.5,
    },
  ],
  fail: [],
  timeLimit: 0,
};

const BRING_IT_DOWN: Mission = {
  id: "bring-it-down",
  name: "Bring It Down",
  blurb: "Demolish the foundry tower in under 30 seconds. Melt it, slam it, blow it apart.",
  badge: "30s",
  spawn: { x: 120, y: 80 },
  generate(world) {
    rect(world, 0, WORLD_H - 16, WORLD_W - 1, WORLD_H - 1, ID.METAL); // floor
    // A tall metal tower on the right.
    rect(world, 300, 40, 360, WORLD_H - 16, ID.METAL);
    rect(world, 312, 52, 348, WORLD_H - 28, ID.ROCK); // inner core
    world.wakeAll();
    return [];
  },
  objectives: [
    {
      kind: "demolish",
      label: "Reduce the tower to rubble (<20% solid)",
      region: { x0: 296, y0: 36, x1: 364, y1: WORLD_H - 18 },
      max: 0.2,
    },
  ],
  fail: [],
  timeLimit: 30,
};

const EVACUATION: Mission = {
  id: "evacuation",
  name: "Evacuation",
  blurb: "Reach all five civilians before the rising lava claims them. 60 seconds.",
  badge: "RESCUE",
  spawn: { x: 256, y: 40 },
  generate(world) {
    // Ledged canyon with a lava floor creeping up.
    rect(world, 0, WORLD_H - 40, WORLD_W - 1, WORLD_H - 1, ID.LAVA);
    rect(world, 0, WORLD_H - 44, WORLD_W - 1, WORLD_H - 41, ID.ROCK);
    const ledges = [
      [60, 210],
      [180, 180],
      [300, 205],
      [400, 165],
      [460, 200],
    ];
    const civs: Civilian[] = [];
    for (const [lx, ly] of ledges) {
      rect(world, lx - 14, ly, lx + 14, ly + 5, ID.ROCK); // ledge
      civs.push(civ(lx, ly - 3));
    }
    world.wakeAll();
    return civs;
  },
  objectives: [{ kind: "rescue", label: "Rescue all civilians" }],
  fail: [],
  timeLimit: 60,
};

const HOLD_THE_LINE: Mission = {
  id: "hold-the-line",
  name: "Hold the Line",
  blurb: "The cracked dam is leaking toward town. Patch it and keep the water out for 35 seconds.",
  badge: "DAM",
  spawn: { x: 120, y: 60 },
  generate(world) {
    const floorY = WORLD_H - 20;
    rect(world, 0, floorY, WORLD_W - 1, WORLD_H - 1, ID.ROCK);
    rect(world, 0, 150, 220, floorY - 1, ID.ROCK); // left shelf
    rect(world, 221, 70, 228, floorY - 1, ID.METAL); // dam wall
    rect(world, 223, 150, 226, 160, ID.AIR); // the crack (leak)
    rect(world, 0, 90, 220, 149, ID.WATER); // reservoir
    // Town on the right.
    for (let hx = 300; hx < WORLD_W - 20; hx += 28) {
      for (let yy = floorY - 16; yy < floorY; yy++)
        for (let xx = hx; xx < hx + 16; xx++) {
          const edge = xx === hx || xx === hx + 15 || yy === floorY - 16;
          if (edge) world.paint(xx, yy, ID.WOOD);
        }
    }
    world.wakeAll();
    return [];
  },
  objectives: [{ kind: "survive", label: "Keep the town dry for 35s", seconds: 35 }],
  fail: [
    {
      kind: "materialIn",
      label: "Water flooded the town",
      region: { x0: 290, y0: WORLD_H - 40, x1: WORLD_W - 1, y1: WORLD_H - 1 },
      material: ID.WATER,
    },
  ],
  timeLimit: 0,
};

export const MISSIONS: readonly Mission[] = [
  COOL_THE_FLOW,
  FILL_THE_CISTERN,
  STILL_THE_SURGE,
  BRING_IT_DOWN,
  EVACUATION,
  HOLD_THE_LINE,
];

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}
