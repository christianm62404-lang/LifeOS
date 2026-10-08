/**
 * Small, fast, deterministic PRNG (mulberry32). Used for cell colour jitter and
 * breaking directional bias in the sim. Deterministic seeding keeps unit tests
 * and procedural generation reproducible.
 */
export class Rng {
  private s: number;

  constructor(seed = 0x9e3779b9) {
    this.s = seed >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [0, n). */
  int(n: number): number {
    return (this.next() * n) | 0;
  }

  /** Returns +1 or -1 with equal probability. */
  sign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }
}
