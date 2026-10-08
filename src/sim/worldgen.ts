import { World } from "./world.ts";
import { ID } from "./materials.ts";
import { Rng } from "../core/rng.ts";

/**
 * Phase 1 starter scene: a rock basin with layered ground, a sand dune, and a
 * walled water pool — enough to see powders pile, water settle and fill, and
 * sand sink through water. Later phases replace this with the full procedural
 * world generators (volcano island, frozen city, canyon dam, foundry).
 */
export function generateStarterWorld(world: World, seed = 2024): void {
  const { w, h } = world;
  const rng = new Rng(seed);

  // Sky is already air (zero-filled).

  // Rolling ground height via a couple of sine waves.
  const groundAt = (x: number): number => {
    const base = h * 0.72;
    return Math.floor(
      base +
        Math.sin(x * 0.012) * 10 +
        Math.sin(x * 0.047 + 1.3) * 5,
    );
  };

  for (let x = 0; x < w; x++) {
    const g = groundAt(x);
    for (let y = g; y < h; y++) {
      // Top soil, then rock bedrock deeper down.
      const depth = y - g;
      world.paint(x, y, depth < 6 ? ID.DIRT : ID.ROCK);
    }
  }

  // A sand dune on the left.
  const duneX = Math.floor(w * 0.22);
  const duneTop = groundAt(duneX) - 34;
  for (let y = duneTop; y < groundAt(duneX); y++) {
    const spread = Math.floor((y - duneTop) * 0.9);
    for (let x = duneX - spread; x <= duneX + spread; x++) {
      if (world.inBounds(x, y)) world.paint(x, y, ID.SAND);
    }
  }

  // A walled stone pool on the right, pre-filled with water.
  const poolLeft = Math.floor(w * 0.6);
  const poolRight = Math.floor(w * 0.9);
  const poolTop = Math.floor(h * 0.4);
  const poolBottom = groundAt(poolRight) + 2;
  for (let x = poolLeft; x <= poolRight; x++) {
    for (let y = poolTop; y <= poolBottom; y++) {
      const wall =
        x <= poolLeft + 2 || x >= poolRight - 2 || y >= poolBottom - 2;
      if (wall) world.paint(x, y, ID.ROCK);
      else if (y > poolTop + 6) world.paint(x, y, ID.WATER);
    }
  }

  // A small wooden shack (burn it down) sitting on the ground, left-centre.
  const shackX = Math.floor(w * 0.4);
  const shackY = groundAt(shackX);
  for (let y = shackY - 18; y < shackY; y++) {
    for (let x = shackX; x < shackX + 20; x++) {
      const edge = x === shackX || x === shackX + 19 || y === shackY - 18;
      if (edge && world.inBounds(x, y)) world.paint(x, y, ID.WOOD);
    }
  }

  // A metal beam you can melt with lava/heat, mid-left.
  const beamY = Math.floor(h * 0.5);
  for (let x = Math.floor(w * 0.08); x < Math.floor(w * 0.2); x++) {
    world.paint(x, beamY, ID.METAL);
    world.paint(x, beamY + 1, ID.METAL);
  }

  // An ice block up high (melts if heated, drips water).
  const iceX = Math.floor(w * 0.5);
  for (let y = Math.floor(h * 0.18); y < Math.floor(h * 0.18) + 12; y++) {
    for (let x = iceX; x < iceX + 14; x++) world.paint(x, y, ID.ICE);
  }

  // A lava pocket nestled in the ground, right of centre (feeds the pool side).
  const lavaX = Math.floor(w * 0.52);
  const lavaGround = groundAt(lavaX);
  for (let y = lavaGround + 4; y < lavaGround + 14; y++) {
    for (let x = lavaX - 10; x < lavaX + 10; x++) {
      if (world.inBounds(x, y)) world.paint(x, y, ID.LAVA);
    }
  }

  // Scatter a few sand blobs mid-air so there's immediate motion on load.
  for (let b = 0; b < 6; b++) {
    const bx = Math.floor(w * 0.3) + rng.int(Math.floor(w * 0.2));
    const by = Math.floor(h * 0.1) + rng.int(Math.floor(h * 0.12));
    world.paintCircle(bx, by, 3 + rng.int(4), ID.SAND);
  }

  world.wakeAll();
}
