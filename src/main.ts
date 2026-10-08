import { SCALE, WORLD_H, WORLD_W } from "./sim/constants.ts";
import { World } from "./sim/world.ts";
import { step } from "./sim/simulation.ts";
import { generateStarterWorld } from "./sim/worldgen.ts";
import { ID } from "./sim/materials.ts";
import { Particles } from "./sim/particles.ts";
import { explode } from "./sim/explosion.ts";
import { CollapseSystem } from "./sim/collapse.ts";
import { Renderer } from "./render/renderer.ts";
import { Loop } from "./core/loop.ts";
import { Input } from "./core/input.ts";
import { Rng } from "./core/rng.ts";
import { sampleShake } from "./core/fx.ts";
import { Effects } from "./core/effects.ts";
import { Hero } from "./entity/hero.ts";
import { POWERS } from "./entity/powers.ts";
import { Hud } from "./ui/hud.ts";

/** Entry point: wires sim + collapse + entities + render + input + HUD. */
function main(): void {
  const canvas = document.getElementById("screen") as HTMLCanvasElement;
  const stage = document.getElementById("stage") as HTMLElement;

  const world = new World();
  generateStarterWorld(world);

  const particles = new Particles();
  const collapse = new CollapseSystem(world);
  const effects = new Effects();
  const renderer = new Renderer(canvas, world, SCALE);
  const simRng = new Rng(0xc0ffee);

  const hero = new Hero(world, particles, collapse, simRng, WORLD_W * 0.3, WORLD_H * 0.3);

  const hud = new Hud(world, (i) => input.select(i));
  const input = new Input(
    canvas,
    (i) => hud.setSelected(i),
    (wx, wy) => {
      explode(world, particles, wx, wy, 18, 110, simRng);
      collapse.markRegion(wx - 20, wy - 20, wx + 20, wy + 20);
    },
    (mode) => {
      hud.setMode(mode);
      hud.setSelected(input.selectedIndex);
    },
  );
  hud.setSelected(0);

  const firePower = (): void => {
    if (!input.firePrimary) return;
    // No cooldowns — powers are unlimited.
    POWERS[input.powerIndex].fire({
      world,
      particles,
      collapse,
      effects,
      rng: simRng,
      hero,
      aimX: input.wx,
      aimY: input.wy,
    });
  };

  const crushCheck = (): void => {
    // Rigid bodies passing through the hero deal crushing damage.
    const left = hero.cx - hero.hw;
    const right = hero.cx + hero.hw;
    const top = hero.cy - hero.hh;
    const bottom = hero.cy + hero.hh;
    for (const body of collapse.bodies) {
      if (
        body.ox > right ||
        body.ox + body.bw < left ||
        body.oy > bottom ||
        body.oy + body.bh < top
      ) {
        continue;
      }
      hero.hurt(0.9);
      break;
    }
  };

  const loop = new Loop(
    () => {
      if (input.mode === "paint") {
        if (input.painting) {
          world.paintCircle(input.wx, input.wy, input.brush, input.materialId);
        } else if (input.erasing) {
          world.paintCircle(input.wx, input.wy, input.brush, ID.AIR);
          collapse.markRegion(
            input.wx - input.brush - 1,
            input.wy - input.brush - 1,
            input.wx + input.brush + 1,
            input.wy + input.brush + 1,
          );
        }
      } else {
        hero.update(input.moveX(), input.moveY(), input.wx);
        firePower();
      }

      step(world, simRng);
      collapse.update(particles, simRng);
      particles.update(world);
      effects.update();
      crushCheck();
    },
    () => {
      renderer.render({
        particles,
        bodies: collapse.bodies,
        hero: input.mode === "hero" ? hero : undefined,
        effects,
      });
      const shake = sampleShake(0.06, 6);
      stage.style.transform = `translate(${shake.x.toFixed(2)}px, ${shake.y.toFixed(2)}px)`;
      hud.update(loop.stats, {
        brush: input.brush,
        particles: particles.count,
        bodies: collapse.bodies.length,
        health: hero.health,
      });
    },
  );

  loop.start();
}

main();
