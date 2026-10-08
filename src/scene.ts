import { World } from "./sim/world.ts";
import { Hero } from "./entity/hero.ts";
import type { ObjectiveStatus, Civilian } from "./mission/objectives.ts";

/**
 * Common interface for anything that drives a "play" session with objectives and
 * a win/lose state — missions and kaiju fights both implement it, so the Game
 * loop treats them uniformly (update, render status bars, show the end banner).
 */
export interface PlayController {
  readonly name: string;
  status: "active" | "won" | "lost";
  failReason: string;
  /** Seconds remaining, or null if untimed. */
  readonly remaining: number | null;
  /** Civilians to render as markers, if any. */
  readonly civilians?: Civilian[];
  update(world: World, hero: Hero): void;
  statuses(world: World): ObjectiveStatus[];
}
