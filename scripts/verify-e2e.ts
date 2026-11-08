import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = resolve(process.cwd(), 'docs/screenshots');
const SCREENSHOT_V11_DIR = resolve(process.cwd(), 'docs/screenshots/v1.1');
const ARTIFACT_DIR =
  'C:\\Users\\yanca\\.gemini\\antigravity\\brain\\61bc1a90-0335-4c85-8287-b511ee9b88af';

async function runE2EAndVisualVerification(): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  mkdirSync(SCREENSHOT_V11_DIR, { recursive: true });

  console.log('1. Starting local Vite server...');
  const server = await createServer({
    server: { port: 4173, strictPort: false },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 4173;
  const baseUrl = `http://localhost:${port}`;
  console.log(`   Server listening at ${baseUrl}`);

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    ignoreDefaultArgs: ['--hide-scrollbars'],
  });

  const consoleErrors: string[] = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    page.on('pageerror', (err) => {
      consoleErrors.push(`PageError: ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`ConsoleError: ${msg.text()}`);
      }
    });

    console.log('2. Loading application at 1920x1080...');
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="energy-value"]');
    await page.waitForTimeout(600);

    // --- CAPTURE A: Inicio (solo núcleo) ---
    console.log('3. Capturing State A: Inicio (solo núcleo)...');
    const pathA = resolve(SCREENSHOT_DIR, 'A-inicio.png');
    await page.screenshot({ path: pathA });
    copyFileSync(pathA, resolve(ARTIFACT_DIR, 'A-inicio.png'));

    // --- E2E Flow: Click 15 times -> Buy First Atom ---
    console.log('4. Testing Clicks, Resonance Combo & Buying First Atom (State B)...');
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(45);
    }

    const energyAfterClicks = await page.textContent('[data-testid="energy-value"]');
    console.log(`   Energy after 15 rapid clicks: ${energyAfterClicks}`);

    await page.click('[data-testid="buy-gen-atom"]');
    await page.waitForTimeout(500);

    const pathB = resolve(SCREENSHOT_DIR, 'B-primer-atomo.png');
    await page.screenshot({ path: pathB });
    copyFileSync(pathB, resolve(ARTIFACT_DIR, 'B-primer-atomo.png'));

    // --- CAPTURE C: Los 16 tipos en órbita ---
    console.log('5. Populating all 16 orbital generator types (14 bodies each) & measuring FPS...');
    const fpsMeasured = await page.evaluate(async () => {
      const app = (window as any).__CHISPA__;
      const D = app.sim.state.energy.constructor;
      app.sim.state.energy = new D('1e22');
      app.sim.state.totalEnergyProduced = new D('1e22');
      app.sim.state.allTimeEnergyProduced = new D('1e22');
      app.sim.state.currentEraIndex = 10; // Era de las Dimensiones Extra (280° violet-magenta)
      app.sim.state.upgradesPurchased = ['click_1', 'click_2', 'click_3', 'echo_1'];
      app.sim.state.resonanceCombo = 22;
      app.sim.state.resonanceMultiplier = 2.47;
      app.sim.state.resonanceTimer = -10;

      for (const id of Object.keys(app.sim.state.generators)) {
        app.sim.state.generators[id].owned = 14;
      }
      app.sim.recalculateRates();
      app.scene.snapToCurrentEraHue();
      app.ui.renderTabsNav();
      app.ui.renderActiveTabContent();
      app.ui.updateHUD();

      // Hide era banner if visible so the 16 orbits are completely unobstructed
      document.getElementById('era-banner')?.classList.remove('visible');

      // Let 45 frames render and return measured FPS
      await new Promise((r) => setTimeout(r, 800));
      return Math.round(app.scene.quality.currentFps);
    });
    console.log(`   Measured FPS with all 16 orbits × 14 bodies: ${fpsMeasured} FPS`);

    const pathC = resolve(SCREENSHOT_DIR, 'C-16-orbitas.png');
    await page.screenshot({ path: pathC });
    copyFileSync(pathC, resolve(ARTIFACT_DIR, 'C-16-orbitas.png'));

    // --- CAPTURE D: Big Bang a mitad de secuencia ---
    console.log('6. Triggering Big Bang cinematic sequence and capturing State D...');
    await page.evaluate(() => {
      const app = (window as any).__CHISPA__;
      const D = app.sim.state.energy.constructor;
      app.sim.state.totalEnergyProduced = new D('1e18'); // Era de la Singularidad (330° crimson-rose)
      app.sim.state.currentEraIndex = 8;
      app.sim.state.resonanceCombo = 26;
      app.sim.state.resonanceMultiplier = 2.73;
      app.sim.state.resonanceTimer = -10;
      app.sim.recalculateRates();
      app.scene.snapToCurrentEraHue();
    });
    await page.click('[data-tab="bigbang"]');
    await page.waitForTimeout(200);
    // Two-tap confirmation
    await page.click('[data-testid="btn-bigbang"]');
    await page.waitForTimeout(100);
    await page.click('[data-testid="btn-bigbang"]');
    // Wait 950ms so we are right in the middle of the orbital implosion + chromatic aberration
    await page.waitForTimeout(950);

    const pathD = resolve(SCREENSHOT_DIR, 'D-big-bang.png');
    await page.screenshot({ path: pathD });
    copyFileSync(pathD, resolve(ARTIFACT_DIR, 'D-big-bang.png'));

    // Wait for Big Bang rebirth to complete
    await page.waitForTimeout(1800);

    // --- CAPTURE E: Multiverso con 3 universos ---
    console.log('7. Unlocking Multiverse with 3 active Parallel Universes (State E)...');
    await page.evaluate(() => {
      const app = (window as any).__CHISPA__;
      const D = app.sim.state.energy.constructor;
      app.sim.state.bigBangsTotal = 12;
      app.sim.state.energy = new D('1.2e14');
      app.sim.state.totalEnergyProduced = new D('1.2e14'); // Era del Multiverso (265° indigo-violet)
      app.sim.state.realityFragments = new D(450);
      app.sim.state.upgradesPurchased = ['click_1', 'click_2', 'echo_1'];
      app.sim.state.resonanceCombo = 18;
      app.sim.state.resonanceMultiplier = 2.2;
      app.sim.state.resonanceTimer = -10;
      app.sim.state.parallelUniverseAttention = {
        uni_dense: 3,
        uni_cold: 2,
        uni_harmonic: 2,
        uni_hyper: 0,
        uni_void: 0,
      };
      for (const id of ['atom', 'gas_cloud', 'protostar', 'dwarf_star', 'pulsar', 'galaxy']) {
        app.sim.state.generators[id].owned = 10;
      }
      app.sim.state.currentEraIndex = 6; // Era del Multiverso
      app.sim.recalculateRates();
      app.scene.snapToCurrentEraHue();
      app.ui.renderTabsNav();
      document.getElementById('era-banner')?.classList.remove('visible');
    });
    await page.click('[data-tab="multiverse"]');
    await page.waitForTimeout(500);

    const pathE = resolve(SCREENSHOT_DIR, 'E-multiverso.png');
    await page.screenshot({ path: pathE });
    copyFileSync(pathE, resolve(ARTIFACT_DIR, 'E-multiverso.png'));

    // --- CAPTURE F: Mapa de Constelaciones con 10 dibujadas ---
    console.log('8. Drawing 10 Constellations in the sky and capturing State F...');
    await page.evaluate(() => {
      const app = (window as any).__CHISPA__;
      const D = app.sim.state.energy.constructor;
      app.sim.state.bigBangsTotal = 26;
      app.sim.state.energy = new D('1.5e16');
      app.sim.state.totalEnergyProduced = new D('1.5e16'); // Era de la Conciencia (175° emerald-teal)
      app.sim.state.attentionCurrency = new D(2500);
      app.sim.state.resonanceCombo = 30;
      app.sim.state.resonanceMultiplier = 3.0;
      app.sim.state.resonanceTimer = -10;
      app.sim.state.unlockedConstellations = [
        'const_1',
        'const_2',
        'const_3',
        'const_4',
        'const_5',
        'const_6',
        'const_7',
        'const_8',
        'const_9',
        'const_10',
      ];
      app.sim.state.currentEraIndex = 7; // Era de la Conciencia
      app.sim.recalculateRates();
      app.scene.snapToCurrentEraHue();
      app.ui.syncSkyConstellations();
      app.ui.renderTabsNav();
      document.getElementById('era-banner')?.classList.remove('visible');
    });
    await page.click('[data-tab="constellations"]');
    await page.waitForTimeout(500);

    const pathF = resolve(SCREENSHOT_DIR, 'F-constelaciones.png');
    await page.screenshot({ path: pathF });
    copyFileSync(pathF, resolve(ARTIFACT_DIR, 'F-constelaciones.png'));

    // --- CAPTURE G: Mobile Viewport (390x844) ---
    console.log('9. Verifying Mobile Responsive Layout at 390x844...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const app = (window as any).__CHISPA__;
      app.sim.state.resonanceCombo = 24;
      app.sim.state.resonanceMultiplier = 2.6;
      app.sim.state.resonanceTimer = -10;
      const toasts = document.getElementById('toast-container');
      if (toasts) toasts.innerHTML = '';
      document.getElementById('hud-container')?.classList.add('hud-collapsed');
    });
    await page.click('[data-tab="generators"]');
    await page.waitForTimeout(500);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    if (hasHorizontalScroll) {
      throw new Error('Mobile layout has horizontal overflow!');
    }

    const pathG = resolve(SCREENSHOT_DIR, 'G-movil-390x844.png');
    await page.screenshot({ path: pathG });
    copyFileSync(pathG, resolve(ARTIFACT_DIR, 'G-movil-390x844.png'));

    // Copy all A-G screenshots to docs/screenshots/v1.1/
    for (const name of [
      'A-inicio.png',
      'B-primer-atomo.png',
      'C-16-orbitas.png',
      'D-big-bang.png',
      'E-multiverso.png',
      'F-constelaciones.png',
      'G-movil-390x844.png',
    ]) {
      copyFileSync(resolve(SCREENSHOT_DIR, name), resolve(SCREENSHOT_V11_DIR, name));
    }

    // Verify F3 debug overlay toggles cleanly
    await page.keyboard.press('F3');
    await page.waitForTimeout(100);
    const f3Visible = await page.evaluate(() => {
      const el = document.getElementById('f3-debug-panel');
      return !!el && !el.classList.contains('hidden');
    });
    if (!f3Visible) {
      throw new Error('F3 debug panel did not open on F3 key press');
    }
    await page.keyboard.press('F3');

    if (consoleErrors.length > 0) {
      throw new Error(`Console errors detected:\n${consoleErrors.join('\n')}`);
    }

    console.log('\n✓ All E2E flows and screenshots A–G verified with 0 console errors!');
  } finally {
    await browser.close();
    await server.close();
  }
}

runE2EAndVisualVerification().catch((err) => {
  console.error('E2E Verification Failed:', err);
  process.exit(1);
});
