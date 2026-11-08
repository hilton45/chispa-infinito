export type QualitySetting = 'auto' | 'high' | 'medium' | 'low';
export type ActiveQualityTier = 'high' | 'medium' | 'low';

export interface QualityProfile {
  tier: ActiveQualityTier;
  maxParticles: number;
  resolutionScale: number;
  bloomLevels: number;
  hdrEnabled: boolean;
  enableBloom: boolean;
  enableLensing: boolean;
  enableChromatic: boolean;
  enableFlares: boolean;
  enableGodRays: boolean;
  enableGrain: boolean;
}

export const QUALITY_PROFILES: Record<ActiveQualityTier, QualityProfile> = {
  high: {
    tier: 'high',
    maxParticles: 50000,
    resolutionScale: 1.0,
    bloomLevels: 5,
    hdrEnabled: true,
    enableBloom: true,
    enableLensing: true,
    enableChromatic: true,
    enableFlares: true,
    enableGodRays: true,
    enableGrain: true,
  },
  medium: {
    tier: 'medium',
    maxParticles: 15000,
    resolutionScale: 0.75,
    bloomLevels: 3,
    hdrEnabled: false,
    enableBloom: true,
    enableLensing: false,
    enableChromatic: false,
    enableFlares: false,
    enableGodRays: false,
    enableGrain: true,
  },
  low: {
    tier: 'low',
    maxParticles: 3000,
    resolutionScale: 0.5,
    bloomLevels: 0,
    hdrEnabled: false,
    enableBloom: false,
    enableLensing: false,
    enableChromatic: false,
    enableFlares: false,
    enableGodRays: false,
    enableGrain: false,
  },
};

export class QualityGovernor {
  public setting: QualitySetting = 'auto';
  public currentTier: ActiveQualityTier = 'high';
  public reduceMotion = false;
  public batterySaver = false;

  private fpsSamples: number[] = [];
  private lowFpsTimer = 0;
  private highFpsTimer = 0;
  public currentFps = 60;

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  public setSetting(setting: QualitySetting): void {
    this.setting = setting;
    if (setting !== 'auto') {
      this.currentTier = setting;
    }
    this.lowFpsTimer = 0;
    this.highFpsTimer = 0;
  }

  public getProfile(): QualityProfile {
    if (this.batterySaver) {
      return QUALITY_PROFILES.low;
    }
    return QUALITY_PROFILES[this.currentTier];
  }

  public update(dt: number): boolean {
    if (dt <= 0 || dt > 1) return false;
    const instantFps = 1 / dt;
    this.fpsSamples.push(instantFps);
    if (this.fpsSamples.length > 60) {
      this.fpsSamples.shift();
    }

    const sum = this.fpsSamples.reduce((a, b) => a + b, 0);
    this.currentFps = sum / this.fpsSamples.length;

    if (this.setting !== 'auto' || this.batterySaver) {
      return false;
    }

    let changed = false;
    if (this.currentFps < 50) {
      this.lowFpsTimer += dt;
      this.highFpsTimer = 0;
      if (this.lowFpsTimer >= 2.0) {
        this.lowFpsTimer = 0;
        if (this.currentTier === 'high') {
          this.currentTier = 'medium';
          changed = true;
        } else if (this.currentTier === 'medium') {
          this.currentTier = 'low';
          changed = true;
        }
      }
    } else if (this.currentFps > 58) {
      this.highFpsTimer += dt;
      this.lowFpsTimer = 0;
      if (this.highFpsTimer >= 10.0) {
        this.highFpsTimer = 0;
        if (this.currentTier === 'low') {
          this.currentTier = 'medium';
          changed = true;
        } else if (this.currentTier === 'medium') {
          this.currentTier = 'high';
          changed = true;
        }
      }
    } else {
      this.lowFpsTimer = Math.max(0, this.lowFpsTimer - dt * 0.5);
      this.highFpsTimer = Math.max(0, this.highFpsTimer - dt * 0.5);
    }

    return changed;
  }
}
