import { describe, it, expect } from 'vitest';
import { D, ZERO } from '@/utils/Decimal';
import {
  calculateBatchCost,
  calculateMaxAffordable,
  calculateGeneratorSPS,
  calculateClickPower,
  calculateBigBangDarkMatter,
  calculateOfflineGains,
  COST_RATIO,
} from '@/core/Economy';
import { GENERATORS, getMilestoneCount } from '@/data/generators';
import { createInitialState } from '@/core/GameState';

describe('Economy & Math Calculations', () => {
  it('calculates single and batch generator costs correctly', () => {
    const baseCost = D(12);
    // Cost of 1st atom starting from 0: 12
    const cost1 = calculateBatchCost(baseCost, COST_RATIO, 0, 1);
    expect(cost1.toNumber()).toBeCloseTo(12, 1);

    // Cost of 2nd atom starting from 1: 12 * 1.15 = 13.8
    const cost2 = calculateBatchCost(baseCost, COST_RATIO, 1, 1);
    expect(cost2.toNumber()).toBeCloseTo(13.8, 1);

    // Cost of 2 atoms at once starting from 0: 12 + 13.8 = 25.8
    const batch2 = calculateBatchCost(baseCost, COST_RATIO, 0, 2);
    expect(batch2.toNumber()).toBeCloseTo(25.8, 1);
  });

  it('batch cost of N equals the sum of individual costs', () => {
    const baseCost = D(90);
    const owned = 5;
    const count = 10;

    let manualSum = ZERO;
    for (let i = 0; i < count; i++) {
      manualSum = manualSum.plus(calculateBatchCost(baseCost, COST_RATIO, owned + i, 1));
    }

    const formulaCost = calculateBatchCost(baseCost, COST_RATIO, owned, count);
    expect(formulaCost.toNumber()).toBeCloseTo(manualSum.toNumber(), 2);
  });

  it('calculateMaxAffordable computes the exact affordable quantity', () => {
    const baseCost = D(12);
    const owned = 0;
    const energy = D(100);

    const { count, cost } = calculateMaxAffordable(baseCost, COST_RATIO, owned, energy);
    expect(count).toBeGreaterThan(0);
    expect(cost.lte(energy)).toBe(true);

    // Buying count + 1 must exceed available energy
    const nextCost = calculateBatchCost(baseCost, COST_RATIO, owned, count + 1);
    expect(nextCost.gt(energy)).toBe(true);
  });

  it('calculates milestone count and multipliers correctly', () => {
    expect(getMilestoneCount(0)).toBe(0);
    expect(getMilestoneCount(9)).toBe(0);
    expect(getMilestoneCount(10)).toBe(1);
    expect(getMilestoneCount(24)).toBe(1);
    expect(getMilestoneCount(25)).toBe(2);
    expect(getMilestoneCount(50)).toBe(3);
    expect(getMilestoneCount(100)).toBe(4);
    expect(getMilestoneCount(500)).toBe(10);
  });

  it('applies milestones (x2 per milestone) to generator SPS', () => {
    const state = createInitialState();
    const atom = GENERATORS[0];

    // 10 atoms: 10 * 0.2 * 2^1 = 4.0
    state.generators['atom'] = { owned: 10 };
    const sps10 = calculateGeneratorSPS(atom, state, D(1));
    expect(sps10.toNumber()).toBeCloseTo(4.0, 2);

    // 25 atoms: 25 * 0.2 * 2^2 = 20.0
    state.generators['atom'] = { owned: 25 };
    const sps25 = calculateGeneratorSPS(atom, state, D(1));
    expect(sps25.toNumber()).toBeCloseTo(20.0, 2);
  });

  it('calculates click power, resonance combo, and high-layer SPS scaling correctly', () => {
    const state = createInitialState();
    state.resonanceMultiplier = 1.0;
    const clickAt1 = calculateClickPower(state, ZERO);
    expect(clickAt1.toNumber()).toBe(1.0);

    // Max resonance combo (x3)
    state.resonanceMultiplier = 3.0;
    const clickAt3 = calculateClickPower(state, ZERO);
    expect(clickAt3.toNumber()).toBe(3.0);

    // Click upgrades + high layer SPS scaling
    state.resonanceMultiplier = 1.0;
    state.upgradesPurchased = ['click_1', 'click_2']; // 2 click upgrades -> x4 base + 2% of SPS
    state.bigBangsTotal = 5; // +5% of SPS
    state.currentEraIndex = 6; // +3% of SPS -> total 10% of SPS
    const sps = D(1e12);
    const scaledClick = calculateClickPower(state, sps);
    expect(scaledClick.gt(D(5e10))).toBe(true);
  });

  it('calculates offline progress with efficiency and 8h cap', () => {
    const state = createInitialState();
    state.generators['atom'] = { owned: 10 }; // 4.0 SPS
    state.offlineEfficiency = 0.5;
    state.maxOfflineSeconds = 28800; // 8 hours

    // 1 hour offline = 3600s * 4.0 SPS * 0.5 = 7200 energy
    const { energyGained: gain1h, actualSeconds: sec1h } = calculateOfflineGains(3600, state);
    expect(sec1h).toBe(3600);
    expect(gain1h.toNumber()).toBeCloseTo(7200, 1);

    // 12 hours offline (should cap at 8 hours = 28800s)
    const { energyGained: gain12h, actualSeconds: sec12h } = calculateOfflineGains(12 * 3600, state);
    expect(sec12h).toBe(28800);
    expect(gain12h.toNumber()).toBeCloseTo(28800 * 4.0 * 0.5, 1);
  });

  it('calculates Big Bang Dark Matter formula correctly', () => {
    // floor(sqrt(energy / 1e7))
    expect(calculateBigBangDarkMatter(D(9.9e6)).toNumber()).toBe(0);
    expect(calculateBigBangDarkMatter(D(1e7)).toNumber()).toBe(1); // sqrt(1) = 1
    expect(calculateBigBangDarkMatter(D(4e7)).toNumber()).toBe(2); // sqrt(4) = 2
    expect(calculateBigBangDarkMatter(D(9e7)).toNumber()).toBe(3); // sqrt(9) = 3
    expect(calculateBigBangDarkMatter(D(1e9)).toNumber()).toBe(10); // sqrt(100) = 10
  });
});
