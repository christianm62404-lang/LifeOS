import { AMBIENT_TEMP, CHUNK_SIZE, WORLD_H, WORLD_W } from "./constants.ts";
import { material } from "./materials.ts";
import { Rng } from "../core/rng.ts";

/**
 * The simulation world: structure-of-arrays cell storage plus chunk bookkeeping
 * for sleeping idle regions.
 *
 * Storage is deliberately flat typed arrays (no per-cell objects) so the sim
 * stays cache-friendly and allocation-free. Chunk activity is double-buffered:
 * `active` is what we simulate this frame, `next` accumulates what any move or
 * paint touched for the following frame. An untouched chunk is simulated zero
 * times, so idle areas cost nothing.
 */
export class World {
  readonly w: number;
  readonly h: number;
  readonly chunk: number;
  readonly chunksW: number;
  readonly chunksH: number;

  /** Material id per cell. */
  readonly mat: Uint8Array;
  /** Per-cell brightness jitter, -128..127 (only a small range is used). */
  readonly shade: Int8Array;
  /** Temperature per cell (Celsius-ish). Unused in Phase 1 but allocated. */
  readonly temp: Float32Array;
  /** Reserved bit-flags per cell (anchored, ...). Phase 3+. */
  readonly flags: Uint8Array;
  /** Small per-cell scratch state (e.g. fire/smoke remaining lifetime). */
  readonly aux: Uint8Array;

  /** Tick index at which each cell last moved, to prevent double updates. */
  private readonly movedTick: Uint32Array;

  private chunkActive: Uint8Array;
  private chunkNext: Uint8Array;

  /** Monotonic simulation tick counter. */
  frame = 0;
  /** Number of chunks simulated in the current frame (for the HUD). */
  activeChunks = 0;

  private readonly rng: Rng;

  constructor(w = WORLD_W, h = WORLD_H, chunk = CHUNK_SIZE, seed = 1337) {
    this.w = w;
    this.h = h;
    this.chunk = chunk;
    this.chunksW = Math.ceil(w / chunk);
    this.chunksH = Math.ceil(h / chunk);

    const n = w * h;
    this.mat = new Uint8Array(n);
    this.shade = new Int8Array(n);
    this.temp = new Float32Array(n).fill(AMBIENT_TEMP);
    this.flags = new Uint8Array(n);
    this.aux = new Uint8Array(n);
    this.movedTick = new Uint32Array(n);

    const c = this.chunksW * this.chunksH;
    this.chunkActive = new Uint8Array(c);
    this.chunkNext = new Uint8Array(c);
    this.rng = new Rng(seed);
  }

  idx(x: number, y: number): number {
    return y * this.w + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): number {
    return this.mat[y * this.w + x];
  }

  // --- chunk activity ----------------------------------------------------

  private chunkIndex(x: number, y: number): number {
    return ((y / this.chunk) | 0) * this.chunksW + ((x / this.chunk) | 0);
  }

  isChunkActive(cx: number, cy: number): boolean {
    return this.chunkActive[cy * this.chunksW + cx] === 1;
  }

  /** Wake the chunk containing (x,y), plus neighbours when on a chunk border. */
  touch(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.wakeChunkAt(x, y);
    const lx = x % this.chunk;
    const ly = y % this.chunk;
    const left = lx === 0;
    const right = lx === this.chunk - 1 || x === this.w - 1;
    const top = ly === 0;
    const bottom = ly === this.chunk - 1 || y === this.h - 1;
    if (left) this.wakeChunkAt(x - 1, y);
    if (right) this.wakeChunkAt(x + 1, y);
    if (top) this.wakeChunkAt(x, y - 1);
    if (bottom) this.wakeChunkAt(x, y + 1);
    if (left && top) this.wakeChunkAt(x - 1, y - 1);
    if (right && top) this.wakeChunkAt(x + 1, y - 1);
    if (left && bottom) this.wakeChunkAt(x - 1, y + 1);
    if (right && bottom) this.wakeChunkAt(x + 1, y + 1);
  }

  private wakeChunkAt(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.chunkNext[this.chunkIndex(x, y)] = 1;
  }

  /** Promote next-frame activity to the current frame and clear the buffer. */
  beginFrame(): void {
    this.frame++;
    const tmp = this.chunkActive;
    this.chunkActive = this.chunkNext;
    this.chunkNext = tmp;
    this.chunkNext.fill(0);
    let count = 0;
    for (let i = 0; i < this.chunkActive.length; i++) count += this.chunkActive[i];
    this.activeChunks = count;
  }

  /** Wake every chunk (used once at startup after world generation). */
  wakeAll(): void {
    this.chunkNext.fill(1);
  }

  /** Reset every cell to empty air (used when loading a new world). */
  reset(): void {
    this.mat.fill(0);
    this.shade.fill(0);
    this.temp.fill(AMBIENT_TEMP);
    this.flags.fill(0);
    this.aux.fill(0);
    this.movedTick.fill(0);
    this.chunkActive.fill(0);
    this.chunkNext.fill(0);
    this.frame = 0;
    this.activeChunks = 0;
  }

  // --- cell mutation -----------------------------------------------------

  /** True if the cell has already moved this tick. */
  movedThisTick(i: number): boolean {
    return this.movedTick[i] === this.frame;
  }

  private markMoved(i: number): void {
    this.movedTick[i] = this.frame;
  }

  /**
   * Swap two cells' contents and wake both locations. Used by the sim when a
   * cell moves into / displaces another.
   */
  swap(ax: number, ay: number, bx: number, by: number): void {
    const a = ay * this.w + ax;
    const b = by * this.w + bx;
    const m = this.mat[a];
    this.mat[a] = this.mat[b];
    this.mat[b] = m;
    const s = this.shade[a];
    this.shade[a] = this.shade[b];
    this.shade[b] = s;
    const t = this.temp[a];
    this.temp[a] = this.temp[b];
    this.temp[b] = t;
    const f = this.flags[a];
    this.flags[a] = this.flags[b];
    this.flags[b] = f;
    const x = this.aux[a];
    this.aux[a] = this.aux[b];
    this.aux[b] = x;
    this.markMoved(a);
    this.markMoved(b);
    this.touch(ax, ay);
    this.touch(bx, by);
  }

  /**
   * Set a cell from the brush: assigns fresh colour jitter, a sensible starting
   * temperature (a heat/cold source starts at its source temp) and lifetime,
   * and wakes the cell.
   */
  paint(x: number, y: number, matId: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    const m = material(matId);
    this.mat[i] = matId;
    this.shade[i] = this.rng.int(255) - 128;
    this.temp[i] = m.sourceTemp ?? AMBIENT_TEMP;
    this.aux[i] = m.life ?? 0;
    this.touch(x, y);
  }

  /**
   * Convert an existing cell to another material in place (phase change /
   * reaction). Keeps temperature by default, refreshes shade + lifetime, and
   * wakes the cell. Used by the simulation, not the brush.
   */
  convert(i: number, matId: number, temp?: number): void {
    const m = material(matId);
    this.mat[i] = matId;
    this.shade[i] = this.rng.int(255) - 128;
    this.aux[i] = m.life ?? 0;
    if (temp !== undefined) this.temp[i] = temp;
    this.touch(i % this.w, (i / this.w) | 0);
  }

  /** Circular brush paint. */
  paintCircle(cx: number, cy: number, radius: number, matId: number): void {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= r2) this.paint(cx + dx, cy + dy, matId);
      }
    }
  }
}
