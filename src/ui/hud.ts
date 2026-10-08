import { PALETTE, material } from "../sim/materials.ts";
import { POWERS } from "../entity/powers.ts";
import type { LoopStats } from "../core/loop.ts";
import type { World } from "../sim/world.ts";
import type { Mode } from "../core/input.ts";

/**
 * DOM HUD: live stats, control hints, hero health, and the mode-dependent
 * palette (materials in paint mode, powers in hero mode). Reads state only;
 * reports palette selection back through a callback.
 */
export class Hud {
  private readonly hudEl: HTMLElement;
  private readonly helpEl: HTMLElement;
  private readonly paletteEl: HTMLElement;
  private buttons: HTMLButtonElement[] = [];
  private mode: Mode = "hero";

  constructor(
    private readonly world: World,
    private readonly onSelect: (index: number) => void,
  ) {
    this.hudEl = document.getElementById("hud")!;
    this.helpEl = document.getElementById("help")!;
    this.paletteEl = document.getElementById("palette")!;
    this.setMode("hero");
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.helpEl.innerHTML =
      mode === "hero"
        ? [
            "<b>MODE: HERO</b> (Tab to paint)",
            "<b>WASD</b> fly &nbsp; <b>mouse</b> aim",
            "<b>LMB</b> use power",
            "<b>1-9</b> / <b>wheel</b> power",
          ].join("<br>")
        : [
            "<b>MODE: PAINT</b> (Tab to hero)",
            "<b>LMB</b> paint &nbsp; <b>RMB</b> erase",
            "<b>1-9</b> / <b>wheel</b> material",
            "<b>[ ]</b> brush &nbsp; <b>X</b> explode",
          ].join("<br>");
    this.buildPalette();
  }

  private buildPalette(): void {
    this.paletteEl.innerHTML = "";
    this.buttons = [];
    const entries =
      this.mode === "hero"
        ? POWERS.map((p, i) => ({ label: `${i + 1} ${p.name}`, color: p.color }))
        : PALETTE.map((id, i) => {
            const m = material(id);
            return { label: `${i + 1} ${m.name}`, color: m.color };
          });

    entries.forEach((entry, index) => {
      const btn = document.createElement("button");
      const [r, g, b] = entry.color;
      btn.innerHTML =
        `<span class="swatch" style="background:rgb(${r},${g},${b})"></span>` +
        `<span>${entry.label}</span>`;
      btn.addEventListener("click", () => this.onSelect(index));
      this.paletteEl.appendChild(btn);
      this.buttons.push(btn);
    });
  }

  setSelected(index: number): void {
    this.buttons.forEach((b, i) => b.classList.toggle("active", i === index));
  }

  update(
    stats: LoopStats,
    extra: { brush: number; particles: number; bodies: number; health: number },
  ): void {
    const totalChunks = this.world.chunksW * this.world.chunksH;
    const hp = Math.round(extra.health);
    const bars = Math.round(hp / 10);
    const healthBar = "█".repeat(bars) + "░".repeat(10 - bars);
    this.hudEl.innerHTML = [
      `<span class="stat">${stats.fps}</span> fps · sim <span class="stat">${stats.simMs}</span>ms · render <span class="stat">${stats.renderMs}</span>ms`,
      `chunks <span class="stat">${this.world.activeChunks}</span>/${totalChunks} · ` +
        `particles <span class="stat">${extra.particles}</span> · ` +
        `chunks falling <span class="stat">${extra.bodies}</span>`,
      `HP <span class="stat">${hp}</span> <span style="color:${hp < 35 ? "#ff6b6b" : "#9fe0a0"}">${healthBar}</span>`,
    ].join("<br>");
  }
}
