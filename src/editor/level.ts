import { World } from "../sim/world.ts";
import { WORLD_H, WORLD_W } from "../sim/constants.ts";
import { ID } from "../sim/materials.ts";
import type { Mission } from "../mission/missions.ts";
import type { Civilian, FailCond, Objective, Region } from "../mission/objectives.ts";

/**
 * A user-authored level. The material grid is run-length encoded (worlds are
 * mostly air/rock, so RLE is a big win), and the whole thing base64-encodes to
 * a shareable string. Objective authoring is intentionally compact: one goal
 * zone + goal type, an optional protect zone, and civilians for rescue.
 */
export interface CustomLevel {
  v: 1;
  name: string;
  w: number;
  h: number;
  cells: string; // RLE of the material grid
  spawn: { x: number; y: number };
  civilians: { x: number; y: number }[];
  goal?: {
    kind: "fill-water" | "fill-ice" | "demolish" | "survive" | "rescue";
    zone: Region;
    seconds?: number;
  };
  protect?: { zone: Region; material: "lava" | "water" };
  timeLimit: number;
}

const STORE_KEY = "shattersand.levels";

// --- RLE -----------------------------------------------------------------

export function encodeCells(mat: Uint8Array): string {
  const runs: string[] = [];
  let i = 0;
  while (i < mat.length) {
    const v = mat[i];
    let n = 1;
    while (i + n < mat.length && mat[i + n] === v) n++;
    runs.push(`${v}x${n}`);
    i += n;
  }
  return runs.join(".");
}

export function decodeCells(str: string, out: Uint8Array): void {
  out.fill(0);
  let p = 0;
  for (const run of str.split(".")) {
    if (!run) continue;
    const [vs, ns] = run.split("x");
    const v = Number(vs);
    const n = Number(ns);
    for (let k = 0; k < n && p < out.length; k++) out[p++] = v;
  }
}

// --- share string (base64 of JSON) --------------------------------------

export function encodeLevel(level: CustomLevel): string {
  const json = JSON.stringify(level);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeLevel(str: string): CustomLevel {
  const json = decodeURIComponent(escape(atob(str.trim())));
  const level = JSON.parse(json) as CustomLevel;
  if (level.v !== 1 || level.w !== WORLD_W || level.h !== WORLD_H) {
    throw new Error("Unsupported or mismatched level format");
  }
  return level;
}

// --- capture / apply -----------------------------------------------------

export function levelFromWorld(
  world: World,
  meta: Omit<CustomLevel, "v" | "w" | "h" | "cells">,
): CustomLevel {
  return {
    v: 1,
    w: world.w,
    h: world.h,
    cells: encodeCells(world.mat),
    ...meta,
  };
}

export function applyLevel(level: CustomLevel, world: World): void {
  world.reset();
  const tmp = new Uint8Array(world.mat.length);
  decodeCells(level.cells, tmp);
  for (let i = 0; i < tmp.length; i++) {
    if (tmp[i] !== ID.AIR) world.paint(i % world.w, (i / world.w) | 0, tmp[i]);
  }
  world.wakeAll();
}

// --- custom level -> mission --------------------------------------------

export function levelToMission(level: CustomLevel): Mission {
  const objectives: Objective[] = [];
  const fail: FailCond[] = [];

  if (level.goal) {
    const z = level.goal.zone;
    switch (level.goal.kind) {
      case "fill-water":
        objectives.push({ kind: "fill", label: "Flood the zone", region: z, material: ID.WATER, min: 0.6 });
        break;
      case "fill-ice":
        objectives.push({ kind: "fill", label: "Freeze the zone", region: z, material: ID.ICE, min: 0.5 });
        break;
      case "demolish":
        objectives.push({ kind: "demolish", label: "Demolish the zone", region: z, max: 0.2 });
        break;
      case "survive":
        objectives.push({ kind: "survive", label: "Survive", seconds: level.goal.seconds ?? 20 });
        break;
      case "rescue":
        objectives.push({ kind: "rescue", label: "Rescue all civilians" });
        break;
    }
  }
  if (level.protect) {
    fail.push({
      kind: "materialIn",
      label: level.protect.material === "lava" ? "Lava breached the zone" : "Water breached the zone",
      region: level.protect.zone,
      material: level.protect.material === "lava" ? ID.LAVA : ID.WATER,
    });
  }

  return {
    id: `custom:${level.name}`,
    name: level.name,
    blurb: "Custom level",
    spawn: level.spawn,
    generate: (world) => {
      applyLevel(level, world);
      return level.civilians.map((c) => ({ x: c.x, y: c.y, rescued: false, lost: false }) as Civilian);
    },
    objectives,
    fail,
    timeLimit: level.timeLimit,
  };
}

// --- localStorage store --------------------------------------------------

export function listLevels(): CustomLevel[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as CustomLevel[]) : [];
  } catch {
    return [];
  }
}

export function saveLevel(level: CustomLevel): void {
  const levels = listLevels().filter((l) => l.name !== level.name);
  levels.push(level);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(levels));
  } catch {
    // storage full / unavailable — ignore for the MVP
  }
}

export function deleteLevel(name: string): void {
  const levels = listLevels().filter((l) => l.name !== name);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(levels));
  } catch {
    // ignore
  }
}
