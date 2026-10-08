import { World } from "../sim/world.ts";
import { ID } from "../sim/materials.ts";
import { WORLD_H, WORLD_W } from "../sim/constants.ts";
import { Rng } from "../core/rng.ts";
import type { Region } from "../mission/objectives.ts";

/** A weak point: a region you must empty of armour (solid/lava/ice) to break. */
export interface CoreSpec {
  label: string;
  region: Region;
}

export interface KaijuDef {
  id: string;
  name: string;
  blurb: string;
  badge: string;
  heroSpawn: { x: number; y: number };
  /** Material the kaiju hurls at the hero. */
  projectile: number;
  /** Seconds between attacks. */
  attackInterval: number;
  attacks: ("stomp" | "hurl")[];
  /** Build the arena + body, return the weak-point cores. */
  build: (world: World, rng: Rng) => CoreSpec[];
}

function rect(world: World, x0: number, y0: number, x1: number, y1: number, mat: number): void {
  for (let y = Math.max(0, y0); y <= Math.min(WORLD_H - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(WORLD_W - 1, x1); x++) world.paint(x, y, mat);
  }
}

const groundY = WORLD_H - 18;

function ground(world: World, mat: number = ID.ROCK): void {
  rect(world, 0, groundY, WORLD_W - 1, WORLD_H - 1, mat);
}

/**
 * Cragmaw, a rock golem. Shatter the glass cores behind its rock armour —
 * melt or blast the rock away, then break the exposed cores.
 */
const ROCK_GOLEM: KaijuDef = {
  id: "cragmaw",
  name: "Cragmaw",
  blurb: "A towering rock golem. Strip its armour and shatter the three glass cores.",
  badge: "GOLEM",
  heroSpawn: { x: 90, y: 60 },
  projectile: ID.ROCK,
  attackInterval: 3.2,
  attacks: ["stomp", "hurl"],
  build(world) {
    ground(world);
    const cx = Math.floor(WORLD_W * 0.62);
    const topY = groundY - 120;
    // Torso + head + arms of rock.
    rect(world, cx - 34, topY + 24, cx + 34, groundY - 1, ID.ROCK);
    rect(world, cx - 18, topY, cx + 18, topY + 28, ID.ROCK); // head
    rect(world, cx - 54, topY + 40, cx - 35, topY + 96, ID.ROCK); // left arm
    rect(world, cx + 35, topY + 40, cx + 54, topY + 96, ID.ROCK); // right arm
    // Three glass cores, each encased in the rock.
    const cores: CoreSpec[] = [];
    const place = (x: number, y: number, label: string) => {
      rect(world, x - 4, y - 4, x + 4, y + 4, ID.GLASS);
      cores.push({ label, region: { x0: x - 5, y0: y - 5, x1: x + 5, y1: y + 5 } });
    };
    place(cx, topY + 60, "Chest core");
    place(cx - 44, topY + 66, "Left core");
    place(cx + 44, topY + 66, "Right core");
    world.wakeAll();
    return cores;
  },
};

/** Sinuvex, an ice serpent. Melt its icy segments to nothing. */
const ICE_SERPENT: KaijuDef = {
  id: "sinuvex",
  name: "Sinuvex",
  blurb: "A coiled ice serpent. Melt its three frozen hearts with heat.",
  badge: "SERPENT",
  heroSpawn: { x: 80, y: 60 },
  projectile: ID.ICE,
  attackInterval: 2.6,
  attacks: ["hurl"],
  build(world) {
    ground(world, ID.ICE);
    const cores: CoreSpec[] = [];
    // A sine-wave body of ice with three thicker heart segments.
    let n = 0;
    for (let x = 80; x < WORLD_W - 60; x += 4) {
      const y = Math.floor(groundY - 70 + Math.sin(x * 0.04) * 40);
      rect(world, x - 6, y - 6, x + 6, y + 6, ID.ICE);
      if ((x - 80) % 120 === 0 && n < 3) {
        rect(world, x - 5, y - 5, x + 5, y + 5, ID.ICE);
        cores.push({ label: `Heart ${n + 1}`, region: { x0: x - 7, y0: y - 7, x1: x + 7, y1: y + 7 } });
        n++;
      }
    }
    world.wakeAll();
    return cores;
  },
};

/** Pyrogon, a magma beast. Cool its molten cores to rock, then shatter them. */
const MAGMA_BEAST: KaijuDef = {
  id: "pyrogon",
  name: "Pyrogon",
  blurb: "A magma beast. Freeze its molten cores solid, then shatter the rock.",
  badge: "MAGMA",
  heroSpawn: { x: 80, y: 60 },
  projectile: ID.LAVA,
  attackInterval: 3.6,
  attacks: ["stomp", "hurl"],
  build(world) {
    ground(world);
    const cx = Math.floor(WORLD_W * 0.6);
    const topY = groundY - 96;
    // Rock hide around molten cores.
    rect(world, cx - 40, topY, cx + 40, groundY - 1, ID.ROCK);
    const cores: CoreSpec[] = [];
    const place = (x: number, y: number, label: string) => {
      rect(world, x - 5, y - 5, x + 5, y + 5, ID.LAVA); // molten core
      rect(world, x - 6, y - 6, x + 6, y - 6, ID.ROCK); // thin cap so it stays put
      cores.push({ label, region: { x0: x - 6, y0: y - 6, x1: x + 6, y1: y + 6 } });
    };
    place(cx - 20, topY + 40, "Left vent");
    place(cx + 20, topY + 40, "Right vent");
    place(cx, topY + 72, "Core");
    world.wakeAll();
    return cores;
  },
};

export const KAIJU: readonly KaijuDef[] = [ROCK_GOLEM, ICE_SERPENT, MAGMA_BEAST];

export function kaijuById(id: string): KaijuDef | undefined {
  return KAIJU.find((k) => k.id === id);
}

export { groundY };
