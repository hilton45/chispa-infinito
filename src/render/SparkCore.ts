import { Container, Graphics, Mesh, MeshGeometry, Shader } from 'pixi.js';
import { hslToRgbNormalized, hslToHexNumber } from '@/utils/Color';
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
  uniform float uEvolutionStage;
  uniform float uSkinMode;

  void main(void) {
    vec2 p = (vUV - 0.5) * 2.0;
    float d = length(p) / max(0.5, uPulse + uKick);
    float angle = atan(p.y, p.x);

    // Core body: smoothstep(0.34, 0.30, d) in white (or dark event horizon for black hole stage/skin)
    float body = smoothstep(0.34, 0.28, d);

    // Corona: pow(0.06 / d, 1.4)
    float corona = pow(0.06 / max(d, 0.015), 1.4);

    // Rotating rays: sin(atan(y,x) * N + t * 0.4) * smoothstep(1.0, 0.2, d)
    float rayWave = 0.5 + 0.5 * sin(angle * uRayCount + uTime * 0.4);
    float rayWave2 = 0.5 + 0.5 * sin(angle * (uRayCount + 3.0) - uTime * 0.65);
    float rays = (rayWave * 0.65 + rayWave2 * 0.35) * smoothstep(1.0, 0.2, d) * smoothstep(0.12, 0.35, d);

    vec3 accent = uAccentColor;
    if (uSkinMode == 1.0) {
      // Solar flare skin
      accent = vec3(1.0, 0.55, 0.12);
    } else if (uSkinMode == 2.0) {
      // Rainbow resonator skin
      accent = 0.5 + 0.5 * cos(uTime * 1.5 + angle + vec3(0.0, 2.0, 4.0));
    } else if (uSkinMode == 3.0) {
      // Comet gold skin
      accent = vec3(1.0, 0.85, 0.28);
    } else if (uSkinMode == 4.0) {
      // Void black hole skin
      accent = vec3(0.65, 0.25, 1.0);
    }

    // Evolution visual nuance (pulsar / black hole / singularity rings)
    float ringHighlight = 0.0;
    if (uEvolutionStage >= 2.0) {
      ringHighlight = smoothstep(0.03, 0.0, abs(d - 0.35)) * 0.8;
    }

    vec3 col = accent * (corona * 0.85 + rays * 0.55 + ringHighlight);

    // If black hole stage (stage 3) or void skin (4), dark inner core with bright photon ring
    if (uSkinMode == 4.0 || (uEvolutionStage >= 3.0 && uEvolutionStage < 4.0)) {
      float photonRing = smoothstep(0.04, 0.0, abs(d - 0.31)) * 2.2;
      col += vec3(1.0, 0.92, 0.8) * photonRing;
      col = mix(col, vec3(0.02, 0.01, 0.05), smoothstep(0.30, 0.25, d));
    } else {
      // White-hot incandescent core
      col = mix(col, vec3(1.0, 1.0, 1.0), body);
    }

    // Smooth circular falloff at outer quad boundary so no hard square edge ever shows
    float edgeFade = smoothstep(1.0, 0.65, length(p));
    col *= edgeFade;

    float alpha = clamp((corona * 0.6 + rays * 0.4 + body) * edgeFade, 0.0, 1.0);
    finalColor = vec4(col, alpha);
  }
`;

export class SparkCore {
  public container: Container;
  private sparkMesh: Mesh<MeshGeometry, Shader>;
  private sparkShader: Shader;
  private resonanceGraphics: Graphics;
  private kick = 0;
  public currentRadius = 90;

  constructor() {
    this.container = new Container();

    const r = 220;
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
          uEvolutionStage: { value: 0.0, type: 'f32' },
          uSkinMode: { value: 0.0, type: 'f32' },
        },
      },
    });

    this.sparkMesh = new Mesh({ geometry, shader: this.sparkShader });
    this.container.addChild(this.sparkMesh);

    this.resonanceGraphics = new Graphics();
    this.container.addChild(this.resonanceGraphics);
  }

  public triggerClickKick(): void {
    this.kick = 0.16;
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
    reduceMotion: boolean
  ): void {
    // Decay kick by x0.86 per frame
    this.kick *= 0.86;
    if (this.kick < 0.001) this.kick = 0;

    // Core radius grows with log10(totalEnergy) between 7.5% and 12.5% of minSide
    const logE = totalEnergy.gt(1) ? Math.max(0, Decimal.log10(totalEnergy)) : 0;
    const growthFactor = Math.min(1, logE / 35); // reaches max size around 1e35
    const pct = 0.075 + growthFactor * 0.05; // 7.5% to 12.5%
    const visualRadius = Math.max(42, minSceneSide * pct);
    this.currentRadius = visualRadius;

    // Mesh quad is 2.6x visualRadius so the corona and rays have plenty of room to fade
    const meshScale = (visualRadius * 2.6) / 220;
    this.sparkMesh.scale.set(meshScale);

    // Ray count: N = 5 + eras + cycles (max 15)
    const rayCount = Math.min(15, 5 + eraIndex + bigBangs);

    // Evolution stage based on eraIndex
    let evolutionStage = 0;
    if (eraIndex >= 12) evolutionStage = 4; // Singularity
    else if (eraIndex >= 8) evolutionStage = 3; // Luminous Black Hole
    else if (eraIndex >= 4) evolutionStage = 2; // Pulsar
    else if (eraIndex >= 1) evolutionStage = 1; // Star

    // Skin mapping
    let skinMode = 0;
    if (selectedSkinId === 'skin_solar_flare') skinMode = 1;
    else if (selectedSkinId === 'skin_rainbow_resonator') skinMode = 2;
    else if (selectedSkinId === 'skin_comet_gold') skinMode = 3;
    else if (selectedSkinId === 'skin_void_black_hole') skinMode = 4;

    const pulse = reduceMotion ? 1.0 : 1.0 + 0.05 * Math.sin(2.2 * elapsedSeconds);
    const [r, g, b] = hslToRgbNormalized(currentHue, 95, 62);

    const uniforms = (this.sparkShader.resources.sparkUniforms as any).uniforms;
    uniforms.uTime = reduceMotion ? 0 : elapsedSeconds;
    uniforms.uAccentColor = [r, g, b];
    uniforms.uRayCount = rayCount;
    uniforms.uPulse = pulse;
    uniforms.uKick = reduceMotion ? this.kick * 0.3 : this.kick;
    uniforms.uEvolutionStage = evolutionStage;
    uniforms.uSkinMode = skinMode;

    // Draw Resonance Ring around the core
    const rg = this.resonanceGraphics;
    rg.clear();

    if (resonanceCombo > 0) {
      const ratio = Math.min(1, resonanceCombo / maxResonanceCombo);
      const ringRadius = visualRadius * 1.18 + this.kick * 25;

      // Subtle track circle
      rg.circle(0, 0, ringRadius).stroke({
        width: 2,
        color: 0xffffff,
        alpha: 0.12,
      });

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + ratio * Math.PI * 2;

      if (ratio >= 0.99) {
        // Max combo: Rainbow segmented halo!
        const segments = 24;
        for (let i = 0; i < segments; i++) {
          const a0 = (i / segments) * Math.PI * 2 + elapsedSeconds * 2.0;
          const a1 = ((i + 0.85) / segments) * Math.PI * 2 + elapsedSeconds * 2.0;
          const segHue = (i / segments) * 360;
          const segColor = hslToHexNumber(segHue, 100, 65);
          rg.arc(0, 0, ringRadius, a0, a1).stroke({
            width: 4.5,
            color: segColor,
            alpha: 0.95,
          });
        }
      } else {
        const ringColor = hslToHexNumber(currentHue, 100, 68);
        rg.arc(0, 0, ringRadius, startAngle, endAngle).stroke({
          width: 3.5,
          color: ringColor,
          alpha: 0.88,
        });
      }
    }
  }
}
