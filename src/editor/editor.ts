import { World } from "../sim/world.ts";
import { SCALE } from "../sim/constants.ts";
import { ID, PALETTE, material } from "../sim/materials.ts";
import type { OverlayRect, Marker } from "../render/renderer.ts";
import type { Region } from "../mission/objectives.ts";
import {
  decodeLevel,
  encodeLevel,
  levelFromWorld,
  saveLevel,
  type CustomLevel,
} from "./level.ts";

type Tool = "paint" | "erase" | "fill" | "spawn" | "civilian" | "goal" | "protect";
type GoalKind = "none" | "fill-water" | "fill-ice" | "demolish" | "survive" | "rescue";

export interface EditorCallbacks {
  onTest: (level: CustomLevel) => void;
  onMenu: () => void;
}

/**
 * In-game level editor. Paints directly onto the world grid (simulation paused),
 * places a spawn, civilians and goal/protect zones, and serializes to a
 * CustomLevel for save/share/test-play.
 */
export class Editor {
  active = false;
  private tool: Tool = "paint";
  private matId: number = ID.ROCK;
  private brush = 4;
  private name = "My Level";
  private spawn: { x: number; y: number } | null = null;
  private civilians: { x: number; y: number }[] = [];
  private goalZone: Region | null = null;
  private goalKind: GoalKind = "none";
  private goalSeconds = 20;
  private protectZone: Region | null = null;
  private protectMat: "lava" | "water" = "lava";
  private timeLimit = 0;

  private dragStart: { x: number; y: number } | null = null;
  private dragRect: Region | null = null;
  private pointerDown = false;

  private readonly bar: HTMLElement;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly world: World,
    private readonly cb: EditorCallbacks,
  ) {
    injectStyles();
    this.bar = document.createElement("div");
    this.bar.id = "editor-bar";
    this.bar.style.display = "none";
    document.getElementById("stage")!.appendChild(this.bar);
    this.buildToolbar();

    canvas.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
  }

  // --- lifecycle ---------------------------------------------------------

  activate(): void {
    this.active = true;
    this.bar.style.display = "flex";
  }
  deactivate(): void {
    this.active = false;
    this.bar.style.display = "none";
  }
  resetLevel(): void {
    this.world.reset();
    this.spawn = null;
    this.civilians = [];
    this.goalZone = null;
    this.protectZone = null;
    this.goalKind = "none";
    this.name = "My Level";
    this.syncInputs();
  }

  loadLevel(level: CustomLevel): void {
    // Caller has already applied the cells to the world.
    this.name = level.name;
    this.spawn = level.spawn;
    this.civilians = level.civilians.slice();
    this.timeLimit = level.timeLimit;
    this.goalKind = level.goal?.kind ?? "none";
    this.goalZone = level.goal?.zone ?? null;
    this.goalSeconds = level.goal?.seconds ?? 20;
    this.protectZone = level.protect?.zone ?? null;
    this.protectMat = level.protect?.material ?? "lava";
    this.syncInputs();
  }

  // --- overlay for the renderer -----------------------------------------

  overlay(): { rects: OverlayRect[]; spawn: { x: number; y: number } | null; markers: Marker[] } {
    const rects: OverlayRect[] = [];
    if (this.goalZone) rects.push({ ...this.goalZone, color: [120, 230, 140] });
    if (this.protectZone) rects.push({ ...this.protectZone, color: [255, 110, 110] });
    if (this.dragRect) rects.push({ ...this.dragRect, color: [255, 220, 120] });
    return {
      rects,
      spawn: this.spawn,
      markers: this.civilians.map((c) => ({ x: c.x, y: c.y, rescued: false, lost: false })),
    };
  }

  // --- pointer editing ---------------------------------------------------

  private toWorld(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) / SCALE),
      y: Math.floor((e.clientY - rect.top) / SCALE),
    };
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.active || e.button !== 0) return;
    this.pointerDown = true;
    const p = this.toWorld(e);
    if (this.tool === "goal" || this.tool === "protect") {
      this.dragStart = p;
      this.dragRect = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    } else {
      this.apply(p);
    }
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.active || !this.pointerDown) return;
    const p = this.toWorld(e);
    if (this.dragStart) {
      this.dragRect = { x0: this.dragStart.x, y0: this.dragStart.y, x1: p.x, y1: p.y };
    } else if (this.tool === "paint" || this.tool === "erase") {
      this.apply(p);
    }
  };

  private onUp = (): void => {
    if (!this.active) return;
    this.pointerDown = false;
    if (this.dragStart && this.dragRect) {
      const z = normalize(this.dragRect, this.world);
      if (this.tool === "goal") this.goalZone = z;
      else this.protectZone = z;
    }
    this.dragStart = null;
    this.dragRect = null;
  };

  private apply(p: { x: number; y: number }): void {
    switch (this.tool) {
      case "paint":
        this.world.paintCircle(p.x, p.y, this.brush, this.matId);
        break;
      case "erase":
        this.world.paintCircle(p.x, p.y, this.brush, ID.AIR);
        break;
      case "fill":
        this.floodFill(p.x, p.y, this.matId);
        break;
      case "spawn":
        this.spawn = { x: p.x, y: p.y };
        break;
      case "civilian":
        this.civilians.push({ x: p.x, y: p.y });
        break;
      default:
        break;
    }
  }

  private floodFill(sx: number, sy: number, mat: number): void {
    const { world } = this;
    if (!world.inBounds(sx, sy)) return;
    const target = world.mat[world.idx(sx, sy)];
    if (target === mat) return;
    const stack = [world.idx(sx, sy)];
    let budget = 60000;
    while (stack.length > 0 && budget-- > 0) {
      const i = stack.pop()!;
      if (world.mat[i] !== target) continue;
      const x = i % world.w;
      const y = (i / world.w) | 0;
      world.paint(x, y, mat);
      if (x > 0) stack.push(i - 1);
      if (x < world.w - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - world.w);
      if (y < world.h - 1) stack.push(i + world.w);
    }
  }

  // --- serialization -----------------------------------------------------

  buildLevel(): CustomLevel {
    const spawn = this.spawn ?? { x: this.world.w / 2, y: 40 };
    let goal: CustomLevel["goal"];
    if (this.goalKind !== "none") {
      const needsZone = this.goalKind === "fill-water" || this.goalKind === "fill-ice" || this.goalKind === "demolish";
      const zone = this.goalZone ?? { x0: 0, y0: 0, x1: this.world.w - 1, y1: this.world.h - 1 };
      if (!needsZone || this.goalZone) {
        goal = { kind: this.goalKind, zone, seconds: this.goalSeconds };
      }
    }
    const protect =
      this.protectZone ? { zone: this.protectZone, material: this.protectMat } : undefined;
    return levelFromWorld(this.world, {
      name: this.name,
      spawn,
      civilians: this.civilians.slice(),
      goal,
      protect,
      timeLimit: this.timeLimit,
    });
  }

  // --- toolbar -----------------------------------------------------------

  private goalSelect!: HTMLSelectElement;
  private protectSelect!: HTMLSelectElement;
  private nameInput!: HTMLInputElement;
  private timeInput!: HTMLInputElement;

  private buildToolbar(): void {
    const tools: Tool[] = ["paint", "erase", "fill", "spawn", "civilian", "goal", "protect"];
    const toolBtns = tools
      .map((t) => `<button class="eb-btn eb-tool" data-tool="${t}">${t}</button>`)
      .join("");
    const mats = PALETTE.map((id) => {
      const m = material(id);
      const [r, g, b] = m.color;
      return `<button class="eb-mat" data-mat="${id}" title="${m.name}" style="background:rgb(${r},${g},${b})"></button>`;
    }).join("");

    this.bar.innerHTML = `
      <div class="eb-row">
        <span class="eb-group">${toolBtns}</span>
        <span class="eb-group eb-mats">${mats}</span>
        <label class="eb-group">brush <input type="range" min="1" max="24" value="${this.brush}" id="eb-brush"></label>
      </div>
      <div class="eb-row">
        <label class="eb-group">name <input id="eb-name" value="${this.name}"></label>
        <label class="eb-group">goal
          <select id="eb-goal">
            <option value="none">none</option>
            <option value="fill-water">flood (water)</option>
            <option value="fill-ice">freeze (ice)</option>
            <option value="demolish">demolish</option>
            <option value="survive">survive</option>
            <option value="rescue">rescue</option>
          </select>
        </label>
        <label class="eb-group">protect
          <select id="eb-protect">
            <option value="none">none</option>
            <option value="lava">no lava</option>
            <option value="water">no water</option>
          </select>
        </label>
        <label class="eb-group">time(s) <input id="eb-time" type="number" min="0" value="${this.timeLimit}" style="width:52px"></label>
        <span class="eb-group">
          <button class="eb-btn" data-act="clear">Clear</button>
          <button class="eb-btn eb-primary" data-act="test">Test ▶</button>
          <button class="eb-btn" data-act="save">Save</button>
          <button class="eb-btn" data-act="export">Export</button>
          <button class="eb-btn" data-act="import">Import</button>
          <button class="eb-btn" data-act="menu">Menu</button>
        </span>
      </div>`;

    this.bar.querySelectorAll<HTMLButtonElement>(".eb-tool").forEach((b) => {
      b.addEventListener("click", () => {
        this.tool = b.dataset.tool as Tool;
        this.highlightTools();
      });
    });
    this.bar.querySelectorAll<HTMLButtonElement>(".eb-mat").forEach((b) => {
      b.addEventListener("click", () => {
        this.matId = Number(b.dataset.mat);
        if (this.tool !== "paint" && this.tool !== "fill") this.tool = "paint";
        this.highlightTools();
        this.highlightMats();
      });
    });
    (this.bar.querySelector("#eb-brush") as HTMLInputElement).addEventListener("input", (e) => {
      this.brush = Number((e.target as HTMLInputElement).value);
    });
    this.nameInput = this.bar.querySelector("#eb-name")!;
    this.nameInput.addEventListener("input", () => (this.name = this.nameInput.value || "My Level"));
    this.goalSelect = this.bar.querySelector("#eb-goal")!;
    this.goalSelect.addEventListener("change", () => (this.goalKind = this.goalSelect.value as GoalKind));
    this.protectSelect = this.bar.querySelector("#eb-protect")!;
    this.protectSelect.addEventListener("change", () => {
      const v = this.protectSelect.value;
      if (v === "none") this.protectZone = null;
      else this.protectMat = v as "lava" | "water";
    });
    this.timeInput = this.bar.querySelector("#eb-time")!;
    this.timeInput.addEventListener("input", () => (this.timeLimit = Number(this.timeInput.value) || 0));

    this.bar.querySelectorAll<HTMLButtonElement>("[data-act]").forEach((b) => {
      b.addEventListener("click", () => this.action(b.dataset.act!));
    });
    this.highlightTools();
    this.highlightMats();
  }

  private highlightTools(): void {
    this.bar.querySelectorAll<HTMLButtonElement>(".eb-tool").forEach((b) => {
      b.classList.toggle("active", b.dataset.tool === this.tool);
    });
  }
  private highlightMats(): void {
    this.bar.querySelectorAll<HTMLButtonElement>(".eb-mat").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.mat) === this.matId);
    });
  }
  private syncInputs(): void {
    if (!this.nameInput) return;
    this.nameInput.value = this.name;
    this.goalSelect.value = this.goalKind;
    this.protectSelect.value = this.protectZone ? this.protectMat : "none";
    this.timeInput.value = String(this.timeLimit);
  }

  private action(act: string): void {
    switch (act) {
      case "clear":
        this.resetLevel();
        break;
      case "test":
        this.cb.onTest(this.buildLevel());
        break;
      case "save": {
        const level = this.buildLevel();
        saveLevel(level);
        flash(`Saved "${level.name}"`);
        break;
      }
      case "export": {
        const str = encodeLevel(this.buildLevel());
        download(`${this.name}.sand.txt`, str);
        window.prompt("Shareable level string (copy this):", str);
        break;
      }
      case "import": {
        const str = window.prompt("Paste a level string:");
        if (!str) break;
        try {
          const level = decodeLevel(str);
          this.importLevel(level);
        } catch {
          flash("Invalid level string");
        }
        break;
      }
      case "menu":
        this.cb.onMenu();
        break;
    }
  }

  /** Expose a way for Game to apply an imported level's cells, then load meta. */
  onImport: ((level: CustomLevel) => void) | null = null;
  private importLevel(level: CustomLevel): void {
    this.onImport?.(level);
    this.loadLevel(level);
    flash(`Imported "${level.name}"`);
  }
}

function normalize(r: Region, world: World): Region {
  return {
    x0: Math.max(0, Math.min(r.x0, r.x1)),
    y0: Math.max(0, Math.min(r.y0, r.y1)),
    x1: Math.min(world.w - 1, Math.max(r.x0, r.x1)),
    y1: Math.min(world.h - 1, Math.max(r.y0, r.y1)),
  };
}

function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

let flashTimer = 0;
function flash(msg: string): void {
  let el = document.getElementById("eb-flash");
  if (!el) {
    el = document.createElement("div");
    el.id = "eb-flash";
    document.getElementById("stage")!.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => (el!.style.opacity = "0"), 1600);
}

function injectStyles(): void {
  if (document.getElementById("editor-styles")) return;
  const css = document.createElement("style");
  css.id = "editor-styles";
  css.textContent = `
    #editor-bar {
      position:absolute; left:0; right:0; bottom:0; z-index:30;
      display:flex; flex-direction:column; gap:6px; padding:8px 10px;
      background:rgba(14,14,22,.92); border-top:1px solid #2a2a3a; font-size:12px;
    }
    .eb-row { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
    .eb-group { display:flex; gap:4px; align-items:center; color:#b8b8cc; }
    .eb-btn, .eb-tool {
      all:unset; cursor:pointer; padding:4px 9px; border:1px solid #2a2a3a;
      border-radius:5px; background:#1a1a24; color:#dcdce8; text-transform:capitalize;
    }
    .eb-btn:hover, .eb-tool:hover { border-color:#6a6a86; }
    .eb-tool.active { border-color:#ffd479; background:#262013; color:#ffe9b8; }
    .eb-primary { border-color:#4caf6d; color:#9fe0a0; }
    .eb-mat { all:unset; cursor:pointer; width:18px; height:18px; border-radius:4px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.15); }
    .eb-mat.active { box-shadow:0 0 0 2px #ffd479; }
    #editor-bar input, #editor-bar select {
      background:#0f0f17; color:#e8e8f0; border:1px solid #2a2a3a; border-radius:4px; padding:2px 4px;
    }
    #eb-flash {
      position:absolute; top:8px; left:50%; transform:translateX(-50%);
      background:#1b1b26; border:1px solid #4caf6d; color:#9fe0a0; padding:6px 12px;
      border-radius:6px; font-size:12px; z-index:40; transition:opacity .4s; pointer-events:none;
    }
  `;
  document.head.appendChild(css);
}
