/**
 * Transient visual FX shared across modules without coupling them: currently a
 * screen-shake trauma value. Explosions add trauma; the renderer host reads the
 * decaying offset each frame and nudges the canvas.
 */
let trauma = 0;

export function addShake(amount: number): void {
  trauma = Math.min(1, trauma + amount);
}

/** Decay trauma and return the current pixel offset {x, y}. */
export function sampleShake(decay: number, maxPixels: number): { x: number; y: number } {
  if (trauma <= 0) return { x: 0, y: 0 };
  const mag = trauma * trauma; // quadratic feels punchier
  const ox = (Math.random() * 2 - 1) * mag * maxPixels;
  const oy = (Math.random() * 2 - 1) * mag * maxPixels;
  trauma = Math.max(0, trauma - decay);
  return { x: ox, y: oy };
}
