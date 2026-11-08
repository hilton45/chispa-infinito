import { Filter, GlProgram, defaultFilterVert } from 'pixi.js';
import { QualityProfile } from './QualityGovernor';

const POST_FRAG = `
  in vec2 vTextureCoord;
  out vec4 finalColor;

  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uEnableBloom;
  uniform float uEnableLensing;
  uniform float uEnableGrain;
  uniform vec2 uBlackHoleUV;
  uniform float uChromaticAmount;
  uniform float uVignette;
  uniform float uFlash;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main(void) {
    vec2 uv = vTextureCoord;

    // 1. Gravitational Lensing around Black Hole (localized Einstein ring)
    if (uEnableLensing > 0.5) {
      vec2 delta = uv - uBlackHoleUV;
      float r = length(delta);
      if (r < 0.036 && r > 0.0001) {
        float falloff = smoothstep(0.036, 0.005, r);
        vec2 offset = (delta / r) * (0.0085 * falloff);
        uv = clamp(uv - offset, 0.001, 0.999);
      }
    }

    // 2. Chromatic Aberration (on milestones and Big Bang)
    vec3 col;
    if (uChromaticAmount > 0.0001) {
      vec2 dir = uv - 0.5;
      float r = texture(uTexture, clamp(uv + dir * uChromaticAmount, 0.0, 1.0)).r;
      float g = texture(uTexture, uv).g;
      float b = texture(uTexture, clamp(uv - dir * uChromaticAmount, 0.0, 1.0)).b;
      col = vec3(r, g, b);
    } else {
      col = texture(uTexture, uv).rgb;
    }

    // 3. Soft Bloom pass (threshold 0.6, intensity 0.8)
    if (uEnableBloom > 0.5) {
      vec3 glow = vec3(0.0);
      float spread = 0.0032;
      for (int i = 0; i < 8; i++) {
        float ang = float(i) * 0.78539816;
        vec2 off = vec2(cos(ang), sin(ang)) * spread;
        vec3 s = texture(uTexture, clamp(uv + off, 0.0, 1.0)).rgb;
        float lum = max(s.r, max(s.g, s.b));
        float factor = smoothstep(0.6, 1.0, lum);
        glow += s * factor;
      }
      col += (glow / 8.0) * 0.8;
    }

    // 4. Vignette (0.35)
    vec2 vuv = uv - 0.5;
    float vig = 1.0 - dot(vuv, vuv) * uVignette * 2.1;
    col *= clamp(vig, 0.25, 1.0);

    // 5. Film Grain (0.03)
    if (uEnableGrain > 0.5) {
      float n = (hash(uv * 500.0 + uTime) - 0.5) * 0.03;
      col += n;
    }

    // 6. Big Bang / Era Transition Overexposure Flash
    if (uFlash > 0.001) {
      col = mix(col, vec3(1.0, 0.98, 0.94), clamp(uFlash, 0.0, 1.0));
    }

    finalColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export class PostProcessController {
  public filter: Filter;
  private chromaticPulse = 0;
  private flashIntensity = 0;

  constructor() {
    const glProgram = GlProgram.from({
      vertex: defaultFilterVert,
      fragment: POST_FRAG,
      name: 'chispa-post-process',
    });

    this.filter = new Filter({
      glProgram,
      resources: {
        postUniforms: {
          uTime: { value: 0, type: 'f32' },
          uEnableBloom: { value: 1, type: 'f32' },
          uEnableLensing: { value: 0, type: 'f32' },
          uEnableGrain: { value: 1, type: 'f32' },
          uBlackHoleUV: { value: [0.5, 0.5], type: 'vec2<f32>' },
          uChromaticAmount: { value: 0, type: 'f32' },
          uVignette: { value: 0.35, type: 'f32' },
          uFlash: { value: 0, type: 'f32' },
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

  public update(
    dt: number,
    elapsedSeconds: number,
    profile: QualityProfile,
    reduceMotion: boolean,
    blackHolePos: { active: boolean; x: number; y: number },
    screenWidth: number,
    screenHeight: number
  ): void {
    this.chromaticPulse = Math.max(0, this.chromaticPulse - dt * 0.012);
    this.flashIntensity = Math.max(0, this.flashIntensity - dt * 1.4);

    if (profile.tier === 'low') {
      this.filter.enabled = this.flashIntensity > 0.01;
    } else {
      this.filter.enabled = true;
    }

    const uniforms = (this.filter.resources.postUniforms as any).uniforms;
    uniforms.uTime = elapsedSeconds;
    uniforms.uEnableBloom = profile.enableBloom ? 1.0 : 0.0;
    uniforms.uEnableLensing =
      profile.enableLensing && !reduceMotion && blackHolePos.active ? 1.0 : 0.0;
    uniforms.uEnableGrain = profile.enableGrain && !reduceMotion ? 1.0 : 0.0;
    uniforms.uBlackHoleUV = [
      blackHolePos.x / Math.max(1, screenWidth),
      blackHolePos.y / Math.max(1, screenHeight),
    ];
    uniforms.uChromaticAmount =
      profile.enableChromatic && !reduceMotion ? this.chromaticPulse : 0.0;
    uniforms.uVignette = 0.35;
    uniforms.uFlash = reduceMotion ? this.flashIntensity * 0.3 : this.flashIntensity;
  }
}
