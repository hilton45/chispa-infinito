import { Container, Graphics } from 'pixi.js';
import { CometDefinition, pickRandomComet } from '@/data/comets';

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: number;
  life: number;
  maxLife: number;
  drag: number;
}

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
  private graphics: Graphics;
  private particles: PooledParticle[] = [];
  private shockwaves: PooledShockwave[] = [];
  public flyingComets: ActiveFlyingComet[] = [];

  private maxActiveParticles = 3000;
  private particleCursor = 0;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Pre-allocate 3000 particles (zero allocations in hot loop)
    for (let i = 0; i < 3000; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        color: 0xffffff,
        life: 0,
        maxLife: 1,
        drag: 0.96,
      });
    }

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
    this.maxActiveParticles = Math.max(100, Math.min(3000, limit));
  }

  public spawnBurst(
    x: number,
    y: number,
    count: number,
    color: number,
    speed = 180,
    life = 0.75,
    size = 2.6
  ): void {
    const actualCount = Math.min(count, Math.floor(this.maxActiveParticles * 0.15));
    for (let i = 0; i < actualCount; i++) {
      const idx = this.particleCursor % this.maxActiveParticles;
      this.particleCursor = (this.particleCursor + 1) % this.maxActiveParticles;

      const p = this.particles[idx];
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.25 + Math.random() * 0.95);

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.size = size * (0.65 + Math.random() * 0.7);
      p.color = Math.random() > 0.35 ? color : 0xffffff;
      p.life = 0;
      p.maxLife = life * (0.7 + Math.random() * 0.5);
      p.drag = 0.94;
    }
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
        sw.maxRadius = maxRadius;
        sw.color = color;
        sw.life = 0;
        sw.maxLife = duration;
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

  /**
   * Check if a pointer click at (px, py) hits any active comet.
   */
  public tryCatchCometAt(px: number, py: number): CometDefinition | null {
    for (let i = this.flyingComets.length - 1; i >= 0; i--) {
      const c = this.flyingComets[i];
      const dx = px - c.x;
      const dy = py - c.y;
      // Generous 54px hit radius for mobile and desktop ergonomics
      if (dx * dx + dy * dy <= 54 * 54) {
        this.spawnBurst(c.x, c.y, 48, c.def.color, 260, 0.9, 3.2);
        this.spawnShockwave(c.x, c.y, 130, c.def.color, 0.6, 3.5);
        this.flyingComets.splice(i, 1);
        return c.def;
      }
    }
    return null;
  }

  public update(
    dt: number,
    autoCatchComets: boolean,
    onAutoCatch?: (def: CometDefinition, x: number, y: number) => void
  ): void {
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

    // 2. Update & draw pooled particles
    for (let i = 0; i < this.maxActiveParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;

      const t = p.life / p.maxLife;
      const alpha = 1 - t;
      const radius = p.size * (1 - t * 0.4);

      g.circle(p.x, p.y, radius).fill({ color: p.color, alpha });
    }

    // 3. Update & draw flying comets
    for (let i = this.flyingComets.length - 1; i >= 0; i--) {
      const c = this.flyingComets[i];
      c.life += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.trailTimer += dt;

      if (c.trailTimer >= 0.03) {
        c.trailTimer = 0;
        this.spawnBurst(c.x, c.y, 2, c.def.color, 35, 0.55, 2.4);
      }

      // Auto-catch when comet reaches 65% across screen if unlocked
      if (autoCatchComets && c.life >= c.maxLife * 0.65) {
        this.spawnBurst(c.x, c.y, 42, c.def.color, 240, 0.85, 3.0);
        this.spawnShockwave(c.x, c.y, 120, c.def.color, 0.55, 3.0);
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

      // Draw comet glowing aura, head, and lens flare cross
      g.circle(c.x, c.y, 22).fill({ color: c.def.color, alpha: 0.22 });
      g.circle(c.x, c.y, 11).fill({ color: c.def.color, alpha: 0.65 });
      g.circle(c.x, c.y, 5.5).fill({ color: 0xffffff, alpha: 1.0 });

      // Lens flare spikes
      const spike = 24 + 4 * Math.sin(c.life * 12);
      g.moveTo(c.x - spike, c.y).lineTo(c.x + spike, c.y).stroke({ width: 1.8, color: 0xffffff, alpha: 0.8 });
      g.moveTo(c.x, c.y - spike).lineTo(c.x, c.y + spike).stroke({ width: 1.8, color: 0xffffff, alpha: 0.8 });
    }
  }
}
