/**
 * Transient visual effects drawn over the world for one or more frames: beams,
 * lightning bolts, power flashes. Stored as a small fixed cap of line segments
 * with a fading lifetime. Kept separate from the sim so powers can emit visuals
 * without touching the renderer directly.
 */
export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  r: number;
  g: number;
  b: number;
  ttl: number;
  maxTtl: number;
}

const MAX_SEGMENTS = 512;

export class Effects {
  readonly segments: Segment[] = [];

  line(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: readonly [number, number, number],
    ttl = 2,
  ): void {
    if (this.segments.length >= MAX_SEGMENTS) this.segments.shift();
    this.segments.push({
      x0,
      y0,
      x1,
      y1,
      r: color[0],
      g: color[1],
      b: color[2],
      ttl,
      maxTtl: ttl,
    });
  }

  update(): void {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      if (--this.segments[i].ttl <= 0) this.segments.splice(i, 1);
    }
  }
}
