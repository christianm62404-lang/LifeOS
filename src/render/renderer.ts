import { World } from "../sim/world.ts";
import { MATERIALS } from "../sim/materials.ts";
import { Particles } from "../sim/particles.ts";
import type { RigidBody } from "../sim/collapse.ts";
import type { Effects } from "../core/effects.ts";
import { Hero, HERO_H, HERO_W } from "../entity/hero.ts";

export interface Marker {
  x: number;
  y: number;
  rescued: boolean;
  lost: boolean;
}

export interface Scene {
  particles?: Particles;
  bodies?: readonly RigidBody[];
  hero?: Hero;
  effects?: Effects;
  markers?: readonly Marker[];
}

// Original 8x12 hero sprite ("Emberkin"), 2 animation frames. '.'/' ' = clear.
// Frame 0: cape down / legs together. Frame 1: cape flared / legs apart.
const HERO_FRAMES = [
  [
    "   SS   ",
    "  SSSS  ",
    "  SKKS  ",
    "   KK   ",
    " CSSSSC ",
    " CSSSSC ",
    " CSSSSC ",
    "  SSSS  ",
    "  S  S  ",
    "  B  B  ",
    "  B  B  ",
    "  BB BB ",
  ],
  [
    "   SS   ",
    "  SSSS  ",
    "  SKKS  ",
    "   KK   ",
    "CCSSSSC ",
    "CCSSSSC ",
    " CSSSSC ",
    "  SSSS  ",
    " S    S ",
    " B    B ",
    " B    B ",
    "BB    BB",
  ],
];
const HERO_COLORS: Record<string, [number, number, number]> = {
  S: [84, 96, 214], // suit (indigo)
  K: [232, 188, 150], // skin
  C: [214, 66, 92], // cape (crimson)
  B: [245, 206, 92], // boots/gloves (gold)
};

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

  render(scene: Scene = {}): void {
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

    if (scene.bodies) this.drawBodies(scene.bodies);
    if (scene.particles) this.drawParticles(scene.particles);
    if (scene.markers) this.drawMarkers(scene.markers);
    if (scene.hero) this.drawHero(scene.hero);
    if (scene.effects) this.drawEffects(scene.effects);

    this.ctx.putImageData(this.image, 0, 0);
  }

  private setPixel(x: number, y: number, r: number, g: number, b: number): void {
    if (x < 0 || y < 0 || x >= this.world.w || y >= this.world.h) return;
    const p = (y * this.world.w + x) * 4;
    this.buf[p] = clamp(r);
    this.buf[p + 1] = clamp(g);
    this.buf[p + 2] = clamp(b);
  }

  private drawBodies(bodies: readonly RigidBody[]): void {
    const { lutR, lutG, lutB } = this;
    for (const body of bodies) {
      const ox = Math.round(body.ox);
      const oy = Math.round(body.oy);
      for (let k = 0; k < body.n; k++) {
        const m = body.mat[k];
        const s = body.shade[k] >> 3;
        this.setPixel(ox + body.dx[k], oy + body.dy[k], lutR[m] + s, lutG[m] + s, lutB[m] + s);
      }
    }
  }

  private drawHero(hero: Hero): void {
    // Animation: flutter fast while moving, gentle idle sway otherwise, plus a
    // 1px vertical bob so the hover reads as alive.
    const frameIdx = hero.moving
      ? (hero.animTime >> 2) & 1
      : (hero.animTime >> 4) & 1;
    const bob = hero.moving ? 0 : (hero.animTime >> 5) & 1;
    const sprite = HERO_FRAMES[frameIdx];

    const left = Math.round(hero.cx - HERO_W / 2);
    const top = Math.round(hero.cy - HERO_H / 2) + bob;
    const flip = hero.facing < 0;

    // Thruster flames trailing opposite the velocity when moving.
    if (hero.moving) {
      const tx = Math.round(hero.cx - hero.vx * 2);
      const ty = Math.round(hero.cy - hero.vy * 2);
      this.setPixel(tx, ty, 255, 170, 60);
      this.setPixel(tx, ty + 1, 255, 120, 40);
    }

    for (let row = 0; row < sprite.length; row++) {
      const line = sprite[row];
      for (let col = 0; col < HERO_W; col++) {
        const ch = line[flip ? HERO_W - 1 - col : col];
        const color = ch && HERO_COLORS[ch];
        if (color) this.setPixel(left + col, top + row, color[0], color[1], color[2]);
      }
    }

    // Low-health flashing tint above the head.
    if (hero.health < 35 && ((hero.animTime >> 3) & 1) === 0) {
      this.setPixel(left + 3, top - 2, 255, 60, 60);
      this.setPixel(left + 4, top - 2, 255, 60, 60);
    }
  }

  private drawMarkers(markers: readonly Marker[]): void {
    // A small 3x5 civilian sprite: green = waiting, dim = rescued, red = lost.
    for (const m of markers) {
      if (m.rescued) continue;
      const [r, g, b] = m.lost ? [120, 40, 40] : [120, 230, 140];
      const bx = Math.round(m.x) - 1;
      const by = Math.round(m.y) - 2;
      this.setPixel(bx + 1, by, r, g, b); // head
      this.setPixel(bx, by + 1, r, g, b);
      this.setPixel(bx + 1, by + 1, r, g, b);
      this.setPixel(bx + 2, by + 1, r, g, b);
      this.setPixel(bx + 1, by + 2, r, g, b);
      this.setPixel(bx, by + 3, r, g, b);
      this.setPixel(bx + 2, by + 3, r, g, b);
      // Pulsing halo so they're easy to spot.
      if (!m.lost && ((this.pulse >> 3) & 1) === 0) {
        this.setPixel(bx + 1, by - 2, 220, 255, 220);
      }
    }
    this.pulse++;
  }

  private pulse = 0;

  private drawEffects(effects: Effects): void {
    for (const s of effects.segments) {
      const a = s.ttl / s.maxTtl;
      this.drawLine(
        Math.round(s.x0),
        Math.round(s.y0),
        Math.round(s.x1),
        Math.round(s.y1),
        s.r * a + 40,
        s.g * a + 40,
        s.b * a + 40,
      );
    }
  }

  private drawLine(x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number): void {
    // Integer Bresenham.
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (let guard = 0; guard < 2048; guard++) {
      this.setPixel(x, y, r, g, b);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
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
