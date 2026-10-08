import { World } from "./world.ts";
import { Particles } from "./particles.ts";
import { ID, State, material } from "./materials.ts";
import { Rng } from "../core/rng.ts";
import { addShake } from "../core/fx.ts";

/**
 * Radial explosion: within `radius`, deposit heat (igniting/melting), and
 * shatter solids/powders whose `strength` is below the local impulse. Shattered
 * cells have a chance to become flying debris that re-enters the grid, and the
 * core flashes to fire. Impulse falls off linearly with distance.
 */
export function explode(
  world: World,
  particles: Particles,
  cx: number,
  cy: number,
  radius: number,
  power: number,
  rng: Rng,
  heatFactor = 1,
): void {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (!world.inBounds(x, y)) continue;

      const dist = Math.sqrt(d2);
      const falloff = 1 - dist / radius;
      const impulse = power * falloff;
      const i = world.idx(x, y);
      const m = world.mat[i];

      // Heat everything in range (center hottest). heatFactor=0 → kinetic only.
      world.temp[i] += impulse * 7 * heatFactor;
      world.touch(x, y);

      if (m === ID.AIR) continue;
      const mm = material(m);

      if (mm.state === State.Solid || mm.state === State.Powder) {
        if (mm.strength <= impulse) {
          // Shatter: maybe throw debris, otherwise just vaporize to air.
          if (rng.next() < 0.4 && dist > 0.5) {
            const speed = impulse * 0.06 + rng.next() * 1.5;
            const inv = speed / (dist || 1);
            particles.spawn(
              x + 0.5,
              y + 0.5,
              dx * inv,
              dy * inv - 0.5, // slight upward bias
              m,
              world.temp[i],
              40 + rng.int(40),
            );
          }
          world.convert(i, ID.AIR);
        } else if (mm.flammable && impulse > mm.strength * 0.5) {
          world.convert(i, ID.FIRE);
        }
      }
      // Liquids/gases are simply heated (water -> steam next thermal tick).
    }
  }

  // Core flash: a few fire cells for the initial burst (skip for kinetic blasts).
  const flashR = heatFactor > 0.3 ? Math.max(1, (radius / 4) | 0) : 0;
  for (let dy = -flashR; dy <= flashR; dy++) {
    for (let dx = -flashR; dx <= flashR; dx++) {
      if (dx * dx + dy * dy > flashR * flashR) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (world.inBounds(x, y) && world.mat[world.idx(x, y)] === ID.AIR) {
        world.convert(world.idx(x, y), ID.FIRE);
      }
    }
  }

  addShake(Math.min(1, power / 120));
}
