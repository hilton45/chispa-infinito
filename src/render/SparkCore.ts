import { Container, Mesh, MeshGeometry, Shader } from 'pixi.js';
import { hslToRgbNormalized } from '@/utils/Color';
import { Decimal } from '@/utils/Decimal';

const SPARK_VERT = `
  in vec2 aPosition;
  in vec2 aUV;
  out vec2 vUV;

  uniform mat3 uProjectionMatrix;
  uniform mat3 uWorldTransformMatrix;
  uniform mat3 uTransformMatrix;

  void main(void) {
    vUV = aUV;
    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  }
`;

const SPARK_FRAG = `
  in vec2 vUV;
  out vec4 finalColor;

  uniform float uTime;
  uniform vec3 uAccentColor;
  uniform float uRayCount;
  uniform float uPulse;
  uniform float uKick;
  uniform float uVariant;
  uniform float uComboRatio;
  uniform float uSkinMode;
  uniform float uEnableGodRays;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.53);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.05 + vec2(1.9, 7.3);
      a *= 0.5;
    }
    return v;
  }

  // Domain-warped 4-octave FBM for convective granulation and plasma filaments
  float warpedSurface(vec2 p, float t, out float qOut) {
    vec2 q = vec2(
      fbm(p + vec2(0.0, 0.0) + t * 0.14),
      fbm(p + vec2(5.2, 1.3) - t * 0.12)
    );
    qOut = length(q);
    return fbm(p + 2.45 * q + vec2(t * 0.09, -t * 0.11));
  }

  // Angular emission function used by the 32-sample volumetric God Rays
  float angularEmission(vec2 samplePos, float t, float rayN) {
    float r = length(samplePos);
    float ang = atan(samplePos.y, samplePos.x);
    float w1 = 0.5 + 0.5 * sin(ang * rayN + t * 0.65 + sin(r * 8.0 - t * 2.0) * 0.6);
    float w2 = 0.5 + 0.5 * cos(ang * (rayN + 4.0) - t * 0.95);
    float radial = exp(-r * 3.1) * smoothstep(0.08, 0.28, r);
    return pow(w1 * 0.62 + w2 * 0.38, 1.8) * radial;
  }

  void main(void) {
    vec2 p = (vUV - 0.5) * 2.0;
    float scale = max(0.55, uPulse + uKick * 0.9);
    vec2 sp = p / scale;
    float d = length(sp);
    float angle = atan(sp.y, sp.x);

    // Base accent color & skin override
    vec3 accent = uAccentColor;
    if (uSkinMode == 1.0) {
      accent = vec3(1.0, 0.47, 0.08); // Fulgor Solar
    } else if (uSkinMode == 2.0) {
      accent = 0.55 + 0.45 * cos(uTime * 1.6 + angle + vec3(0.0, 2.1, 4.2)); // Prisma RGB
    } else if (uSkinMode == 3.0) {
      accent = vec3(1.0, 0.84, 0.18); // Oro Divino
    } else if (uSkinMode == 4.0) {
      accent = vec3(0.62, 0.18, 1.0); // Singularidad Abisal
    } else if (uSkinMode == 5.0) {
      // Neón Cyberpunk: cian de fibra óptica y magenta radiactivo
      float cyc = 0.5 + 0.5 * sin(angle * 3.0 + uTime * 2.8);
      accent = mix(vec3(0.0, 0.94, 1.0), vec3(1.0, 0.0, 0.65), cyc);
    } else if (uSkinMode == 6.0) {
      // Hiper-Espacio Esmeralda: verde aurora boreal
      accent = vec3(0.05, 1.0, 0.55);
    }

    vec3 hotWhite = vec3(1.0, 0.98, 0.93);
    vec3 warmCore = mix(accent, vec3(1.0, 0.92, 0.76), 0.58);
    vec3 deepLimb = accent * 0.48 + vec3(0.06, 0.03, 0.12);

    // Variant blending weights (0: Plasma, 1: Star+Sunspots, 2: Pulsar+Jets, 3: Luminous Black Hole, 4: Singularity)
    float wPlasma = clamp(1.0 - abs(uVariant - 0.0), 0.0, 1.0);
    float wStar   = clamp(1.0 - abs(uVariant - 1.0), 0.0, 1.0);
    float wPulsar = clamp(1.0 - abs(uVariant - 2.0), 0.0, 1.0);
    float wBH     = clamp(1.0 - abs(uVariant - 3.0), 0.0, 1.0);
    float wSing   = clamp(1.0 - abs(uVariant - 4.0), 0.0, 1.0);

    // 1. SURFACE: 3D Spherical Projection + Domain-Warped FBM + Limb Darkening + Granulation
    float coreRadius = 0.33;
    float sphereMask = smoothstep(coreRadius + 0.018, coreRadius - 0.012, d);
    vec3 surfaceCol = vec3(0.0);

    if (d < coreRadius + 0.03) {
      float normR = clamp(d / coreRadius, 0.0, 1.0);
      // 3D hemisphere normal Z for physical Eddington limb darkening
      float z = sqrt(max(0.01, 1.0 - normR * normR));
      vec2 sphereUV = sp / (coreRadius * (0.62 + 0.38 * z));
      // Slow axial rotation
      float rotA = uTime * 0.16;
      mat2 rotMat = mat2(cos(rotA), -sin(rotA), sin(rotA), cos(rotA));
      sphereUV = rotMat * sphereUV;

      float warpMag = 0.0;
      float gran = warpedSurface(sphereUV * 3.4, uTime, warpMag);
      float fineGran = fbm(sphereUV * 8.5 - uTime * 0.25);

      // Physical limb darkening: center is hotter, limb reveals deep convective color & contrast
      float limb = pow(z, 0.68);
      float cellContrast = smoothstep(0.24, 0.78, gran * 0.72 + fineGran * 0.28);

      // Variant 1 (Star) magnetic sunspots with bright penumbra
      float sunspotMask = smoothstep(0.32, 0.18, gran) * smoothstep(0.15, 0.85, normR);
      float spotDarkening = 1.0 - wStar * sunspotMask * 0.68;

      // Center hotspot burns toward warm white while preserving visible cellular texture around it
      float centerHot = pow(z, 2.4) * (0.65 + 0.35 * cellContrast) + uKick * 0.45;
      surfaceCol = mix(deepLimb, warmCore, limb * (0.45 + 0.55 * cellContrast));
      surfaceCol = mix(surfaceCol, hotWhite, clamp(centerHot * 0.82, 0.0, 0.92));
      surfaceCol *= spotDarkening;

      // Variant 0 (Plasma) electric filaments across the sphere
      float plasmaArcs = smoothstep(0.52, 0.82, warpMag) * (1.0 - z * 0.4);
      surfaceCol += accent * plasmaArcs * (0.45 + 0.55 * wPlasma);

      // Variant 3 (Luminous Black Hole) relativistic inner shadow + blazing photon ring at r = 0.24
      if (wBH > 0.01) {
        float eventHorizon = smoothstep(0.22, 0.12, d);
        float photonRing = smoothstep(0.045, 0.0, abs(d - 0.235)) * (1.4 + 0.6 * sin(angle * 3.0 - uTime * 5.0));
        vec3 bhCol = mix(surfaceCol, vec3(0.03, 0.01, 0.07) + accent * 0.22 * fineGran, eventHorizon * 0.88);
        bhCol += mix(accent, hotWhite, 0.7) * photonRing * 1.45;
        surfaceCol = mix(surfaceCol, bhCol, wBH);
      }

      // Variant 4 (Singularity) concentric quantum lensing caustics
      if (wSing > 0.01) {
        float caustics = 0.5 + 0.5 * sin(normR * 22.0 - uTime * 4.5 + gran * 4.0);
        surfaceCol += mix(accent, hotWhite, 0.6) * pow(caustics, 3.0) * wSing * 0.65;
      }
    }

    // 2. CORONA: Radial pow falloff + turbulent coronal prominences
    float coronaNoise = fbm(vec2(angle * 2.5, d * 5.0 - uTime * 0.45));
    float coronaDist = max(0.016, abs(d - coreRadius * 0.88));
    float corona = pow(0.058 / coronaDist, 1.38) * (0.78 + 0.45 * coronaNoise);
    corona *= smoothstep(1.0, 0.26, d);

    // 3. VOLUMETRIC GOD RAYS: 28-sample radial march from core over the glow
    float godRays = 0.0;
    int steps = uEnableGodRays > 0.5 ? 28 : 10;
    float invSteps = 1.0 / float(steps);
    float decay = 0.93;
    float weight = 1.0;
    for (int i = 0; i < 28; i++) {
      if (i >= steps) break;
      float frac = float(i) * invSteps;
      vec2 samplePos = sp * (1.0 - frac * 0.68);
      godRays += angularEmission(samplePos, uTime, uRayCount) * weight;
      weight *= decay;
    }
    godRays *= invSteps * (1.65 + uKick * 3.8 + uComboRatio * 1.15);

    // 4. VARIANT EXTRAS: Bipolar Relativistic Jets (Pulsar) & Accretion Disk (Black Hole / Singularity)
    float variantGlow = 0.0;
    if (wPulsar > 0.01) {
      float jetAxis = uTime * 1.35;
      float align = abs(cos(angle - jetAxis));
      float jetCone = pow(align, 16.0) * smoothstep(0.18, 0.42, d) * smoothstep(0.98, 0.35, d);
      float jetPulses = 0.65 + 0.35 * sin(d * 28.0 - uTime * 14.0);
      variantGlow += jetCone * jetPulses * wPulsar * 1.65;
    }
    if (wBH + wSing > 0.01) {
      // Tilted relativistic accretion disk with Doppler beaming on the approaching side
      vec2 diskP = mat2(0.88, -0.47, 0.47, 0.88) * sp;
      float diskR = length(vec2(diskP.x, diskP.y * 2.8));
      float diskBand = smoothstep(0.56, 0.34, diskR) * smoothstep(0.20, 0.30, diskR);
      float doppler = 0.65 + 0.55 * clamp(-diskP.x / max(0.1, diskR), -0.8, 1.0);
      variantGlow += diskBand * doppler * (wBH + wSing * 0.8) * 1.15;
    }

    // 5. RESONANCE RING SHADER (glowing plasma track + active combo arc + rainbow max combo + shockwave)
    float ringR = 0.405 + uKick * 0.055;
    float ringDist = abs(d - ringR);
    float baseTrack = smoothstep(0.012, 0.0, ringDist) * 0.32;

    float activeRing = 0.0;
    vec3 ringCol = mix(accent, hotWhite, 0.45);
    if (uComboRatio > 0.001) {
      // Normalized angle starting from top (-PI/2) clockwise
      float normAng = fract((angle + 1.5707963) / 6.2831853);
      float inArc = smoothstep(uComboRatio + 0.015, uComboRatio - 0.015, normAng);
      float plasmaPulse = 0.82 + 0.18 * sin(normAng * 40.0 - uTime * 9.0);
      activeRing = (smoothstep(0.018, 0.0, ringDist) + pow(0.004 / max(ringDist, 0.002), 1.2) * 0.35) * inArc * plasmaPulse;

      if (uComboRatio >= 0.98) {
        // Max combo: iridescent rainbow resonator halo
        ringCol = 0.55 + 0.45 * cos(normAng * 6.2831853 * 2.0 - uTime * 3.5 + vec3(0.0, 2.09, 4.18));
        ringCol = mix(ringCol, hotWhite, 0.3);
      }
    }

    // Combine all layers in linear HDR space
    vec3 col = accent * (corona * 0.88 + godRays * 1.05 + variantGlow);
    col += mix(accent, hotWhite, 0.55) * (corona * godRays * 0.65);
    col = mix(col, surfaceCol, sphereMask);
    col += ringCol * (baseTrack + activeRing * 1.35);

    // Outer quad edge fade so no bounding box ever clips
    float edgeFade = smoothstep(1.0, 0.64, length(p));
    col *= edgeFade;

    float alpha = clamp((corona * 0.72 + godRays * 0.65 + variantGlow + sphereMask + baseTrack + activeRing) * edgeFade, 0.0, 1.0);
    finalColor = vec4(col, alpha);
  }
`;

export class SparkCore {
  public container: Container;
  private sparkMesh: Mesh<MeshGeometry, Shader>;
  private sparkShader: Shader;
  private kick = 0;
  private currentVariant = 0;
  public currentRadius = 90;

  constructor() {
    this.container = new Container();

    const r = 240;
    const geometry = new MeshGeometry({
      positions: new Float32Array([-r, -r, r, -r, r, r, -r, r]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });

    this.sparkShader = Shader.from({
      gl: {
        vertex: SPARK_VERT,
        fragment: SPARK_FRAG,
      },
      resources: {
        sparkUniforms: {
          uTime: { value: 0, type: 'f32' },
          uAccentColor: { value: [0.22, 0.74, 0.97], type: 'vec3<f32>' },
          uRayCount: { value: 5, type: 'f32' },
          uPulse: { value: 1.0, type: 'f32' },
          uKick: { value: 0.0, type: 'f32' },
          uVariant: { value: 0.0, type: 'f32' },
          uComboRatio: { value: 0.0, type: 'f32' },
          uSkinMode: { value: 0.0, type: 'f32' },
          uEnableGodRays: { value: 1.0, type: 'f32' },
        },
      },
    });

    this.sparkMesh = new Mesh({ geometry, shader: this.sparkShader });
    this.container.addChild(this.sparkMesh);
  }

  public triggerClickKick(): void {
    this.kick = 0.18;
  }

  public update(
    elapsedSeconds: number,
    minSceneSide: number,
    totalEnergy: Decimal,
    currentHue: number,
    eraIndex: number,
    bigBangs: number,
    resonanceCombo: number,
    maxResonanceCombo: number,
    selectedSkinId: string,
    reduceMotion: boolean,
    enableGodRays = true
  ): void {
    this.kick *= 0.86;
    if (this.kick < 0.001) this.kick = 0;

    // Core radius grows with log10(totalEnergy) and guarantees >= 25% width on mobile
    const logE = totalEnergy.gt(1) ? Math.max(0, Decimal.log10(totalEnergy)) : 0;
    const growthFactor = Math.min(1, logE / 35);
    const pct = 0.088 + growthFactor * 0.045;
    const minPxRadius = minSceneSide < 500 ? minSceneSide * 0.148 : 50;
    const visualRadius = Math.max(minPxRadius, minSceneSide * pct);
    this.currentRadius = visualRadius;

    const meshScale = (visualRadius * 2.75) / 240;
    this.sparkMesh.scale.set(meshScale);

    const rayCount = Math.min(15, 5 + eraIndex + bigBangs);

    // Target variant by era (0: Plasma, 1: Star with spots, 2: Pulsar with jets, 3: Luminous BH with photon ring, 4: Singularity)
    let targetVariant = 0;
    if (eraIndex >= 12) targetVariant = 4;
    else if (eraIndex >= 8) targetVariant = 3;
    else if (eraIndex >= 5) targetVariant = 2;
    else if (eraIndex >= 2) targetVariant = 1;

    // Smoothly transition between core variants
    this.currentVariant += (targetVariant - this.currentVariant) * 0.08;

    let skinMode = 0;
    if (selectedSkinId === 'skin_solar_flare') skinMode = 1;
    else if (selectedSkinId === 'skin_rainbow_resonator') skinMode = 2;
    else if (selectedSkinId === 'skin_comet_gold') skinMode = 3;
    else if (selectedSkinId === 'skin_void_black_hole') skinMode = 4;
    else if (selectedSkinId === 'skin_neon_cyberpunk') skinMode = 5;
    else if (selectedSkinId === 'skin_emerald_aurora') skinMode = 6;

    const pulse = reduceMotion ? 1.0 : 1.0 + 0.045 * Math.sin(2.2 * elapsedSeconds);
    const [r, g, b] = hslToRgbNormalized(currentHue, 95, 62);
    const comboRatio = Math.min(1, Math.max(0, resonanceCombo / Math.max(1, maxResonanceCombo)));

    const uniforms = (this.sparkShader.resources.sparkUniforms as any).uniforms;
    uniforms.uTime = reduceMotion ? 0 : elapsedSeconds;
    uniforms.uAccentColor = [r, g, b];
    uniforms.uRayCount = rayCount;
    uniforms.uPulse = pulse;
    uniforms.uKick = reduceMotion ? this.kick * 0.3 : this.kick;
    uniforms.uVariant = this.currentVariant;
    uniforms.uComboRatio = comboRatio;
    uniforms.uSkinMode = skinMode;
    uniforms.uEnableGodRays = enableGodRays ? 1.0 : 0.0;
  }
}
