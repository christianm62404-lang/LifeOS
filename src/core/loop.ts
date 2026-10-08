import { MAX_STEPS_PER_FRAME, SIM_DT } from "../sim/constants.ts";

export interface LoopStats {
  fps: number;
  simStepsPerSec: number;
  simMs: number;
  renderMs: number;
}

/**
 * Fixed-timestep game loop: the simulation advances in fixed SIM_DT increments
 * (accumulator pattern) independent of the display refresh rate, while
 * rendering happens once per animation frame. Includes a catch-up cap to avoid
 * a death-spiral after a long stall (e.g. a backgrounded tab).
 */
export class Loop {
  private acc = 0;
  private last = 0;
  private running = false;

  // Rolling stats.
  private frames = 0;
  private steps = 0;
  private statTimer = 0;
  private simMsAccum = 0;
  private renderMsAccum = 0;
  readonly stats: LoopStats = {
    fps: 0,
    simStepsPerSec: 0,
    simMs: 0,
    renderMs: 0,
  };

  constructor(
    private readonly onStep: () => void,
    private readonly onRender: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.tick);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.25) dt = 0.25; // clamp huge gaps
    this.acc += dt;

    let stepsThisFrame = 0;
    const simStart = performance.now();
    while (this.acc >= SIM_DT && stepsThisFrame < MAX_STEPS_PER_FRAME) {
      this.onStep();
      this.acc -= SIM_DT;
      stepsThisFrame++;
      this.steps++;
    }
    // Drop backlog we couldn't catch up on, rather than accumulating lag.
    if (this.acc > SIM_DT) this.acc = 0;
    this.simMsAccum += performance.now() - simStart;

    const renderStart = performance.now();
    this.onRender();
    this.renderMsAccum += performance.now() - renderStart;

    this.frames++;
    this.statTimer += dt;
    if (this.statTimer >= 0.5) {
      this.stats.fps = Math.round(this.frames / this.statTimer);
      this.stats.simStepsPerSec = Math.round(this.steps / this.statTimer);
      this.stats.simMs = +(this.simMsAccum / this.frames).toFixed(2);
      this.stats.renderMs = +(this.renderMsAccum / this.frames).toFixed(2);
      this.frames = 0;
      this.steps = 0;
      this.statTimer = 0;
      this.simMsAccum = 0;
      this.renderMsAccum = 0;
    }

    requestAnimationFrame(this.tick);
  };
}
