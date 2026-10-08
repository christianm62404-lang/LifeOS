import { describe, it, expect } from "vitest";
import { World } from "../sim/world.ts";
import { ID } from "../sim/materials.ts";
import { Particles } from "../sim/particles.ts";
import { CollapseSystem } from "../sim/collapse.ts";
import { Hero } from "../entity/hero.ts";
import { Rng } from "../core/rng.ts";
import { KAIJU, kaijuById } from "./kaiju.ts";
import { KaijuController } from "./runtime.ts";

function setup(defIndex: number) {
  const def = KAIJU[defIndex];
  const world = new World();
  const particles = new Particles();
  const rng = new Rng(1);
  const cores = def.build(world, rng);
  const ctrl = new KaijuController(def, cores, world, particles, rng);
  const hero = new Hero(world, particles, new CollapseSystem(world), rng, def.heroSpawn.x, def.heroSpawn.y);
  return { def, world, ctrl, hero, cores };
}

describe("kaiju registry", () => {
  it("ships 3 kaiju with unique ids", () => {
    expect(KAIJU.length).toBe(3);
    expect(new Set(KAIJU.map((k) => k.id)).size).toBe(3);
  });
  it("kaijuById resolves", () => {
    expect(kaijuById("cragmaw")!.name).toBe("Cragmaw");
    expect(kaijuById("nope")).toBeUndefined();
  });
});

describe("kaiju fight", () => {
  it("builds with the right number of cores, all intact", () => {
    const { ctrl, world, cores } = setup(0);
    const statuses = ctrl.statuses(world);
    expect(statuses.length).toBe(cores.length);
    expect(statuses.every((s) => !s.done)).toBe(true);
    expect(ctrl.status).toBe("active");
  });

  it("is won once every core region is emptied of armour", () => {
    const { ctrl, world, hero, cores } = setup(0);
    for (const c of cores) {
      for (let y = c.region.y0; y <= c.region.y1; y++)
        for (let x = c.region.x0; x <= c.region.x1; x++) world.paint(x, y, ID.AIR);
    }
    ctrl.update(world, hero);
    expect(ctrl.status).toBe("won");
  });

  it("runs attacks over time without error and stays active while cores hold", () => {
    const { ctrl, world, hero } = setup(2); // magma beast (stomp + hurl)
    expect(() => {
      for (let i = 0; i < 400; i++) ctrl.update(world, hero);
    }).not.toThrow();
    expect(ctrl.status).toBe("active");
  });
});
