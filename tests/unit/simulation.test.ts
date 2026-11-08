import { describe, it, expect } from 'vitest';
import { Simulation } from '@/core/Simulation';
import { D } from '@/utils/Decimal';

describe('Simulation Engine', () => {
  it('initializes with default state', () => {
    const sim = new Simulation();
    expect(sim.state.energy.toNumber()).toBe(0);
    expect(sim.state.energyPerClick.toNumber()).toBe(1);
    expect(sim.state.generators['atom'].owned).toBe(0);
  });

  it('clicking generates energy and builds combo', () => {
    const sim = new Simulation();
    sim.clickCore();
    expect(sim.state.energy.toNumber()).toBe(1);
    expect(sim.state.resonanceCombo).toBe(1);

    // Rapid second click within 0.7s
    sim.clickCore();
    expect(sim.state.resonanceCombo).toBe(2);
    expect(sim.state.energy.toNumber()).toBeGreaterThan(1);
  });

  it('resonance decays if timer exceeds 0.7s', () => {
    const sim = new Simulation();
    sim.clickCore();
    sim.clickCore();
    sim.clickCore();
    expect(sim.state.resonanceCombo).toBe(3);

    // Advance tick by 1.0 second (exceeds 0.7s)
    sim.tick(1.0);
    expect(sim.state.resonanceCombo).toBeLessThan(3);
  });

  it('can buy generators and starts producing energy', () => {
    const sim = new Simulation();
    // Give 100 energy
    sim.state.energy = D(100);
    const { boughtCount, cost } = sim.buyGenerator('atom', 1);

    expect(boughtCount).toBe(1);
    expect(cost.toNumber()).toBe(12);
    expect(sim.state.generators['atom'].owned).toBe(1);
    expect(sim.state.energyPerSecond.toNumber()).toBeCloseTo(0.2, 2);

    // Tick 5 seconds -> 5 * 0.2 = 1.0 energy produced
    const prevEnergy = sim.state.energy.toNumber();
    sim.tick(5);
    expect(sim.state.energy.toNumber()).toBeCloseTo(prevEnergy + 1.0, 1);
  });

  it('can execute Big Bang and keeps dark matter bonus', () => {
    const sim = new Simulation();
    // Simulate end of run with 4e7 energy
    sim.state.totalEnergyProduced = D(4e7);
    sim.state.generators['atom'] = { owned: 50 };

    const { darkMatterGained } = sim.triggerBigBang();
    expect(darkMatterGained.toNumber()).toBe(2); // floor(sqrt(4)) = 2
    expect(sim.state.darkMatterTotal.toNumber()).toBe(2);
    expect(sim.state.generators['atom'].owned).toBe(0); // reset
    expect(sim.state.bigBangsTotal).toBe(1);

    // Now buy 10 atoms: base is 4.0 SPS, with 2 DM (+20%) and 2 achievements unlocked (+4%), SPS is 4.0 * 1.20 * 1.04 = 4.992
    sim.state.generators['atom'] = { owned: 10 };
    sim.recalculateRates();
    expect(sim.state.energyPerSecond.toNumber()).toBeCloseTo(4.992, 2);
  });
});
