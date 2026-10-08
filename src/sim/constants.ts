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
