import { World } from "../sim/world.ts";
import { MATERIALS } from "../sim/materials.ts";
import { Particles } from "../sim/particles.ts";

/**
 * Framebuffer renderer. Fills an ImageData the size of the world from the
 * material colour table, per-cell shade jitter, and a temperature glow for hot
 * materials, then overlays debris particles and blits 1:1 to the canvas. CSS
 * scales the canvas up with `image-rendering: pixelated` — chunky pixels, no
 * extra draw cost.
 */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly buf: Uint8ClampedArray;

  private readonly lutR: Int32Array;
  private readonly lutG: Int32Array;
  private readonly lutB: Int32Array;
  private readonly lutGlow: Float32Array;

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
    for (let i = 3; i < this.buf.length; i += 4) this.buf[i] = 255;

    const n = MATERIALS.length;
    this.lutR = new Int32Array(n);
    this.lutG = new Int32Array(n);
    this.lutB = new Int32Array(n);
    this.lutGlow = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.lutR[i] = MATERIALS[i].color[0];
      this.lutG[i] = MATERIALS[i].color[1];
      this.lutB[i] = MATERIALS[i].color[2];
      this.lutGlow[i] = MATERIALS[i].glow ?? 0;
    }
  }

  render(particles?: Particles): void {
    const { mat, shade, temp } = this.world;
    const buf = this.buf;
    const { lutR, lutG, lutB, lutGlow } = this;
    const n = mat.length;

    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const m = mat[i];
      const s = shade[i] >> 3; // gentle -16..15 brightness wobble
      let r = lutR[m] + s;
      let g = lutG[m] + s;
      let b = lutB[m] + s;

      // Temperature glow: material self-glow, boosted when genuinely hot.
      const t = temp[i];
      let gf = lutGlow[m];
      if (t > 300) {
        const hot = (t - 300) / 900;
        gf = gf > hot ? gf : hot;
      }
      if (gf > 0) {
        if (gf > 1) gf = 1;
        r += gf * 150;
        g += gf * 70;
        b -= gf * 25;
      }

      buf[p] = clamp(r);
      buf[p + 1] = clamp(g);
      buf[p + 2] = clamp(b);
    }

    if (particles) this.drawParticles(particles);

    this.ctx.putImageData(this.image, 0, 0);
  }

  private drawParticles(particles: Particles): void {
    const buf = this.buf;
    const { lutR, lutG, lutB } = this;
    const w = this.world.w;
    const h = this.world.h;
    for (let i = 0; i < particles.alive.length; i++) {
      if (!particles.alive[i]) continue;
      const x = particles.x[i] | 0;
      const y = particles.y[i] | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const m = particles.mat[i];
      const t = particles.temp[i];
      const p = (y * w + x) * 4;
      let r = lutR[m] + 30;
      let g = lutG[m] + 30;
      let b = lutB[m] + 30;
      if (t > 400) {
        r += 120;
        g += 60;
      }
      buf[p] = clamp(r);
      buf[p + 1] = clamp(g);
      buf[p + 2] = clamp(b);
    }
  }
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
