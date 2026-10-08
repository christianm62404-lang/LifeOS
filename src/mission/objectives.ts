import { World } from "../sim/world.ts";
import { State, material } from "../sim/materials.ts";

/** An axis-aligned region of world cells (inclusive). */
export interface Region {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A civilian to rescue: a point the hero must reach before it's lost. */
export interface Civilian {
  x: number;
  y: number;
  rescued: boolean;
  lost: boolean;
}

/**
 * Objectives are plain data; evaluators below interpret them. All of a
 * mission's objectives must complete for success.
 */
export type Objective =
  | { kind: "fill"; label: string; region: Region; material: number; min: number }
  | { kind: "demolish"; label: string; region: Region; max: number }
  | { kind: "survive"; label: string; seconds: number }
  | { kind: "rescue"; label: string };

/** Fail conditions; any one true loses the mission. */
export type FailCond =
  | { kind: "materialIn"; label: string; region: Region; material: number };

export interface MissionRuntime {
  elapsed: number; // seconds
  civilians: Civilian[];
  baselines: number[]; // per-objective baseline (for demolish progress)
}

export interface ObjectiveStatus {
  label: string;
  progress: number; // 0..1
  done: boolean;
}

function regionCells(r: Region): number {
  return (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
}

function countMaterial(world: World, r: Region, mat: number): number {
  let c = 0;
  for (let y = Math.max(0, r.y0); y <= Math.min(world.h - 1, r.y1); y++) {
    for (let x = Math.max(0, r.x0); x <= Math.min(world.w - 1, r.x1); x++) {
      if (world.mat[world.idx(x, y)] === mat) c++;
    }
  }
  return c;
}

function countSolid(world: World, r: Region): number {
  let c = 0;
  for (let y = Math.max(0, r.y0); y <= Math.min(world.h - 1, r.y1); y++) {
    for (let x = Math.max(0, r.x0); x <= Math.min(world.w - 1, r.x1); x++) {
      if (material(world.mat[world.idx(x, y)]).state === State.Solid) c++;
    }
  }
  return c;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function evaluateObjective(
  obj: Objective,
  index: number,
  world: World,
  rt: MissionRuntime,
): ObjectiveStatus {
  switch (obj.kind) {
    case "fill": {
      const frac = countMaterial(world, obj.region, obj.material) / regionCells(obj.region);
      return { label: obj.label, progress: clamp01(frac / obj.min), done: frac >= obj.min };
    }
    case "demolish": {
      const frac = countSolid(world, obj.region) / regionCells(obj.region);
      const base = rt.baselines[index] || frac || 1;
      const denom = Math.max(1e-6, base - obj.max);
      return {
        label: obj.label,
        progress: clamp01((base - frac) / denom),
        done: frac <= obj.max,
      };
    }
    case "survive": {
      return {
        label: obj.label,
        progress: clamp01(rt.elapsed / obj.seconds),
        done: rt.elapsed >= obj.seconds,
      };
    }
    case "rescue": {
      const total = rt.civilians.length || 1;
      const rescued = rt.civilians.filter((c) => c.rescued).length;
      return { label: obj.label, progress: rescued / total, done: rescued === rt.civilians.length };
    }
  }
}

/** Baseline solid fraction captured at mission start, for demolish progress. */
export function captureBaseline(obj: Objective, world: World): number {
  if (obj.kind === "demolish") {
    return countSolid(world, obj.region) / regionCells(obj.region);
  }
  return 0;
}

export function failTriggered(fail: FailCond, world: World): boolean {
  switch (fail.kind) {
    case "materialIn":
      return countMaterial(world, fail.region, fail.material) > 0;
  }
}
