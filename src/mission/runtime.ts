import { World } from "../sim/world.ts";
import { Hero } from "../entity/hero.ts";
import { ID } from "../sim/materials.ts";
import { SIM_DT } from "../sim/constants.ts";
import { audio } from "../core/audio.ts";
import type { Mission } from "./missions.ts";
import {
  captureBaseline,
  evaluateObjective,
  failTriggered,
  type Civilian,
  type MissionRuntime,
  type ObjectiveStatus,
} from "./objectives.ts";

export type MissionStatus = "active" | "won" | "lost";

const RESCUE_RADIUS = 11;

/** Drives one mission: timing, civilian rescue, objective + fail evaluation. */
export class MissionController {
  readonly mission: Mission;
  status: MissionStatus = "active";
  failReason = "";
  private rt: MissionRuntime;

  constructor(mission: Mission, civilians: Civilian[], world: World) {
    this.mission = mission;
    this.rt = {
      elapsed: 0,
      civilians,
      baselines: mission.objectives.map((o) => captureBaseline(o, world)),
    };
  }

  get civilians(): Civilian[] {
    return this.rt.civilians;
  }

  update(world: World, hero: Hero): void {
    if (this.status !== "active") return;
    this.rt.elapsed += SIM_DT;

    // Civilian rescue / loss.
    for (const c of this.rt.civilians) {
      if (c.rescued || c.lost) continue;
      if (world.inBounds(c.x, c.y)) {
        const m = world.mat[world.idx(c.x, c.y)];
        if (m === ID.LAVA || m === ID.FIRE || m === ID.MOLTEN_METAL) {
          c.lost = true;
          continue;
        }
      }
      if (Math.hypot(hero.cx - c.x, hero.cy - c.y) <= RESCUE_RADIUS) {
        c.rescued = true;
        audio.zap();
      }
    }

    // Objectives.
    const statuses = this.statuses(world);
    const allDone = statuses.every((s) => s.done);

    // Fail checks.
    for (const f of this.mission.fail) {
      if (failTriggered(f, world)) {
        this.lose(f.label);
        return;
      }
    }
    if (this.rt.civilians.some((c) => c.lost)) {
      this.lose("A civilian was lost");
      return;
    }
    if (this.mission.timeLimit > 0 && this.rt.elapsed >= this.mission.timeLimit && !allDone) {
      this.lose("Out of time");
      return;
    }

    if (allDone) {
      this.status = "won";
      audio.boom(0.7);
    }
  }

  private lose(reason: string): void {
    this.status = "lost";
    this.failReason = reason;
  }

  statuses(world: World): ObjectiveStatus[] {
    return this.mission.objectives.map((o, i) => evaluateObjective(o, i, world, this.rt));
  }

  get elapsed(): number {
    return this.rt.elapsed;
  }

  /** Seconds remaining, or null when the mission is untimed. */
  get remaining(): number | null {
    return this.mission.timeLimit > 0 ? Math.max(0, this.mission.timeLimit - this.rt.elapsed) : null;
  }
}
