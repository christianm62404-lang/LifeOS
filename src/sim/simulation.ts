import { World } from "./world.ts";
import {
  ID,
  MATERIALS,
  REACTIONS,
  REACTIVE,
  State,
  material,
  reactionKey,
} from "./materials.ts";
import {
  AMBIENT_RATE,
  AMBIENT_TEMP,
  DIFFUSION_SCALE,
  TEMP_WAKE_EPSILON,
} from "./constants.ts";
import { Rng } from "../core/rng.ts";

/**
 * One fixed simulation step, in two passes over the active chunks:
 *
 *   A. Thermal: heat sources, diffusion, ambient relaxation, temperature-driven
 *      phase changes, timed decay (fire -> smoke -> air), and contact reactions
 *      (lava + water -> rock + steam). All data-driven from the material table.
 *   B. Movement: powders fall, liquids flow, gases rise.
 *
 * Both passes visit only awake chunks. Pass A only keeps a chunk awake while
 * its temperature is still changing by more than TEMP_WAKE_EPSILON, so thermal
 * equilibrium lets regions sleep.
 */
export function step(world: World, rng: Rng): void {
  world.beginFrame();
  thermalPass(world);
  movementPass(world, rng);
}

// Precomputed per-material scalars for the hot loops.
const COND = MATERIALS.map((m) => m.conductivity);
const SRC_T = MATERIALS.map((m) => m.sourceTemp ?? NaN);
const SRC_P = MATERIALS.map((m) => m.sourcePower ?? 0);
const STATE = MATERIALS.map((m) => m.state);

function thermalPass(world: World): void {
  const { chunksW, chunksH, chunk, w, h, mat, temp, aux } = world;

  for (let cy = 0; cy < chunksH; cy++) {
    for (let cx = 0; cx < chunksW; cx++) {
      if (!world.isChunkActive(cx, cy)) continue;
      const x0 = cx * chunk;
      const y0 = cy * chunk;
      const x1 = Math.min(x0 + chunk, w);
      const y1 = Math.min(y0 + chunk, h);

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * w + x;
          const m = mat[i];
          if (m === ID.AIR && temp[i] === AMBIENT_TEMP) continue;

          // --- diffusion (in-place; good enough for a game) ---
          const t0 = temp[i];
          let sum = 0;
          let n = 0;
          if (x > 0) {
            sum += temp[i - 1];
            n++;
          }
          if (x < w - 1) {
            sum += temp[i + 1];
            n++;
          }
          if (y > 0) {
            sum += temp[i - w];
            n++;
          }
          if (y < h - 1) {
            sum += temp[i + w];
            n++;
          }
          let t = t0;
          if (n > 0) {
            const k = COND[m] * DIFFUSION_SCALE;
            t += (sum / n - t0) * k;
          }

          // --- self heat/cool source ---
          const st = SRC_T[m];
          if (st === st) t += (st - t) * SRC_P[m]; // st===st: not NaN

          // --- ambient relaxation ---
          t += (AMBIENT_TEMP - t) * AMBIENT_RATE;
          temp[i] = t;

          // Keep awake only while temperature is still moving meaningfully.
          if (Math.abs(t - t0) > TEMP_WAKE_EPSILON) world.touch(x, y);

          // --- timed decay (fire -> smoke -> air) ---
          const mm = MATERIALS[m];
          if (mm.life) {
            if (aux[i] > 0) aux[i]--;
            if (aux[i] === 0 && mm.decayTo !== undefined) {
              world.convert(i, mm.decayTo);
              continue;
            }
          }

          // --- temperature-driven phase change ---
          if (mm.highTo !== undefined && t >= mm.highAbove!) {
            world.convert(i, mm.highTo);
            continue;
          }
          if (mm.lowTo !== undefined && t <= mm.lowBelow!) {
            world.convert(i, mm.lowTo);
            continue;
          }

          // --- contact reactions ---
          if (REACTIVE[m]) reactWithNeighbours(world, x, y, i, m);
        }
      }
    }
  }
}

function reactWithNeighbours(
  world: World,
  x: number,
  y: number,
  i: number,
  m: number,
): void {
  const { w, h, mat } = world;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    const j = ny * w + nx;
    const other = mat[j];
    if (!REACTIVE[other]) continue;
    const r =
      REACTIONS.get(reactionKey(m, other)) ??
      flip(REACTIONS.get(reactionKey(other, m)));
    if (!r) continue;
    world.convert(i, r.toA, r.tempA);
    world.convert(j, r.toB, r.tempB);
    return; // one reaction per cell per tick
  }
}

/** Swap a reaction's products so (b,a) can reuse an (a,b) table entry. */
function flip(r: ReturnType<typeof REACTIONS.get>) {
  if (!r) return undefined;
  return { toA: r.toB, toB: r.toA, tempA: r.tempB, tempB: r.tempA };
}

// --- movement ------------------------------------------------------------

function movementPass(world: World, rng: Rng): void {
  const { chunksW, chunksH, chunk, w, h } = world;
  for (let cy = chunksH - 1; cy >= 0; cy--) {
    for (let cx = 0; cx < chunksW; cx++) {
      if (!world.isChunkActive(cx, cy)) continue;
      const x0 = cx * chunk;
      const y0 = cy * chunk;
      const x1 = Math.min(x0 + chunk, w);
      const y1 = Math.min(y0 + chunk, h);
      for (let y = y1 - 1; y >= y0; y--) {
        const leftToRight = ((world.frame + y) & 1) === 0;
        for (let k = 0; k < x1 - x0; k++) {
          const x = leftToRight ? x0 + k : x1 - 1 - k;
          moveCell(world, rng, x, y);
        }
      }
    }
  }
}

function moveCell(world: World, rng: Rng, x: number, y: number): void {
  const i = world.idx(x, y);
  if (world.movedThisTick(i)) return;
  const m = world.mat[i];
  if (m === ID.AIR) return;
  switch (STATE[m]) {
    case State.Powder:
      updatePowder(world, rng, x, y);
      break;
    case State.Liquid:
      updateLiquid(world, rng, x, y, m);
      break;
    case State.Gas:
      updateGas(world, rng, x, y, m);
      break;
    default:
      break; // solids are inert
  }
}

/** Can `from` move into the cell holding `into`? Air, or a lighter fluid. */
function canDisplace(from: number, into: number): boolean {
  if (into === ID.AIR) return true;
  const target = material(into);
  if (target.state === State.Liquid || target.state === State.Gas) {
    return target.density < material(from).density;
  }
  return false;
}

/** Can gas `from` rise into the cell holding `into`? Air, or a heavier fluid. */
function canRiseInto(from: number, into: number): boolean {
  if (into === ID.AIR) return true;
  const target = material(into);
  if (target.state === State.Liquid || target.state === State.Gas) {
    return target.density > material(from).density;
  }
  return false;
}

function tryMove(
  world: World,
  x: number,
  y: number,
  nx: number,
  ny: number,
  test: (from: number, into: number) => boolean,
): boolean {
  if (nx < 0 || ny < 0 || nx >= world.w || ny >= world.h) return false;
  const from = world.mat[world.idx(x, y)];
  const j = world.idx(nx, ny);
  const into = world.mat[j];
  if (into !== ID.AIR && world.movedThisTick(j)) return false;
  if (!test(from, into)) return false;
  world.swap(x, y, nx, ny);
  return true;
}

function updatePowder(world: World, rng: Rng, x: number, y: number): void {
  if (tryMove(world, x, y, x, y + 1, canDisplace)) return;
  const d = rng.sign();
  if (tryMove(world, x, y, x + d, y + 1, canDisplace)) return;
  if (tryMove(world, x, y, x - d, y + 1, canDisplace)) return;
}

function updateLiquid(
  world: World,
  rng: Rng,
  x: number,
  y: number,
  m: number,
): void {
  if (tryMove(world, x, y, x, y + 1, canDisplace)) return;
  const d = rng.sign();
  if (tryMove(world, x, y, x + d, y + 1, canDisplace)) return;
  if (tryMove(world, x, y, x - d, y + 1, canDisplace)) return;
  const reach = material(m).fluidity ?? 4;
  if (flow(world, x, y, d, reach, canDisplace)) return;
  flow(world, x, y, -d, reach, canDisplace);
}

function updateGas(
  world: World,
  rng: Rng,
  x: number,
  y: number,
  m: number,
): void {
  if (!material(m).floats) return; // e.g. fire stays put on its fuel
  if (tryMove(world, x, y, x, y - 1, canRiseInto)) return;
  const d = rng.sign();
  if (tryMove(world, x, y, x + d, y - 1, canRiseInto)) return;
  if (tryMove(world, x, y, x - d, y - 1, canRiseInto)) return;
  // Gases also drift sideways to fill space.
  if (flow(world, x, y, d, 3, canRiseInto)) return;
  flow(world, x, y, -d, 3, canRiseInto);
}

function flow(
  world: World,
  x: number,
  y: number,
  dir: number,
  maxReach: number,
  test: (from: number, into: number) => boolean,
): boolean {
  const from = world.mat[world.idx(x, y)];
  let reach = 0;
  for (let s = 1; s <= maxReach; s++) {
    const nx = x + dir * s;
    if (nx < 0 || nx >= world.w) break;
    const j = world.idx(nx, y);
    const into = world.mat[j];
    if (into === ID.AIR) reach = s;
    else if (test(from, into) && !world.movedThisTick(j)) reach = s;
    else break;
  }
  if (reach === 0) return false;
  return tryMove(world, x, y, x + dir * reach, y, test);
}
