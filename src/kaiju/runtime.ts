import { World } from "../sim/world.ts";
import { Hero } from "../entity/hero.ts";
import { Particles } from "../sim/particles.ts";
import { explode } from "../sim/explosion.ts";
import { State, material } from "../sim/materials.ts";
import { SIM_DT } from "../sim/constants.ts";
import { Rng } from "../core/rng.ts";
import { addShake } from "../core/fx.ts";
import { audio } from "../core/audio.ts";
import type { PlayController } from "../scene.ts";
import type { ObjectiveStatus, Region } from "../mission/objectives.ts";
import { groundY, type CoreSpec, type KaijuDef } from "./kaiju.ts";
import { ID } from "../sim/materials.ts";

interface CoreState {
  spec: CoreSpec;
  baseline: number;
}

const BREAK_THRESHOLD = 0.2; // core broken when armour drops below 20%

/** Cells that still count as a core's armour: solids, lava and molten metal. */
function armourCount(world: World, r: Region): number {
  let c = 0;
  for (let y = Math.max(0, r.y0); y <= Math.min(world.h - 1, r.y1); y++) {
    for (let x = Math.max(0, r.x0); x <= Math.min(world.w - 1, r.x1); x++) {
      const m = world.mat[world.idx(x, y)];
      if (material(m).state === State.Solid || m === ID.LAVA || m === ID.MOLTEN_METAL) c++;
    }
  }
  return c;
}

/**
 * Drives a kaiju fight: tracks each weak-point core's integrity (break them all
 * to win), and runs the monster's timed attacks against the hero. A core is
 * only "broken" once its region is emptied of armour — melting (ice→water) or
 * cooling + shattering (lava→rock→air) both work, depending on the material.
 */
export class KaijuController implements PlayController {
  readonly name: string;
  status: "active" | "won" | "lost" = "active";
  failReason = "";
  private cores: CoreState[];
  private attackTimer: number;

  constructor(
    private readonly def: KaijuDef,
    cores: CoreSpec[],
    world: World,
    private readonly particles: Particles,
    private readonly rng: Rng,
  ) {
    this.name = def.name;
    this.cores = cores.map((spec) => ({ spec, baseline: Math.max(1, armourCount(world, spec.region)) }));
    this.attackTimer = def.attackInterval;
  }

  get remaining(): number | null {
    return null;
  }

  update(world: World, hero: Hero): void {
    if (this.status !== "active") return;

    this.attackTimer -= SIM_DT;
    if (this.attackTimer <= 0) {
      this.attack(world, hero);
      this.attackTimer = this.def.attackInterval;
    }

    const allBroken = this.cores.every((c) => armourCount(world, c.spec.region) / c.baseline <= BREAK_THRESHOLD);
    if (allBroken) {
      this.status = "won";
      addShake(1);
      audio.boom(1);
    }
  }

  statuses(world: World): ObjectiveStatus[] {
    return this.cores.map((c) => {
      const frac = armourCount(world, c.spec.region) / c.baseline;
      const done = frac <= BREAK_THRESHOLD;
      return { label: c.spec.label, progress: 1 - Math.min(1, frac), done };
    });
  }

  private attack(world: World, hero: Hero): void {
    const kind = this.def.attacks[this.rng.int(this.def.attacks.length)];
    if (kind === "stomp") {
      // Shockwave on the ground beneath the hero.
      const x = Math.round(hero.cx);
      explode(world, this.particles, x, groundY, 16, 95, this.rng, 0.15);
      addShake(0.6);
      audio.boom(0.7);
      if (Math.abs(hero.cy - groundY) < 26) hero.hurt(16);
    } else {
      // Hurl a projectile of the kaiju's material toward the hero.
      const sx = world.w * 0.6;
      const sy = groundY - 90;
      const dx = hero.cx - sx;
      const dy = hero.cy - sy;
      const len = Math.hypot(dx, dy) || 1;
      for (let k = 0; k < 10; k++) {
        this.particles.spawn(
          sx + (this.rng.next() - 0.5) * 4,
          sy + (this.rng.next() - 0.5) * 4,
          (dx / len) * 3.2 + (this.rng.next() - 0.5),
          (dy / len) * 3.2 - 1.2,
          this.def.projectile,
          this.def.projectile === ID.LAVA ? 1100 : 20,
          90,
        );
      }
      audio.whoosh();
    }
  }
}
