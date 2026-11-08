import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

interface BenchmarkResult {
  scenario: string;
  tier: 'high' | 'medium' | 'low';
  avgFps: number;
  avgMs: number;
  p95Ms: number;
  workAvgMs: number;
  workP95Ms: number;
  drawCalls: number;
  particles: number;
}

async function runBenchmarks(): Promise<void> {
  const server = await createServer({
    server: { port: 4178, strictPort: false },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 4178;
  const baseUrl = `http://localhost:${port}`;

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  const results: BenchmarkResult[] = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="energy-value"]');

    // Populate all 16 orbits x 14 bodies
    await page.evaluate(() => {
      const app = (window as any).__CHISPA__;
      const D = app.sim.state.energy.constructor;
      app.sim.state.energy = new D('1e22');
      app.sim.state.totalEnergyProduced = new D('1e22');
      app.sim.state.currentEraIndex = 10;
      app.sim.state.resonanceCombo = 25;
      app.sim.state.resonanceMultiplier = 2.65;
      app.sim.state.resonanceTimer = -100;
      for (const id of Object.keys(app.sim.state.generators)) {
        app.sim.state.generators[id].owned = 14;
      }
      app.sim.recalculateRates();
      app.scene.snapToCurrentEraHue();
    });

    const scenarios: Array<{
      name: string;
      width: number;
      height: number;
      cpuRate: number;
    }> = [
      { name: 'Escritorio normal (1920×1080, CPU ×1)', width: 1920, height: 1080, cpuRate: 1 },
      { name: 'Escritorio CPU ×4 (1920×1080, CPU ×4)', width: 1920, height: 1080, cpuRate: 4 },
      { name: 'Emulación móvil (390×844, CPU ×4)', width: 390, height: 844, cpuRate: 4 },
    ];

    const tiers: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];

    for (const sc of scenarios) {
      await page.setViewportSize({ width: sc.width, height: sc.height });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: sc.cpuRate });

      for (const tier of tiers) {
        const res = await page.evaluate(async (t: 'high' | 'medium' | 'low') => {
          const app = (window as any).__CHISPA__;
          app.sim.state.qualityMode = t;
          app.scene.quality.setSetting(t);
          const profile = app.scene.quality.getProfile();
          app.scene.effectsLayer.setMaxParticles(profile.maxParticles);

          // Warmup 600ms and clear fpsSamples
          await new Promise((r) => setTimeout(r, 600));
          app.scene.quality.fpsSamples = [];

          // Sample over 1200ms
          await new Promise((r) => setTimeout(r, 1200));

          const samples: number[] = app.scene.quality.fpsSamples.slice();
          const avgFps =
            samples.length > 0
              ? samples.reduce((a: number, b: number) => a + b, 0) / samples.length
              : app.scene.quality.currentFps;
          const msSamples = samples.map((f: number) => 1000 / Math.max(1, f)).sort((a: number, b: number) => a - b);
          const avgMs = msSamples.length > 0 ? msSamples.reduce((a: number, b: number) => a + b, 0) / msSamples.length : 1000 / avgFps;
          const p95Ms = msSamples[Math.floor(msSamples.length * 0.95)] ?? avgMs;

          // Also measure active CPU+WebGL work per frame (unlocked from VSync) over 60 iterations
          const workTimes: number[] = [];
          for (let i = 0; i < 60; i++) {
            const t0 = performance.now();
            app.sim.tick(0.016);
            app.scene.update(0.016);
            app.scene.app.renderer.render(app.scene.app.stage);
            const t1 = performance.now();
            workTimes.push(t1 - t0);
          }
          workTimes.sort((a: number, b: number) => a - b);
          const workAvgMs = workTimes.reduce((a: number, b: number) => a + b, 0) / workTimes.length;
          const workP95Ms = workTimes[Math.floor(workTimes.length * 0.95)] ?? workAvgMs;

          return {
            avgFps: Number(avgFps.toFixed(2)),
            avgMs: Number(avgMs.toFixed(2)),
            p95Ms: Number(p95Ms.toFixed(2)),
            workAvgMs: Number(workAvgMs.toFixed(2)),
            workP95Ms: Number(workP95Ms.toFixed(2)),
            drawCalls: app.scene.getEstimatedDrawCalls(),
            particles: app.scene.effectsLayer.getActiveParticleCount(),
          };
        }, tier);

        results.push({
          scenario: sc.name,
          tier,
          ...res,
        });
        console.log(
          `[${sc.name}] [${tier.toUpperCase()}] -> ${res.avgFps} FPS (${res.avgMs} ms VSync) | Active Frame Work: ${res.workAvgMs} ms (P95: ${res.workP95Ms} ms) | Draw calls: ${res.drawCalls} | GPU Particles: ${res.particles}`
        );
      }
    }

    console.log('\nJSON_RESULTS:' + JSON.stringify(results));
  } finally {
    await browser.close();
    await server.close();
  }
}

runBenchmarks().catch((err) => {
  console.error(err);
  process.exit(1);
});
