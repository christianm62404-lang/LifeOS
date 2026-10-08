import { PALETTE, material } from "../sim/materials.ts";
import type { LoopStats } from "../core/loop.ts";
import type { World } from "../sim/world.ts";

/**
 * Lightweight DOM HUD: live stats, control hints, and the material palette.
 * Kept entirely separate from sim/render — it only reads stats and reports
 * palette selection back through a callback.
 */
export class Hud {
  private readonly hudEl: HTMLElement;
  private readonly helpEl: HTMLElement;
  private readonly buttons: HTMLButtonElement[] = [];

  constructor(
    private readonly world: World,
    onSelect: (paletteIndex: number) => void,
  ) {
    this.hudEl = document.getElementById("hud")!;
    this.helpEl = document.getElementById("help")!;

    this.helpEl.innerHTML = [
      "<b>LMB</b> paint &nbsp; <b>RMB</b> erase",
      "<b>1-9</b> / <b>wheel</b> material",
      "<b>[ ]</b> brush size",
      "<b>X</b> / <b>MMB</b> explode",
    ].join("<br>");

    const palette = document.getElementById("palette")!;
    PALETTE.forEach((id, index) => {
      const m = material(id);
      const btn = document.createElement("button");
      const [r, g, b] = m.color;
      btn.innerHTML =
        `<span class="swatch" style="background:rgb(${r},${g},${b})"></span>` +
        `<span>${index + 1} ${m.name}</span>`;
      btn.addEventListener("click", () => onSelect(index));
      palette.appendChild(btn);
      this.buttons.push(btn);
    });
  }

  setSelected(index: number): void {
    this.buttons.forEach((b, i) => b.classList.toggle("active", i === index));
  }

  update(stats: LoopStats, brush: number, particles = 0): void {
    const totalChunks = this.world.chunksW * this.world.chunksH;
    this.hudEl.innerHTML = [
      `<span class="stat">${stats.fps}</span> fps`,
      `sim <span class="stat">${stats.simStepsPerSec}</span>/s · ` +
        `<span class="stat">${stats.simMs}</span>ms`,
      `render <span class="stat">${stats.renderMs}</span>ms`,
      `chunks awake <span class="stat">${this.world.activeChunks}</span>/${totalChunks}`,
      `particles <span class="stat">${particles}</span>`,
      `brush <span class="stat">${brush}</span>`,
    ].join("<br>");
  }
}
