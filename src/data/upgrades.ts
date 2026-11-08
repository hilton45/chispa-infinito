import { D, Decimal } from '@/utils/Decimal';
import { GENERATORS } from './generators';

export type UpgradeType = 'generator' | 'click' | 'echo' | 'global';

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  quote?: string;
  type: UpgradeType;
  cost: Decimal;
  targetGeneratorId?: string;
  multiplier?: number;
  echoPercent?: number; // e.g. 0.01 for 1%
  requirement: {
    generatorId?: string;
    ownedCount?: number;
    totalClicks?: number;
    totalEnergy?: Decimal;
  };
}

export function generateAllUpgrades(): UpgradeDefinition[] {
  const upgrades: UpgradeDefinition[] = [];

  // 1. Generator upgrades: 3 for each generator (unlocked at 1, 10, 40; cost 5x, 50x, 500x)
  const tierNames = [
    ['Sintonía cuántica', 'Fisión acelerada', 'Enlace primordial'],
    ['Condensación fría', 'Turbulencia molecular', 'Viento estelar'],
    ['Colapso hidrostático', 'Ignición de helio', 'Chorros relativistas'],
    ['Cinturón de radiación', 'Granulación fina', 'Corona activa'],
    ['Campo magnético polar', 'Emisión sincronizada', 'Frecuencia armónica'],
    ['Filamentos ionizados', 'Espectro de emisión', 'Nubes oscuras'],
    ['Disco caliente', 'Curvatura extrema', 'Esfera de fotones'],
    ['Brazos densos', 'Rotación diferencial', 'Cúmulo nuclear'],
    ['Gravedad colectiva', 'Puentes de marea', 'Halo extendido'],
    ['Cosmología armónica', 'Inflación sostenida', 'Frontera observable'],
    ['Acreción hiperlumínica', 'Chorro gamma', 'Faro del abismo'],
    ['Oscilación dimensional', 'Tensión de Planck', 'Matriz vibratoria'],
    ['Modos armónicos', 'Tensión infinita', 'Ruptura topológica'],
    ['Vacío enriquecido', 'Bifurcación causal', 'Evolución cuántica'],
    ['Conexión sináptica', 'Introspección cósmica', 'Autoconciencia universal'],
    ['Bucle infinito', 'El primer destello', 'Génesis perpetuo'],
  ];

  for (let i = 0; i < GENERATORS.length; i++) {
    const gen = GENERATORS[i];
    const tiers = tierNames[i] || ['Nivel I', 'Nivel II', 'Nivel III'];

    // Tier 1: req 1, cost 5x
    upgrades.push({
      id: `${gen.id}_up1`,
      name: `${gen.name}: ${tiers[0]}`,
      description: `Duplica la producción de ${gen.name}.`,
      type: 'generator',
      targetGeneratorId: gen.id,
      multiplier: 2,
      cost: gen.baseCost.times(5),
      requirement: { generatorId: gen.id, ownedCount: 1 },
    });

    // Tier 2: req 10, cost 50x
    upgrades.push({
      id: `${gen.id}_up2`,
      name: `${gen.name}: ${tiers[1]}`,
      description: `Duplica la producción de ${gen.name}.`,
      type: 'generator',
      targetGeneratorId: gen.id,
      multiplier: 2,
      cost: gen.baseCost.times(50),
      requirement: { generatorId: gen.id, ownedCount: 10 },
    });

    // Tier 3: req 40, cost 500x
    upgrades.push({
      id: `${gen.id}_up3`,
      name: `${gen.name}: ${tiers[2]}`,
      description: `Duplica la producción de ${gen.name}.`,
      type: 'generator',
      targetGeneratorId: gen.id,
      multiplier: 2,
      cost: gen.baseCost.times(500),
      requirement: { generatorId: gen.id, ownedCount: 40 },
    });
  }

  // 2. Click upgrades (6 tiers, x2 each)
  const clickUpgradesData = [
    { id: 'click_1', name: 'Toque Primordial', desc: 'Duplica el poder de cada clic.', cost: D(100), clicks: 10 },
    { id: 'click_2', name: 'Pulso de Plasma', desc: 'Duplica el poder de cada clic.', cost: D(1_500), clicks: 50 },
    { id: 'click_3', name: 'Ignición Nuclear', desc: 'Duplica el poder de cada clic.', cost: D(25_000), clicks: 150 },
    { id: 'click_4', name: 'Descarga Electromagnética', desc: 'Duplica el poder de cada clic.', cost: D(600_000), clicks: 350 },
    { id: 'click_5', name: 'Resonancia Galáctica', desc: 'Duplica el poder de cada clic.', cost: D(25_000_000), clicks: 750 },
    { id: 'click_6', name: 'Chispa del Multiverso', desc: 'Duplica el poder de cada clic.', cost: D(1_500_000_000), clicks: 1500 },
  ];

  for (const cu of clickUpgradesData) {
    upgrades.push({
      id: cu.id,
      name: cu.name,
      description: cu.desc,
      type: 'click',
      multiplier: 2,
      cost: cu.cost,
      requirement: { totalClicks: cu.clicks },
    });
  }

  // 3. Echo upgrades (3 tiers: click gains % of passive SPS)
  const echoUpgradesData = [
    { id: 'echo_1', name: 'Eco Armónico I', percent: 0.01, desc: 'Los clics ganan un +1% de tu producción por segundo.', cost: D(8_000), genId: 'atom', count: 15 },
    { id: 'echo_2', name: 'Eco Armónico II', percent: 0.02, desc: 'Los clics ganan un +2% adicional de tu producción por segundo.', cost: D(350_000), genId: 'dwarf_star', count: 15 },
    { id: 'echo_3', name: 'Eco Armónico III', percent: 0.03, desc: 'Los clics ganan un +3% adicional de tu producción por segundo.', cost: D(80_000_000), genId: 'galaxy', count: 15 },
  ];

  for (const eu of echoUpgradesData) {
    upgrades.push({
      id: eu.id,
      name: eu.name,
      description: eu.desc,
      type: 'echo',
      echoPercent: eu.percent,
      cost: eu.cost,
      requirement: { generatorId: eu.genId, ownedCount: eu.count },
    });
  }

  // 4. Global production upgrades (5 tiers)
  const globalUpgradesData = [
    { id: 'global_1', name: 'Sintonía del Vacío', mult: 1.1, desc: 'Aumenta toda la producción un +10%.', cost: D(50_000), energy: D(25_000) },
    { id: 'global_2', name: 'Constante Fina', mult: 1.25, desc: 'Aumenta toda la producción un +25%.', cost: D(1_500_000), energy: D(800_000) },
    { id: 'global_3', name: 'Fluctuación Cuántica', mult: 1.5, desc: 'Aumenta toda la producción un +50%.', cost: D(60_000_000), energy: D(30_000_000) },
    { id: 'global_4', name: 'Materia Bariónica', mult: 1.75, desc: 'Aumenta toda la producción un +75%.', cost: D(3_000_000_000), energy: D(1.5e9) },
    { id: 'global_5', name: 'Supercuerdas', mult: 2.0, desc: 'Duplica toda la producción de energía.', cost: D(150_000_000_000), energy: D(75e9) },
  ];

  for (const gu of globalUpgradesData) {
    upgrades.push({
      id: gu.id,
      name: gu.name,
      description: gu.desc,
      type: 'global',
      multiplier: gu.mult,
      cost: gu.cost,
      requirement: { totalEnergy: gu.energy },
    });
  }

  return upgrades;
}

export const UPGRADES: UpgradeDefinition[] = generateAllUpgrades();
