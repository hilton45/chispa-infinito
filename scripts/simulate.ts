import { Simulation } from '../src/core/Simulation';
import { GENERATORS, getMilestoneCount } from '../src/data/generators';
import { UPGRADES } from '../src/data/upgrades';
import { DARK_MATTER_NODES } from '../src/data/darkMatterTree';
import { formatDecimal, formatTime } from '../src/utils/Decimal';

interface PacingResult {
  firstGeneratorTime: number;
  fiveGeneratorsTime: number;
  tenGeneratorsTime: number;
  firstBigBangTime: number;
  secondBigBangTime: number;
  multiverseTime: number;
}

export function runSimulationBot(options?: { maxSimulatedSeconds?: number; verbose?: boolean }): PacingResult {
  const maxSeconds = options?.maxSimulatedSeconds ?? 45000;
  const verbose = options?.verbose ?? true;
  const sim = new Simulation();

  let simTime = 0;
  const dt = 0.1; // 100ms step
  let clickAccumulator = 0;

  let firstGenTime = -1;
  let fiveGensTime = -1;
  let tenGensTime = -1;
  let firstBigBangTime = -1;
  let secondBigBangTime = -1;
  let multiverseTime = -1;
  let bigBangCount = 0;

  if (verbose) {
    console.log('====================================================');
    console.log('   CHISPA ∞ · SIMULADOR DE BALANCE ECONÓMICO        ');
    console.log('====================================================');
    console.log('Estrategia: Clics activos + prioridad de descubrimiento y mejor ROI\n');
  }

  let cometTimer = 0;
  let nextCometDelay = 65; // average between 50-110s

  while (simTime < maxSeconds) {
    simTime += dt;
    clickAccumulator += dt;
    cometTimer += dt;

    // Realistic active clicking: ~2.5 clicks per second
    if (clickAccumulator >= 0.4) {
      sim.clickCore();
      clickAccumulator = 0;
    }

    // Comets appear every 50-110 seconds
    if (cometTimer >= nextCometDelay) {
      cometTimer = 0;
      nextCometDelay = 50 + Math.random() * 60;
      // Pick random comet type: Frenzy (x7, 30s), Divine Click (x50, 10s), Star Rain
      const r = Math.random();
      if (r < 0.4) {
        sim.catchComet({ type: 'frenzy', multiplier: 7, duration: 30, name: 'Cometa de Frenesí' });
      } else if (r < 0.7) {
        sim.catchComet({ type: 'divine_click', multiplier: 50, duration: 10, name: 'Cometa Divino' });
      } else {
        sim.catchComet({ type: 'star_rain', multiplier: 1, duration: 0, name: 'Cometa de Lluvia Estelar' });
      }
    }

    // Step simulation
    sim.tick(dt);

    // AI Decision: Check affordable upgrades first (high ROI)
    for (const up of UPGRADES) {
      if (!sim.state.upgradesPurchased.includes(up.id)) {
        if (sim.state.energy.gte(up.cost)) {
          // Check requirement
          let reqMet = true;
          if (up.requirement.generatorId && up.requirement.ownedCount) {
            const owned = sim.state.generators[up.requirement.generatorId]?.owned ?? 0;
            if (owned < up.requirement.ownedCount) reqMet = false;
          }
          if (up.requirement.totalClicks && sim.state.totalClicks < up.requirement.totalClicks) {
            reqMet = false;
          }
          if (up.requirement.totalEnergy && sim.state.totalEnergyProduced.lt(up.requirement.totalEnergy)) {
            reqMet = false;
          }

          if (reqMet) {
            sim.buyUpgrade(up.id);
          }
        }
      }
    }

    // AI Decision: Check if we can unlock the next unowned generator!
    // Players prioritize unlocking the next tier as soon as they have the energy
    let nextUnownedGen = GENERATORS.find((g) => (sim.state.generators[g.id]?.owned ?? 0) === 0);
    if (nextUnownedGen && sim.state.energy.gte(nextUnownedGen.baseCost)) {
      sim.buyGenerator(nextUnownedGen.id, 1);
    } else {
      // Otherwise, buy the generator with the best ROI
      let bestGenId: string | null = null;
      let bestROI = 0;

      for (const gen of GENERATORS) {
        const owned = sim.state.generators[gen.id]?.owned ?? 0;
        if (owned === 0 && gen.baseCost.gt(sim.state.energy)) continue;

        const cost = gen.baseCost.times(Math.pow(gen.costMultiplier, owned));
        if (sim.state.energy.gte(cost)) {
          const nextMilestoneMult = getMilestoneCount(owned + 1) > getMilestoneCount(owned) ? 2 : 1;
          const spsGain = gen.baseProduction.toNumber() * nextMilestoneMult;
          const roi = spsGain / cost.toNumber();

          if (roi > bestROI) {
            bestROI = roi;
            bestGenId = gen.id;
          }
        }
      }

      if (bestGenId) {
        sim.buyGenerator(bestGenId, 1);
      }
    }

    // Check milestones
    const distinctGensOwned = Object.values(sim.state.generators).filter((g) => g.owned > 0).length;

    if (firstGenTime < 0 && distinctGensOwned >= 1) {
      firstGenTime = simTime;
      if (verbose) console.log(`[HITO 1] Primer generador (Átomo): ${formatTime(firstGenTime)} (Meta: ~10 s)`);
    }

    if (fiveGensTime < 0 && distinctGensOwned >= 5) {
      fiveGensTime = simTime;
      if (verbose) console.log(`[HITO 2] 5 tipos de generadores (Púlsar): ${formatTime(fiveGensTime)} (Meta: ~5 min)`);
    }

    if (tenGensTime < 0 && distinctGensOwned >= 10) {
      tenGensTime = simTime;
      if (verbose) console.log(`[HITO 3] 10 tipos de generadores (Universo): ${formatTime(tenGensTime)}`);
    }

    // Big Bang Check: Players prestige when they can gain significant Dark Matter
    // Target Dark Matter increases with each run: 1, 3, 8, 20, 50, 120, 300, 800, 2000, 5000
    const dmTargets = [1, 3, 8, 20, 50, 120, 300, 800, 2000, 5000];
    const currentDMTarget = dmTargets[bigBangCount] ?? 5000;
    const pendingDM = Math.floor(Math.sqrt(sim.state.totalEnergyProduced.dividedBy(1e7).toNumber()));

    if (pendingDM >= currentDMTarget) {
      if (firstBigBangTime < 0) {
        firstBigBangTime = simTime;
        if (verbose) {
          console.log(`[HITO 4] Primer Big Bang disponible (1 DM): ${formatTime(firstBigBangTime)} (Meta: 20-30 min)`);
        }
        sim.triggerBigBang();
        bigBangCount++;
        for (const node of DARK_MATTER_NODES) {
          if (!sim.state.darkMatterUpgrades.includes(node.id) && sim.state.darkMatter.gte(node.cost)) {
            sim.buyDarkMatterUpgrade(node.id);
          }
        }
    // Measure when run 2 reaches 1e7 (equivalent milestone to run 1)
    if (bigBangCount === 1 && sim.state.totalEnergyProduced.gte(1e7) && secondBigBangTime < 0) {
      secondBigBangTime = simTime - firstBigBangTime;
      if (verbose) {
        const ratioPercent = ((secondBigBangTime / firstBigBangTime) * 100).toFixed(0);
        console.log(`[HITO 5] Segundo Big Bang (a 1e7 equivalente): tomó ${formatTime(secondBigBangTime)} (~${ratioPercent}% del primero, Meta: ~60%)`);
      }
    }
      } else if (bigBangCount < 10) {
        sim.triggerBigBang();
        bigBangCount++;
        if (verbose) {
          console.log(`[Big Bang ${bigBangCount}] Realizado a los ${formatTime(simTime)} con ${pendingDM} DM`);
        }
        for (const node of DARK_MATTER_NODES) {
          if (!sim.state.darkMatterUpgrades.includes(node.id) && sim.state.darkMatter.gte(node.cost)) {
            sim.buyDarkMatterUpgrade(node.id);
          }
        }
      }
    }

    if (multiverseTime < 0 && (bigBangCount >= 10 || sim.state.allTimeEnergyProduced.gte(1e15))) {
      multiverseTime = simTime;
      if (verbose) {
        console.log(`[HITO 6] Multiverso desbloqueado: ${formatTime(multiverseTime)} (Meta: 6-10 h)`);
      }
      break;
    }
  }

  if (verbose) {
    console.log('\n--- RESUMEN FINAL ---');
    console.log(`Energía acumulada: ${formatDecimal(sim.state.allTimeEnergyProduced)}`);
    console.log(`Big Bangs realizados: ${sim.state.bigBangsTotal}`);
    console.log(`Materia Oscura: ${formatDecimal(sim.state.darkMatterTotal)}`);
    console.log(`Mejoras de Materia Oscura compradas: ${sim.state.darkMatterUpgrades.length}`);
  }

  return {
    firstGeneratorTime: firstGenTime,
    fiveGeneratorsTime: fiveGensTime,
    tenGeneratorsTime: tenGensTime,
    firstBigBangTime,
    secondBigBangTime,
    multiverseTime,
  };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('simulate')) {
  runSimulationBot();
}
