/**
 * The material data table.
 *
 * Everything the simulation needs to know about a material lives here as data,
 * never as scattered conditionals. Later phases extend `Material` with thermal
 * and structural fields (melt/freeze/boil points, conductivity, flammability,
 * strength) and a reactions table; the renderer and sim only ever read from
 * this table, keyed by the material id stored in `World.mat`.
 */

export const enum State {
  Solid = 0,
  Powder = 1,
  Liquid = 2,
  Gas = 3,
}

export interface Material {
  readonly id: number;
  readonly name: string;
  readonly state: State;
  /**
   * Relative density. Drives displacement: a denser mobile cell can sink
   * through a lighter liquid/gas cell (they swap). Air is the lightest.
   */
  readonly density: number;
  /** Base colour, 0-255 per channel. */
  readonly color: readonly [number, number, number];
  /** Per-cell brightness jitter range (+/-) for a non-flat, grainy look. */
  readonly colorVar: number;
}

/**
 * Stable numeric ids. Stored directly in the world's `Uint8Array`, so order
 * here is part of the save format — only append, never reorder.
 */
export const ID = {
  AIR: 0,
  ROCK: 1,
  SAND: 2,
  DIRT: 3,
  WATER: 4,
} as const;

export type MaterialId = (typeof ID)[keyof typeof ID];

/** Indexed by material id. */
export const MATERIALS: readonly Material[] = [
  {
    id: ID.AIR,
    name: "Air",
    state: State.Gas,
    density: 0,
    color: [10, 11, 18],
    colorVar: 2,
  },
  {
    id: ID.ROCK,
    name: "Rock",
    state: State.Solid,
    density: 100,
    color: [96, 98, 110],
    colorVar: 12,
  },
  {
    id: ID.SAND,
    name: "Sand",
    state: State.Powder,
    density: 50,
    color: [206, 178, 108],
    colorVar: 16,
  },
  {
    id: ID.DIRT,
    name: "Dirt",
    state: State.Powder,
    density: 55,
    color: [120, 86, 58],
    colorVar: 14,
  },
  {
    id: ID.WATER,
    name: "Water",
    state: State.Liquid,
    density: 30,
    color: [54, 110, 196],
    colorVar: 10,
  },
];

export function material(id: number): Material {
  return MATERIALS[id] ?? MATERIALS[ID.AIR];
}

/** Materials offered in the Phase 1 paint palette, in display order. */
export const PALETTE: readonly MaterialId[] = [
  ID.SAND,
  ID.WATER,
  ID.ROCK,
  ID.DIRT,
  ID.AIR,
];
