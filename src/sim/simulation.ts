import { World } from "./world.ts";
import { ID, material, State } from "./materials.ts";
import { Rng } from "../core/rng.ts";

/**
 * One fixed simulation step.
 *
 * Only active chunks are visited. Chunks are processed bottom row first so that
 * settling cells don't get re-processed on their way down, and within each row
 * the horizontal scan direction alternates to cancel left/right drift bias.
 * A per-cell "moved this tick" guard prevents a single cell being advanced
 * twice in one step.
 */
export function step(world: World, rng: Rng): void {
  world.beginFrame();
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
          updateCell(world, rng, x, y);
        }
      }
    }
  }
}

function updateCell(world: World, rng: Rng, x: number, y: number): void {
  const i = world.idx(x, y);
  if (world.movedThisTick(i)) return;
  const m = world.mat[i];
  if (m === ID.AIR) return;

  switch (material(m).state) {
    case State.Powder:
      updatePowder(world, rng, x, y, m);
      break;
    case State.Liquid:
      updateLiquid(world, rng, x, y, m);
      break;
    // Solids and gases are inert in Phase 1.
    default:
      break;
  }
}

/**
 * Can a mobile cell of material `from` move into the cell holding `into`?
 * Yes into empty air; otherwise only by sinking through a *lighter* fluid
 * (liquid or gas), which swaps the two cells.
 */
function canDisplace(from: number, into: number): boolean {
  if (into === ID.AIR) return true;
  const target = material(into);
  if (target.state === State.Liquid || target.state === State.Gas) {
    return target.density < material(from).density;
  }
  return false;
}

function tryMove(
  world: World,
  x: number,
  y: number,
  nx: number,
  ny: number,
): boolean {
  if (nx < 0 || ny < 0 || nx >= world.w || ny >= world.h) return false;
  const from = world.mat[world.idx(x, y)];
  const into = world.mat[world.idx(nx, ny)];
  if (into !== ID.AIR && world.movedThisTick(world.idx(nx, ny))) return false;
  if (!canDisplace(from, into)) return false;
  world.swap(x, y, nx, ny);
  return true;
}

function updatePowder(
  world: World,
  rng: Rng,
  x: number,
  y: number,
  _m: number,
): void {
  // Straight down first, then diagonally down in a randomised order.
  if (tryMove(world, x, y, x, y + 1)) return;
  const d = rng.sign();
  if (tryMove(world, x, y, x + d, y + 1)) return;
  if (tryMove(world, x, y, x - d, y + 1)) return;
}

/** Max cells a liquid may flow sideways per step (dispersion). */
const LIQUID_FLOW = 4;

function updateLiquid(
  world: World,
  rng: Rng,
  x: number,
  y: number,
  _m: number,
): void {
  if (tryMove(world, x, y, x, y + 1)) return;
  const d = rng.sign();
  if (tryMove(world, x, y, x + d, y + 1)) return;
  if (tryMove(world, x, y, x - d, y + 1)) return;

  // Spread sideways: step toward the farther reachable cell in one direction,
  // then try the other. Bounded by LIQUID_FLOW to cap per-cell work.
  if (flowSideways(world, x, y, d)) return;
  flowSideways(world, x, y, -d);
}

function flowSideways(world: World, x: number, y: number, dir: number): boolean {
  let reach = 0;
  for (let step = 1; step <= LIQUID_FLOW; step++) {
    const nx = x + dir * step;
    if (nx < 0 || nx >= world.w) break;
    const into = world.mat[world.idx(nx, y)];
    if (into === ID.AIR) {
      reach = step;
    } else if (
      canDisplace(world.mat[world.idx(x, y)], into) &&
      !world.movedThisTick(world.idx(nx, y))
    ) {
      reach = step;
    } else {
      break;
    }
  }
  if (reach === 0) return false;
  return tryMove(world, x, y, x + dir * reach, y);
}
