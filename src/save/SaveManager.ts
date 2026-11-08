import { D } from '@/utils/Decimal';
import { GameState, createInitialState } from '@/core/GameState';
import { GENERATORS } from '@/data/generators';

const SAVE_KEY_PRIMARY = 'chispa_infinito_save_v2';
const SAVE_KEY_BACKUP = 'chispa_infinito_save_backup_v2';

function computeChecksum(payload: string): string {
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function serializeState(state: GameState): string {
  const plain: Record<string, any> = {
    version: state.version,
    energy: state.energy.toString(),
    totalEnergyProduced: state.totalEnergyProduced.toString(),
    allTimeEnergyProduced: state.allTimeEnergyProduced.toString(),
    generators: state.generators,
    upgradesPurchased: state.upgradesPurchased,
    achievementsUnlocked: state.achievementsUnlocked,
    maxResonanceComboReached: state.maxResonanceComboReached,
    totalCometsCaught: state.totalCometsCaught,
    totalCometsSpawned: state.totalCometsSpawned,
    bigBangsTotal: state.bigBangsTotal,
    darkMatter: state.darkMatter.toString(),
    darkMatterTotal: state.darkMatterTotal.toString(),
    darkMatterUpgrades: state.darkMatterUpgrades,
    realityFragments: state.realityFragments.toString(),
    parallelUniverseAttention: state.parallelUniverseAttention,
    completedChallenges: state.completedChallenges,
    activeChallengeId: state.activeChallengeId,
    attentionCurrency: state.attentionCurrency.toString(),
    unlockedConstellations: state.unlockedConstellations,
    aeonsCurrency: state.aeonsCurrency.toString(),
    cosmicClockBoostTimer: state.cosmicClockBoostTimer,
    rewindsCount: state.rewindsCount,
    newGamePlusCount: state.newGamePlusCount,
    automationEnabled: state.automationEnabled,
    autoBigBangThreshold: state.autoBigBangThreshold,
    lastDailyClaimDate: state.lastDailyClaimDate,
    dailyStreakCount: state.dailyStreakCount,
    currentEraIndex: state.currentEraIndex,
    totalClicks: state.totalClicks,
    timePlayedSeconds: state.timePlayedSeconds,
    lastTickTimestamp: state.lastTickTimestamp,
    offlineEfficiency: state.offlineEfficiency,
    maxOfflineSeconds: state.maxOfflineSeconds,
    selectedSkinId: state.selectedSkinId,
    unlockedSkins: state.unlockedSkins,
    caughtCometAtMaxCombo: state.caughtCometAtMaxCombo,
    hasExportedSave: state.hasExportedSave,
    constellationsDrawn: state.constellationsDrawn,
    clickedObserver: state.clickedObserver,
  };

  return JSON.stringify(plain);
}

export function deserializeState(rawJson: string): GameState {
  const parsed = JSON.parse(rawJson);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Formato de guardado inválido');
  }

  const base = createInitialState();

  // Migrate v1 -> v2 automatically by merging onto createInitialState()
  base.version = 2;
  base.energy = D(parsed.energy ?? 0);
  base.totalEnergyProduced = D(parsed.totalEnergyProduced ?? 0);
  base.allTimeEnergyProduced = D(parsed.allTimeEnergyProduced ?? parsed.totalEnergyProduced ?? 0);

  if (parsed.generators && typeof parsed.generators === 'object') {
    for (const gen of GENERATORS) {
      const savedOwned = Number(parsed.generators[gen.id]?.owned ?? 0);
      base.generators[gen.id] = {
        owned: Number.isFinite(savedOwned) && savedOwned >= 0 ? Math.floor(savedOwned) : 0,
      };
    }
  }

  if (Array.isArray(parsed.upgradesPurchased)) {
    base.upgradesPurchased = parsed.upgradesPurchased.filter((x: any) => typeof x === 'string');
  }
  if (Array.isArray(parsed.achievementsUnlocked)) {
    base.achievementsUnlocked = parsed.achievementsUnlocked.filter(
      (x: any) => typeof x === 'string'
    );
  }

  base.maxResonanceComboReached = Number(parsed.maxResonanceComboReached ?? 0) || 0;
  base.totalCometsCaught = Number(parsed.totalCometsCaught ?? 0) || 0;
  base.totalCometsSpawned = Number(parsed.totalCometsSpawned ?? 0) || 0;
  base.bigBangsTotal = Number(parsed.bigBangsTotal ?? 0) || 0;
  base.darkMatter = D(parsed.darkMatter ?? 0);
  base.darkMatterTotal = D(parsed.darkMatterTotal ?? 0);

  if (Array.isArray(parsed.darkMatterUpgrades)) {
    base.darkMatterUpgrades = parsed.darkMatterUpgrades.filter((x: any) => typeof x === 'string');
  }

  base.realityFragments = D(parsed.realityFragments ?? 0);
  if (parsed.parallelUniverseAttention && typeof parsed.parallelUniverseAttention === 'object') {
    base.parallelUniverseAttention = {
      ...base.parallelUniverseAttention,
      ...parsed.parallelUniverseAttention,
    };
  }
  if (Array.isArray(parsed.completedChallenges)) {
    base.completedChallenges = parsed.completedChallenges;
  }
  base.activeChallengeId = parsed.activeChallengeId ?? null;

  base.attentionCurrency = D(parsed.attentionCurrency ?? 0);
  if (Array.isArray(parsed.unlockedConstellations)) {
    base.unlockedConstellations = parsed.unlockedConstellations;
  }

  base.aeonsCurrency = D(parsed.aeonsCurrency ?? 0);
  base.cosmicClockBoostTimer = Number(parsed.cosmicClockBoostTimer ?? 0) || 0;
  base.rewindsCount = Number(parsed.rewindsCount ?? 0) || 0;
  base.newGamePlusCount = Number(parsed.newGamePlusCount ?? 0) || 0;

  base.automationEnabled = parsed.automationEnabled ?? true;
  base.autoBigBangThreshold = Number(parsed.autoBigBangThreshold ?? 0) || 0;
  base.lastDailyClaimDate = String(parsed.lastDailyClaimDate ?? '');
  base.dailyStreakCount = Number(parsed.dailyStreakCount ?? 0) || 0;

  base.currentEraIndex = Number(parsed.currentEraIndex ?? 0) || 0;
  base.totalClicks = Number(parsed.totalClicks ?? 0) || 0;
  base.timePlayedSeconds = Number(parsed.timePlayedSeconds ?? 0) || 0;
  base.lastTickTimestamp = Number(parsed.lastTickTimestamp ?? Date.now()) || Date.now();
  base.offlineEfficiency = Number(parsed.offlineEfficiency ?? 0.5) || 0.5;
  base.maxOfflineSeconds = Number(parsed.maxOfflineSeconds ?? 28800) || 28800;

  base.selectedSkinId = String(parsed.selectedSkinId ?? 'skin_default');
  if (Array.isArray(parsed.unlockedSkins)) {
    base.unlockedSkins = parsed.unlockedSkins;
  }

  base.caughtCometAtMaxCombo = Boolean(parsed.caughtCometAtMaxCombo);
  base.hasExportedSave = Boolean(parsed.hasExportedSave);
  base.constellationsDrawn = Number(parsed.constellationsDrawn ?? 0) || 0;
  base.clickedObserver = Boolean(parsed.clickedObserver);

  return base;
}

export function exportSaveString(state: GameState): string {
  const json = serializeState(state);
  const checksum = computeChecksum(json);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `CHISPA2:${checksum}:${encoded}`;
}

export function importSaveString(code: string): GameState {
  const trimmed = code.trim();
  if (!trimmed.startsWith('CHISPA2:')) {
    throw new Error('El código no tiene la cabecera CHISPA2 válida.');
  }
  const parts = trimmed.split(':');
  if (parts.length !== 3) {
    throw new Error('Estructura de código de guardado incompleta.');
  }
  const [, expectedChecksum, encoded] = parts;
  const json = decodeURIComponent(escape(atob(encoded)));
  const actualChecksum = computeChecksum(json);

  if (actualChecksum !== expectedChecksum) {
    throw new Error('El checksum del guardado no coincide (datos alterados o incompletos).');
  }

  return deserializeState(json);
}

export class SaveManager {
  public saveToLocal(state: GameState): void {
    try {
      const currentPrimary = localStorage.getItem(SAVE_KEY_PRIMARY);
      if (currentPrimary) {
        localStorage.setItem(SAVE_KEY_BACKUP, currentPrimary);
      }
      const serialized = serializeState(state);
      localStorage.setItem(SAVE_KEY_PRIMARY, serialized);
    } catch {
      // Ignore storage quota errors silently
    }
  }

  public loadFromLocal(): {
    state: GameState;
    corruptedRecovered: boolean;
    offlineSeconds: number;
  } {
    const rawPrimary = localStorage.getItem(SAVE_KEY_PRIMARY);
    const rawBackup = localStorage.getItem(SAVE_KEY_BACKUP);

    let loaded: GameState | null = null;
    let corruptedRecovered = false;

    if (rawPrimary) {
      try {
        loaded = deserializeState(rawPrimary);
      } catch {
        corruptedRecovered = true;
      }
    }

    if (!loaded && rawBackup) {
      try {
        loaded = deserializeState(rawBackup);
      } catch {
        corruptedRecovered = true;
      }
    }

    if (!loaded) {
      return {
        state: createInitialState(),
        corruptedRecovered,
        offlineSeconds: 0,
      };
    }

    const now = Date.now();
    // Guard against backwards clock jumps
    const rawDeltaMs = now - loaded.lastTickTimestamp;
    const offlineSeconds = rawDeltaMs > 5000 ? Math.floor(rawDeltaMs / 1000) : 0;
    loaded.lastTickTimestamp = now;

    return {
      state: loaded,
      corruptedRecovered,
      offlineSeconds,
    };
  }

  public hardReset(): GameState {
    localStorage.removeItem(SAVE_KEY_PRIMARY);
    localStorage.removeItem(SAVE_KEY_BACKUP);
    return createInitialState();
  }
}
