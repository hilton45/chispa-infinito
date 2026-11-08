import { Container, Graphics, Mesh, MeshGeometry, Shader } from 'pixi.js';
import { hslToRgbNormalized, hslToHexNumber } from '@/utils/Color';

const SKY_VERT = `
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

const SKY_FRAG = `
  in vec2 vUV;
  out vec4 finalColor;

  uniform float uTime;
  uniform vec3 uAccentColor;
  uniform vec2 uParallax;
  uniform vec2 uAspect;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
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
      p = rot * p * 2.02 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main(void) {
    vec2 uv = (vUV - 0.5) * uAspect;
    vec2 p = uv + uParallax * 0.04;

    // Deep cosmic base
    vec3 deepBg = vec3(0.02, 0.015, 0.06);
    vec3 midBg = vec3(0.04, 0.03, 0.11);

    // 3 FBM nebula layers with slow drift
    float n1 = fbm(p * 1.6 + vec2(uTime * 0.012, -uTime * 0.008));
    float n2 = fbm(p * 2.8 - vec2(uTime * 0.018, uTime * 0.014) + n1 * 0.65);
    float n3 = fbm(p * 4.2 + vec2(uTime * 0.007, uTime * 0.022) - n2 * 0.4);

    float nebulaMask = smoothstep(0.32, 0.85, n1 * 0.55 + n2 * 0.45);
    float detailMask = smoothstep(0.45, 0.9, n3);

    vec3 col = mix(deepBg, midBg, clamp(1.0 - length(uv) * 0.65, 0.0, 1.0));
    col += uAccentColor * nebulaMask * 0.22;
    col += mix(uAccentColor, vec3(0.9, 0.95, 1.0), 0.45) * detailMask * nebulaMask * 0.16;

    // Subtle radial center glow behind the spark
    float centerGlow = exp(-length(uv) * 2.2) * 0.18;
    col += uAccentColor * centerGlow;

    finalColor = vec4(col, 1.0);
  }
`;

interface StarData {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
  layer: number; // 0 = far, 1 = mid, 2 = near
  tintMix: number;
}

export class SkyLayer {
  public container: Container;
  private quadMesh: Mesh<MeshGeometry, Shader>;
  private skyShader: Shader;
  private starsGraphics: Graphics;
  private constellationsGraphics: Graphics;
  private stars: StarData[] = [];
  private width = 1920;
  private height = 1080;

  constructor() {
    this.container = new Container();

    const geometry = new MeshGeometry({
      positions: new Float32Array([0, 0, 1920, 0, 1920, 1080, 0, 1080]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });

    this.skyShader = Shader.from({
      gl: {
        vertex: SKY_VERT,
        fragment: SKY_FRAG,
      },
      resources: {
        skyUniforms: {
          uTime: { value: 0, type: 'f32' },
          uAccentColor: { value: [0.22, 0.74, 0.97], type: 'vec3<f32>' },
          uParallax: { value: [0, 0], type: 'vec2<f32>' },
          uAspect: { value: [1.77, 1.0], type: 'vec2<f32>' },
        },
      },
    });

    this.quadMesh = new Mesh({ geometry, shader: this.skyShader });
    this.container.addChild(this.quadMesh);

    this.constellationsGraphics = new Graphics();
    this.container.addChild(this.constellationsGraphics);

    this.starsGraphics = new Graphics();
    this.container.addChild(this.starsGraphics);

    this.initStars(220);
  }

  private initStars(count: number): void {
    this.stars = [];
    // Deterministic-feeling distribution across 3 parallax layers
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: layer === 0 ? 1.0 : layer === 1 ? 1.5 : 2.3,
        baseAlpha: layer === 0 ? 0.35 : layer === 1 ? 0.55 : 0.8,
        twinkleSpeed: 0.8 + Math.random() * 2.8,
        phase: Math.random() * Math.PI * 2,
        layer,
        tintMix: Math.random(),
      });
    }
  }

  public resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);

    const pos = this.quadMesh.geometry.positions;
    pos[2] = this.width;
    pos[4] = this.width;
    pos[5] = this.height;
    pos[7] = this.height;
    this.quadMesh.geometry.buffers[0].update();

    const uniforms = (this.skyShader.resources.skyUniforms as any).uniforms;
    const minSide = Math.min(this.width, this.height);
    uniforms.uAspect = [this.width / minSide, this.height / minSide];
  }

  public update(
    elapsedSeconds: number,
    currentHue: number,
    pointerParallaxX: number,
    pointerParallaxY: number,
    reduceMotion: boolean,
    constellationEdges?: Array<[number, number, number, number]>
  ): void {
    const uniforms = (this.skyShader.resources.skyUniforms as any).uniforms;
    uniforms.uTime = reduceMotion ? 0 : elapsedSeconds;
    const [r, g, b] = hslToRgbNormalized(currentHue, 95, 62);
    uniforms.uAccentColor = [r, g, b];
    uniforms.uParallax = reduceMotion ? [0, 0] : [pointerParallaxX, pointerParallaxY];

    // Render parallax stars
    const sg = this.starsGraphics;
    sg.clear();

    const accentHex = hslToHexNumber(currentHue, 90, 75);

    for (let i = 0; i < this.stars.length; i++) {
      const st = this.stars[i];
      const parallaxFactor = (st.layer + 1) * 14 * (reduceMotion ? 0 : 1);
      const sx = ((st.x * this.width + pointerParallaxX * parallaxFactor) % this.width + this.width) % this.width;
      const sy = ((st.y * this.height + pointerParallaxY * parallaxFactor) % this.height + this.height) % this.height;

      const twinkle = reduceMotion
        ? 1.0
        : 0.65 + 0.35 * Math.sin(elapsedSeconds * st.twinkleSpeed + st.phase);
      const alpha = st.baseAlpha * twinkle;
      const color = st.tintMix > 0.7 ? accentHex : 0xffffff;

      sg.circle(sx, sy, st.size).fill({ color, alpha });
    }

    // Draw unlocked sky constellations if any
    const cg = this.constellationsGraphics;
    cg.clear();
    if (constellationEdges && constellationEdges.length > 0) {
      for (let i = 0; i < constellationEdges.length; i++) {
        const [x1, y1, x2, y2] = constellationEdges[i];
        const px1 = x1 * this.width;
        const py1 = y1 * this.height;
        const px2 = x2 * this.width;
        const py2 = y2 * this.height;
        cg.moveTo(px1, py1).lineTo(px2, py2).stroke({ width: 1.2, color: accentHex, alpha: 0.22 });
        cg.circle(px1, py1, 2.5).fill({ color: 0xffffff, alpha: 0.45 });
        cg.circle(px2, py2, 2.5).fill({ color: 0xffffff, alpha: 0.45 });
      }
    }
  }
}
