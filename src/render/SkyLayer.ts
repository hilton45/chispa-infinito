import { Container, Graphics, Mesh, MeshGeometry, Shader } from 'pixi.js';
import { hslToRgbNormalized, hslToHexNumber } from '@/utils/Color';

const SKY_VERT = `
  precision highp float;
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
  precision highp float;
  in vec2 vUV;
  out vec4 finalColor;

  uniform float uTime;
  uniform vec3 uAccentColor;
  uniform vec2 uParallax;
  uniform vec2 uAspect;
  uniform float uEraIndex;
  uniform float uBigBangImplosion;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  vec2 hash2(vec2 p) {
    return vec2(hash(p), hash(p + vec2(37.2, 91.7)));
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

  // Progressive depth blur FBM: lower octaves for far layers, full 5 octaves for near filaments
  float fbmDepth(vec2 p, int octaves) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      if (i >= octaves) break;
      v += a * noise(p);
      p = rot * p * 2.02 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  // Procedural distant spiral & elliptical deep-field galaxies
  vec3 deepFieldGalaxies(vec2 uv, float time, vec3 eraCol) {
    vec2 grid = uv * 3.4;
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;

    vec2 rnd = hash2(cell);
    // Only ~40% of cells contain a noticeable distant galaxy
    if (rnd.x < 0.58) return vec3(0.0);

    vec2 offset = (rnd - 0.5) * 0.45;
    vec2 p = (local - offset) * 4.2;

    // Random orientation and elliptical inclination
    float angle = rnd.y * 6.2831853 + time * 0.015;
    float ca = cos(angle);
    float sa = sin(angle);
    p = mat2(ca, -sa, sa, ca) * p;
    p.y *= 1.35 + fract(rnd.x * 7.3) * 1.1;

    float r = length(p);
    if (r > 1.2) return vec3(0.0);

    float theta = atan(p.y, p.x);
    float spiral = cos(2.0 * theta - 4.8 * log(max(r, 0.04)) + time * 0.06);
    float armMask = smoothstep(-0.2, 0.85, spiral) * exp(-r * 3.1);
    float core = exp(-r * 7.5);

    vec3 galTint = mix(vec3(1.0, 0.86, 0.68), mix(eraCol, vec3(0.65, 0.84, 1.0), 0.5), fract(rnd.y * 5.1));
    return (vec3(1.0, 0.95, 0.85) * core * 0.32 + galTint * armMask * 0.18) * smoothstep(1.2, 0.15, r);
  }

  void main(void) {
    vec2 uv = (vUV - 0.5) * uAspect;

    // Big Bang implosion warps background space inward toward core
    float rCenter = length(uv);
    if (uBigBangImplosion > 0.001) {
      uv *= mix(1.0, 1.85 / (0.35 + rCenter), uBigBangImplosion * 0.65);
    }

    // Deep cosmic base tuned slightly by Era progression
    float eraNorm = clamp(uEraIndex / 15.0, 0.0, 1.0);
    vec3 deepBg = mix(vec3(0.014, 0.012, 0.045), vec3(0.025, 0.015, 0.065), eraNorm);
    vec3 midBg = mix(vec3(0.032, 0.026, 0.095), vec3(0.05, 0.032, 0.13), eraNorm);
    vec3 col = mix(deepBg, midBg, clamp(1.0 - rCenter * 0.62, 0.0, 1.0));

    // Distant procedural deep-field galaxies (farthest parallax plane)
    vec2 pGal = uv + uParallax * 0.012;
    col += deepFieldGalaxies(pGal, uTime, uAccentColor);

    // Layer 1 (Far, blurry 2-octave soft giant emission veil)
    vec2 p1 = uv * 1.15 + uParallax * 0.018 + vec2(uTime * 0.006, -uTime * 0.004);
    float neb1 = fbmDepth(p1, 2);
    float mask1 = smoothstep(0.30, 0.82, neb1);
    col += mix(uAccentColor, vec3(0.25, 0.18, 0.55), 0.5) * mask1 * 0.16;

    // Layer 2 (Mid-far, 3-octave domain-warped nebula clouds)
    vec2 p2 = uv * 2.1 + uParallax * 0.034 - vec2(uTime * 0.012, uTime * 0.009);
    float neb2 = fbmDepth(p2 + neb1 * 0.65, 3);
    float mask2 = smoothstep(0.36, 0.85, neb2);
    col += uAccentColor * mask2 * 0.21;

    // Layer 3 (Mid-near, 4-octave bright ionized ridges + Beer-Lambert dark dust lanes)
    vec2 p3 = uv * 3.4 + uParallax * 0.052 + vec2(uTime * 0.008, uTime * 0.016);
    float neb3 = fbmDepth(p3 - neb2 * 0.45, 4);
    float ridge3 = smoothstep(0.46, 0.90, neb3) * mask2;
    float darkDust = smoothstep(0.48, 0.78, fbmDepth(p3 * 1.45 + vec2(4.2, 1.9), 4));
    col *= exp(-darkDust * 0.55); // Dark absorption lanes
    col += mix(uAccentColor, vec3(0.92, 0.96, 1.0), 0.48) * ridge3 * 0.22;

    // Layer 4 (Near suspended cosmic micro-dust reactive to Era & Big Bang)
    vec2 p4 = uv * 5.8 + uParallax * 0.075 + vec2(-uTime * 0.019, uTime * 0.014);
    float dustShimmer = fbmDepth(p4, 5);
    float dustMask = smoothstep(0.60, 0.92, dustShimmer) * (0.5 + 0.5 * eraNorm + uBigBangImplosion * 1.2);
    col += mix(uAccentColor, vec3(1.0, 0.9, 0.75), 0.35) * dustMask * 0.14;

    // Subtle radial center glow behind the spark
    float centerGlow = exp(-rCenter * 2.1) * (0.20 + uBigBangImplosion * 0.35);
    col += uAccentColor * centerGlow;

    finalColor = vec4(col, 1.0);
  }
`;

// Blackbody stellar color temperature palette (3,000 K red-orange -> 25,000 K blue-white)
const STELLAR_BLACKBODY_COLORS = [
  0x9bbcff, // O-type ~25,000 K (deep blue-white)
  0xaad4ff, // B-type ~15,000 K (blue-white)
  0xdbe9ff, // A-type ~9,500 K (cool white)
  0xf8f7ff, // F-type ~7,000 K (pure white)
  0xfff4ea, // G-type ~5,800 K (warm solar white)
  0xffd2a1, // K-type ~4,500 K (golden amber)
  0xffa372, // M-type ~3,200 K (red-orange dwarf/giant)
];

interface StarData {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
  layer: number; // 0 = far, 1 = mid, 2 = near
  blackbodyHex: number;
  hasSpikes: boolean;
}

interface ShootingStar {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
}

export class SkyLayer {
  public container: Container;
  private quadMesh: Mesh<MeshGeometry, Shader>;
  private skyShader: Shader;
  private starsGraphics: Graphics;
  private constellationsGraphics: Graphics;
  private stars: StarData[] = [];
  private shootingStars: ShootingStar[] = [];
  private nextShootingStarTimer = 4.5;
  private lastElapsed = 0;
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
          uEraIndex: { value: 0, type: 'f32' },
          uBigBangImplosion: { value: 0, type: 'f32' },
        },
      },
    });

    this.quadMesh = new Mesh({ geometry, shader: this.skyShader });
    this.container.addChild(this.quadMesh);

    this.constellationsGraphics = new Graphics();
    this.container.addChild(this.constellationsGraphics);

    this.starsGraphics = new Graphics();
    this.container.addChild(this.starsGraphics);

    this.initStars(270);
    for (let i = 0; i < 3; i++) {
      this.shootingStars.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0.8,
        color: 0xffffff,
      });
    }
  }

  private initStars(count: number): void {
    this.stars = [];
    // Deterministic PRNG so starfield looks rich and balanced across runs
    let seed = 918273;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      const tempIdx = Math.floor(rand() * STELLAR_BLACKBODY_COLORS.length);
      const isBright = layer === 2 && i % 9 === 0;
      this.stars.push({
        x: rand(),
        y: rand(),
        size: isBright ? 2.6 + rand() * 0.9 : layer === 0 ? 0.95 : layer === 1 ? 1.45 : 2.1,
        baseAlpha: isBright ? 0.95 : layer === 0 ? 0.38 : layer === 1 ? 0.58 : 0.82,
        twinkleSpeed: 0.7 + rand() * 2.9,
        phase: rand() * Math.PI * 2,
        layer,
        blackbodyHex: STELLAR_BLACKBODY_COLORS[tempIdx],
        hasSpikes: isBright,
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

  private spawnShootingStar(accentHex: number): void {
    const slot = this.shootingStars.find((s) => !s.active);
    if (!slot) return;

    slot.active = true;
    slot.x = (0.1 + Math.random() * 0.8) * this.width;
    slot.y = (0.05 + Math.random() * 0.45) * this.height;
    const angle = (Math.PI * 0.15) + Math.random() * (Math.PI * 0.22) + (Math.random() < 0.5 ? 0 : Math.PI * 0.5);
    const speed = 520 + Math.random() * 380;
    slot.vx = Math.cos(angle) * speed;
    slot.vy = Math.abs(Math.sin(angle)) * speed * 0.75 + 140;
    slot.maxLife = 0.55 + Math.random() * 0.45;
    slot.life = slot.maxLife;
    slot.color = Math.random() < 0.5 ? 0xffffff : accentHex;
  }

  public update(
    elapsedSeconds: number,
    currentHue: number,
    pointerParallaxX: number,
    pointerParallaxY: number,
    reduceMotion: boolean,
    constellationEdges?: Array<[number, number, number, number]>,
    eraIndex = 0,
    bigBangImplosion = 0
  ): void {
    const dt = Math.max(0, Math.min(0.1, elapsedSeconds - this.lastElapsed));
    this.lastElapsed = elapsedSeconds;

    const uniforms = (this.skyShader.resources.skyUniforms as any).uniforms;
    uniforms.uTime = reduceMotion ? 0 : elapsedSeconds;
    const [r, g, b] = hslToRgbNormalized(currentHue, 95, 62);
    uniforms.uAccentColor = [r, g, b];
    uniforms.uParallax = reduceMotion ? [0, 0] : [pointerParallaxX, pointerParallaxY];
    uniforms.uEraIndex = eraIndex;
    uniforms.uBigBangImplosion = bigBangImplosion;

    const sg = this.starsGraphics;
    sg.clear();

    const accentHex = hslToHexNumber(currentHue, 90, 75);
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    for (let i = 0; i < this.stars.length; i++) {
      const st = this.stars[i];
      const parallaxFactor = (st.layer + 1) * 15 * (reduceMotion ? 0 : 1);
      let sx = ((st.x * this.width + pointerParallaxX * parallaxFactor) % this.width + this.width) % this.width;
      let sy = ((st.y * this.height + pointerParallaxY * parallaxFactor) % this.height + this.height) % this.height;

      // Implode stars slightly toward center during Big Bang
      if (bigBangImplosion > 0.001) {
        sx += (cx - sx) * bigBangImplosion * 0.65;
        sy += (cy - sy) * bigBangImplosion * 0.65;
      }

      const twinkle = reduceMotion
        ? 1.0
        : 0.68 + 0.32 * Math.sin(elapsedSeconds * st.twinkleSpeed + st.phase);
      const alpha = st.baseAlpha * twinkle;

      // Soft outer halo for bright stars
      if (st.hasSpikes) {
        sg.circle(sx, sy, st.size * 2.6).fill({ color: st.blackbodyHex, alpha: alpha * 0.22 });
        const spikeLen = st.size * (3.8 + 0.9 * twinkle);
        sg.moveTo(sx - spikeLen, sy).lineTo(sx + spikeLen, sy).stroke({ width: 1.1, color: st.blackbodyHex, alpha: alpha * 0.65 });
        sg.moveTo(sx, sy - spikeLen).lineTo(sx, sy + spikeLen).stroke({ width: 1.1, color: st.blackbodyHex, alpha: alpha * 0.65 });
        const diagLen = spikeLen * 0.52;
        sg.moveTo(sx - diagLen, sy - diagLen).lineTo(sx + diagLen, sy + diagLen).stroke({ width: 0.8, color: 0xffffff, alpha: alpha * 0.35 });
        sg.moveTo(sx - diagLen, sy + diagLen).lineTo(sx + diagLen, sy - diagLen).stroke({ width: 0.8, color: 0xffffff, alpha: alpha * 0.35 });
      }

      sg.circle(sx, sy, st.size).fill({ color: st.blackbodyHex, alpha });
    }

    // Occasional shooting stars (meteors) in the background sky
    if (!reduceMotion) {
      this.nextShootingStarTimer -= dt;
      if (this.nextShootingStarTimer <= 0) {
        this.nextShootingStarTimer = 5.5 + Math.random() * 8.5;
        this.spawnShootingStar(accentHex);
      }

      for (let i = 0; i < this.shootingStars.length; i++) {
        const ms = this.shootingStars[i];
        if (!ms.active) continue;
        ms.life -= dt;
        if (ms.life <= 0) {
          ms.active = false;
          continue;
        }
        ms.x += ms.vx * dt;
        ms.y += ms.vy * dt;
        const p = ms.life / ms.maxLife;
        const tailAlpha = Math.sin(p * Math.PI) * 0.85;
        const tailX = ms.x - ms.vx * 0.085;
        const tailY = ms.y - ms.vy * 0.085;
        sg.moveTo(tailX, tailY).lineTo(ms.x, ms.y).stroke({ width: 1.8, color: ms.color, alpha: tailAlpha });
        sg.circle(ms.x, ms.y, 2.2).fill({ color: 0xffffff, alpha: tailAlpha });
      }
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
        cg.moveTo(px1, py1).lineTo(px2, py2).stroke({ width: 1.3, color: accentHex, alpha: 0.26 });
        cg.circle(px1, py1, 2.6).fill({ color: 0xffffff, alpha: 0.52 });
        cg.circle(px2, py2, 2.6).fill({ color: 0xffffff, alpha: 0.52 });
      }
    }
  }
}
