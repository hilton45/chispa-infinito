import { Application, Container } from 'pixi.js';
import { Simulation } from '@/core/Simulation';
import { ERAS } from '@/data/eras';
import { MAX_RESONANCE_COMBO } from '@/core/Economy';
import { lerpHue, hslToHexNumber } from '@/utils/Color';
import { SkyLayer } from './SkyLayer';
import { OrbitsLayer } from './OrbitsLayer';
import { SparkCore } from './SparkCore';
import { EffectsLayer } from './EffectsLayer';
import { PostProcessController } from './PostProcess';
import { QualityGovernor } from './QualityGovernor';
import { CometDefinition } from '@/data/comets';

export class SceneManager {
  public app: Application;
  public sceneRoot: Container;
  public worldContainer: Container;

  public skyLayer!: SkyLayer;
  public orbitsLayer!: OrbitsLayer;
  public sparkCore!: SparkCore;
  public effectsLayer!: EffectsLayer;
  public postProcess!: PostProcessController;
  public quality: QualityGovernor;

  private sim: Simulation;
  private elapsedSeconds = 0;

  // Era palette interpolation (3 seconds)
  private currentHue = 205;
  private startHue = 205;
  private targetHue = 205;
  private hueLerpTimer = 3.0;

  // Camera shake & zoom
  private shakeIntensity = 0;
  private cameraZoom = 1.0;
  private targetCameraZoom = 1.0;

  // Big Bang cinematic sequence
  private bigBangSequenceTimer = 0; // > 0 when playing Big Bang animation
  private bigBangImplosion = 0;
  private onBigBangCompleteCallback?: () => void;

  // Pointer parallax
  private pointerParallaxX = 0;
  private pointerParallaxY = 0;

  // Comet auto-spawner timer (50-110 s)
  private cometSpawnTimer = 0;
  private nextCometDelay = 55;

  // Callbacks to UI / Audio
  public onCoreClicked?: (x: number, y: number) => void;
  public onCometCaught?: (def: CometDefinition, x: number, y: number, description: string) => void;

  // Constellation edges drawn in sky
  public constellationEdges: Array<[number, number, number, number]> = [];

  constructor(sim: Simulation) {
    this.sim = sim;
    this.app = new Application();
    this.sceneRoot = new Container();
    this.worldContainer = new Container();
    this.quality = new QualityGovernor();
  }

  public async init(hostElement: HTMLElement): Promise<void> {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    await this.app.init({
      resizeTo: hostElement,
      backgroundColor: 0x05040f,
      antialias: true,
      resolution: dpr,
      autoDensity: true,
      preference: 'webgl',
    });

    hostElement.appendChild(this.app.canvas);

    this.skyLayer = new SkyLayer();
    this.orbitsLayer = new OrbitsLayer();
    this.sparkCore = new SparkCore();
    this.effectsLayer = new EffectsLayer();
    this.postProcess = new PostProcessController();

    this.sceneRoot.addChild(this.skyLayer.container);
    this.worldContainer.addChild(this.orbitsLayer.backContainer);
    this.worldContainer.addChild(this.sparkCore.container);
    this.worldContainer.addChild(this.orbitsLayer.frontContainer);
    this.worldContainer.addChild(this.effectsLayer.container);

    this.sceneRoot.addChild(this.worldContainer);
    this.sceneRoot.filters = [this.postProcess.filter];
    this.app.stage.addChild(this.sceneRoot);

    // Sync initial era hue
    const initialEra = ERAS[this.sim.state.currentEraIndex] ?? ERAS[0];
    this.currentHue = initialEra.hue;
    this.startHue = initialEra.hue;
    this.targetHue = initialEra.hue;

    this.setupInteractions();
    this.setupSimulationListeners();
    this.handleResize();

    window.addEventListener('resize', () => this.handleResize());
  }

  private getSceneCenter(): { cx: number; cy: number; minSide: number } {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    // On desktop (> 900px width), shift center slightly left so the right glass panel doesn't cover orbits
    const isDesktop = w > 900;
    const cx = isDesktop ? w * 0.36 : w * 0.5;
    const cy = isDesktop ? h * 0.5 : h * 0.36;
    const minSide = Math.min(isDesktop ? w * 0.72 : w * 0.92, isDesktop ? h : h * 0.56);
    return { cx, cy, minSide };
  }

  public snapToCurrentEraHue(): void {
    const targetEra = ERAS[this.sim.state.currentEraIndex] ?? ERAS[0];
    this.currentHue = targetEra.hue;
    this.startHue = targetEra.hue;
    this.targetHue = targetEra.hue;
    this.hueLerpTimer = 3.0;
    document.documentElement.style.setProperty('--era-hue', `${Math.round(this.currentHue)}`);
  }

  public handleResize(): void {
    if (!this.app.renderer) return;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.skyLayer.resize(w, h);
    const { cx, cy } = this.getSceneCenter();
    this.sparkCore.container.position.set(cx, cy);
  }

  private setupInteractions(): void {
    const canvas = this.app.canvas;

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      const ny = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
      this.pointerParallaxX = nx;
      this.pointerParallaxY = ny;
    });

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // 1. Check if user clicked on a flying Golden Comet first
      const caughtComet = this.effectsLayer.tryCatchCometAt(px, py);
      if (caughtComet) {
        const res = this.sim.catchComet({
          type: caughtComet.effectType,
          multiplier: caughtComet.multiplier,
          duration: caughtComet.duration,
          name: caughtComet.name,
        });
        this.postProcess.triggerChromaticPulse(0.004);
        this.onCometCaught?.(caughtComet, px, py, res.description);
        return;
      }

      // 2. Otherwise click the Spark Core
      this.triggerManualCoreClick(px, py);
    });
  }

  public triggerManualCoreClick(px?: number, py?: number): void {
    const { cx, cy } = this.getSceneCenter();
    const clickX = px ?? cx;
    const clickY = py ?? cy;

    this.sparkCore.triggerClickKick();
    const accentHex = hslToHexNumber(this.currentHue, 95, 68);
    this.effectsLayer.spawnBurst(clickX, clickY, 16, accentHex, 210, 0.65, 2.8);
    this.effectsLayer.spawnShockwave(cx, cy, this.sparkCore.currentRadius * 1.5, accentHex, 0.45, 2.2);

    this.onCoreClicked?.(clickX, clickY);
  }

  private setupSimulationListeners(): void {
    this.sim.addEventListener((event, data) => {
      const { cx, cy, minSide } = this.getSceneCenter();
      const accentHex = hslToHexNumber(this.currentHue, 95, 68);

      if (event === 'buy_generator') {
        this.effectsLayer.spawnShockwave(cx, cy, minSide * 0.35, accentHex, 0.6, 2.5);
        this.effectsLayer.spawnBurst(cx, cy, 20, accentHex, 160, 0.7, 2.5);
      } else if (event === 'milestone') {
        this.effectsLayer.spawnShockwave(cx, cy, minSide * 0.55, 0xfde047, 0.85, 4.0);
        this.effectsLayer.spawnBurst(cx, cy, 45, 0xfde047, 280, 0.95, 3.2);
        this.postProcess.triggerChromaticPulse(0.005);
        if (!this.quality.reduceMotion) {
          this.shakeIntensity = 6.0;
        }
      } else if (event === 'era_change') {
        const newEra = data.newEra;
        this.startHue = this.currentHue;
        this.targetHue = newEra.hue;
        this.hueLerpTimer = 0;
        this.targetCameraZoom = 1.04;
        setTimeout(() => {
          this.targetCameraZoom = 1.0;
        }, 1400);
        this.postProcess.triggerChromaticPulse(0.004);
      }
    });
  }

  /**
   * Play cinematic Big Bang implosion -> flash -> rebirth sequence.
   */
  public playBigBangCinematic(onComplete: () => void): void {
    this.bigBangSequenceTimer = 2.4;
    this.onBigBangCompleteCallback = onComplete;
  }

  public forceSpawnComet(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.effectsLayer.spawnComet(w, h);
    this.sim.state.totalCometsSpawned += 1;
  }

  public getRendererType(): string {
    const r = this.app.renderer as any;
    if (!r) return 'WebGL2';
    return r.name === 'webgpu' || r.type === 2 ? 'WebGPU' : 'WebGL2';
  }

  public getEstimatedDrawCalls(): number {
    // Sky quad + stars + constellations + back orbits + core shader + resonance ring + front orbits + effects + post-process passes
    const profile = this.quality.getProfile();
    const bloomPasses = profile.tier === 'high' ? 10 : profile.tier === 'medium' ? 6 : 0;
    return 8 + bloomPasses;
  }

  public update(dt: number): void {
    if (document.visibilityState === 'hidden') return;

    this.elapsedSeconds += dt;
    this.quality.update(dt);
    const profile = this.quality.getProfile();
    this.effectsLayer.setMaxParticles(profile.maxParticles);

    // 1. Era Hue 3-second smooth transition
    if (this.hueLerpTimer < 3.0) {
      this.hueLerpTimer = Math.min(3.0, this.hueLerpTimer + dt);
      const t = this.hueLerpTimer / 3.0;
      const smoothT = t * t * (3 - 2 * t);
      this.currentHue = lerpHue(this.startHue, this.targetHue, smoothT);
      // Sync CSS variable for UI accent color
      document.documentElement.style.setProperty('--era-hue', `${Math.round(this.currentHue)}`);
    } else {
      const targetEra = ERAS[this.sim.state.currentEraIndex] ?? ERAS[0];
      if (Math.abs(this.targetHue - targetEra.hue) > 0.5) {
        this.startHue = this.currentHue;
        this.targetHue = targetEra.hue;
        this.hueLerpTimer = 0;
      }
    }

    // 2. Big Bang Cinematic sequence handling
    if (this.bigBangSequenceTimer > 0) {
      this.bigBangSequenceTimer -= dt;
      if (this.bigBangSequenceTimer > 0.9) {
        // Implosion phase (2.4 -> 0.9)
        const p = 1 - (this.bigBangSequenceTimer - 0.9) / 1.5;
        this.bigBangImplosion = p * p;
        this.postProcess.triggerChromaticPulse(0.006 * p);
      } else if (this.bigBangSequenceTimer > 0) {
        // Explosion & Rebirth flash phase
        if (this.bigBangImplosion > 0) {
          this.bigBangImplosion = 0;
          this.postProcess.triggerFlash(1.0);
          this.postProcess.triggerChromaticPulse(0.008);
          const { cx, cy, minSide } = this.getSceneCenter();
          this.effectsLayer.spawnBurst(cx, cy, 120, 0xffffff, 420, 1.4, 3.8);
          this.effectsLayer.spawnShockwave(cx, cy, minSide * 0.85, 0xffffff, 1.2, 5.0);
          this.onBigBangCompleteCallback?.();
          this.onBigBangCompleteCallback = undefined;
        }
      } else {
        this.bigBangImplosion = 0;
      }
    }

    // 3. Comet automatic spawner (every 50-110s, faster with dm_comet_magnet)
    this.cometSpawnTimer += dt;
    const magnetFactor = this.sim.state.darkMatterUpgrades?.includes('dm_comet_magnet') ? 0.7 : 1.0;
    if (this.cometSpawnTimer >= this.nextCometDelay * magnetFactor) {
      this.cometSpawnTimer = 0;
      this.nextCometDelay = 50 + Math.random() * 60;
      this.forceSpawnComet();
    }

    const { cx, cy, minSide } = this.getSceneCenter();
    this.sparkCore.container.position.set(cx, cy);

    // 4. Camera micro-shake & zoom
    let offsetX = 0;
    let offsetY = 0;
    if (this.shakeIntensity > 0.1 && !this.quality.reduceMotion) {
      offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= 0.85;
    } else {
      this.shakeIntensity = 0;
    }

    this.cameraZoom += (this.targetCameraZoom - this.cameraZoom) * Math.min(1, dt * 4);
    this.worldContainer.position.set(offsetX, offsetY);

    // 5. Update Sky, Orbits, SparkCore, Effects, and PostProcess
    this.skyLayer.update(
      this.elapsedSeconds,
      this.currentHue,
      this.pointerParallaxX,
      this.pointerParallaxY,
      this.quality.reduceMotion,
      this.constellationEdges
    );

    this.orbitsLayer.syncWithState(this.sim.state.generators);
    this.orbitsLayer.update(
      dt,
      this.elapsedSeconds,
      cx,
      cy,
      minSide,
      this.currentHue,
      this.bigBangImplosion,
      this.quality.reduceMotion
    );

    const maxCombo = this.sim.state.darkMatterUpgrades?.includes('dm_resonance_ext')
      ? 50
      : MAX_RESONANCE_COMBO;

    this.sparkCore.update(
      this.elapsedSeconds,
      minSide,
      this.sim.state.totalEnergyProduced,
      this.currentHue,
      this.sim.state.currentEraIndex,
      this.sim.state.bigBangsTotal,
      this.sim.state.resonanceCombo,
      maxCombo,
      this.sim.state.selectedSkinId,
      this.quality.reduceMotion
    );

    // Track black hole gaze for secret achievement
    if (this.orbitsLayer.blackHoleScreenPos.active) {
      this.sim.state.blackHoleGazeSeconds += dt;
    }

    const autoComets = this.sim.state.darkMatterUpgrades?.includes('dm_auto_comets') ?? false;
    this.effectsLayer.update(dt, autoComets, (def, x, y) => {
      const res = this.sim.catchComet({
        type: def.effectType,
        multiplier: def.multiplier,
        duration: def.duration,
        name: def.name,
      });
      this.onCometCaught?.(def, x, y, res.description);
    });

    this.postProcess.update(
      dt,
      this.elapsedSeconds,
      profile,
      this.quality.reduceMotion,
      this.orbitsLayer.blackHoleScreenPos,
      this.app.screen.width,
      this.app.screen.height
    );
  }
}
