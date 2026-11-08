import '@fontsource/unbounded/400.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/sora/400.css';
import '@fontsource/sora/600.css';
import './ui/styles.css';

import { Simulation } from '@/core/Simulation';
import { calculateOfflineGains } from '@/core/Economy';
import { SceneManager } from '@/render/SceneManager';
import { AudioEngine } from '@/audio/AudioEngine';
import { SaveManager } from '@/save/SaveManager';
import { UIManager } from '@/ui/UIManager';

async function bootstrap(): Promise<void> {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  const sceneHost = document.createElement('div');
  sceneHost.id = 'scene-container';
  appEl.appendChild(sceneHost);

  const saveManager = new SaveManager();
  const { state: initialState, corruptedRecovered, offlineSeconds } = saveManager.loadFromLocal();

  // Check night-owl hour for secret achievement
  const currentHour = new Date().getHours();
  if (currentHour === 3) {
    initialState.playedAtNightHour = true;
  }

  const sim = new Simulation(initialState);
  const scene = new SceneManager(sim);
  const audio = new AudioEngine();
  const ui = new UIManager(sim, scene, audio, saveManager);

  await scene.init(sceneHost);
  ui.mount(appEl);

  if (corruptedRecovered) {
    ui.showToast(
      'Aviso de Recuperación',
      'Se detectó un guardado dañado y se restauró una partida segura.'
    );
  }

  if (offlineSeconds >= 15) {
    sim.state.offlineDurationSeconds = Math.max(
      sim.state.offlineDurationSeconds,
      offlineSeconds
    );
    const { energyGained, actualSeconds } = calculateOfflineGains(offlineSeconds, sim.state);
    if (energyGained.gt(0)) {
      sim.state.energy = sim.state.energy.plus(energyGained);
      sim.state.totalEnergyProduced = sim.state.totalEnergyProduced.plus(energyGained);
      sim.state.allTimeEnergyProduced = sim.state.allTimeEnergyProduced.plus(energyGained);
      ui.showOfflineModal(actualSeconds, energyGained);
    }
  }

  // Expose programmatic hook for E2E & visual verification
  (window as any).__CHISPA__ = {
    sim,
    scene,
    ui,
    audio,
    saveManager,
  };

  // Fixed-step 20 Hz simulation accumulator + 60 fps render ticker
  const FIXED_STEP = 1 / 20;
  let simAccumulator = 0;
  let uiAccumulator = 0;
  let autoSaveAccumulator = 0;
  let lastFrameTime = performance.now();

  function frameLoop(now: number): void {
    const rawDt = Math.min(0.25, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    if (!ui.isPaused) {
      const scaledDt = rawDt * ui.timeScale;
      simAccumulator += scaledDt;

      let steps = 0;
      while (simAccumulator >= FIXED_STEP && steps < 20) {
        sim.tick(FIXED_STEP);
        simAccumulator -= FIXED_STEP;
        steps++;
      }

      if (ui.isZenMode) {
        sim.state.timeInZenMode += rawDt;
      }

      scene.update(rawDt);

      const ownedTypes = Object.values(sim.state.generators).filter((g) => g.owned > 0).length;
      audio.updateMusic(rawDt, sim.state.currentEraIndex, ownedTypes);

      uiAccumulator += rawDt;
      if (uiAccumulator >= 0.08) {
        ui.update(uiAccumulator);
        uiAccumulator = 0;
      }

      autoSaveAccumulator += rawDt;
      if (autoSaveAccumulator >= 10.0) {
        autoSaveAccumulator = 0;
        saveManager.saveToLocal(sim.state);
      }
    }

    requestAnimationFrame(frameLoop);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveManager.saveToLocal(sim.state);
    }
  });

  requestAnimationFrame(frameLoop);
}

bootstrap().catch((err) => {
  console.error('Error iniciando CHISPA ∞:', err);
});
