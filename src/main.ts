import { SCALE } from "./sim/constants.ts";
import { World } from "./sim/world.ts";
import { step } from "./sim/simulation.ts";
import { generateStarterWorld } from "./sim/worldgen.ts";
import { ID } from "./sim/materials.ts";
import { Particles } from "./sim/particles.ts";
import { explode } from "./sim/explosion.ts";
import { Renderer } from "./render/renderer.ts";
import { Loop } from "./core/loop.ts";
import { Input } from "./core/input.ts";
import { Rng } from "./core/rng.ts";
import { sampleShake } from "./core/fx.ts";
import { Hud } from "./ui/hud.ts";

/**
 * Entry point: constructs the world, wires sim + render + input + HUD together
 * behind the fixed-timestep loop. This is the only module that knows about all
 * the others.
 */
function main(): void {
  const canvas = document.getElementById("screen") as HTMLCanvasElement;

  const stage = document.getElementById("stage") as HTMLElement;

  const world = new World();
  generateStarterWorld(world);

  const particles = new Particles();
  const renderer = new Renderer(canvas, world, SCALE);
  const simRng = new Rng(0xc0ffee);

  const hud = new Hud(world, (i) => {
    input.select(i);
  });
  const input = new Input(
    canvas,
    (i) => hud.setSelected(i),
    (wx, wy) => explode(world, particles, wx, wy, 18, 110, simRng),
  );
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
      particles.update(world);
    },
    () => {
      renderer.render(particles);
      const shake = sampleShake(0.06, 6);
      stage.style.transform = `translate(${shake.x.toFixed(2)}px, ${shake.y.toFixed(2)}px)`;
      hud.update(loop.stats, input.brush, particles.count);
    },
  );

  loop.start();
}

main();
