import { SCALE } from "../sim/constants.ts";
import { PALETTE } from "../sim/materials.ts";
import { POWERS } from "../entity/powers.ts";

export type Mode = "hero" | "paint";

/**
 * Pointer + keyboard input for both modes:
 *  - hero  : WASD/arrows fly, mouse aims, LMB fires the selected power,
 *            number keys / wheel switch powers.
 *  - paint : LMB paints, RMB erases, number keys / wheel switch materials.
 * Tab toggles modes. Input stays free of sim/entity logic — the owning module
 * reads these fields each tick.
 */
export class Input {
  wx = 0;
  wy = 0;

  mode: Mode = "hero";
  firePrimary = false; // LMB held (fire power in hero mode)
  painting = false;
  erasing = false;

  powerIndex = 0;
  paintIndex = 0;
  brush = 3;

  private readonly keys = new Set<string>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onSelect: (index: number, mode: Mode) => void,
    private readonly onExplode: (wx: number, wy: number) => void,
    private readonly onModeChange: (mode: Mode) => void,
  ) {
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", () => this.keys.clear());
  }

  get selectedIndex(): number {
    return this.mode === "hero" ? this.powerIndex : this.paintIndex;
  }

  get listLength(): number {
    return this.mode === "hero" ? POWERS.length : PALETTE.length;
  }

  get materialId(): number {
    return PALETTE[this.paintIndex];
  }

  moveX(): number {
    let v = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) v -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) v += 1;
    return v;
  }

  moveY(): number {
    let v = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) v -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) v += 1;
    return v;
  }

  private updatePos(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.wx = Math.floor((e.clientX - rect.left) / SCALE);
    this.wy = Math.floor((e.clientY - rect.top) / SCALE);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.updatePos(e);
    if (e.button === 1) {
      e.preventDefault();
      this.onExplode(this.wx, this.wy);
      return;
    }
    if (this.mode === "hero") {
      if (e.button === 0) this.firePrimary = true;
    } else {
      if (e.button === 2) this.erasing = true;
      else this.painting = true;
    }
  };

  private onPointerUp = (): void => {
    this.firePrimary = false;
    this.painting = false;
    this.erasing = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    this.updatePos(e);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const n = this.listLength;
    this.select((this.selectedIndex + (e.deltaY > 0 ? 1 : -1) + n) % n);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if (k === "tab") {
      e.preventDefault();
      this.mode = this.mode === "hero" ? "paint" : "hero";
      this.onModeChange(this.mode);
      this.onSelect(this.selectedIndex, this.mode);
      return;
    }
    if (k >= "1" && k <= "9") {
      const idx = Number(k) - 1;
      if (idx < this.listLength) this.select(idx);
      return;
    }
    if (k === "[") this.brush = Math.max(1, this.brush - 1);
    else if (k === "]") this.brush = Math.min(40, this.brush + 1);
    else if (k === "x" && this.mode === "paint") this.onExplode(this.wx, this.wy);
    else this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  select(index: number): void {
    if (this.mode === "hero") this.powerIndex = index;
    else this.paintIndex = index;
    this.onSelect(index, this.mode);
  }
}
