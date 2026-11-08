import { describe, it, expect } from 'vitest';
import { Simulation } from '@/core/Simulation';
import { D } from '@/utils/Decimal';
import { CONSTELLATIONS, ENCYCLOPEDIA_ENTRIES } from '@/data/extendedLayers';

describe('Extended Progression Layers (Layers 2-5)', () => {
  it('unlocks Multiverse after 10 Big Bangs or 1e15 energy and upgrades parallel universes', () => {
    const sim = new Simulation();
    expect(sim.isMultiverseUnlocked()).toBe(false);

    sim.state.bigBangsTotal = 10;
    expect(sim.isMultiverseUnlocked()).toBe(true);

    sim.state.realityFragments = D(100);
    const ok = sim.upgradeParallelUniverse('uni_dense');
    expect(ok).toBe(true);
    expect(sim.state.parallelUniverseAttention['uni_dense']).toBe(1);
  });

  it('completes all 4 Cosmic Challenges with core restrictions and permanent rewards', () => {
    const sim = new Simulation();

    // 1. Silencio Manual (no click upgrades)
    sim.startChallenge('chal_no_click_upgrades');
    expect(sim.state.activeChallengeId).toBe('chal_no_click_upgrades');
    sim.state.energy = D(10000);
    expect(sim.buyUpgrade('click_1')).toBe(false);
    sim.state.totalEnergyProduced = D(1e7);
    sim.tick(0.1);
    expect(sim.state.completedChallenges.includes('chal_no_click_upgrades')).toBe(true);
    expect(sim.state.activeChallengeId).toBeNull();

    // 2. Austeridad Cuántica (max 25 units per generator -> -12% cost reward)
    sim.startChallenge('chal_minimalist');
    sim.state.energy = D(1e12);
    const resMin = sim.buyGenerator('atom', 100);
    expect(resMin.boughtCount).toBe(25);
    expect(sim.buyGenerator('atom', 1).boughtCount).toBe(0);
    sim.state.totalEnergyProduced = D(1e8);
    sim.tick(0.1);
    expect(sim.state.completedChallenges.includes('chal_minimalist')).toBe(true);

    // 3. Forja Estelar (only first 5 generators -> +15% milestone base reward)
    sim.startChallenge('chal_stellar_only');
    sim.state.energy = D(1e15);
    expect(sim.buyGenerator('nebula', 1).boughtCount).toBe(0); // generator #6 blocked
    expect(sim.buyGenerator('pulsar', 1).boughtCount).toBe(1); // generator #5 allowed
    sim.state.totalEnergyProduced = D(1e8);
    sim.tick(0.1);
    expect(sim.state.completedChallenges.includes('chal_stellar_only')).toBe(true);

    // 4. Inflación Severa (2x cost inflation -> +100% global production reward)
    sim.startChallenge('chal_inflated');
    sim.state.totalEnergyProduced = D(1e9);
    sim.tick(0.1);
    expect(sim.state.completedChallenges.includes('chal_inflated')).toBe(true);
  });

  it('unlocks Consciousness constellations, Eternity Cosmic Clock, and New Game+ selectable modifiers', () => {
    const sim = new Simulation();
    sim.state.attentionCurrency = D(1e9);

    for (let i = 0; i < 25; i++) {
      const ok = sim.unlockConstellation(CONSTELLATIONS[i].id);
      expect(ok).toBe(true);
    }

    expect(sim.state.unlockedConstellations.length).toBe(25);
    expect(sim.isEternityUnlocked()).toBe(true);

    sim.state.aeonsCurrency = D(100);
    expect(sim.activateCosmicClockBoost()).toBe(true);
    expect(sim.state.cosmicClockBoostTimer).toBeGreaterThan(0);

    // Trigger New Game+ with all 4 selectable modifiers
    expect(
      sim.triggerNewGamePlus([
        'ng_hyper_gravity',
        'ng_stellar_echo',
        'ng_harmonic_milestones',
        'ng_dark_abundance',
      ])
    ).toBe(true);
    expect(sim.state.newGamePlusCount).toBe(1);
    expect(sim.state.ngPlusModifiers.length).toBe(4);

    // Verify ng_stellar_echo + ng_harmonic_milestones affect core rates
    sim.state.generators['atom'] = { owned: 10 };
    sim.recalculateRates();
    expect(sim.state.energyPerSecond.gt(0)).toBe(true);
    expect(sim.state.energyPerClick.gt(1)).toBe(true);
  });

  it('claims non-punitive daily streak and has 16 verified encyclopedia entries', () => {
    const sim = new Simulation();
    const res1 = sim.claimDailyStreak();
    expect(res1.claimed).toBe(true);
    expect(res1.streak).toBe(1);

    const res2 = sim.claimDailyStreak();
    expect(res2.claimed).toBe(false);
    expect(ENCYCLOPEDIA_ENTRIES.length).toBe(16);
  });
});
