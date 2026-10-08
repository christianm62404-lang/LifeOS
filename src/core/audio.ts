/**
 * Synthesized sound effects via the Web Audio API — no audio assets. Each SFX
 * is built from oscillators and filtered noise. The context is created lazily
 * and must be resumed from a user gesture (browser autoplay policy), so call
 * `resume()` on the first pointer/key event.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = true;
  private lastAt: Record<string, number> = {};

  resume(): void {
    if (!this.enabled) return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise(this.ctx);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 0.35 : 0;
    return this.enabled;
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = ctx.sampleRate * 1.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Rate-limit continuous SFX (beams, wind) so they don't machine-gun. */
  private throttle(key: string, ms: number): boolean {
    const now = performance.now();
    if ((this.lastAt[key] ?? 0) + ms > now) return false;
    this.lastAt[key] = now;
    return true;
  }

  private now(): number {
    return this.ctx!.currentTime;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    freqEnd?: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const t = this.now();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  private noiseBurst(dur: number, gain: number, filter: BiquadFilterType, freq: number, q = 1): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const biq = this.ctx.createBiquadFilter();
    biq.type = filter;
    biq.frequency.value = freq;
    biq.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(biq);
    biq.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  boom(power = 1): void {
    if (!this.ctx || !this.throttle("boom", 110)) return;
    this.noiseBurst(0.5 * power, 0.9, "lowpass", 500, 1);
    this.tone(120, 0.5 * power, "sine", 0.7, 40);
  }
  thud(): void {
    if (!this.ctx || !this.throttle("thud", 60)) return;
    this.tone(90, 0.18, "sine", 0.6, 45);
    this.noiseBurst(0.12, 0.3, "lowpass", 300);
  }
  zap(): void {
    if (!this.ctx || !this.throttle("zap", 70)) return;
    this.tone(1400, 0.12, "sawtooth", 0.35, 300);
    this.noiseBurst(0.1, 0.4, "highpass", 2000);
  }
  rumble(): void {
    if (!this.ctx || !this.throttle("rumble", 160)) return;
    this.noiseBurst(0.7, 0.6, "lowpass", 180, 0.7);
    this.tone(60, 0.7, "sine", 0.5, 35);
  }
  hiss(): void {
    if (!this.ctx || !this.throttle("hiss", 80)) return;
    this.noiseBurst(0.12, 0.12, "bandpass", 3200, 2);
  }
  whoosh(): void {
    if (!this.ctx || !this.throttle("whoosh", 90)) return;
    this.noiseBurst(0.18, 0.18, "bandpass", 900, 1.2);
  }
  freeze(): void {
    if (!this.ctx || !this.throttle("freeze", 90)) return;
    this.noiseBurst(0.15, 0.12, "highpass", 5000);
    this.tone(2200, 0.15, "triangle", 0.08, 2600);
  }
}

export const audio = new AudioEngine();
