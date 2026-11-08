import { D, Decimal, ZERO } from '@/utils/Decimal';
import { GENERATORS } from '@/data/generators';

export interface ActiveCometEffect {
  id: string;
  type: 'frenzy' | 'divine_click' | 'star_rain' | 'time_echo' | 'milestone_rain' | 'cursed_surge';
  multiplier: number;
  durationRemaining: number;
}

export interface GameState {
  version: number;

  // Economy & Resources
  energy: Decimal;
  totalEnergyProduced: Decimal;
  allTimeEnergyProduced: Decimal;
  energyPerSecond: Decimal;
  energyPerClick: Decimal;

  // Generators: id -> { owned: number }
  generators: Record<string, { owned: number }>;

  // Upgrades & Achievements
  upgradesPurchased: string[];
  achievementsUnlocked: string[];

  // Resonance / Click Combo
  resonanceCombo: number; // 0 to 30 (or 50)
  resonanceTimer: number; // seconds since last click
  resonanceMultiplier: number; // 1.0 to 3.0 (or 5.0)
  maxResonanceComboReached: number;

  // Active Buffs / Comets
  activeCometEffects: ActiveCometEffect[];
  totalCometsCaught: number;
  totalCometsSpawned: number;

  // Prestige Layer 1: Big Bang (Dark Matter)
  bigBangsTotal: number;
  darkMatter: Decimal;
  darkMatterTotal: Decimal;
  darkMatterUpgrades: string[];

  // Prestige Layer 2: Multiverse (Reality Fragments & Parallel Universes)
  realityFragments: Decimal;
  parallelUniverseAttention: Record<string, number>;
  completedChallenges: string[];
  activeChallengeId: string | null;

  // Prestige Layer 3: Consciousness (Attention & Constellations)
  attentionCurrency: Decimal;
  unlockedConstellations: string[];

  // Prestige Layer 4: Eternity (Aeons, Cosmic Clock & New Game+)
  aeonsCurrency: Decimal;
  cosmicClockBoostTimer: number;
  rewindsCount: number;
  newGamePlusCount: number;

  // Automation & Daily Streak
  automationEnabled: boolean;
  autoBigBangThreshold: number; // 0 = disabled
  lastDailyClaimDate: string; // YYYY-MM-DD
  dailyStreakCount: number;

  // Stats & Progress
  currentEraIndex: number;
  totalClicks: number;
  timePlayedSeconds: number;
  lastTickTimestamp: number;
  offlineEfficiency: number; // 0.5 default
  maxOfflineSeconds: number; // 28800 (8 hours) default

  // Skin & Cosmetics
  selectedSkinId: string;
  unlockedSkins: string[];

  // Secret achievement trackers
  clicksInTwoSeconds: number;
  clicksRecentTimestamps: number[];
  maxComboDuration: number;
  caughtCometAtMaxCombo: boolean;
  offlineDurationSeconds: number;
  timeInZenMode: number;
  blackHoleGazeSeconds: number;
  newsReadCount: number;
  hasExportedSave: boolean;
  constellationsDrawn: number;
  clickedObserver: boolean;
  playedAtNightHour: boolean;
}

export function createInitialState(): GameState {
  const generatorsState: Record<string, { owned: number }> = {};
  for (const gen of GENERATORS) {
    generatorsState[gen.id] = { owned: 0 };
  }

  return {
    version: 2,
    energy: ZERO,
    totalEnergyProduced: ZERO,
    allTimeEnergyProduced: ZERO,
    energyPerSecond: ZERO,
    energyPerClick: D(1),

    generators: generatorsState,

    upgradesPurchased: [],
    achievementsUnlocked: [],

    resonanceCombo: 0,
    resonanceTimer: 0,
    resonanceMultiplier: 1.0,
    maxResonanceComboReached: 0,

    activeCometEffects: [],
    totalCometsCaught: 0,
    totalCometsSpawned: 0,

    bigBangsTotal: 0,
    darkMatter: ZERO,
    darkMatterTotal: ZERO,
    darkMatterUpgrades: [],

    realityFragments: ZERO,
    parallelUniverseAttention: {
      uni_dense: 0,
      uni_cold: 0,
      uni_harmonic: 0,
      uni_hyper: 0,
      uni_void: 0,
    },
    completedChallenges: [],
    activeChallengeId: null,

    attentionCurrency: ZERO,
    unlockedConstellations: [],

    aeonsCurrency: ZERO,
    cosmicClockBoostTimer: 0,
    rewindsCount: 0,
    newGamePlusCount: 0,

    automationEnabled: true,
    autoBigBangThreshold: 0,
    lastDailyClaimDate: '',
    dailyStreakCount: 0,

    currentEraIndex: 0,
    totalClicks: 0,
    timePlayedSeconds: 0,
    lastTickTimestamp: Date.now(),
    offlineEfficiency: 0.5,
    maxOfflineSeconds: 28800, // 8 hours

    selectedSkinId: 'skin_default',
    unlockedSkins: ['skin_default'],

    clicksInTwoSeconds: 0,
    clicksRecentTimestamps: [],
    maxComboDuration: 0,
    caughtCometAtMaxCombo: false,
    offlineDurationSeconds: 0,
    timeInZenMode: 0,
    blackHoleGazeSeconds: 0,
    newsReadCount: 0,
    hasExportedSave: false,
    constellationsDrawn: 0,
    clickedObserver: false,
    playedAtNightHour: false,
  };
}
