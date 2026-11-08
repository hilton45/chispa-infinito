import { D, Decimal, ZERO } from '@/utils/Decimal';
import { GENERATORS, getMilestoneCount } from '@/data/generators';
import { UPGRADES } from '@/data/upgrades';
import { ACHIEVEMENTS } from '@/data/achievements';
import { ERAS, getEraForEnergy } from '@/data/eras';
import { DARK_MATTER_NODES } from '@/data/darkMatterTree';
import {
  PARALLEL_UNIVERSES,
  COSMIC_CHALLENGES,
  CONSTELLATIONS,
} from '@/data/extendedLayers';
import { COSMIC_EXTENSIONS } from '@/data/extensions';
import { GameState, createInitialState, ActiveCometEffect } from './GameState';
import {
  calculateBatchCost,
  calculateMaxAffordable,
  calculateTotalSPS,
  calculateClickPower,
  calculateBigBangDarkMatter,
  MAX_RESONANCE_COMBO,
  RESONANCE_DECAY_DELAY,
} from './Economy';

export type EventCallback = (eventName: string, data: any) => void;

export class Simulation {
  public state: GameState;
  private listeners: EventCallback[] = [];
  private autoTimer = 0;
  private autoClickAccumulator = 0;

  constructor(initialState?: GameState) {
    this.state = initialState ?? createInitialState();
    this.recalculateRates();
  }

  public addEventListener(cb: EventCallback): void {
    this.listeners.push(cb);
  }

  public removeEventListener(cb: EventCallback): void {
    this.listeners = this.listeners.filter((l) => l !== cb);
  }

  private emit(eventName: string, data: any): void {
    for (const listener of this.listeners) {
      listener(eventName, data);
    }
  }

  public recalculateRates(): void {
    const sps = calculateTotalSPS(this.state);
    this.state.energyPerSecond = sps;
    this.state.energyPerClick = calculateClickPower(this.state, sps);
  }

  public clickCore(): {
    energyGained: Decimal;
    resonanceCombo: number;
    resonanceMultiplier: number;
  } {
    const now = Date.now();

    this.recalculateRates();
    const gain = this.state.energyPerClick;
    this.state.energy = this.state.energy.plus(gain);
    this.state.totalEnergyProduced = this.state.totalEnergyProduced.plus(gain);
    this.state.allTimeEnergyProduced = this.state.allTimeEnergyProduced.plus(gain);
    this.state.totalClicks += 1;

    const decayDelay = this.state.darkMatterUpgrades?.includes('dm_resonance_decay')
      ? 1.5
      : RESONANCE_DECAY_DELAY;
    const maxCombo = this.state.darkMatterUpgrades?.includes('dm_resonance_ext')
      ? 50
      : MAX_RESONANCE_COMBO;

    if (this.state.resonanceTimer < decayDelay && this.state.resonanceCombo > 0) {
      const step =
        this.state.darkMatterUpgrades?.includes('dm_hyper_resonance') && Math.random() < 0.15
          ? 2
          : 1;
      this.state.resonanceCombo = Math.min(maxCombo, this.state.resonanceCombo + step);
    } else {
      this.state.resonanceCombo = 1;
    }
    this.state.resonanceTimer = 0;

    const maxBonus = maxCombo === 50 ? 4.0 : 2.0;
    this.state.resonanceMultiplier = 1.0 + (this.state.resonanceCombo / maxCombo) * maxBonus;

    if (this.state.resonanceCombo > this.state.maxResonanceComboReached) {
      this.state.maxResonanceComboReached = this.state.resonanceCombo;
    }

    this.recalculateRates();

    this.state.clicksRecentTimestamps.push(now);
    this.state.clicksRecentTimestamps = this.state.clicksRecentTimestamps.filter(
      (t) => now - t <= 2000
    );
    this.state.clicksInTwoSeconds = this.state.clicksRecentTimestamps.length;

    this.checkEraProgression();
    this.checkAchievements();

    this.emit('click', {
      energyGained: gain,
      combo: this.state.resonanceCombo,
      multiplier: this.state.resonanceMultiplier,
    });

    return {
      energyGained: gain,
      resonanceCombo: this.state.resonanceCombo,
      resonanceMultiplier: this.state.resonanceMultiplier,
    };
  }

  public buyGenerator(
    id: string,
    mode: 1 | 10 | 100 | 'max'
  ): { boughtCount: number; cost: Decimal } {
    const gen = GENERATORS.find((g) => g.id === id);
    if (!gen) return { boughtCount: 0, cost: ZERO };

    // Check active challenge restrictions
    if (this.state.activeChallengeId === 'chal_stellar_only' && gen.index > 5) {
      return { boughtCount: 0, cost: ZERO };
    }

    const currentOwned = this.state.generators[id]?.owned ?? 0;
    if (this.state.activeChallengeId === 'chal_minimalist' && currentOwned >= 25) {
      return { boughtCount: 0, cost: ZERO };
    }

    let countToBuy = 0;
    let totalCost = ZERO;

    if (mode === 'max') {
      const result = calculateMaxAffordable(
        gen.baseCost,
        gen.costMultiplier,
        currentOwned,
        this.state.energy,
        this.state
      );
      countToBuy = result.count;
      totalCost = result.cost;
    } else {
      countToBuy = mode;
      if (this.state.activeChallengeId === 'chal_minimalist') {
        countToBuy = Math.min(countToBuy, 25 - currentOwned);
      }
      totalCost = calculateBatchCost(
        gen.baseCost,
        gen.costMultiplier,
        currentOwned,
        countToBuy,
        this.state
      );
      if (this.state.energy.lt(totalCost)) {
        return { boughtCount: 0, cost: ZERO };
      }
    }

    if (countToBuy <= 0 || this.state.energy.lt(totalCost)) {
      return { boughtCount: 0, cost: ZERO };
    }

    this.state.energy = this.state.energy.minus(totalCost);
    const prevMilestones = getMilestoneCount(currentOwned);
    const newOwned = currentOwned + countToBuy;
    this.state.generators[id] = { owned: newOwned };

    const newMilestones = getMilestoneCount(newOwned);
    if (newMilestones > prevMilestones) {
      this.emit('milestone', {
        generatorId: id,
        generatorName: gen.name,
        newMilestones,
        multiplier: Math.pow(2, newMilestones - prevMilestones),
      });
    }

    this.recalculateRates();
    this.checkAchievements();

    this.emit('buy_generator', {
      generatorId: id,
      count: countToBuy,
      cost: totalCost,
      newOwned,
    });

    return { boughtCount: countToBuy, cost: totalCost };
  }

  public buyUpgrade(id: string): boolean {
    if (this.state.upgradesPurchased.includes(id)) {
      return false;
    }

    const upDef = UPGRADES.find((u) => u.id === id);
    if (!upDef) return false;

    if (this.state.activeChallengeId === 'chal_no_click_upgrades' && upDef.type === 'click') {
      return false;
    }

    if (this.state.energy.lt(upDef.cost)) {
      return false;
    }

    this.state.energy = this.state.energy.minus(upDef.cost);
    this.state.upgradesPurchased.push(id);

    this.recalculateRates();
    this.checkAchievements();

    this.emit('buy_upgrade', { upgrade: upDef });
    return true;
  }

  public tick(dt: number): void {
    if (dt <= 0) return;

    // Extensión Compresor Temporal Cuántico (velocidad x2)
    if (this.state.unlockedExtensions?.includes('ext_time_warp')) {
      dt *= 2.0;
    }

    // Extensión Pulsador Cuántico Automático (10 clics por segundo)
    if (this.state.unlockedExtensions?.includes('ext_autoclicker')) {
      this.autoClickAccumulator += dt;
      let safetyCount = 0;
      while (this.autoClickAccumulator >= 0.1 && safetyCount < 30) {
        this.autoClickAccumulator -= 0.1;
        safetyCount++;
        this.clickCore();
      }
    }

    this.state.timePlayedSeconds += dt;
    this.state.lastTickTimestamp = Date.now();

    if (this.state.cosmicClockBoostTimer > 0) {
      this.state.cosmicClockBoostTimer = Math.max(0, this.state.cosmicClockBoostTimer - dt);
      if (this.state.cosmicClockBoostTimer === 0) {
        this.recalculateRates();
      }
    }

    // 1. Resonance combo decay
    const decayDelay = this.state.darkMatterUpgrades?.includes('dm_resonance_decay')
      ? 1.5
      : RESONANCE_DECAY_DELAY;
    const maxCombo = this.state.darkMatterUpgrades?.includes('dm_resonance_ext')
      ? 50
      : MAX_RESONANCE_COMBO;

    this.state.resonanceTimer += dt;
    if (this.state.resonanceTimer > decayDelay) {
      if (this.state.resonanceCombo > 0) {
        const decayAmount = Math.ceil(dt * 15);
        this.state.resonanceCombo = Math.max(0, this.state.resonanceCombo - decayAmount);
        const maxBonus = maxCombo === 50 ? 4.0 : 2.0;
        this.state.resonanceMultiplier = 1.0 + (this.state.resonanceCombo / maxCombo) * maxBonus;
        this.recalculateRates();
      }
    } else if (this.state.resonanceCombo >= maxCombo) {
      this.state.maxComboDuration += dt;
    }

    // 2. Active comet effects countdown
    if (this.state.activeCometEffects.length > 0) {
      let effectsChanged = false;
      this.state.activeCometEffects = this.state.activeCometEffects.filter((effect) => {
        effect.durationRemaining -= dt;
        if (effect.durationRemaining <= 0) {
          effectsChanged = true;
          return false;
        }
        return true;
      });

      if (effectsChanged) {
        this.recalculateRates();
      }
    }

    // 3. Passive production from generators
    const sps = this.state.energyPerSecond;
    if (sps.gt(0)) {
      const generated = sps.times(dt);
      this.state.energy = this.state.energy.plus(generated);
      this.state.totalEnergyProduced = this.state.totalEnergyProduced.plus(generated);
      this.state.allTimeEnergyProduced = this.state.allTimeEnergyProduced.plus(generated);
    }

    // 4. Multiverse passive Reality Fragments & Consciousness passive Attention
    if (this.isMultiverseUnlocked()) {
      let fragPerSec = 0.2;
      for (const u of PARALLEL_UNIVERSES) {
        const lvl = this.state.parallelUniverseAttention?.[u.id] ?? 0;
        fragPerSec += lvl * u.fragmentRatePerSec;
      }
      this.state.realityFragments = this.state.realityFragments.plus(fragPerSec * dt);
    }

    if (this.isConsciousnessUnlocked()) {
      const attRate = 0.5 + this.state.unlockedConstellations.length * 0.25;
      this.state.attentionCurrency = this.state.attentionCurrency.plus(attRate * dt);
    }

    if (this.isEternityUnlocked()) {
      const aeonRate = 0.1 + this.state.rewindsCount * 0.05;
      this.state.aeonsCurrency = this.state.aeonsCurrency.plus(aeonRate * dt);
    }

    // 5. Quantum Automation (every 1.0s)
    if (this.state.automationEnabled) {
      this.autoTimer += dt;
      if (this.autoTimer >= 1.0) {
        this.autoTimer = 0;
        this.runQuantumAutomation();
      }
    }

    // 6. Active Challenge completion check
    if (this.state.activeChallengeId) {
      const ch = COSMIC_CHALLENGES.find((c) => c.id === this.state.activeChallengeId);
      if (ch && this.state.totalEnergyProduced.gte(Decimal.pow(10, ch.goalEnergyExp))) {
        if (!this.state.completedChallenges.includes(ch.id)) {
          this.state.completedChallenges.push(ch.id);
        }
        this.state.activeChallengeId = null;
        this.recalculateRates();
        this.emit('challenge_completed', { challenge: ch });
      }
    }

    this.checkEraProgression();
    this.checkAchievements();
  }

  private runQuantumAutomation(): void {
    const dm = this.state.darkMatterUpgrades ?? [];
    if (dm.includes('dm_auto_atom')) {
      this.buyGenerator('atom', 1);
    }
    if (dm.includes('dm_auto_tier1')) {
      this.buyGenerator('gas_cloud', 1);
      this.buyGenerator('protostar', 1);
      this.buyGenerator('dwarf_star', 1);
    }
    if (dm.includes('dm_auto_tier2')) {
      this.buyGenerator('pulsar', 1);
      this.buyGenerator('nebula', 1);
      this.buyGenerator('black_hole', 1);
      this.buyGenerator('galaxy', 1);
    }
    if (dm.includes('dm_auto_upgrades')) {
      for (const up of UPGRADES) {
        if (!this.state.upgradesPurchased.includes(up.id) && this.state.energy.gte(up.cost)) {
          this.buyUpgrade(up.id);
          break;
        }
      }
    }
    if (dm.includes('dm_auto_bigbang') && this.state.autoBigBangThreshold > 0) {
      const pending = calculateBigBangDarkMatter(this.state.totalEnergyProduced, this.state);
      if (pending.gte(this.state.autoBigBangThreshold)) {
        this.triggerBigBang();
      }
    }
  }

  public isMultiverseUnlocked(): boolean {
    return (
      this.state.bigBangsTotal >= 10 ||
      this.state.allTimeEnergyProduced.gte(1e15) ||
      this.state.realityFragments.gt(0)
    );
  }

  public isConsciousnessUnlocked(): boolean {
    const totalAttentionLevels = Object.values(
      this.state.parallelUniverseAttention ?? {}
    ).reduce((a, b) => a + b, 0);
    return (
      (this.state.bigBangsTotal >= 25 && totalAttentionLevels >= 3) ||
      this.state.unlockedConstellations.length > 0 ||
      this.state.attentionCurrency.gt(0)
    );
  }

  public isEternityUnlocked(): boolean {
    return (
      this.state.unlockedConstellations.length >= 25 ||
      this.state.aeonsCurrency.gt(0) ||
      this.state.newGamePlusCount > 0
    );
  }

  public upgradeParallelUniverse(universeId: string): boolean {
    const u = PARALLEL_UNIVERSES.find((p) => p.id === universeId);
    if (!u) return false;
    const currentLvl = this.state.parallelUniverseAttention[universeId] ?? 0;
    const cost = D(10 * Math.pow(1.6, currentLvl));
    if (this.state.realityFragments.lt(cost)) return false;

    this.state.realityFragments = this.state.realityFragments.minus(cost);
    this.state.parallelUniverseAttention[universeId] = currentLvl + 1;
    this.recalculateRates();
    return true;
  }

  public startChallenge(challengeId: string): boolean {
    const ch = COSMIC_CHALLENGES.find((c) => c.id === challengeId);
    if (!ch) return false;
    this.triggerBigBang(true);
    this.state.activeChallengeId = challengeId;
    this.recalculateRates();
    return true;
  }

  public unlockConstellation(constId: string): boolean {
    if (this.state.unlockedConstellations.includes(constId)) return false;
    const cDef = CONSTELLATIONS.find((c) => c.id === constId);
    if (!cDef) return false;
    if (this.state.attentionCurrency.lt(cDef.costAttention)) return false;

    this.state.attentionCurrency = this.state.attentionCurrency.minus(cDef.costAttention);
    this.state.unlockedConstellations.push(constId);
    this.state.constellationsDrawn = this.state.unlockedConstellations.length;
    this.recalculateRates();
    this.checkAchievements();
    return true;
  }

  public activateCosmicClockBoost(): boolean {
    const cost = D(10);
    if (this.state.aeonsCurrency.lt(cost)) return false;
    this.state.aeonsCurrency = this.state.aeonsCurrency.minus(cost);
    this.state.cosmicClockBoostTimer += 120; // 2 minutes of x2 speed
    this.recalculateRates();
    return true;
  }

  public rewindCosmicRun(): boolean {
    const cost = D(25 * Math.pow(1.5, this.state.rewindsCount));
    if (this.state.aeonsCurrency.lt(cost)) return false;
    this.state.aeonsCurrency = this.state.aeonsCurrency.minus(cost);
    this.state.rewindsCount += 1;
    this.triggerBigBang(true);
    this.recalculateRates();
    return true;
  }

  public toggleNgPlusModifier(modId: string): boolean {
    if (!this.state.ngPlusModifiers) {
      this.state.ngPlusModifiers = [];
    }
    const idx = this.state.ngPlusModifiers.indexOf(modId);
    if (idx >= 0) {
      this.state.ngPlusModifiers.splice(idx, 1);
      this.recalculateRates();
      return false;
    } else {
      this.state.ngPlusModifiers.push(modId);
      this.recalculateRates();
      return true;
    }
  }

  public triggerNewGamePlus(selectedModifiers?: string[]): boolean {
    if (!this.isEternityUnlocked()) return false;
    if (selectedModifiers) {
      this.state.ngPlusModifiers = [...selectedModifiers];
    }
    this.state.newGamePlusCount += 1;
    this.triggerBigBang(true);
    this.recalculateRates();
    return true;
  }

  public claimDailyStreak(): { claimed: boolean; streak: number; bonusEnergy: Decimal } {
    const today = new Date().toISOString().slice(0, 10);
    if (this.state.lastDailyClaimDate === today) {
      return { claimed: false, streak: this.state.dailyStreakCount, bonusEnergy: ZERO };
    }
    this.state.lastDailyClaimDate = today;
    this.state.dailyStreakCount += 1;
    const bonus = Decimal.max(D(250), this.state.energyPerSecond.times(600));
    this.state.energy = this.state.energy.plus(bonus);
    this.state.totalEnergyProduced = this.state.totalEnergyProduced.plus(bonus);
    return { claimed: true, streak: this.state.dailyStreakCount, bonusEnergy: bonus };
  }

  public checkEraProgression(): void {
    const era = getEraForEnergy(this.state.totalEnergyProduced);
    if (era.index > this.state.currentEraIndex) {
      const prevEra = ERAS[this.state.currentEraIndex];
      this.state.currentEraIndex = era.index;
      this.emit('era_change', { prevEra, newEra: era });
    }
  }

  public checkAchievements(): void {
    const evalState = {
      ...this.state,
      totalGeneratorsOwned: Object.values(this.state.generators).reduce(
        (acc, g) => acc + g.owned,
        0
      ),
      totalNonAtomGenerators: Object.entries(this.state.generators).reduce(
        (acc, [id, g]) => (id !== 'atom' ? acc + g.owned : acc),
        0
      ),
    };

    for (const ach of ACHIEVEMENTS) {
      if (!this.state.achievementsUnlocked.includes(ach.id)) {
        if (ach.condition(evalState)) {
          this.state.achievementsUnlocked.push(ach.id);
          if (ach.rewardSkinId && !this.state.unlockedSkins.includes(ach.rewardSkinId)) {
            this.state.unlockedSkins.push(ach.rewardSkinId);
          }
          this.recalculateRates();
          this.emit('achievement', { achievement: ach });
        }
      }
    }
  }

  public catchComet(effect: {
    type: ActiveCometEffect['type'];
    multiplier: number;
    duration: number;
    name: string;
  }): { description: string; instantGain?: Decimal } {
    this.state.totalCometsCaught += 1;

    if (this.state.resonanceCombo >= MAX_RESONANCE_COMBO) {
      this.state.caughtCometAtMaxCombo = true;
    }

    let description = '';
    let instantGain: Decimal | undefined;

    const durationMult = this.state.darkMatterUpgrades?.includes('dm_comet_duration') ? 1.5 : 1.0;
    const coldUniLvl = this.state.parallelUniverseAttention?.['uni_cold'] ?? 0;
    const coldMult = 1 + coldUniLvl * 0.25;
    const goldMult = (this.state.darkMatterUpgrades?.includes('dm_comet_gold') ? 2.0 : 1.0) * coldMult;

    if (effect.type === 'star_rain') {
      const bankBonus = this.state.energy.times(0.15 * goldMult);
      const spsCap = this.state.energyPerSecond.times(900 * goldMult);
      instantGain = Decimal.max(bankBonus, Decimal.min(spsCap, D(100)));
      this.state.energy = this.state.energy.plus(instantGain);
      this.state.totalEnergyProduced = this.state.totalEnergyProduced.plus(instantGain);
      description = `${effect.name}: +${instantGain.toExponential(2)} energía`;
    } else if (effect.type === 'frenzy') {
      const dur = Math.round((effect.duration || 30) * durationMult);
      this.state.activeCometEffects.push({
        id: `frenzy_${Date.now()}`,
        type: 'frenzy',
        multiplier: effect.multiplier || 7,
        durationRemaining: dur,
      });
      this.recalculateRates();
      description = `${effect.name}: Producción ×${effect.multiplier} durante ${dur} s`;
    } else if (effect.type === 'divine_click') {
      const dur = Math.round((effect.duration || 10) * durationMult);
      this.state.activeCometEffects.push({
        id: `divine_${Date.now()}`,
        type: 'divine_click',
        multiplier: effect.multiplier || 50,
        durationRemaining: dur,
      });
      this.recalculateRates();
      description = `${effect.name}: Clics ×${effect.multiplier} durante ${dur} s`;
    } else if (effect.type === 'milestone_rain') {
      const secs = (effect.multiplier || 300) * goldMult;
      instantGain = Decimal.max(D(50), this.state.energyPerSecond.times(secs));
      this.state.energy = this.state.energy.plus(instantGain);
      this.state.totalEnergyProduced = this.state.totalEnergyProduced.plus(instantGain);
      description = `${effect.name}: +${Math.round(secs)} s de producción instantánea`;
    } else if (effect.type === 'cursed_surge') {
      const lucky = Math.random() < 0.7;
      const mult = lucky ? 25 : 0.5;
      const dur = lucky ? Math.round(20 * durationMult) : 10;
      this.state.activeCometEffects.push({
        id: `cursed_${Date.now()}`,
        type: 'frenzy',
        multiplier: mult,
        durationRemaining: dur,
      });
      this.recalculateRates();
      description = lucky
        ? `¡Fortuna del Abismo! Producción ×25 durante ${dur} s`
        : `¡Sombra Maldita! Producción ×0.5 durante 10 s`;
    }

    this.checkAchievements();
    this.emit('comet_caught', { effect, description, instantGain });
    return { description, instantGain };
  }

  public triggerBigBang(forceReset = false): { darkMatterGained: Decimal } {
    const dm = calculateBigBangDarkMatter(this.state.totalEnergyProduced, this.state);
    if (dm.lte(0) && !forceReset) {
      return { darkMatterGained: ZERO };
    }

    if (dm.gt(0)) {
      this.state.bigBangsTotal += 1;
      this.state.darkMatter = this.state.darkMatter.plus(dm);
      this.state.darkMatterTotal = this.state.darkMatterTotal.plus(dm);
    }

    const startingEnergy = this.state.darkMatterUpgrades?.includes('dm_spark_start')
      ? D(100)
      : ZERO;
    this.state.energy = startingEnergy;
    this.state.totalEnergyProduced = startingEnergy;
    for (const gen of GENERATORS) {
      this.state.generators[gen.id] = { owned: 0 };
    }

    this.state.upgradesPurchased = [];
    this.state.activeCometEffects = [];
    this.state.resonanceCombo = 0;
    this.state.resonanceTimer = 0;
    this.state.resonanceMultiplier = 1.0;
    this.state.currentEraIndex = 0;
    this.state.activeChallengeId = null;

    this.recalculateRates();
    this.checkAchievements();

    this.emit('big_bang', { darkMatterGained: dm, totalDarkMatter: this.state.darkMatterTotal });
    return { darkMatterGained: dm };
  }

  public buyDarkMatterUpgrade(nodeId: string): boolean {
    if (this.state.darkMatterUpgrades?.includes(nodeId)) return false;
    const node = DARK_MATTER_NODES.find((n) => n.id === nodeId);
    if (!node) return false;

    for (const prereq of node.prerequisites) {
      if (!this.state.darkMatterUpgrades?.includes(prereq)) return false;
    }

    if (this.state.darkMatter.lt(node.cost)) return false;

    this.state.darkMatter = this.state.darkMatter.minus(node.cost);
    if (!this.state.darkMatterUpgrades) {
      this.state.darkMatterUpgrades = [];
    }
    this.state.darkMatterUpgrades.push(nodeId);

    if (nodeId === 'dm_cosmic_memory') {
      this.state.offlineEfficiency = 1.0;
      this.state.maxOfflineSeconds = 86400; // 24 hours
    }

    this.recalculateRates();
    this.checkAchievements();
    this.emit('dark_matter_upgrade', { node });
    return true;
  }

  public getNextBestTarget(): {
    type: 'generator' | 'upgrade';
    id: string;
    name: string;
    cost: Decimal;
    progress: number;
  } | null {
    let bestTarget: {
      type: 'generator' | 'upgrade';
      id: string;
      name: string;
      cost: Decimal;
      roi: number;
    } | null = null;

    for (const gen of GENERATORS) {
      const owned = this.state.generators[gen.id]?.owned ?? 0;
      // Only consider discovered or next unowned generator
      const prevGen = GENERATORS[gen.index - 2];
      const isDiscovered =
        gen.index === 1 ||
        owned > 0 ||
        (prevGen && (this.state.generators[prevGen.id]?.owned ?? 0) > 0);
      if (!isDiscovered) continue;

      const cost = calculateBatchCost(gen.baseCost, gen.costMultiplier, owned, 1, this.state);
      const spsGain = gen.baseProduction.toNumber();
      const roi = spsGain / Math.max(1, cost.toNumber());

      if (!bestTarget || roi > bestTarget.roi) {
        bestTarget = {
          type: 'generator',
          id: gen.id,
          name: gen.name,
          cost,
          roi,
        };
      }
    }

    if (!bestTarget) return null;

    const progress = Math.min(1.0, this.state.energy.dividedBy(bestTarget.cost).toNumber());
    return {
      type: bestTarget.type,
      id: bestTarget.id,
      name: bestTarget.name,
      cost: bestTarget.cost,
      progress: Math.max(0, isNaN(progress) ? 0 : progress),
    };
  }

  public buyExtension(extensionId: string): boolean {
    if (!this.state.unlockedExtensions) {
      this.state.unlockedExtensions = [];
    }
    if (this.state.unlockedExtensions.includes(extensionId)) {
      return false;
    }

    const ext = COSMIC_EXTENSIONS.find((e) => e.id === extensionId);
    if (!ext) return false;

    if (ext.currency === 'darkMatter') {
      if (this.state.darkMatter.lt(ext.cost)) return false;
      this.state.darkMatter = this.state.darkMatter.minus(ext.cost);
    } else if (ext.currency === 'realityFragments') {
      if (this.state.realityFragments.lt(ext.cost)) return false;
      this.state.realityFragments = this.state.realityFragments.minus(ext.cost);
    } else {
      if (this.state.energy.lt(ext.cost)) return false;
      this.state.energy = this.state.energy.minus(ext.cost);
    }

    this.state.unlockedExtensions.push(extensionId);
    this.recalculateRates();
    this.checkAchievements();
    this.emit('buy_extension', { extension: ext });
    return true;
  }

  public selectSkin(skinId: string): boolean {
    this.state.selectedSkinId = skinId;
    this.emit('skin_changed', { skinId });
    return true;
  }
}
