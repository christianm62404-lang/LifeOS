/**
 * Global simulation + display constants.
 *
 * World size is fixed here on purpose: the whole engine is tuned around a
 * constant grid resolution (see the performance notes in the README). The
 * `World` class accepts dimensions as constructor arguments that default to
 * these values, so unit tests can build tiny worlds without changing the
 * production resolution.
 */

export const WORLD_W = 512;
export const WORLD_H = 288;

/** Chunk edge length in cells. Must divide evenly into typical world sizes. */
export const CHUNK_SIZE = 32;

/** Integer upscale factor from world pixels to screen pixels. */
export const SCALE = 3;

/** Fixed simulation rate, decoupled from rendering. */
export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;

/** Safety cap so a slow frame can't trigger a death-spiral of catch-up steps. */
export const MAX_STEPS_PER_FRAME = 5;

// --- thermal model -------------------------------------------------------

/** Resting temperature the world relaxes toward (degrees, arbitrary scale). */
export const AMBIENT_TEMP = 20;

/** Per-tick pull of every active cell toward ambient (gentle global cooling). */
export const AMBIENT_RATE = 0.0016;

/** Diffusion scale applied on top of a material's conductivity (keeps k<0.25). */
export const DIFFUSION_SCALE = 0.8;

/** Minimum per-tick temperature change that keeps a chunk awake. */
export const TEMP_WAKE_EPSILON = 0.35;

// --- particles -----------------------------------------------------------

/** Max simultaneous debris particles (typed-array pool, no per-particle GC). */
export const MAX_PARTICLES = 6000;

/** Downward acceleration applied to airborne debris per tick. */
export const PARTICLE_GRAVITY = 0.18;

// --- structural collapse -------------------------------------------------

/** Connected-solid components larger than this are treated as anchored
 * terrain (bounds the flood-fill cost; the ground never "falls"). */
export const MAX_COMPONENT = 2200;

/** Max simultaneous rigid bodies in flight. */
export const MAX_BODIES = 64;

/** Collapse-check regions processed per tick (bounds per-frame work). */
export const MAX_REGIONS_PER_TICK = 4;

/** Gravity + terminal fall speed for rigid bodies (cells/tick). */
export const BODY_GRAVITY = 0.22;
export const BODY_MAX_FALL = 7;
