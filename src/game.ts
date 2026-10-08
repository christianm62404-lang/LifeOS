import { SCALE } from "./sim/constants.ts";
import { World } from "./sim/world.ts";
import { step } from "./sim/simulation.ts";
import { WORLDS, type WorldDef } from "./sim/worldgen.ts";
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
import { audio } from "./core/audio.ts";
import { Hero } from "./entity/hero.ts";
import { POWERS } from "./entity/powers.ts";
import { Hud } from "./ui/hud.ts";
import { Menu, type MenuSection } from "./ui/menu.ts";
import { MissionHud } from "./ui/mission-hud.ts";
import { MISSIONS, type Mission } from "./mission/missions.ts";
import { MissionController } from "./mission/runtime.ts";
import { Editor } from "./editor/editor.ts";
import { applyLevel, levelToMission, listLevels, type CustomLevel } from "./editor/level.ts";
import { KAIJU, type KaijuDef } from "./kaiju/kaiju.ts";
import { KaijuController } from "./kaiju/runtime.ts";
import type { PlayController } from "./scene.ts";

export type Scene = "menu" | "play" | "editor";

/**
 * Top-level game controller. Owns the world, all systems, the hero, the render
 * loop and scene state (menu vs play), and swaps worlds in place without
 * rebuilding subsystems. Later phases extend this with missions, the editor and
 * kaiju by adding scene modes and menu sections.
 */
export class Game {
  readonly world: World;
  readonly particles: Particles;
  readonly collapse: CollapseSystem;
  readonly effects: Effects;
  readonly hero: Hero;
  readonly rng: Rng;

  protected readonly renderer: Renderer;
  protected readonly input: Input;
  protected readonly hud: Hud;
  protected readonly menu: Menu;
  protected readonly missionHud: MissionHud;
  protected readonly stage: HTMLElement;
  protected scene: Scene = "menu";

  protected controller: PlayController | null = null;
  private retry: (() => void) | null = null;
  private paused = false;
  protected readonly editor: Editor;
  private editorLevel: CustomLevel | null = null;

  constructor() {
    const canvas = document.getElementById("screen") as HTMLCanvasElement;
    this.stage = document.getElementById("stage") as HTMLElement;

    this.world = new World();
    this.particles = new Particles();
    this.collapse = new CollapseSystem(this.world);
    this.effects = new Effects();
    this.rng = new Rng(0xc0ffee);
    this.hero = new Hero(this.world, this.particles, this.collapse, this.rng, 90, 60);
    this.collapse.onImpact = () => audio.thud();

    this.renderer = new Renderer(canvas, this.world, SCALE);
    this.hud = new Hud(this.world, (i) => this.input.select(i));
    this.input = new Input(
      canvas,
      (i) => this.hud.setSelected(i),
      (wx, wy) => this.detonate(wx, wy),
      (mode) => {
        this.hud.setMode(mode);
        this.hud.setSelected(this.input.selectedIndex);
      },
      () => this.toMenu(),
    );
    this.hud.setSelected(0);
    this.menu = new Menu();
    this.missionHud = new MissionHud();
    this.editor = new Editor(canvas, this.world, {
      onTest: (level) => this.testPlay(level),
      onMenu: () => this.toMenu(),
    });
    this.editor.onImport = (level) => applyLevel(level, this.world);

    this.buildMenu();
    this.toMenu();

    this.loop = new Loop(
      () => this.step(),
      () => this.render(),
    );
    this.loop.start();
  }

  // --- menu / scene ------------------------------------------------------

  protected buildMenu(): void {
    const sections: MenuSection[] = [
      {
        title: "Free Play",
        items: WORLDS.map((wd) => ({
          label: wd.name,
          desc: wd.blurb,
          onClick: () => this.startFreePlay(wd),
        })),
      },
      {
        title: "Missions",
        items: MISSIONS.map((m) => ({
          label: m.name,
          desc: m.blurb,
          badge: m.badge,
          onClick: () => this.startMission(m),
        })),
      },
      {
        title: "Kaiju Fights",
        items: KAIJU.map((k) => ({
          label: k.name,
          desc: k.blurb,
          badge: k.badge,
          onClick: () => this.startKaiju(k),
        })),
      },
      {
        title: "Create",
        items: [
          { label: "New Level", desc: "Open the editor on a blank canvas.", badge: "EDITOR", onClick: () => this.openEditorNew() },
          ...(this.editorLevel
            ? [{ label: "Resume Editing", desc: `Continue "${this.editorLevel.name}".`, onClick: () => this.openEditorWith(this.editorLevel!) }]
            : []),
          ...listLevels().map((lv) => ({
            label: lv.name,
            desc: "Saved level — edit or test.",
            badge: "SAVED",
            onClick: () => this.openEditorWith(lv),
          })),
        ],
      },
    ];
    this.menu.render(sections);
  }

  protected toMenu(): void {
    this.scene = "menu";
    this.paused = false;
    this.controller = null;
    this.retry = null;
    this.missionHud.hide();
    this.editor.deactivate();
    this.buildMenu(); // refresh saved-level list
    this.menu.show();
  }

  openEditorNew(): void {
    this.resetSystems();
    this.editor.resetLevel();
    this.enterEditor();
  }

  openEditorWith(level: CustomLevel): void {
    this.resetSystems();
    applyLevel(level, this.world);
    this.editor.loadLevel(level);
    this.editorLevel = level;
    this.enterEditor();
  }

  private enterEditor(): void {
    this.controller = null;
    this.retry = null;
    this.missionHud.hide();
    this.scene = "editor";
    this.paused = false;
    this.menu.hide();
    this.editor.activate();
  }

  private testPlay(level: CustomLevel): void {
    this.editorLevel = level;
    this.editor.deactivate();
    this.startMission(levelToMission(level));
  }

  private resetSystems(): void {
    this.world.reset();
    this.particles.reset();
    this.collapse.reset();
    this.effects.reset();
  }

  startFreePlay(def: WorldDef): void {
    this.controller = null;
    this.retry = null;
    this.missionHud.hide();
    this.loadWorld(def);
    this.scene = "play";
    this.paused = false;
    this.editor.deactivate();
    this.menu.hide();
    audio.resume();
  }

  startMission(m: Mission): void {
    this.resetSystems();
    const civilians = m.generate(this.world, this.rng);
    this.hero.placeAt(m.spawn.x, m.spawn.y);
    this.controller = new MissionController(m, civilians, this.world);
    this.retry = () => this.startMission(m);
    this.missionHud.setMission(m.name);
    this.enterPlay();
  }

  startKaiju(def: KaijuDef): void {
    this.resetSystems();
    const cores = def.build(this.world, this.rng);
    this.hero.placeAt(def.heroSpawn.x, def.heroSpawn.y);
    this.controller = new KaijuController(def, cores, this.world, this.particles, this.rng);
    this.retry = () => this.startKaiju(def);
    this.missionHud.setMission(def.name);
    this.enterPlay();
  }

  private enterPlay(): void {
    this.scene = "play";
    this.paused = false;
    this.editor.deactivate();
    this.menu.hide();
    audio.resume();
  }

  /** Reset every system and generate a fresh world in place. */
  protected loadWorld(def: WorldDef): void {
    this.world.reset();
    this.particles.reset();
    this.collapse.reset();
    this.effects.reset();
    def.generate(this.world, this.rng);
    this.hero.placeAt(def.spawn.x, def.spawn.y);
  }

  protected detonate(wx: number, wy: number): void {
    if (this.scene !== "play") return;
    explode(this.world, this.particles, wx, wy, 18, 110, this.rng);
    this.collapse.markRegion(wx - 20, wy - 20, wx + 20, wy + 20);
    audio.boom();
  }

  // --- loop --------------------------------------------------------------

  protected step(): void {
    if (this.scene !== "play" || this.paused) return;
    this.handleInput();
    step(this.world, this.rng);
    this.collapse.update(this.particles, this.rng);
    this.particles.update(this.world);
    this.effects.update();
    this.crushCheck();
    this.updatePlay();
    this.onStepExtra();
  }

  private updatePlay(): void {
    const c = this.controller;
    if (!c) return;
    c.update(this.world, this.hero);
    this.missionHud.update(c.name, c.statuses(this.world), c.remaining);
    if (c.status !== "active") {
      this.paused = true;
      this.missionHud.showEnd(
        c.status === "won",
        c.failReason,
        () => this.retry?.(),
        () => this.toMenu(),
      );
    }
  }

  /** Hook for subclasses to add per-tick logic. */
  protected onStepExtra(): void {}

  protected handleInput(): void {
    const input = this.input;
    if (input.mode === "paint") {
      if (input.painting) {
        this.world.paintCircle(input.wx, input.wy, input.brush, input.materialId);
      } else if (input.erasing) {
        this.world.paintCircle(input.wx, input.wy, input.brush, ID.AIR);
        this.collapse.markRegion(
          input.wx - input.brush - 1,
          input.wy - input.brush - 1,
          input.wx + input.brush + 1,
          input.wy + input.brush + 1,
        );
      }
    } else {
      this.hero.update(input.moveX(), input.moveY(), input.wx);
      if (input.firePrimary) {
        POWERS[input.powerIndex].fire({
          world: this.world,
          particles: this.particles,
          collapse: this.collapse,
          effects: this.effects,
          rng: this.rng,
          hero: this.hero,
          aimX: input.wx,
          aimY: input.wy,
        });
      }
    }
  }

  private crushCheck(): void {
    const h = this.hero;
    const left = h.cx - h.hw;
    const right = h.cx + h.hw;
    const top = h.cy - h.hh;
    const bottom = h.cy + h.hh;
    for (const body of this.collapse.bodies) {
      if (body.ox > right || body.ox + body.bw < left || body.oy > bottom || body.oy + body.bh < top) {
        continue;
      }
      h.hurt(0.9);
      break;
    }
  }

  protected render(): void {
    if (this.scene === "editor") {
      const ov = this.editor.overlay();
      this.renderer.render({ rects: ov.rects, spawn: ov.spawn, markers: ov.markers });
      this.stage.style.transform = "";
      return;
    }
    this.renderer.render({
      particles: this.particles,
      bodies: this.collapse.bodies,
      hero: this.scene === "play" && this.input.mode === "hero" ? this.hero : undefined,
      effects: this.effects,
      markers: this.controller?.civilians,
    });
    const shake = sampleShake(0.06, 6);
    this.stage.style.transform = `translate(${shake.x.toFixed(2)}px, ${shake.y.toFixed(2)}px)`;
    this.hud.update(this.loop.stats, {
      brush: this.input.brush,
      particles: this.particles.count,
      bodies: this.collapse.bodies.length,
      health: this.hero.health,
    });
    this.onRenderExtra();
  }

  protected onRenderExtra(): void {}

  protected loop!: Loop;
}
