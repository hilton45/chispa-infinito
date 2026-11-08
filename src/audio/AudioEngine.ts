/**
 * 100% Procedural WebAudio Synthesizer & Generative Ambient Music Engine.
 * Zero external audio files.
 */

const PENTATONIC_FREQS = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
  1046.50, // C6
  1174.66, // D6
];

const ERA_ROOT_FREQS = [
  110.0, // A2 - Plasma
  123.47, // B2 - Estelar
  130.81, // C3 - Nebulosas
  146.83, // D3 - Galáctica
  164.81, // E3 - Cósmica
  174.61, // F3 - Eterna
  196.00, // G3 - Multiverso
  220.00, // A3 - Conciencia
  116.54, // A#2
  138.59, // C#3
  155.56, // D#3
  185.00, // F#3
  207.65, // G#3
  233.08, // A#3
  246.94, // B3
  261.63, // C4 - Chispa Suprema
];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  public masterVolume = 0.8;
  public musicVolume = 0.45;
  public sfxVolume = 0.75;
  public muted = false;

  private activeVoices = 0;
  private readonly maxVoices = 16;
  private musicTimer = 0;
  private isUnlocked = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.visibilityState === 'hidden') {
          this.ctx.suspend().catch(() => {});
        } else if (this.isUnlocked && !this.muted) {
          this.ctx.resume().catch(() => {});
        }
      });
    }
  }

  public unlock(): void {
    if (this.isUnlocked && this.ctx) {
      if (this.ctx.state === 'suspended' && !this.muted) {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.2;

    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.syncVolumes();
    this.isUnlocked = true;
  }

  public syncVolumes(): void {
    if (!this.masterGain || !this.musicGain || !this.sfxGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVolume, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.03);
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    gainVal: number,
    delay = 0,
    targetBus: 'sfx' | 'music' = 'sfx',
    endFreq?: number
  ): void {
    if (!this.ctx || !this.sfxGain || !this.musicGain || this.muted) return;
    if (this.activeVoices >= this.maxVoices && targetBus === 'sfx') return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + Math.min(0.025, duration * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(g);
    g.connect(targetBus === 'music' ? this.musicGain : this.sfxGain);

    this.activeVoices++;
    osc.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      osc.disconnect();
      g.disconnect();
    };

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick(comboRatio: number): void {
    this.unlock();
    const idx = Math.min(
      PENTATONIC_FREQS.length - 1,
      Math.floor(comboRatio * (PENTATONIC_FREQS.length - 1))
    );
    const baseFreq = PENTATONIC_FREQS[idx] * (0.985 + Math.random() * 0.03);
    this.playTone(baseFreq, 'sine', 0.14, 0.22, 0, 'sfx', baseFreq * 1.04);
    this.playTone(baseFreq * 2, 'triangle', 0.08, 0.08, 0, 'sfx');
  }

  public playBuyGenerator(genIndex = 1): void {
    this.unlock();
    const baseIdx = (genIndex - 1) % 6;
    const f1 = PENTATONIC_FREQS[baseIdx];
    const f2 = PENTATONIC_FREQS[baseIdx + 2];
    const f3 = PENTATONIC_FREQS[baseIdx + 4];
    this.playTone(f1, 'triangle', 0.16, 0.18, 0.0, 'sfx');
    this.playTone(f2, 'triangle', 0.18, 0.18, 0.055, 'sfx');
    this.playTone(f3, 'sine', 0.24, 0.22, 0.11, 'sfx');
  }

  public playBuyUpgrade(): void {
    this.unlock();
    this.playTone(440, 'sine', 0.22, 0.2, 0, 'sfx');
    this.playTone(659.25, 'triangle', 0.28, 0.2, 0.06, 'sfx');
    this.playTone(880, 'sine', 0.36, 0.22, 0.12, 'sfx');
  }

  public playMilestone(): void {
    this.unlock();
    const chord = [261.63, 329.63, 392.0, 493.88, 587.33]; // Cmaj9
    chord.forEach((f, i) => {
      this.playTone(f, 'triangle', 0.75, 0.15, i * 0.04, 'sfx');
    });
  }

  public playAchievement(): void {
    this.unlock();
    this.playTone(880, 'sine', 0.35, 0.2, 0.0, 'sfx');
    this.playTone(1174.66, 'sine', 0.4, 0.2, 0.09, 'sfx');
    this.playTone(1760, 'sine', 0.65, 0.24, 0.18, 'sfx');
  }

  public playCometCatch(): void {
    this.unlock();
    for (let i = 0; i < 6; i++) {
      const f = PENTATONIC_FREQS[3 + i];
      this.playTone(f, 'sine', 0.32, 0.16, i * 0.045, 'sfx', f * 1.12);
    }
  }

  public playBigBang(): void {
    this.unlock();
    // 1.5s Riser
    this.playTone(110, 'sawtooth', 1.45, 0.18, 0, 'sfx', 880);
    this.playTone(220, 'sine', 1.45, 0.22, 0, 'sfx', 1760);
    // Sub Boom at 1.45s
    this.playTone(140, 'sine', 1.6, 0.45, 1.45, 'sfx', 38);
    // Rebirth ethereal chord
    const rebirth = [220, 329.63, 440, 659.25];
    rebirth.forEach((f) => {
      this.playTone(f, 'sine', 2.4, 0.14, 1.55, 'sfx');
    });
  }

  /**
   * Generative ambient music pad updated from main loop.
   */
  public updateMusic(dt: number, eraIndex: number, ownedGeneratorTypes: number): void {
    if (!this.isUnlocked || !this.ctx || this.muted || this.musicVolume <= 0.01) return;
    if (document.visibilityState === 'hidden') return;

    this.musicTimer += dt;
    // Trigger a slow overlapping ambient chord pad every 5.2 seconds
    if (this.musicTimer >= 5.2) {
      this.musicTimer = 0;
      const root = ERA_ROOT_FREQS[eraIndex % ERA_ROOT_FREQS.length] ?? 110;
      const intervals = [1.0, 1.5, 2.0, 2.25, 3.0];
      const activeLayers = Math.min(intervals.length, 2 + Math.floor(ownedGeneratorTypes / 3));

      for (let i = 0; i < activeLayers; i++) {
        const freq = root * intervals[i];
        this.playAmbientPadVoice(freq, 6.8, 0.055 / Math.sqrt(activeLayers));
      }
    }
  }

  private playAmbientPadVoice(freq: number, duration: number, peakGain: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.5, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peakGain, now + duration * 0.42);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
}
