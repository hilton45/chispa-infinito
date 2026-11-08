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

  it('completes Cosmic Challenges and applies permanent bonus', () => {
    const sim = new Simulation();
    sim.startChallenge('chal_no_click_upgrades');
    expect(sim.state.activeChallengeId).toBe('chal_no_click_upgrades');

    // Buying click upgrade is restricted during chal_no_click_upgrades
    sim.state.energy = D(10000);
    expect(sim.buyUpgrade('click_1')).toBe(false);

    // Reach challenge goal 1e7
    sim.state.totalEnergyProduced = D(1e7);
    sim.tick(0.1);
    expect(sim.state.completedChallenges.includes('chal_no_click_upgrades')).toBe(true);
    expect(sim.state.activeChallengeId).toBeNull();
  });

  it('unlocks Consciousness constellations and Eternity Cosmic Clock', () => {
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

    expect(sim.triggerNewGamePlus()).toBe(true);
    expect(sim.state.newGamePlusCount).toBe(1);
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
