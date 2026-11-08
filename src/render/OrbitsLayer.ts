import { Container, Graphics } from 'pixi.js';
import { GENERATORS } from '@/data/generators';
import { hslToHexNumber } from '@/utils/Color';

const MAX_VISIBLE_PER_TYPE = 14;

interface OrbitalBodyInstance {
  genIndex: number; // 1 to 16
  angle: number;
  speed: number;
  birthScale: number; // animates 0 -> 1 on spawn
  seed: number;
}

interface OrbitTrack {
  genId: string;
  genIndex: number; // 1 to 16
  rxRatio: number;
  ryRatio: number;
  tiltAngle: number;
  baseSpeed: number;
  ownedCount: number;
  bodies: OrbitalBodyInstance[];
}

export class OrbitsLayer {
  public backContainer: Container;
  public frontContainer: Container;
  private backGraphics: Graphics;
  private frontGraphics: Graphics;
  private tracks: OrbitTrack[] = [];

  // Screen position of primary Black Hole (for gravitational lensing shader)
  public blackHoleScreenPos: { active: boolean; x: number; y: number } = {
    active: false,
    x: 0.5,
    y: 0.5,
  };

  constructor() {
    this.backContainer = new Container();
    this.frontContainer = new Container();

    this.backGraphics = new Graphics();
    this.frontGraphics = new Graphics();

    this.backContainer.addChild(this.backGraphics);
    this.frontContainer.addChild(this.frontGraphics);

    this.initTracks();
  }

  private initTracks(): void {
    this.tracks = GENERATORS.map((gen, idx) => {
      // Spread 16 orbits radially from inner (0.16 of minSide) to outer (0.48 of minSide)
      const t = idx / Math.max(1, GENERATORS.length - 1);
      const rxRatio = 0.16 + t * 0.33;
      const ryRatio = rxRatio * (0.38 + 0.14 * Math.sin(idx * 1.7));
      const tiltAngle = ((idx * 37) % 180 - 90) * (Math.PI / 180) * 0.45;
      const baseSpeed = (0.75 / Math.pow(1 + idx * 0.35, 0.65)) * (idx % 2 === 0 ? 1 : -1);

      return {
        genId: gen.id,
        genIndex: gen.index,
        rxRatio,
        ryRatio,
        tiltAngle,
        baseSpeed,
        ownedCount: 0,
        bodies: [],
      };
    });
  }

  /**
   * Synchronize owned counts from GameState and spawn new bodies with birth animation.
   */
  public syncWithState(generatorsState: Record<string, { owned: number }>): {
    newlySpawnedScreenCoords: Array<{ x: number; y: number; genIndex: number }>;
  } {
    const newlySpawnedScreenCoords: Array<{ x: number; y: number; genIndex: number }> = [];

    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      const owned = generatorsState[track.genId]?.owned ?? 0;
      track.ownedCount = owned;

      const targetVisible = Math.min(MAX_VISIBLE_PER_TYPE, owned);
      while (track.bodies.length < targetVisible) {
        const idx = track.bodies.length;
        const angle = (idx / MAX_VISIBLE_PER_TYPE) * Math.PI * 2 + i * 0.5;
        track.bodies.push({
          genIndex: track.genIndex,
          angle,
          speed: track.baseSpeed * (0.92 + (idx % 5) * 0.04),
          birthScale: 0.05,
          seed: idx * 17.3 + track.genIndex * 31.7,
        });
        newlySpawnedScreenCoords.push({ x: 0, y: 0, genIndex: track.genIndex });
      }
      if (track.bodies.length > targetVisible) {
        track.bodies.length = targetVisible;
      }
    }

    return { newlySpawnedScreenCoords };
  }

  public update(
    dt: number,
    elapsedSeconds: number,
    centerX: number,
    centerY: number,
    minSceneSide: number,
    currentHue: number,
    implosionFactor: number, // 0 normal, 0..1 during Big Bang implosion
    reduceMotion: boolean
  ): void {
    const bg = this.backGraphics;
    const fg = this.frontGraphics;
    bg.clear();
    fg.clear();

    this.blackHoleScreenPos.active = false;
    const accentColor = hslToHexNumber(currentHue, 90, 65);
    const implosionScale = 1.0 - implosionFactor * 0.92;

    for (let tIdx = 0; tIdx < this.tracks.length; tIdx++) {
      const track = this.tracks[tIdx];
      if (track.ownedCount <= 0) continue;

      const rx = minSceneSide * track.rxRatio * implosionScale;
      const ry = minSceneSide * track.ryRatio * implosionScale;
      const cosTilt = Math.cos(track.tiltAngle);
      const sinTilt = Math.sin(track.tiltAngle);

      // Extra halo density for units beyond 14
      const overflowCount = Math.max(0, track.ownedCount - MAX_VISIBLE_PER_TYPE);
      const haloAlpha = Math.min(0.38, 0.08 + Math.log10(1 + overflowCount) * 0.09);
      const haloWidth = 1.0 + Math.min(3.5, Math.log10(1 + overflowCount) * 1.2);

      // Draw back half of elliptical orbit ring (theta from PI to 2*PI)
      this.drawOrbitArc(bg, centerX, centerY, rx, ry, cosTilt, sinTilt, Math.PI, Math.PI * 2, accentColor, haloAlpha * 0.65, haloWidth);
      // Draw front half of elliptical orbit ring (theta from 0 to PI)
      this.drawOrbitArc(fg, centerX, centerY, rx, ry, cosTilt, sinTilt, 0, Math.PI, accentColor, haloAlpha, haloWidth);

      // Update and draw each body on this orbit
      for (let bIdx = 0; bIdx < track.bodies.length; bIdx++) {
        const body = track.bodies[bIdx];
        if (!reduceMotion) {
          body.angle += body.speed * dt * (1 + implosionFactor * 5.0);
        }
        if (body.birthScale < 1.0) {
          body.birthScale = Math.min(1.0, body.birthScale + dt * 3.5);
        }

        const localX = Math.cos(body.angle) * rx;
        const localY = Math.sin(body.angle) * ry;
        const depthZ = Math.sin(body.angle); // -1 (far back) to +1 (near front)

        const wx = centerX + (localX * cosTilt - localY * sinTilt);
        const wy = centerY + (localX * sinTilt + localY * cosTilt);

        // 3D depth scale & brightness
        const depthScale = (0.82 + 0.24 * depthZ) * body.birthScale * implosionScale;
        const depthAlpha = 0.68 + 0.32 * depthZ;
        const targetG = depthZ < 0 ? bg : fg;

        // Track first Black Hole (genIndex === 7) for gravitational lens filter
        if (track.genIndex === 7 && bIdx === 0) {
          this.blackHoleScreenPos.active = true;
          this.blackHoleScreenPos.x = wx;
          this.blackHoleScreenPos.y = wy;
        }

        this.drawOrbitalBody(
          targetG,
          track.genIndex,
          wx,
          wy,
          depthScale,
          depthAlpha,
          elapsedSeconds,
          currentHue,
          body
        );
      }
    }
  }

  private drawOrbitArc(
    g: Graphics,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    cosT: number,
    sinT: number,
    startA: number,
    endA: number,
    color: number,
    alpha: number,
    width: number
  ): void {
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const a = startA + (i / steps) * (endA - startA);
      const lx = Math.cos(a) * rx;
      const ly = Math.sin(a) * ry;
      const x = cx + (lx * cosT - ly * sinT);
      const y = cy + (lx * sinT + ly * cosT);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke({ width, color, alpha });
  }

  private drawOrbitalBody(
    g: Graphics,
    genIndex: number,
    x: number,
    y: number,
    scale: number,
    alpha: number,
    t: number,
    eraHue: number,
    body: OrbitalBodyInstance
  ): void {
    const s = Math.max(0.2, scale);
    const seed = body.seed;

    switch (genIndex) {
      case 1: {
        // 1. Átomo: core + electron with fading trail
        const r = 4.5 * s;
        g.circle(x, y, r * 1.8).fill({ color: 0x38bdf8, alpha: 0.22 * alpha });
        g.circle(x, y, r * 0.75).fill({ color: 0xffffff, alpha: 0.95 * alpha });
        const eAngle = t * 5.5 + seed;
        const er = 9.5 * s;
        for (let k = 0; k < 6; k++) {
          const ka = eAngle - k * 0.25;
          const ex = x + Math.cos(ka) * er;
          const ey = y + Math.sin(ka) * er * 0.6;
          g.circle(ex, ey, (1.8 - k * 0.22) * s).fill({
            color: 0x7dd3fc,
            alpha: (0.85 - k * 0.13) * alpha,
          });
        }
        break;
      }

      case 2: {
        // 2. Nube de gas: 5 translucent additive blobs
        const baseColor = hslToHexNumber((eraHue + 35) % 360, 88, 66);
        for (let k = 0; k < 5; k++) {
          const ka = t * 0.6 + seed + k * 1.25;
          const dist = (3 + (k % 3) * 2.5) * s;
          const bx = x + Math.cos(ka) * dist;
          const by = y + Math.sin(ka) * dist;
          const br = (5.5 + (k % 2) * 2.5) * s;
          g.circle(bx, by, br).fill({ color: baseColor, alpha: 0.25 * alpha });
        }
        g.circle(x, y, 3.2 * s).fill({ color: 0xffffff, alpha: 0.55 * alpha });
        break;
      }

      case 3: {
        // 3. Protoestrella: warm accretion disk + bipolar jets + flashes
        const jetLen = 15 * s;
        const jetAngle = seed * 0.4;
        const jx = Math.cos(jetAngle) * jetLen;
        const jy = Math.sin(jetAngle) * jetLen;
        g.moveTo(x - jx, y - jy)
          .lineTo(x + jx, y + jy)
          .stroke({ width: 2.2 * s, color: 0xfde047, alpha: 0.42 * alpha });
        g.circle(x, y, 7.5 * s).fill({ color: 0xf97316, alpha: 0.35 * alpha });
        g.circle(x, y, 4.2 * s).fill({ color: 0xffedd5, alpha: 0.95 * alpha });
        break;
      }

      case 4: {
        // 4. Estrella enana: sphere with corona + granulation glow
        const pulse = 1 + 0.08 * Math.sin(t * 3.2 + seed);
        g.circle(x, y, 10.5 * s * pulse).fill({ color: 0xfbbf24, alpha: 0.28 * alpha });
        g.circle(x, y, 6.8 * s).fill({ color: 0xf59e0b, alpha: 0.85 * alpha });
        g.circle(x, y, 4.6 * s).fill({ color: 0xfef3c7, alpha: 0.98 * alpha });
        break;
      }

      case 5: {
        // 5. Púlsar: tiny core + 2 opposite fast rotating conical beams
        const beamAngle = t * 8.5 + seed;
        const beamLen = 20 * s;
        const bx = Math.cos(beamAngle) * beamLen;
        const by = Math.sin(beamAngle) * beamLen;
        g.moveTo(x - bx, y - by)
          .lineTo(x + bx, y + by)
          .stroke({ width: 3.0 * s, color: 0x22d3ee, alpha: 0.65 * alpha });
        g.circle(x, y, 7 * s).fill({ color: 0x06b6d4, alpha: 0.32 * alpha });
        g.circle(x, y, 3.2 * s).fill({ color: 0xffffff, alpha: 1.0 * alpha });
        break;
      }

      case 6: {
        // 6. Nebulosa: multi-layer colored cloud
        const c1 = hslToHexNumber(eraHue, 95, 62);
        const c2 = hslToHexNumber((eraHue + 60) % 360, 92, 68);
        g.circle(x - 3 * s, y - 2 * s, 11 * s).fill({ color: c1, alpha: 0.26 * alpha });
        g.circle(x + 4 * s, y + 2 * s, 9.5 * s).fill({ color: c2, alpha: 0.28 * alpha });
        g.circle(x, y, 5.5 * s).fill({ color: 0xffffff, alpha: 0.45 * alpha });
        break;
      }

      case 7: {
        // 7. Agujero negro: accretion disk + bright photon ring + black core
        g.ellipse(x, y, 14 * s, 6.5 * s).fill({ color: 0xf97316, alpha: 0.42 * alpha });
        // Doppler beaming on left side
        g.circle(x - 6 * s, y, 4.5 * s).fill({ color: 0xfef08a, alpha: 0.55 * alpha });
        // Photon ring
        g.circle(x, y, 6.4 * s).stroke({ width: 1.8 * s, color: 0xfde047, alpha: 0.95 * alpha });
        // Event horizon shadow
        g.circle(x, y, 5.5 * s).fill({ color: 0x03020a, alpha: 0.98 });
        break;
      }

      case 8: {
        // 8. Galaxia: rotating logarithmic spiral arms
        const arms = 3;
        const rot = t * 1.4 + seed;
        const galColor = hslToHexNumber((eraHue + 20) % 360, 90, 72);
        for (let a = 0; a < arms; a++) {
          const baseA = rot + (a * Math.PI * 2) / arms;
          for (let p = 1; p <= 6; p++) {
            const rad = p * 2.3 * s;
            const theta = baseA + p * 0.42;
            const px = x + Math.cos(theta) * rad;
            const py = y + Math.sin(theta) * rad * 0.65;
            g.circle(px, py, (2.2 - p * 0.2) * s).fill({
              color: galColor,
              alpha: (0.85 - p * 0.1) * alpha,
            });
          }
        }
        g.circle(x, y, 4.2 * s).fill({ color: 0xffffff, alpha: 0.95 * alpha });
        break;
      }

      case 9: {
        // 9. Cúmulo galáctico: swarm of points + shared halo
        g.circle(x, y, 13 * s).fill({ color: 0x818cf8, alpha: 0.18 * alpha });
        for (let k = 0; k < 8; k++) {
          const ka = seed + k * 2.1 + Math.sin(t * 0.9 + k) * 0.5;
          const kd = (2.5 + (k % 4) * 2.6) * s;
          const px = x + Math.cos(ka) * kd;
          const py = y + Math.sin(ka) * kd;
          g.circle(px, py, 1.9 * s).fill({ color: 0xe0e7ff, alpha: 0.85 * alpha });
        }
        break;
      }

      case 10: {
        // 10. Universo: cosmic filament web sphere
        const r = 12 * s;
        g.circle(x, y, r).stroke({ width: 1.4 * s, color: 0x38bdf8, alpha: 0.55 * alpha });
        for (let k = 0; k < 5; k++) {
          const a1 = t * 0.5 + seed + k * 1.25;
          const a2 = a1 + 2.2;
          g.moveTo(x + Math.cos(a1) * r * 0.85, y + Math.sin(a1) * r * 0.85)
            .lineTo(x + Math.cos(a2) * r * 0.85, y + Math.sin(a2) * r * 0.85)
            .stroke({ width: 1.1 * s, color: 0xbae6fd, alpha: 0.5 * alpha });
        }
        g.circle(x, y, 3.8 * s).fill({ color: 0xffffff, alpha: 0.9 * alpha });
        break;
      }

      case 11: {
        // 11. Cuásar: blinding core + relativistic jet with pulses
        const jAngle = seed + t * 0.2;
        const jLen = 24 * s;
        const jx = Math.cos(jAngle) * jLen;
        const jy = Math.sin(jAngle) * jLen;
        g.moveTo(x - jx, y - jy)
          .lineTo(x + jx, y + jy)
          .stroke({ width: 3.4 * s, color: 0xa855f7, alpha: 0.65 * alpha });
        g.circle(x, y, 9 * s).fill({ color: 0xe879f9, alpha: 0.45 * alpha });
        g.circle(x, y, 4.8 * s).fill({ color: 0xffffff, alpha: 1.0 * alpha });
        break;
      }

      case 12: {
        // 12. Brana: undulating sinusoidal ribbon grid
        const w = 12 * s;
        for (let k = -2; k <= 2; k++) {
          const off = k * 3 * s;
          const wave = Math.sin(t * 3 + k + seed) * 3 * s;
          g.moveTo(x - w, y + off + wave)
            .lineTo(x + w, y + off - wave)
            .stroke({ width: 1.3 * s, color: 0x2dd4bf, alpha: 0.65 * alpha });
        }
        break;
      }

      case 13: {
        // 13. Cuerda cósmica: vibrating harmonic standing wave
        const len = 15 * s;
        const amp = Math.sin(t * 8 + seed) * 5 * s;
        g.moveTo(x - len, y)
          .quadraticCurveTo(x, y + amp, x + len, y)
          .stroke({ width: 2.4 * s, color: 0xf43f5e, alpha: 0.88 * alpha });
        g.circle(x, y, 3 * s).fill({ color: 0xffffff, alpha: 0.9 * alpha });
        break;
      }

      case 14: {
        // 14. Burbuja de multiverso: iridescent soap-bubble sphere
        const iridHue = (eraHue + t * 60 + seed * 20) % 360;
        const iridColor = hslToHexNumber(iridHue, 100, 70);
        g.circle(x, y, 10.5 * s).fill({ color: iridColor, alpha: 0.2 * alpha });
        g.circle(x, y, 10.5 * s).stroke({ width: 2.0 * s, color: iridColor, alpha: 0.85 * alpha });
        g.circle(x - 3.5 * s, y - 3.5 * s, 2.5 * s).fill({ color: 0xffffff, alpha: 0.85 * alpha });
        break;
      }

      case 15: {
        // 15. Mente cósmica: neural network with traveling pulses
        const r = 11 * s;
        for (let k = 0; k < 5; k++) {
          const a = seed + (k * Math.PI * 2) / 5;
          const nx = x + Math.cos(a) * r;
          const ny = y + Math.sin(a) * r;
          g.moveTo(x, y).lineTo(nx, ny).stroke({ width: 1.3 * s, color: 0x34d399, alpha: 0.55 * alpha });
          g.circle(nx, ny, 2.2 * s).fill({ color: 0xa7f3d0, alpha: 0.9 * alpha });
        }
        g.circle(x, y, 4.2 * s).fill({ color: 0xffffff, alpha: 0.95 * alpha });
        break;
      }

      case 16:
      default: {
        // 16. Chispa original: golden recursive mini-core (2 levels)
        const pulse = 1 + 0.1 * Math.sin(t * 4 + seed);
        g.circle(x, y, 12 * s * pulse).fill({ color: 0xfbbf24, alpha: 0.35 * alpha });
        g.circle(x, y, 8 * s).stroke({ width: 1.8 * s, color: 0xfde047, alpha: 0.9 * alpha });
        g.circle(x, y, 4.5 * s).fill({ color: 0xffffff, alpha: 1.0 * alpha });
        // Inner recursive satellite
        const ia = t * 6 + seed;
        g.circle(x + Math.cos(ia) * 7.5 * s, y + Math.sin(ia) * 7.5 * s, 2.0 * s).fill({
          color: 0xfef08a,
          alpha: 0.95 * alpha,
        });
        break;
      }
    }
  }
}
