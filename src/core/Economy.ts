import { D, Decimal, ZERO, ONE } from '@/utils/Decimal';
import { GENERATORS, GeneratorDefinition, getMilestoneCount } from '@/data/generators';
import { UPGRADES } from '@/data/upgrades';
import { COSMIC_CHALLENGES, CONSTELLATIONS } from '@/data/extendedLayers';
import { GameState } from './GameState';

export const COST_RATIO = 1.15;
export const MAX_RESONANCE_COMBO = 30;
export const RESONANCE_DECAY_DELAY = 0.7; // seconds without clicks before combo decays

/**
 * Get effective cost multiplier ratio and base cost discount for a state.
 */
export function getEffectiveCostModifiers(
  baseCost: Decimal,
  defaultRatio: number,
  state?: GameState
): { effectiveBase: Decimal; effectiveRatio: number } {
  if (!state) return { effectiveBase: baseCost, effectiveRatio: defaultRatio };

  let effectiveBase = baseCost;
  let effectiveRatio = defaultRatio;

  if (state.darkMatterUpgrades?.includes('dm_friendly_gravity')) {
    effectiveBase = effectiveBase.times(0.9);
  }
  if (state.completedChallenges?.includes('chal_minimalist')) {
    effectiveBase = effectiveBase.times(0.88);
  }
  if (state.activeChallengeId === 'chal_inflated') {
    effectiveBase = effectiveBase.times(2.0);
  }
  if (state.darkMatterUpgrades?.includes('dm_cosmic_geometry')) {
    effectiveRatio = 1.14;
  }

  return { effectiveBase, effectiveRatio };
}

/**
 * Calculate the cost of buying `count` generators starting from `owned`.
 * Formula: B * r^owned * (r^count - 1) / (r - 1)
 */
export function calculateBatchCost(
  baseCost: Decimal,
  costMultiplier: number,
  owned: number,
  count: number,
  state?: GameState
): Decimal {
  if (count <= 0) return ZERO;
  const { effectiveBase, effectiveRatio } = getEffectiveCostModifiers(
    baseCost,
    costMultiplier,
    state
  );

  if (count === 1) {
    return effectiveBase.times(Decimal.pow(effectiveRatio, owned));
  }
  const r = effectiveRatio;
  const currentUnitCost = effectiveBase.times(Decimal.pow(r, owned));
  const rPowCount = Decimal.pow(r, count);
  const cost = currentUnitCost.times(rPowCount.minus(1)).dividedBy(r - 1);
  return cost;
}

/**
 * Calculate the maximum affordable number of units and the exact cost for them.
 */
export function calculateMaxAffordable(
  baseCost: Decimal,
  costMultiplier: number,
  owned: number,
  availableEnergy: Decimal,
  state?: GameState
): { count: number; cost: Decimal } {
  const { effectiveBase, effectiveRatio } = getEffectiveCostModifiers(
    baseCost,
    costMultiplier,
    state
  );
  const r = effectiveRatio;
  const currentUnitCost = effectiveBase.times(Decimal.pow(r, owned));

  if (availableEnergy.lt(currentUnitCost)) {
    return { count: 0, cost: ZERO };
  }

  const numerator = availableEnergy.times(r - 1).dividedBy(currentUnitCost).plus(1);
  if (numerator.lte(1)) {
    return { count: 0, cost: ZERO };
  }

  const lnNumerator = Decimal.ln(numerator);
  const lnR = Math.log(r);
  let n = Math.floor(lnNumerator / lnR);

  if (n <= 0) return { count: 0, cost: ZERO };

  let cost = calculateBatchCost(baseCost, costMultiplier, owned, n, state);
  while (cost.gt(availableEnergy) && n > 0) {
    n--;
    cost = calculateBatchCost(baseCost, costMultiplier, owned, n, state);
  }

  return { count: n, cost };
}

/**
 * Calculate the production per second for a specific generator.
 */
export function calculateGeneratorSPS(
  gen: GeneratorDefinition,
  state: GameState,
  globalMultiplier: Decimal
): Decimal {
  const owned = state.generators[gen.id]?.owned ?? 0;
  if (owned <= 0) return ZERO;

  // 1. Base production
  let sps = gen.baseProduction.times(owned);

  // 2. Milestones multiplier: x2 per milestone reached (or x2.15 with chal_stellar_only)
  const milestones = getMilestoneCount(owned);
  if (milestones > 0) {
    const milestoneBase = state.completedChallenges?.includes('chal_stellar_only') ? 2.15 : 2.0;
    sps = sps.times(Math.pow(milestoneBase, milestones));
  }

  // 3. Upgrades specific to this generator (each x2)
  for (const upId of state.upgradesPurchased) {
    const upDef = UPGRADES.find((u) => u.id === upId);
    if (upDef && upDef.type === 'generator' && upDef.targetGeneratorId === gen.id) {
      sps = sps.times(upDef.multiplier ?? 2);
    }
  }

  return sps.times(globalMultiplier);
}

/**
 * Calculate global multiplier applied to all generators.
 */
export function calculateGlobalMultiplier(state: GameState): Decimal {
  let mult = ONE;

  // 1. Achievements: +2% additive per achievement unlocked
  const achCount = state.achievementsUnlocked.length;
  if (achCount > 0) {
    mult = mult.times(1 + achCount * 0.02);
  }

  // 2. Dark Matter: +10% per dark matter total
  if (state.darkMatterTotal.gt(0)) {
    mult = mult.times(ONE.plus(state.darkMatterTotal.times(0.1)));
  }

  // 3. Dark Matter Tree perks
  if (state.darkMatterUpgrades?.includes('dm_prod_1')) mult = mult.times(1.25);
  if (state.darkMatterUpgrades?.includes('dm_prod_2')) mult = mult.times(1.5);
  if (state.darkMatterUpgrades?.includes('dm_prod_3')) mult = mult.times(2.0);

  // 4. Global upgrades
  for (const upId of state.upgradesPurchased) {
    const upDef = UPGRADES.find((u) => u.id === upId);
    if (upDef && upDef.type === 'global' && upDef.multiplier) {
      mult = mult.times(upDef.multiplier);
    }
  }

  // 5. Multiverse parallel universe attention & completed challenges
  if (state.parallelUniverseAttention) {
    const denseLvl = state.parallelUniverseAttention['uni_dense'] ?? 0;
    const harmonicLvl = state.parallelUniverseAttention['uni_harmonic'] ?? 0;
    if (denseLvl > 0) mult = mult.times(1 + denseLvl * 0.3);
    if (harmonicLvl > 0) mult = mult.times(1 + harmonicLvl * 0.2);
  }

  if (state.completedChallenges?.length > 0) {
    for (const cid of state.completedChallenges) {
      const ch = COSMIC_CHALLENGES.find((c) => c.id === cid);
      if (ch) mult = mult.times(1 + ch.rewardBonusSPS);
    }
  }

  // 6. Consciousness Layer: Unlocked Constellations
  if (state.unlockedConstellations?.length > 0) {
    let constBonus = 0;
    for (const constId of state.unlockedConstellations) {
      const cDef = CONSTELLATIONS.find((c) => c.id === constId);
      if (cDef) constBonus += cDef.spsBonus;
    }
    mult = mult.times(1 + constBonus);
  }

  // 7. Eternity Layer: Cosmic Clock boost, Rewinds & New Game+
  if (state.cosmicClockBoostTimer > 0) {
    mult = mult.times(2.0);
  }
  if (state.rewindsCount > 0) {
    mult = mult.times(1 + state.rewindsCount * 0.25);
  }
  if (state.newGamePlusCount > 0) {
    mult = mult.times(Math.pow(3, state.newGamePlusCount));
  }

  // 8. Active Comet Frenzy effects (e.g. x7)
  for (const effect of state.activeCometEffects) {
    if (effect.type === 'frenzy') {
      mult = mult.times(effect.multiplier);
    }
  }

  return mult;
}

/**
 * Calculate total energy produced per second (SPS) across all generators.
 */
export function calculateTotalSPS(state: GameState): Decimal {
  const globalMult = calculateGlobalMultiplier(state);
  let total = ZERO;

  for (const gen of GENERATORS) {
    const genSPS = calculateGeneratorSPS(gen, state, globalMult);
    total = total.plus(genSPS);
  }

  return total;
}

/**
 * Calculate click power given current upgrades, resonance combo, and active comets.
 */
export function calculateClickPower(state: GameState, currentSPS: Decimal): Decimal {
  // 1. Base click power (default 1, or 10 if dm_click_base unlocked)
  let baseClick = state.darkMatterUpgrades?.includes('dm_click_base') ? D(10) : D(1);

  // 2. Click upgrades: x2 each
  for (const upId of state.upgradesPurchased) {
    const upDef = UPGRADES.find((u) => u.id === upId);
    if (upDef && upDef.type === 'click' && upDef.multiplier) {
      baseClick = baseClick.times(upDef.multiplier);
    }
  }

  // 3. Echo upgrades: adds % of current SPS to click
  let echoPercent = 0;
  for (const upId of state.upgradesPurchased) {
    const upDef = UPGRADES.find((u) => u.id === upId);
    if (upDef && upDef.type === 'echo' && upDef.echoPercent) {
      echoPercent += upDef.echoPercent;
    }
  }

  if (state.darkMatterUpgrades?.includes('dm_echo_master')) {
    echoPercent *= 2;
  }

  if (echoPercent > 0 && currentSPS.gt(0)) {
    baseClick = baseClick.plus(currentSPS.times(echoPercent));
  }

  // Multiverse hyper universe bonus to clicks
  const hyperLvl = state.parallelUniverseAttention?.['uni_hyper'] ?? 0;
  if (hyperLvl > 0) {
    baseClick = baseClick.times(1 + hyperLvl * 0.35);
  }

  // 4. Resonance combo multiplier
  baseClick = baseClick.times(state.resonanceMultiplier);

  // 5. Active Comet Divine Click effects (e.g. x50)
  for (const effect of state.activeCometEffects) {
    if (effect.type === 'divine_click') {
      baseClick = baseClick.times(effect.multiplier);
    }
  }

  return baseClick;
}

/**
 * Calculate offline progress using closed-form formula.
 */
export function calculateOfflineGains(
  secondsElapsed: number,
  state: GameState
): { energyGained: Decimal; actualSeconds: number } {
  if (secondsElapsed <= 0) {
    return { energyGained: ZERO, actualSeconds: 0 };
  }

  const actualSeconds = Math.min(secondsElapsed, state.maxOfflineSeconds);
  const sps = calculateTotalSPS(state);
  const energyGained = sps.times(actualSeconds).times(state.offlineEfficiency);

  return { energyGained, actualSeconds };
}

/**
 * Calculate Dark Matter gained on Big Bang.
 * Formula: floor(sqrt(totalEnergyProduced / 1e7))
 */
export function calculateBigBangDarkMatter(runEnergy: Decimal, state?: GameState): Decimal {
  if (runEnergy.lt(1e7)) return ZERO;
  const ratio = runEnergy.dividedBy(1e7);
  let dm = Decimal.floor(Decimal.sqrt(ratio));
  const voidLvl = state?.parallelUniverseAttention?.['uni_void'] ?? 0;
  if (voidLvl > 0) {
    dm = Decimal.floor(dm.times(1 + voidLvl * 0.5));
  }
  return dm;
}
