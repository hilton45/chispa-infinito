import { Container, Geometry, Graphics, Mesh, Shader } from 'pixi.js';
import { CometDefinition, pickRandomComet } from '@/data/comets';
import { hslToRgbNormalized } from '@/utils/Color';

const MAX_GPU_PARTICLES = 50000;
const AMBIENT_GPU_PARTICLES = 44000;
const BURST_RING_SIZE = MAX_GPU_PARTICLES - AMBIENT_GPU_PARTICLES; // 6000 transient burst slots

const GPU_PARTICLES_VERT = `
  precision highp float;

  in vec4 aSpawnData; // mode 0: (orbitRadiusRatio, baseAngle, angularSpeed, tiltAngle) | mode 1: (spawnX, spawnY, vx, vy)
  in vec4 aTiming;    // mode 0: (particleIndex, size, seed, 0.0)                      | mode 1: (spawnTime, maxLife, size, 1.0)
  in vec4 aColor;     // (r, g, b, baseAlpha)

  out vec4 vColor;

  uniform mat3 uProjectionMatrix;
  uniform mat3 uWorldTransformMatrix;
  uniform mat3 uTransformMatrix;

  uniform float uTime;
  uniform float uMaxParticles;
  uniform vec2 uCenter;
  uniform float uMinSide;
  uniform vec3 uEraAccent;
  uniform float uImplosion;
  uniform float uReduceMotion;

  void main(void) {
    float isBurst = aTiming.w;

    if (isBurst < 0.5) {
      // Mode 0: Permanent analytical orbital & cosmic dust particle on GPU
      float idx = aTiming.x;
      if (idx >= uMaxParticles) {
        gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
      }

      float rRatio = aSpawnData.x;
      float baseAngle = aSpawnData.y;
      float speed = aSpawnData.z;
      float tilt = aSpawnData.w;
      float size = aTiming.y;
      float seed = aTiming.z;

      float t = uReduceMotion > 0.5 ? 0.0 : uTime;
      float angle = baseAngle + speed * t * (1.0 + uImplosion * 4.5);
      float scale = 1.0 - uImplosion * 0.92;

      float rx = uMinSide * rRatio * scale;
      float ry = rx * (0.42 + 0.16 * sin(seed));
      // Analytical harmonic radial & vertical turbulence
      float radialWave = sin(t * 1.3 + seed * 3.7) * 6.0 * scale;
      float lx = cos(angle) * (rx + radialWave);
      float ly = sin(angle) * (ry + radialWave * 0.6);

      float ct = cos(tilt);
      float st = sin(tilt);
      vec2 worldPos = uCenter + vec2(lx * ct - ly * st, lx * st + ly * ct);

      float depthZ = sin(angle);
      float twinkle = 0.65 + 0.35 * sin(t * 2.8 + seed * 5.1);
      float alpha = aColor.a * (0.55 + 0.45 * depthZ) * twinkle;

      vec3 col = mix(uEraAccent, aColor.rgb, 0.45);
      vColor = vec4(col, alpha);

      mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
      gl_Position = vec4((mvp * vec3(worldPos, 1.0)).xy, 0.0, 1.0);
      gl_PointSize = size * (0.85 + 0.30 * depthZ);
    } else {
      // Mode 1: Analytical GPU burst / comet trail particle
      float spawnTime = aTiming.x;
      float maxLife = max(0.05, aTiming.y);
      float age = uTime - spawnTime;

      if (age < 0.0 || age >= maxLife) {
        gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec4(0.0);
        return;
      }

      float lifeRatio = age / maxLife;
      // Analytical drag integration: x(t) = x0 + v0 * (1 - exp(-k * t)) / k
      const float dragK = 2.6;
      float travel = (1.0 - exp(-dragK * age)) / dragK;
      vec2 worldPos = aSpawnData.xy + aSpawnData.zw * travel;

      float fade = 1.0 - lifeRatio;
      vColor = vec4(aColor.rgb * (1.2 + fade * 0.6), aColor.a * fade * fade);

      mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
      gl_Position = vec4((mvp * vec3(worldPos, 1.0)).xy, 0.0, 1.0);
      gl_PointSize = aTiming.z * (1.1 - lifeRatio * 0.5);
    }
  }
`;

const GPU_PARTICLES_FRAG = `
  precision highp float;

  in vec4 vColor;
  out vec4 finalColor;

  void main(void) {
    if (vColor.a <= 0.002) discard;
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d2 = dot(p, p);
    if (d2 > 1.0) discard;
    float falloff = exp(-d2 * 3.2);
    finalColor = vec4(vColor.rgb * falloff, vColor.a * falloff);
  }
`;

interface PooledShockwave {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: number;
  life: number;
  maxLife: number;
  lineWidth: number;
}

export interface ActiveFlyingComet {
  def: CometDefinition;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  trailTimer: number;
}

export class EffectsLayer {
  public container: Container;
  private gpuParticlesMesh: Mesh<Geometry, Shader>;
  private gpuShader: Shader;
  private graphics: Graphics;

  private spawnDataBuffer: Float32Array;
  private timingBuffer: Float32Array;
  private colorBuffer: Float32Array;
  private burstDirty = false;
  private burstCursor = 0;

  private shockwaves: PooledShockwave[] = [];
  public flyingComets: ActiveFlyingComet[] = [];

  private maxActiveParticles = 50000;
  private currentTime = 0;

  constructor() {
    this.container = new Container();

    this.spawnDataBuffer = new Float32Array(MAX_GPU_PARTICLES * 4);
    this.timingBuffer = new Float32Array(MAX_GPU_PARTICLES * 4);
    this.colorBuffer = new Float32Array(MAX_GPU_PARTICLES * 4);

    // Initialize permanent analytical GPU cosmic dust & orbital stream particles (slots 0 .. AMBIENT_GPU_PARTICLES - 1)
    for (let i = 0; i < AMBIENT_GPU_PARTICLES; i++) {
      const base4 = i * 4;
      // Distribute across inner core halo, 16 orbital belts, and deep cosmic field
      const u = Math.random();
      const rRatio = 0.11 + Math.pow(u, 0.85) * 0.48;
      const baseAngle = Math.random() * Math.PI * 2;
      const speed = (0.35 / Math.pow(0.2 + rRatio, 0.65)) * (i % 2 === 0 ? 1 : -1) * (0.7 + Math.random() * 0.6);
      const tilt = ((i * 29) % 180 - 90) * (Math.PI / 180) * 0.42;

      this.spawnDataBuffer[base4 + 0] = rRatio;
      this.spawnDataBuffer[base4 + 1] = baseAngle;
      this.spawnDataBuffer[base4 + 2] = speed;
      this.spawnDataBuffer[base4 + 3] = tilt;

      this.timingBuffer[base4 + 0] = i; // particleIndex for GPU budget culling
      this.timingBuffer[base4 + 1] = 1.2 + Math.random() * 1.9; // point size
      this.timingBuffer[base4 + 2] = Math.random() * 100.0; // seed
      this.timingBuffer[base4 + 3] = 0.0; // mode 0 (ambient orbital)

      const warmOrCool = Math.random();
      this.colorBuffer[base4 + 0] = warmOrCool > 0.3 ? 0.85 : 1.0;
      this.colorBuffer[base4 + 1] = warmOrCool > 0.3 ? 0.92 : 0.88;
      this.colorBuffer[base4 + 2] = warmOrCool > 0.3 ? 1.0 : 0.72;
      this.colorBuffer[base4 + 3] = 0.14 + Math.random() * 0.24;
    }

    // Initialize transient burst ring buffer slots as expired (spawnTime = -1000)
    for (let i = AMBIENT_GPU_PARTICLES; i < MAX_GPU_PARTICLES; i++) {
      const base4 = i * 4;
      this.timingBuffer[base4 + 0] = -1000.0;
      this.timingBuffer[base4 + 1] = 0.1;
      this.timingBuffer[base4 + 2] = 2.0;
      this.timingBuffer[base4 + 3] = 1.0; // mode 1 (burst)
    }

    const geometry = new Geometry({
      topology: 'point-list',
      attributes: {
        aSpawnData: {
          buffer: this.spawnDataBuffer,
          format: 'float32x4',
          stride: 4 * 4,
          offset: 0,
        },
        aTiming: {
          buffer: this.timingBuffer,
          format: 'float32x4',
          stride: 4 * 4,
          offset: 0,
        },
        aColor: {
          buffer: this.colorBuffer,
          format: 'float32x4',
          stride: 4 * 4,
          offset: 0,
        },
      },
    });

    this.gpuShader = Shader.from({
      gl: {
        vertex: GPU_PARTICLES_VERT,
        fragment: GPU_PARTICLES_FRAG,
      },
      resources: {
        gpuParticleUniforms: {
          uTime: { value: 0, type: 'f32' },
          uMaxParticles: { value: 50000, type: 'f32' },
          uCenter: { value: [690, 540], type: 'vec2<f32>' },
          uMinSide: { value: 1080, type: 'f32' },
          uEraAccent: { value: [0.22, 0.74, 0.97], type: 'vec3<f32>' },
          uImplosion: { value: 0, type: 'f32' },
          uReduceMotion: { value: 0, type: 'f32' },
        },
      },
    });

    this.gpuParticlesMesh = new Mesh({ geometry, shader: this.gpuShader });
    this.container.addChild(this.gpuParticlesMesh);

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Pre-allocate 32 shockwaves
    for (let i = 0; i < 32; i++) {
      this.shockwaves.push({
        active: false,
        x: 0,
        y: 0,
        radius: 10,
        maxRadius: 200,
        color: 0xffffff,
        life: 0,
        maxLife: 1,
        lineWidth: 3,
      });
    }
  }

  public setMaxParticles(limit: number): void {
    this.maxActiveParticles = Math.max(3000, Math.min(MAX_GPU_PARTICLES, limit));
  }

  public getActiveParticleCount(): number {
    return this.maxActiveParticles;
  }

  public spawnBurst(
    x: number,
    y: number,
    count: number,
    color: number,
    speed = 180,
    life = 0.75,
    size = 3.2
  ): void {
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;

    const actualCount = Math.min(count, 400);
    for (let i = 0; i < actualCount; i++) {
      const slot = AMBIENT_GPU_PARTICLES + (this.burstCursor % BURST_RING_SIZE);
      this.burstCursor = (this.burstCursor + 1) % BURST_RING_SIZE;
      const base4 = slot * 4;

      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.25 + Math.random() * 0.95);

      this.spawnDataBuffer[base4 + 0] = x;
      this.spawnDataBuffer[base4 + 1] = y;
      this.spawnDataBuffer[base4 + 2] = Math.cos(angle) * spd;
      this.spawnDataBuffer[base4 + 3] = Math.sin(angle) * spd;

      this.timingBuffer[base4 + 0] = this.currentTime;
      this.timingBuffer[base4 + 1] = life * (0.7 + Math.random() * 0.5);
      this.timingBuffer[base4 + 2] = size * (0.75 + Math.random() * 0.75);
      this.timingBuffer[base4 + 3] = 1.0;

      const isWhite = Math.random() < 0.32;
      this.colorBuffer[base4 + 0] = isWhite ? 1.0 : r;
      this.colorBuffer[base4 + 1] = isWhite ? 1.0 : g;
      this.colorBuffer[base4 + 2] = isWhite ? 1.0 : b;
      this.colorBuffer[base4 + 3] = 0.95;
    }

    this.burstDirty = true;
  }

  public spawnShockwave(
    x: number,
    y: number,
    maxRadius: number,
    color: number,
    duration = 0.65,
    lineWidth = 3.0
  ): void {
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) {
        sw.active = true;
        sw.x = x;
        sw.y = y;
        sw.radius = 12;
        sw.maxLife = duration;
        sw.maxRadius = maxRadius;
        sw.color = color;
        sw.life = 0;
        sw.lineWidth = lineWidth;
        return;
      }
    }
  }

  public spawnComet(width: number, height: number, customDef?: CometDefinition): ActiveFlyingComet {
    const def = customDef ?? pickRandomComet();
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -40 : width + 40;
    const startY = height * (0.15 + Math.random() * 0.55);
    const endX = fromLeft ? width + 40 : -40;
    const endY = height * (0.15 + Math.random() * 0.65);

    const duration = 9.0 + Math.random() * 3.0;
    const comet: ActiveFlyingComet = {
      def,
      x: startX,
      y: startY,
      vx: (endX - startX) / duration,
      vy: (endY - startY) / duration,
      life: 0,
      maxLife: duration,
      trailTimer: 0,
    };

    this.flyingComets.push(comet);
    return comet;
  }

  public tryCatchCometAt(px: number, py: number): CometDefinition | null {
    for (let i = this.flyingComets.length - 1; i >= 0; i--) {
      const c = this.flyingComets[i];
      const dx = px - c.x;
      const dy = py - c.y;
      if (dx * dx + dy * dy <= 54 * 54) {
        this.spawnBurst(c.x, c.y, 90, c.def.color, 280, 0.95, 4.2);
        this.spawnShockwave(c.x, c.y, 140, c.def.color, 0.65, 3.5);
        this.flyingComets.splice(i, 1);
        return c.def;
      }
    }
    return null;
  }

  public update(
    dt: number,
    autoCatchComets: boolean,
    onAutoCatch?: (def: CometDefinition, x: number, y: number) => void,
    centerX = 690,
    centerY = 540,
    minSide = 1080,
    currentHue = 205,
    implosionFactor = 0,
    reduceMotion = false
  ): void {
    this.currentTime += dt;

    // Upload GPU burst ring buffer only when new bursts were spawned (zero CPU loop over particles!)
    if (this.burstDirty) {
      this.burstDirty = false;
      this.gpuParticlesMesh.geometry.getBuffer('aSpawnData').update();
      this.gpuParticlesMesh.geometry.getBuffer('aTiming').update();
      this.gpuParticlesMesh.geometry.getBuffer('aColor').update();
    }

    const [ar, ag, ab] = hslToRgbNormalized(currentHue, 95, 65);
    const uniforms = (this.gpuShader.resources.gpuParticleUniforms as any).uniforms;
    uniforms.uTime = this.currentTime;
    uniforms.uMaxParticles = Math.min(AMBIENT_GPU_PARTICLES, this.maxActiveParticles);
    uniforms.uCenter = [centerX, centerY];
    uniforms.uMinSide = minSide;
    uniforms.uEraAccent = [ar, ag, ab];
    uniforms.uImplosion = implosionFactor;
    uniforms.uReduceMotion = reduceMotion ? 1.0 : 0.0;

    const g = this.graphics;
    g.clear();

    // 1. Update & draw shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;

      sw.life += dt;
      if (sw.life >= sw.maxLife) {
        sw.active = false;
        continue;
      }

      const t = sw.life / sw.maxLife;
      const easeOut = 1 - Math.pow(1 - t, 3);
      const r = 12 + (sw.maxRadius - 12) * easeOut;
      const alpha = (1 - t) * 0.85;

      g.circle(sw.x, sw.y, r).stroke({
        width: sw.lineWidth * (1 - t * 0.5),
        color: sw.color,
        alpha,
      });
    }

    // 2. Update & draw flying comets (with GPU particle trails & lens flare spikes)
    for (let i = this.flyingComets.length - 1; i >= 0; i--) {
      const c = this.flyingComets[i];
      c.life += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.trailTimer += dt;

      if (c.trailTimer >= 0.02) {
        c.trailTimer = 0;
        this.spawnBurst(c.x, c.y, 6, c.def.color, 48, 0.65, 3.4);
      }

      if (autoCatchComets && c.life >= c.maxLife * 0.65) {
        this.spawnBurst(c.x, c.y, 85, c.def.color, 260, 0.9, 4.0);
        this.spawnShockwave(c.x, c.y, 130, c.def.color, 0.6, 3.2);
        const caughtDef = c.def;
        const cx = c.x;
        const cy = c.y;
        this.flyingComets.splice(i, 1);
        onAutoCatch?.(caughtDef, cx, cy);
        continue;
      }

      if (c.life >= c.maxLife) {
        this.flyingComets.splice(i, 1);
        continue;
      }

      // Draw comet glowing aura, head, and anamorphic lens flare cross
      g.circle(c.x, c.y, 26).fill({ color: c.def.color, alpha: 0.24 });
      g.circle(c.x, c.y, 13).fill({ color: c.def.color, alpha: 0.72 });
      g.circle(c.x, c.y, 6.2).fill({ color: 0xffffff, alpha: 1.0 });

      const spikeH = 34 + 6 * Math.sin(c.life * 14);
      const spikeV = 22 + 4 * Math.cos(c.life * 14);
      g.moveTo(c.x - spikeH, c.y).lineTo(c.x + spikeH, c.y).stroke({ width: 2.0, color: 0xffffff, alpha: 0.88 });
      g.moveTo(c.x, c.y - spikeV).lineTo(c.x, c.y + spikeV).stroke({ width: 1.8, color: 0xffffff, alpha: 0.82 });
    }
  }
}
