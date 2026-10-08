/**
 * The material data table + reaction table.
 *
 * Everything the simulation needs lives here as data, never as scattered
 * conditionals:
 *  - movement is driven by `state` + `density` (+ `fluidity` for liquids,
 *    `floats` for gases);
 *  - phase changes are driven by temperature thresholds (`highAbove`/`highTo`,
 *    `lowBelow`/`lowTo`) and by time (`life`/`decayTo`);
 *  - heat behaviour is driven by `conductivity` and optional `sourceTemp`/
 *    `sourcePower` (a cell that emits or absorbs heat);
 *  - destruction is driven by `strength`;
 *  - contact reactions (e.g. lava + water) live in `REACTIONS`.
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
  readonly density: number;
  readonly color: readonly [number, number, number];
  readonly colorVar: number;

  /** Heat conductivity, 0..~0.3. Higher = diffuses temperature faster. */
  readonly conductivity: number;
  /** If set, the cell drives its own temperature toward this value... */
  readonly sourceTemp?: number;
  /** ...at this rate per tick (0..1). */
  readonly sourcePower?: number;

  /** Above this temperature, become `highTo`. */
  readonly highAbove?: number;
  readonly highTo?: number;
  /** Below this temperature, become `lowTo`. */
  readonly lowBelow?: number;
  readonly lowTo?: number;

  /** Lifetime in ticks before decaying to `decayTo` (fire, smoke). */
  readonly life?: number;
  readonly decayTo?: number;

  /** Structural strength: resists explosions/shatter below this impulse. */
  readonly strength: number;
  /** Catches fire readily (used by explosions to seed flame). */
  readonly flammable?: boolean;

  /** Gas that rises (steam, smoke). Fire does not float — it sits on fuel. */
  readonly floats?: boolean;
  /** Liquid sideways dispersion per tick (water runny, lava viscous). */
  readonly fluidity?: number;

  /** Base self-glow 0..1 for rendering (lava, fire, molten metal). */
  readonly glow?: number;
}

/**
 * Stable numeric ids, stored directly in the world's Uint8Array (part of the
 * save format — only append, never reorder).
 */
export const ID = {
  AIR: 0,
  ROCK: 1,
  SAND: 2,
  DIRT: 3,
  WATER: 4,
  LAVA: 5,
  ICE: 6,
  STEAM: 7,
  METAL: 8,
  MOLTEN_METAL: 9,
  WOOD: 10,
  FIRE: 11,
  SMOKE: 12,
  GLASS: 13,
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
    conductivity: 0.03,
    strength: 0,
  },
  {
    id: ID.ROCK,
    name: "Rock",
    state: State.Solid,
    density: 100,
    color: [96, 98, 110],
    colorVar: 12,
    conductivity: 0.03,
    strength: 60,
    highAbove: 1250,
    highTo: ID.LAVA,
  },
  {
    id: ID.SAND,
    name: "Sand",
    state: State.Powder,
    density: 50,
    color: [206, 178, 108],
    colorVar: 16,
    conductivity: 0.02,
    strength: 6,
    highAbove: 1150,
    highTo: ID.GLASS,
  },
  {
    id: ID.DIRT,
    name: "Dirt",
    state: State.Powder,
    density: 55,
    color: [120, 86, 58],
    colorVar: 14,
    conductivity: 0.02,
    strength: 9,
  },
  {
    id: ID.WATER,
    name: "Water",
    state: State.Liquid,
    density: 30,
    color: [54, 110, 196],
    colorVar: 10,
    conductivity: 0.09,
    fluidity: 5,
    strength: 0,
    highAbove: 100,
    highTo: ID.STEAM,
    lowBelow: 0,
    lowTo: ID.ICE,
  },
  {
    id: ID.LAVA,
    name: "Lava",
    state: State.Liquid,
    density: 90,
    color: [228, 92, 28],
    colorVar: 14,
    conductivity: 0.05,
    fluidity: 1,
    strength: 0,
    sourceTemp: 1150,
    sourcePower: 0.06,
    lowBelow: 650,
    lowTo: ID.ROCK,
    glow: 1,
  },
  {
    id: ID.ICE,
    name: "Ice",
    state: State.Solid,
    density: 28,
    color: [168, 206, 236],
    colorVar: 10,
    conductivity: 0.06,
    strength: 10,
    sourceTemp: -14,
    sourcePower: 0.05,
    highAbove: 0,
    highTo: ID.WATER,
  },
  {
    id: ID.STEAM,
    name: "Steam",
    state: State.Gas,
    density: 1,
    color: [176, 188, 204],
    colorVar: 12,
    conductivity: 0.04,
    strength: 0,
    floats: true,
    lowBelow: 95,
    lowTo: ID.WATER,
  },
  {
    id: ID.METAL,
    name: "Metal",
    state: State.Solid,
    density: 120,
    color: [150, 158, 176],
    colorVar: 10,
    conductivity: 0.3,
    strength: 90,
    highAbove: 1200,
    highTo: ID.MOLTEN_METAL,
  },
  {
    id: ID.MOLTEN_METAL,
    name: "Molten Metal",
    state: State.Liquid,
    density: 110,
    color: [255, 170, 70],
    colorVar: 14,
    conductivity: 0.22,
    fluidity: 2,
    strength: 0,
    sourceTemp: 1320,
    sourcePower: 0.05,
    lowBelow: 1120,
    lowTo: ID.METAL,
    glow: 1,
  },
  {
    id: ID.WOOD,
    name: "Wood",
    state: State.Solid,
    density: 40,
    color: [122, 82, 44],
    colorVar: 12,
    conductivity: 0.02,
    strength: 22,
    flammable: true,
    highAbove: 300,
    highTo: ID.FIRE,
  },
  {
    id: ID.FIRE,
    name: "Fire",
    state: State.Gas,
    density: 2,
    color: [255, 150, 48],
    colorVar: 30,
    conductivity: 0.05,
    strength: 0,
    sourceTemp: 820,
    sourcePower: 0.4,
    floats: false,
    life: 70,
    decayTo: ID.SMOKE,
    glow: 1,
  },
  {
    id: ID.SMOKE,
    name: "Smoke",
    state: State.Gas,
    density: 1.5,
    color: [60, 62, 70],
    colorVar: 12,
    conductivity: 0.03,
    strength: 0,
    floats: true,
    life: 200,
    decayTo: ID.AIR,
  },
  {
    id: ID.GLASS,
    name: "Glass",
    state: State.Solid,
    density: 45,
    color: [150, 200, 210],
    colorVar: 8,
    conductivity: 0.1,
    strength: 14,
  },
];

export function material(id: number): Material {
  return MATERIALS[id] ?? MATERIALS[ID.AIR];
}

// --- contact reactions ---------------------------------------------------

export interface Reaction {
  /** What the first material becomes. */
  readonly toA: number;
  /** What the second material becomes. */
  readonly toB: number;
  /** Temperature to assign to the `toB` product (e.g. fresh steam is hot). */
  readonly tempB?: number;
  readonly tempA?: number;
}

/**
 * Ordered contact reactions keyed by "a,b". The sim checks both orderings, so
 * each pair only needs one entry. Example: molten rock quenched by water turns
 * to rock while the water flashes to steam.
 */
export const REACTIONS: ReadonlyMap<string, Reaction> = new Map([
  [`${ID.LAVA},${ID.WATER}`, { toA: ID.ROCK, toB: ID.STEAM, tempA: 500, tempB: 160 }],
  [`${ID.LAVA},${ID.ICE}`, { toA: ID.ROCK, toB: ID.STEAM, tempA: 500, tempB: 120 }],
  [`${ID.MOLTEN_METAL},${ID.WATER}`, { toA: ID.METAL, toB: ID.STEAM, tempA: 400, tempB: 160 }],
  [`${ID.FIRE},${ID.WATER}`, { toA: ID.SMOKE, toB: ID.WATER, tempB: 60 }],
]);

export function reactionKey(a: number, b: number): string {
  return `${a},${b}`;
}

/** Pre-computed: does this material participate in any contact reaction? */
export const REACTIVE: readonly boolean[] = (() => {
  const flags = MATERIALS.map(() => false);
  for (const key of REACTIONS.keys()) {
    const [a, b] = key.split(",").map(Number);
    flags[a] = true;
    flags[b] = true;
  }
  return flags;
})();

/** Materials offered in the paint palette, in display order. */
export const PALETTE: readonly MaterialId[] = [
  ID.SAND,
  ID.WATER,
  ID.ROCK,
  ID.DIRT,
  ID.WOOD,
  ID.METAL,
  ID.LAVA,
  ID.ICE,
  ID.FIRE,
  ID.STEAM,
  ID.AIR,
];
