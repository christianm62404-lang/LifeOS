import { World } from "../sim/world.ts";
import { MATERIALS } from "../sim/materials.ts";

/**
 * Framebuffer renderer. Maintains an ImageData the size of the world, fills it
 * from the material table + per-cell shade, and blits it to the canvas backing
 * store at 1:1. The canvas is then scaled up by CSS with
 * `image-rendering: pixelated`, giving the chunky look for free with no extra
 * draw cost.
 */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly buf: Uint8ClampedArray;

  // Flattened colour LUTs for speed (avoid tuple indexing in the hot loop).
  private readonly lutR: Int32Array;
  private readonly lutG: Int32Array;
  private readonly lutB: Int32Array;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly world: World,
    scale: number,
  ) {
    canvas.width = world.w;
    canvas.height = world.h;
    canvas.style.width = `${world.w * scale}px`;
    canvas.style.height = `${world.h * scale}px`;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.image = ctx.createImageData(world.w, world.h);
    this.buf = this.image.data;
    // Opaque alpha for every pixel, once.
    for (let i = 3; i < this.buf.length; i += 4) this.buf[i] = 255;

    const n = MATERIALS.length;
    this.lutR = new Int32Array(n);
    this.lutG = new Int32Array(n);
    this.lutB = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      this.lutR[i] = MATERIALS[i].color[0];
      this.lutG[i] = MATERIALS[i].color[1];
      this.lutB[i] = MATERIALS[i].color[2];
    }
  }

  render(): void {
    const { mat, shade } = this.world;
    const buf = this.buf;
    const lutR = this.lutR;
    const lutG = this.lutG;
    const lutB = this.lutB;
    const n = mat.length;

    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const m = mat[i];
      // shade is -128..127; scale down to a gentle brightness wobble.
      const s = shade[i] >> 3; // ~ -16..15
      buf[p] = clamp(lutR[m] + s);
      buf[p + 1] = clamp(lutG[m] + s);
      buf[p + 2] = clamp(lutB[m] + s);
    }

    this.ctx.putImageData(this.image, 0, 0);
  }
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
