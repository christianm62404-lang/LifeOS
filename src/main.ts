import { SCALE } from "./sim/constants.ts";
import { World } from "./sim/world.ts";
import { step } from "./sim/simulation.ts";
import { generateStarterWorld } from "./sim/worldgen.ts";
import { ID } from "./sim/materials.ts";
import { Renderer } from "./render/renderer.ts";
import { Loop } from "./core/loop.ts";
import { Input } from "./core/input.ts";
import { Rng } from "./core/rng.ts";
import { Hud } from "./ui/hud.ts";

/**
 * Entry point: constructs the world, wires sim + render + input + HUD together
 * behind the fixed-timestep loop. This is the only module that knows about all
 * the others.
 */
function main(): void {
  const canvas = document.getElementById("screen") as HTMLCanvasElement;

  const world = new World();
  generateStarterWorld(world);

  const renderer = new Renderer(canvas, world, SCALE);
  const simRng = new Rng(0xc0ffee);

  const hud = new Hud(world, (i) => {
    input.select(i);
  });
  const input = new Input(canvas, (i) => hud.setSelected(i));
  input.select(0); // default to Sand
  hud.setSelected(0);

  const loop = new Loop(
    () => {
      // Apply the brush before stepping so painted cells simulate same tick.
      if (input.painting) {
        world.paintCircle(input.wx, input.wy, input.brush, input.materialId);
      } else if (input.erasing) {
        world.paintCircle(input.wx, input.wy, input.brush, ID.AIR);
      }
      step(world, simRng);
    },
    () => {
      renderer.render();
      hud.update(loop.stats, input.brush);
    },
  );

  loop.start();
}

main();
