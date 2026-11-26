import type { AmbientLevels } from '@/types/catyboard';

/**
 * Pure Web Audio API lofi ambient soundscape generator (rain, cat purr, warm crackle).
 * Zero external audio CDN dependencies, works completely offline on iPhone, Mac & PC.
 */
class LofiAmbientEngine {
  private ctx: AudioContext | null = null;
  private rainGain: GainNode | null = null;
  private purrGain: GainNode | null = null;
  private fireGain: GainNode | null = null;
  private initialized = false;

  private ensureInit() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.initialized) return;

    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 3;

    // 1. Soft Rain (filtered pink-ish noise)
    const rainBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const rainData = rainBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      rainData[i] = (b0 + b1 + b2 + white * 0.1848) * 0.04;
    }
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 1400;

    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(ctx.destination);
    rainSource.start();

    // 2. Cat Purr (warm breathing rhythm ~0.35Hz modulating 26Hz & 52Hz rumble)
    const purrOsc1 = ctx.createOscillator();
    purrOsc1.type = 'triangle';
    purrOsc1.frequency.value = 26;

    const purrOsc2 = ctx.createOscillator();
    purrOsc2.type = 'sine';
    purrOsc2.frequency.value = 52;

    const purrLfo = ctx.createOscillator();
    purrLfo.type = 'sine';
    purrLfo.frequency.value = 0.36;

    const purrLfoGain = ctx.createGain();
    purrLfoGain.gain.value = 0.045;

    const purrEnv = ctx.createGain();
    purrEnv.gain.value = 0.055;
    purrLfo.connect(purrLfoGain);
    purrLfoGain.connect(purrEnv.gain);

    const purrFilter = ctx.createBiquadFilter();
    purrFilter.type = 'lowpass';
    purrFilter.frequency.value = 180;

    this.purrGain = ctx.createGain();
    this.purrGain.gain.value = 0;

    purrOsc1.connect(purrEnv);
    purrOsc2.connect(purrEnv);
    purrEnv.connect(purrFilter);
    purrFilter.connect(this.purrGain);
    this.purrGain.connect(ctx.destination);

    purrOsc1.start();
    purrOsc2.start();
    purrLfo.start();

    // 3. Warm Fireplace / Vinyl Crackle
    const fireBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const fireData = fireBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      const crackle = Math.random() > 0.9982 ? (Math.random() * 2 - 1) * 0.35 : 0;
      fireData[i] = lastOut * 0.6 + crackle;
    }
    const fireSource = ctx.createBufferSource();
    fireSource.buffer = fireBuffer;
    fireSource.loop = true;

    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'bandpass';
    fireFilter.frequency.value = 650;
    fireFilter.Q.value = 0.7;

    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0;
    fireSource.connect(fireFilter);
    fireFilter.connect(this.fireGain);
    this.fireGain.connect(ctx.destination);
    fireSource.start();

    this.initialized = true;
  }

  public updateLevels(levels: AmbientLevels) {
    const anyActive = levels.rain > 0 || levels.purr > 0 || levels.fire > 0;
    if (!anyActive && !this.initialized) return;

    this.ensureInit();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(levels.rain * 0.55, now, 0.08);
    }
    if (this.purrGain) {
      this.purrGain.gain.setTargetAtTime(levels.purr * 1.4, now, 0.08);
    }
    if (this.fireGain) {
      this.fireGain.gain.setTargetAtTime(levels.fire * 0.45, now, 0.08);
    }
  }

  private lastClinkMs = 0;

  public playPurrChime() {
    if (typeof window === 'undefined') return;
    try {
      this.ensureInit();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.11);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Ignore autoplay restrictions before first interaction
    }
  }

  public triggerHaptic(pattern: number | number[] = 8) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore if unsupported
      }
    }
  }

  public playGlassClink(intensity = 0.5) {
    if (typeof window === 'undefined') return;
    const nowMs = Date.now();
    if (nowMs - this.lastClinkMs < 65) return;
    this.lastClinkMs = nowMs;
    if (intensity > 0.55) {
      this.triggerHaptic(6);
    }

    try {
      this.ensureInit();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const baseFreq = 1650 + Math.random() * 650;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, now + 0.045);
      const vol = Math.min(0.045, Math.max(0.008, intensity * 0.04));
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    } catch {
      // Ignore audio errors
    }
  }

  public playCorkPop() {
    if (typeof window === 'undefined') return;
    this.triggerHaptic([12, 18, 10]);
    try {
      this.ensureInit();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.055);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore audio errors
    }
  }

  public playPaperUnfurl() {
    if (typeof window === 'undefined') return;
    try {
      this.ensureInit();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 0.16);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) {
        const env = Math.sin((i / len) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.05;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1850;
      filter.Q.value = 1.1;
      src.connect(filter);
      filter.connect(ctx.destination);
      src.start(now);
    } catch {
      // Ignore audio errors
    }
  }

  public playCapsulePop() {
    if (typeof window === 'undefined') return;
    this.triggerHaptic([14, 24, 16]);
    try {
      this.ensureInit();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Crisp cork/shell pop
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(240, now);
      popOsc.frequency.exponentialRampToValueAtTime(620, now + 0.06);
      popGain.gain.setValueAtTime(0.08, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      popOsc.connect(popGain);
      popGain.connect(this.ctx.destination);
      popOsc.start(now);
      popOsc.stop(now + 0.12);

      // Gentle warm chime after pop
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(783.99, now + 0.07);
      chimeOsc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.22);
      chimeGain.gain.setValueAtTime(0.05, now + 0.07);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chimeOsc.start(now + 0.07);
      chimeOsc.stop(now + 0.44);
    } catch {
      // Ignore audio errors
    }
  }
}

export const ambientEngine = new LofiAmbientEngine();
