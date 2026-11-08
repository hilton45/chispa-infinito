import { Filter, GlProgram, defaultFilterVert } from 'pixi.js';
import { QualityProfile } from './QualityGovernor';

export interface EraColorGrade {
  shadowTint: [number, number, number];
  highlightTint: [number, number, number];
  contrast: number;
  bloomStrength: number;
}

const ERA_COLOR_GRADES: EraColorGrade[] = [
  // 0: Plasma
  { shadowTint: [0.02, 0.04, 0.11], highlightTint: [0.88, 0.96, 1.05], contrast: 1.08, bloomStrength: 1.15 },
  // 1: Nucleosíntesis
  { shadowTint: [0.03, 0.04, 0.12], highlightTint: [0.92, 0.96, 1.04], contrast: 1.09, bloomStrength: 1.18 },
  // 2: Recombinación
  { shadowTint: [0.05, 0.03, 0.09], highlightTint: [1.04, 0.94, 0.86], contrast: 1.10, bloomStrength: 1.22 },
  // 3: Amanecer Estelar
  { shadowTint: [0.06, 0.03, 0.07], highlightTint: [1.06, 0.95, 0.82], contrast: 1.12, bloomStrength: 1.26 },
  // 4: Secuencia Principal
  { shadowTint: [0.05, 0.04, 0.08], highlightTint: [1.05, 0.98, 0.88], contrast: 1.11, bloomStrength: 1.24 },
  // 5: Supernovas
  { shadowTint: [0.07, 0.02, 0.08], highlightTint: [1.08, 0.90, 0.92], contrast: 1.14, bloomStrength: 1.32 },
  // 6: Agujeros Negros
  { shadowTint: [0.02, 0.01, 0.06], highlightTint: [1.06, 0.94, 0.84], contrast: 1.18, bloomStrength: 1.35 },
  // 7: Galaxias
  { shadowTint: [0.02, 0.04, 0.10], highlightTint: [0.94, 0.98, 1.06], contrast: 1.12, bloomStrength: 1.28 },
  // 8: Cúmulos
  { shadowTint: [0.03, 0.03, 0.11], highlightTint: [0.95, 0.94, 1.08], contrast: 1.13, bloomStrength: 1.30 },
  // 9: Filamentos
  { shadowTint: [0.02, 0.05, 0.09], highlightTint: [0.90, 1.02, 1.04], contrast: 1.13, bloomStrength: 1.30 },
  // 10: Energía Oscura
  { shadowTint: [0.04, 0.02, 0.11], highlightTint: [1.02, 0.90, 1.08], contrast: 1.15, bloomStrength: 1.34 },
  // 11: Multiverso
  { shadowTint: [0.05, 0.02, 0.12], highlightTint: [1.04, 0.92, 1.08], contrast: 1.16, bloomStrength: 1.36 },
  // 12: Dimensiones Extra
  { shadowTint: [0.05, 0.01, 0.11], highlightTint: [1.06, 0.88, 1.06], contrast: 1.16, bloomStrength: 1.38 },
  // 13: Conciencia
  { shadowTint: [0.01, 0.06, 0.09], highlightTint: [0.88, 1.06, 1.02], contrast: 1.14, bloomStrength: 1.35 },
  // 14: Singularidad
  { shadowTint: [0.06, 0.01, 0.08], highlightTint: [1.08, 0.92, 1.02], contrast: 1.18, bloomStrength: 1.42 },
  // 15: Eternidad
  { shadowTint: [0.05, 0.04, 0.09], highlightTint: [1.08, 1.02, 0.88], contrast: 1.16, bloomStrength: 1.45 },
];

const POST_FRAG = `
  in vec2 vTextureCoord;
  out vec4 finalColor;

  uniform sampler2D uTexture;
  uniform vec2 uTexelSize;
  uniform float uTime;
  uniform float uBloomLevels;
  uniform float uBloomStrength;
  uniform float uEnableLensing;
  uniform float uEnableFlares;
  uniform float uEnableGrain;
  uniform vec2 uBlackHoleUV;
  uniform float uChromaticAmount;
  uniform float uVignette;
  uniform float uFlash;
  uniform float uExposure;
  uniform float uContrast;
  uniform vec3 uShadowTint;
  uniform vec3 uHighlightTint;
  uniform vec2 uShockwaveUV;
  uniform float uShockwaveRadius;
  uniform float uShockwaveStrength;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Soft-knee physical bloom threshold extraction into linear HDR space
  vec3 extractHDRBright(vec3 s) {
    // Expand 8-bit highlights into HDR range before soft-knee
    float luma = dot(s, vec3(0.2126, 0.7152, 0.0722));
    vec3 hdr = s * (1.0 + pow(max(0.0, luma - 0.45), 1.85) * 3.4);
    float hLuma = max(hdr.r, max(hdr.g, hdr.b));

    const float threshold = 0.52;
    const float knee = 0.28;
    float soft = clamp(hLuma - threshold + knee, 0.0, 2.0 * knee);
    soft = (soft * soft) / (4.0 * knee + 0.0001);
    float contribution = max(soft, hLuma - threshold) / max(hLuma, 0.0001);
    return hdr * max(0.0, contribution);
  }

  // Dual Kawase 5-point tent/cross tap at a given pixel radius
  vec3 sampleKawaseLevel(vec2 uv, float radiusPx) {
    vec2 d = uTexelSize * radiusPx;
    vec3 c0 = extractHDRBright(texture(uTexture, uv).rgb) * 0.28;
    vec3 c1 = extractHDRBright(texture(uTexture, clamp(uv + vec2( d.x,  d.y), 0.001, 0.999)).rgb) * 0.18;
    vec3 c2 = extractHDRBright(texture(uTexture, clamp(uv + vec2(-d.x,  d.y), 0.001, 0.999)).rgb) * 0.18;
    vec3 c3 = extractHDRBright(texture(uTexture, clamp(uv + vec2( d.x, -d.y), 0.001, 0.999)).rgb) * 0.18;
    vec3 c4 = extractHDRBright(texture(uTexture, clamp(uv + vec2(-d.x, -d.y), 0.001, 0.999)).rgb) * 0.18;
    return c0 + c1 + c2 + c3 + c4;
  }

  // Narkowicz Filmic ACES Approximation
  vec3 acesFilm(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main(void) {
    vec2 uv = vTextureCoord;

    // 0. Screen-space Shockwave Distortion (on milestones & Big Bang)
    if (uShockwaveStrength > 0.0001 && uShockwaveRadius > 0.001) {
      vec2 swDelta = uv - uShockwaveUV;
      swDelta.x *= uTexelSize.y / max(uTexelSize.x, 0.00001);
      float dist = length(swDelta);
      float band = abs(dist - uShockwaveRadius);
      if (band < 0.065 && dist > 0.0001) {
        float wave = (1.0 - band / 0.065);
        wave = wave * wave * sin((dist - uShockwaveRadius) * 48.0);
        uv = clamp(uv + normalize(uv - uShockwaveUV) * wave * uShockwaveStrength, 0.001, 0.999);
      }
    }

    // 1. Gravitational Lensing around Black Hole (Einstein Ring curvature on background/scene)
    float einsteinGlow = 0.0;
    if (uEnableLensing > 0.5) {
      vec2 delta = uv - uBlackHoleUV;
      float aspect = uTexelSize.y / max(uTexelSize.x, 0.00001);
      vec2 corrDelta = vec2(delta.x * aspect, delta.y);
      float r = length(corrDelta);
      const float einsteinR = 0.022;
      const float influenceR = 0.068;
      if (r < influenceR && r > 0.0001) {
        float falloff = smoothstep(influenceR, 0.004, r);
        float deflection = (einsteinR * einsteinR) / max(r, 0.0065) * falloff;
        vec2 offset = normalize(delta) * deflection * 0.42;
        uv = clamp(uv - offset, 0.001, 0.999);
        // Subtle relativistic photon ring brightening at the Einstein radius
        einsteinGlow = smoothstep(0.007, 0.0, abs(r - einsteinR)) * 0.55;
      }
    }

    // 2. Chromatic Aberration (on milestones, comets, and Big Bang)
    vec3 baseCol;
    if (uChromaticAmount > 0.0001) {
      vec2 dir = uv - 0.5;
      float r = texture(uTexture, clamp(uv + dir * uChromaticAmount, 0.001, 0.999)).r;
      float g = texture(uTexture, uv).g;
      float b = texture(uTexture, clamp(uv - dir * uChromaticAmount, 0.001, 0.999)).b;
      baseCol = vec3(r, g, b);
    } else {
      baseCol = texture(uTexture, uv).rgb;
    }

    // Convert scene sample to linear HDR representation
    float baseLuma = dot(baseCol, vec3(0.2126, 0.7152, 0.0722));
    vec3 hdrCol = baseCol * (1.0 + pow(max(0.0, baseLuma - 0.55), 1.65) * 1.45);
    hdrCol += vec3(1.0, 0.88, 0.55) * einsteinGlow;

    // 3. Multi-scale Dual Kawase Bloom (5 levels in High, 3 in Medium, 0 in Low)
    if (uBloomLevels > 0.5) {
      vec3 bloom = vec3(0.0);
      // Level 1 (tight core radiance)
      bloom += sampleKawaseLevel(uv, 1.5) * 0.32;
      // Level 2
      bloom += sampleKawaseLevel(uv, 3.8) * 0.26;
      // Level 3 (medium halo)
      bloom += sampleKawaseLevel(uv, 8.5) * 0.20;

      if (uBloomLevels > 3.5) {
        // Level 4 (wide atmospheric scatter)
        bloom += sampleKawaseLevel(uv, 17.5) * 0.14;
        // Level 5 (deep space veil)
        bloom += sampleKawaseLevel(uv, 34.0) * 0.10;
      } else {
        bloom *= 1.22;
      }

      hdrCol += bloom * uBloomStrength;
    }

    // 4. Anamorphic Horizontal Lens Flares & Halo (High quality only, sampled from wide Kawase blur so only major light sources streak smoothly)
    if (uEnableFlares > 0.5) {
      vec3 flare = vec3(0.0);
      for (int i = -4; i <= 4; i++) {
        if (i == 0) continue;
        float fi = float(i);
        vec2 fOff = vec2(fi * uTexelSize.x * 9.5, 0.0);
        vec3 s = sampleKawaseLevel(clamp(uv + fOff, 0.001, 0.999), 6.5);
        float w = exp(-abs(fi) * 0.52);
        flare += s * w;
      }
      // Tint anamorphic streak slightly warm-cyan/gold
      hdrCol += flare * vec3(0.72, 0.88, 1.15) * 0.095;
    }

    // 5. Auto-Exposure & Highlight Burn toward warm incandescent white
    hdrCol *= uExposure;
    float peak = max(hdrCol.r, max(hdrCol.g, hdrCol.b));
    if (peak > 0.85) {
      float burn = smoothstep(0.85, 2.6, peak);
      hdrCol = mix(hdrCol, vec3(1.0, 0.97, 0.91) * peak, burn * 0.68);
    }

    // 6. Per-Era Color Grading (shadows, highlights, contrast)
    float gradedLuma = clamp(dot(hdrCol, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    hdrCol = mix(hdrCol + uShadowTint * (1.0 - gradedLuma) * 0.35, hdrCol * uHighlightTint, smoothstep(0.15, 0.85, gradedLuma));

    // 7. Filmic ACES Tonemapping
    vec3 col = acesFilm(hdrCol);

    // Apply era contrast S-curve around mid-gray
    col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);

    // 8. Vignette
    vec2 vuv = uv - 0.5;
    float vig = 1.0 - dot(vuv, vuv) * uVignette * 2.05;
    col *= clamp(vig, 0.22, 1.0);

    // 9. Film Grain (subtle organic sensor texture)
    if (uEnableGrain > 0.5) {
      float n = (hash(uv * 520.0 + fract(uTime * 7.13)) - 0.5) * 0.022;
      col += n;
    }

    // 10. Big Bang / Era Transition Overexposure Flash
    if (uFlash > 0.001) {
      col = mix(col, vec3(1.0, 0.98, 0.93), clamp(uFlash, 0.0, 1.0));
    }

    // 11. 1-LSB Interleaved Gradient Noise Dithering (eliminates 8-bit dark sky banding)
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy + fract(uTime * 11.0), vec2(0.06711056, 0.00583715))));
    col += (ign - 0.5) / 255.0;

    finalColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export class PostProcessController {
  public filter: Filter;
  private chromaticPulse = 0;
  private flashIntensity = 0;

  // Smooth auto-exposure (~1s inertia)
  public currentExposure = 1.05;
  private targetExposure = 1.05;

  // Era color grading 3s transition state
  private currentEraIndex = 0;
  private startGrade: EraColorGrade = ERA_COLOR_GRADES[0];
  private targetGrade: EraColorGrade = ERA_COLOR_GRADES[0];
  private gradeLerpTimer = 3.0;

  // Screen-space shockwave distortion state
  private shockwaveUV: [number, number] = [0.36, 0.5];
  private shockwaveTimer = 0;
  private shockwaveDuration = 0.9;
  private shockwaveMaxStrength = 0.012;

  constructor() {
    const glProgram = GlProgram.from({
      vertex: defaultFilterVert,
      fragment: POST_FRAG,
      name: 'chispa-hdr-post-process',
    });

    this.filter = new Filter({
      glProgram,
      resources: {
        postUniforms: {
          uTexelSize: { value: [1 / 1920, 1 / 1080], type: 'vec2<f32>' },
          uTime: { value: 0, type: 'f32' },
          uBloomLevels: { value: 5, type: 'f32' },
          uBloomStrength: { value: 1.15, type: 'f32' },
          uEnableLensing: { value: 0, type: 'f32' },
          uEnableFlares: { value: 1, type: 'f32' },
          uEnableGrain: { value: 1, type: 'f32' },
          uBlackHoleUV: { value: [0.5, 0.5], type: 'vec2<f32>' },
          uChromaticAmount: { value: 0, type: 'f32' },
          uVignette: { value: 0.35, type: 'f32' },
          uFlash: { value: 0, type: 'f32' },
          uExposure: { value: 1.05, type: 'f32' },
          uContrast: { value: 1.08, type: 'f32' },
          uShadowTint: { value: [0.02, 0.04, 0.11], type: 'vec3<f32>' },
          uHighlightTint: { value: [0.88, 0.96, 1.05], type: 'vec3<f32>' },
          uShockwaveUV: { value: [0.36, 0.5], type: 'vec2<f32>' },
          uShockwaveRadius: { value: 0, type: 'f32' },
          uShockwaveStrength: { value: 0, type: 'f32' },
        },
      },
    });
  }

  public triggerChromaticPulse(amount = 0.005): void {
    this.chromaticPulse = Math.max(this.chromaticPulse, amount);
  }

  public triggerFlash(amount = 1.0): void {
    this.flashIntensity = Math.max(this.flashIntensity, amount);
  }

  public triggerShockwaveDistortion(
    normX: number,
    normY: number,
    strength = 0.012,
    duration = 0.85
  ): void {
    this.shockwaveUV = [normX, normY];
    this.shockwaveMaxStrength = strength;
    this.shockwaveDuration = Math.max(0.2, duration);
    this.shockwaveTimer = 0.001;
  }

  public triggerEraBloomPulse(): void {
    this.currentExposure = Math.min(1.45, this.currentExposure + 0.25);
  }

  public update(
    dt: number,
    elapsedSeconds: number,
    profile: QualityProfile,
    reduceMotion: boolean,
    blackHolePos: { active: boolean; x: number; y: number },
    screenWidth: number,
    screenHeight: number,
    eraIndex = 0,
    sceneBrightnessEstimate = 0.5
  ): void {
    this.chromaticPulse = Math.max(0, this.chromaticPulse - dt * 0.012);
    this.flashIntensity = Math.max(0, this.flashIntensity - dt * 1.4);

    // Update Filter resolution to match quality governor profile
    this.filter.resolution = profile.resolutionScale * Math.min(window.devicePixelRatio || 1, 2);

    if (profile.tier === 'low') {
      this.filter.enabled = this.flashIntensity > 0.01;
    } else {
      this.filter.enabled = true;
    }

    // 1. Era Color Grade 3-second transition
    const clampedEra = Math.max(0, Math.min(ERA_COLOR_GRADES.length - 1, eraIndex));
    if (clampedEra !== this.currentEraIndex) {
      this.startGrade = this.getInterpolatedGrade();
      this.targetGrade = ERA_COLOR_GRADES[clampedEra];
      this.currentEraIndex = clampedEra;
      this.gradeLerpTimer = 0;
    }
    if (this.gradeLerpTimer < 3.0) {
      this.gradeLerpTimer = Math.min(3.0, this.gradeLerpTimer + dt);
    }
    const grade = this.getInterpolatedGrade();

    // 2. Smooth Auto-Exposure (~1s inertia)
    // Brighter scenes gently lower exposure to prevent flat clipping; darker scenes boost exposure
    this.targetExposure = 1.16 / (0.82 + Math.min(1.2, sceneBrightnessEstimate) * 0.34);
    const expLerp = 1.0 - Math.exp(-dt / 1.0);
    this.currentExposure += (this.targetExposure - this.currentExposure) * expLerp;

    // 3. Screen-space shockwave distortion update
    let swRadius = 0;
    let swStrength = 0;
    if (this.shockwaveTimer > 0) {
      this.shockwaveTimer += dt;
      if (this.shockwaveTimer >= this.shockwaveDuration || reduceMotion) {
        this.shockwaveTimer = 0;
      } else {
        const p = this.shockwaveTimer / this.shockwaveDuration;
        swRadius = p * 0.55;
        swStrength = this.shockwaveMaxStrength * (1.0 - p);
      }
    }

    const uniforms = (this.filter.resources.postUniforms as any).uniforms;
    uniforms.uTexelSize = [1 / Math.max(1, screenWidth), 1 / Math.max(1, screenHeight)];
    uniforms.uTime = elapsedSeconds;
    uniforms.uBloomLevels = profile.enableBloom ? profile.bloomLevels : 0.0;
    uniforms.uBloomStrength = grade.bloomStrength;
    uniforms.uEnableLensing =
      profile.enableLensing && !reduceMotion && blackHolePos.active ? 1.0 : 0.0;
    uniforms.uEnableFlares = profile.enableFlares && !reduceMotion ? 1.0 : 0.0;
    uniforms.uEnableGrain = profile.enableGrain && !reduceMotion ? 1.0 : 0.0;
    uniforms.uBlackHoleUV = [
      blackHolePos.x / Math.max(1, screenWidth),
      blackHolePos.y / Math.max(1, screenHeight),
    ];
    uniforms.uChromaticAmount =
      profile.enableChromatic && !reduceMotion ? this.chromaticPulse : 0.0;
    uniforms.uVignette = 0.34;
    uniforms.uFlash = reduceMotion ? this.flashIntensity * 0.3 : this.flashIntensity;
    uniforms.uExposure = this.currentExposure;
    uniforms.uContrast = grade.contrast;
    uniforms.uShadowTint = grade.shadowTint;
    uniforms.uHighlightTint = grade.highlightTint;
    uniforms.uShockwaveUV = this.shockwaveUV;
    uniforms.uShockwaveRadius = swRadius;
    uniforms.uShockwaveStrength = swStrength;
  }

  private getInterpolatedGrade(): EraColorGrade {
    const t = Math.min(1, this.gradeLerpTimer / 3.0);
    const s = t * t * (3 - 2 * t);
    const a = this.startGrade;
    const b = this.targetGrade;
    return {
      shadowTint: [
        a.shadowTint[0] + (b.shadowTint[0] - a.shadowTint[0]) * s,
        a.shadowTint[1] + (b.shadowTint[1] - a.shadowTint[1]) * s,
        a.shadowTint[2] + (b.shadowTint[2] - a.shadowTint[2]) * s,
      ],
      highlightTint: [
        a.highlightTint[0] + (b.highlightTint[0] - a.highlightTint[0]) * s,
        a.highlightTint[1] + (b.highlightTint[1] - a.highlightTint[1]) * s,
        a.highlightTint[2] + (b.highlightTint[2] - a.highlightTint[2]) * s,
      ],
      contrast: a.contrast + (b.contrast - a.contrast) * s,
      bloomStrength: a.bloomStrength + (b.bloomStrength - a.bloomStrength) * s,
    };
  }
}
