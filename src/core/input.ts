import { SCALE } from "../sim/constants.ts";
import { PALETTE } from "../sim/materials.ts";

/**
 * Pointer + keyboard input, translated into world-space paint intent.
 *
 * Mapping screen -> world uses the canvas bounding rect (so it's correct
 * regardless of CSS scale or page layout). The owning module reads `painting`,
 * `wx`, `wy`, `selected` and `brush` each frame and applies the brush; input
 * here stays free of any sim knowledge beyond material ids.
 */
export class Input {
  wx = 0;
  wy = 0;
  painting = false;
  erasing = false;
  selected = 0; // index into PALETTE
  brush = 3;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onSelect: (paletteIndex: number) => void,
    private readonly onExplode: (wx: number, wy: number) => void,
  ) {
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
  }

  get materialId(): number {
    return PALETTE[this.selected];
  }

  private updatePos(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    // rect is in CSS pixels (world * SCALE); divide back to world cells.
    this.wx = Math.floor((e.clientX - rect.left) / SCALE);
    this.wy = Math.floor((e.clientY - rect.top) / SCALE);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.updatePos(e);
    if (e.button === 1) {
      e.preventDefault();
      this.onExplode(this.wx, this.wy); // middle click = detonate
    } else if (e.button === 2) {
      this.erasing = true;
    } else {
      this.painting = true;
    }
  };

  private onPointerUp = (): void => {
    this.painting = false;
    this.erasing = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    this.updatePos(e);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const n = PALETTE.length;
    this.select((this.selected + (e.deltaY > 0 ? 1 : -1) + n) % n);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key >= "1" && e.key <= "9") {
      const idx = Number(e.key) - 1;
      if (idx < PALETTE.length) this.select(idx);
    } else if (e.key === "[") {
      this.brush = Math.max(1, this.brush - 1);
    } else if (e.key === "]") {
      this.brush = Math.min(40, this.brush + 1);
    } else if (e.key === "x" || e.key === "X") {
      this.onExplode(this.wx, this.wy); // detonate at cursor
    }
  };

  select(index: number): void {
    this.selected = index;
    this.onSelect(index);
  }
}
