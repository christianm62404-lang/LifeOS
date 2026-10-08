import { World } from "./world.ts";
import { ID } from "./materials.ts";
import { Rng } from "../core/rng.ts";

/**
 * Procedural world generators for free play. Each returns through side effects
 * on the World and declares a hero spawn point. Kept data-driven via the WORLDS
 * registry so the menu and later phases can enumerate them.
 */
export interface WorldDef {
  id: string;
  name: string;
  blurb: string;
  spawn: { x: number; y: number };
  generate: (world: World, rng: Rng) => void;
}

// --- primitives ----------------------------------------------------------

function fillRect(world: World, x0: number, y0: number, x1: number, y1: number, mat: number): void {
  for (let y = Math.max(0, y0); y <= Math.min(world.h - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(world.w - 1, x1); x++) {
      world.paint(x, y, mat);
    }
  }
}

/** Fill a column span from the ground function downward. */
function terrain(
  world: World,
  heightAt: (x: number) => number,
  topMat: number,
  bodyMat: number,
  topDepth = 6,
): void {
  for (let x = 0; x < world.w; x++) {
    const g = Math.floor(heightAt(x));
    for (let y = g; y < world.h; y++) {
      world.paint(x, y, y - g < topDepth ? topMat : bodyMat);
    }
  }
}

// --- generators ----------------------------------------------------------

/** Volcano island: sea, an island mound, and a central lava chamber + crater. */
function volcanoIsland(world: World, rng: Rng): void {
  const { w, h } = world;
  const seaY = Math.floor(h * 0.68);
  fillRect(world, 0, seaY, w - 1, h - 1, ID.WATER); // ocean

  const cx = w / 2;
  const peak = h * 0.3;
  const islandAt = (x: number): number => {
    const d = Math.abs(x - cx) / (w * 0.42);
    const mound = peak + (1 - Math.max(0, 1 - d * d)) * (h - peak);
    // Crater dip near the centre.
    const crater = Math.abs(x - cx) < 14 ? 18 : 0;
    return Math.min(h, mound + crater);
  };
  for (let x = 0; x < w; x++) {
    const g = Math.floor(islandAt(x) + Math.sin(x * 0.05) * 3);
    for (let y = g; y < h; y++) {
      world.paint(x, y, y - g < 7 ? ID.DIRT : ID.ROCK);
    }
  }

  // Lava chamber + crater column.
  fillRect(world, cx - 9, h * 0.42, cx + 9, h - 8, ID.LAVA);
  fillRect(world, cx - 4, peak + 10, cx + 4, h * 0.42, ID.LAVA);

  // A few trees (wood) on the slopes.
  for (let t = 0; t < 8; t++) {
    const tx = Math.floor(rng.next() * w);
    if (Math.abs(tx - cx) < 40) continue;
    const g = Math.floor(islandAt(tx));
    if (g < seaY) fillRect(world, tx, g - 12, tx, g - 1, ID.WOOD);
  }

  world.wakeAll();
}

/** Frozen city: snowy ground and a skyline of ice-capped buildings. */
function frozenCity(world: World, rng: Rng): void {
  const { w, h } = world;
  const groundY = Math.floor(h * 0.82);
  terrain(world, () => groundY, ID.ICE, ID.ROCK, 4);

  // Buildings of metal/glass with icy roofs.
  let x = 10;
  while (x < w - 20) {
    const bw = 22 + rng.int(26);
    const bh = 40 + rng.int(90);
    const top = groundY - bh;
    const bodyMat = rng.next() < 0.5 ? ID.METAL : ID.ROCK;
    for (let yy = top; yy < groundY; yy++) {
      for (let xx = x; xx < x + bw; xx++) {
        const edge = xx === x || xx === x + bw - 1 || yy === top;
        // Windows of glass dotted across the facade.
        const window = (xx - x) % 6 === 3 && (yy - top) % 8 === 4;
        world.paint(xx, yy, edge ? bodyMat : window ? ID.GLASS : bodyMat);
      }
    }
    // Snow/ice cap.
    fillRect(world, x, top - 3, x + bw - 1, top - 1, ID.ICE);
    x += bw + 6 + rng.int(10);
  }

  // Scattered ice boulders.
  for (let k = 0; k < 10; k++) {
    world.paintCircle(rng.int(w), groundY - 6 - rng.int(30), 3 + rng.int(4), ID.ICE);
  }
  world.wakeAll();
}

/** Canyon dam: a reservoir held back by a dam wall above a town to flood. */
function canyonDam(world: World, rng: Rng): void {
  const { w, h } = world;
  // Canyon floor.
  const floorY = h - 20;
  fillRect(world, 0, floorY, w - 1, h - 1, ID.ROCK);

  // Left plateau holding the reservoir, higher than the right valley.
  const damX = Math.floor(w * 0.42);
  const reservoirTop = Math.floor(h * 0.22);
  const shelfY = Math.floor(h * 0.58);

  // Left canyon wall + shelf.
  fillRect(world, 0, shelfY, damX - 1, floorY - 1, ID.ROCK);
  // Dam wall (metal-reinforced rock) spanning up from the shelf.
  fillRect(world, damX, reservoirTop, damX + 7, floorY - 1, ID.METAL);
  // Reservoir water behind the dam.
  fillRect(world, 0, reservoirTop + 4, damX - 1, shelfY - 1, ID.WATER);

  // Right valley: a little wooden town to menace.
  let tx = damX + 30;
  while (tx < w - 24) {
    const houseH = 14 + rng.int(14);
    for (let yy = floorY - houseH; yy < floorY; yy++) {
      for (let xx = tx; xx < tx + 16; xx++) {
        const edge = xx === tx || xx === tx + 15 || yy === floorY - houseH;
        if (edge) world.paint(xx, yy, ID.WOOD);
      }
    }
    tx += 24 + rng.int(16);
  }
  world.wakeAll();
}

/** Metal foundry: platforms, pillars, molten-metal vats and lava channels. */
function metalFoundry(world: World, rng: Rng): void {
  const { w, h } = world;
  fillRect(world, 0, h - 16, w - 1, h - 1, ID.METAL); // floor

  // Stacked platforms connected by pillars.
  for (let level = 0; level < 3; level++) {
    const y = Math.floor(h * (0.35 + level * 0.18));
    let x = 20 + rng.int(20);
    while (x < w - 40) {
      const pw = 40 + rng.int(60);
      fillRect(world, x, y, x + pw, y + 4, ID.METAL);
      // Support pillars down to the platform below.
      fillRect(world, x + 2, y, x + 4, y + 40, ID.METAL);
      fillRect(world, x + pw - 4, y, x + pw - 2, y + 40, ID.METAL);
      // A molten-metal vat on some platforms.
      if (rng.next() < 0.5) fillRect(world, x + 10, y - 10, x + pw - 10, y - 1, ID.MOLTEN_METAL);
      x += pw + 24 + rng.int(20);
    }
  }

  // A lava channel along the floor.
  fillRect(world, 0, h - 20, w - 1, h - 17, ID.LAVA);
  // Molten pools sunk into the floor.
  for (let k = 0; k < 3; k++) {
    const px = 60 + rng.int(w - 120);
    fillRect(world, px, h - 15, px + 24, h - 6, ID.MOLTEN_METAL);
  }
  world.wakeAll();
}

export const WORLDS: readonly WorldDef[] = [
  {
    id: "volcano",
    name: "Volcano Island",
    blurb: "An island ringed by sea with a molten heart. Carve it, flood it, erupt it.",
    spawn: { x: 90, y: 60 },
    generate: volcanoIsland,
  },
  {
    id: "frozen",
    name: "Frozen City",
    blurb: "An ice-locked skyline of metal towers. Melt it, topple it, bury it.",
    spawn: { x: 60, y: 50 },
    generate: frozenCity,
  },
  {
    id: "dam",
    name: "Canyon Dam",
    blurb: "A reservoir held back by a metal dam above a wooden town. Hold the water — or don't.",
    spawn: { x: 60, y: 50 },
    generate: canyonDam,
  },
  {
    id: "foundry",
    name: "Metal Foundry",
    blurb: "Platforms, pillars and molten-metal vats. Melt the steel and bring it down.",
    spawn: { x: 70, y: 60 },
    generate: metalFoundry,
  },
];

export function worldById(id: string): WorldDef {
  return WORLDS.find((wd) => wd.id === id) ?? WORLDS[0];
}

/** Legacy starter scene, retained for tests. */
export function generateStarterWorld(world: World, seed = 2024): void {
  const rng = new Rng(seed);
  volcanoIsland(world, rng);
}
