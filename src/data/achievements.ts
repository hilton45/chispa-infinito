import { D } from '@/utils/Decimal';
import { GENERATORS } from './generators';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: 'energy' | 'clicks' | 'generators' | 'combo' | 'comets' | 'prestige' | 'secrets';
  secret?: boolean;
  rewardSkinId?: string;
  condition: (state: any) => boolean;
}

export function generateAllAchievements(): AchievementDefinition[] {
  const list: AchievementDefinition[] = [];

  // 1. Clicks (13 achievements)
  const clickCounts = [
    { n: 1, name: 'Primer Chispazo', desc: 'Haz tu primer clic en el vacío.' },
    { n: 10, name: 'Fricción Atómica', desc: 'Haz 10 clics.' },
    { n: 50, name: 'Encendido Cuántico', desc: 'Haz 50 clics.' },
    { n: 100, name: 'Pulso Constante', desc: 'Haz 100 clics.' },
    { n: 250, name: 'Cadencia Estelar', desc: 'Haz 250 clics.' },
    { n: 500, name: 'Dedo Relativista', desc: 'Haz 500 clics.' },
    { n: 1_000, name: 'Mil Chisporroteos', desc: 'Haz 1.000 clics.' },
    { n: 2_500, name: 'Ritmo Sináptico', desc: 'Haz 2.500 clics.' },
    { n: 5_000, name: 'Tempestad de Clics', desc: 'Haz 5.000 clics.' },
    { n: 10_000, name: 'El Toque de la Creación', desc: 'Haz 10.000 clics.', rewardSkinId: 'skin_solar_flare' },
    { n: 25_000, name: 'Martillo Cósmico', desc: 'Haz 25.000 clics.' },
    { n: 50_000, name: 'Resonador Primario', desc: 'Haz 50.000 clics.' },
    { n: 100_000, name: 'Fiebre de Energía', desc: 'Haz 100.000 clics.' },
  ];

  for (const c of clickCounts) {
    list.push({
      id: `ach_clicks_${c.n}`,
      name: c.name,
      description: c.desc,
      category: 'clicks',
      rewardSkinId: c.rewardSkinId,
      condition: (s) => s.totalClicks >= c.n,
    });
  }

  // 2. Energy Milestones (25 achievements)
  const energyLevels = [
    { val: D(10), name: 'Breve Destello' },
    { val: D(100), name: 'Pequeña Brasa' },
    { val: D(1_000), name: 'Luz Cálida' },
    { val: D(10_000), name: 'Lámpara Primordial' },
    { val: D(100_000), name: 'Hoguera Cósmica' },
    { val: D(1e6), name: 'Faro de Neutrones' },
    { val: D(10e6), name: 'Explosión de Rayos Gamma' },
    { val: D(100e6), name: 'Brillo de Supernova' },
    { val: D(1e9), name: 'Luminosidad Galáctica' },
    { val: D(10e9), name: 'Cúmulo Encendido' },
    { val: D(100e9), name: 'Resplandor Macro' },
    { val: D(1e12), name: 'Abismo Iluminado' },
    { val: D(10e12), name: 'Océano de Fotones' },
    { val: D(100e12), name: 'Mar Radiante' },
    { val: D(1e15), name: 'Horizonte Brillante' },
    { val: D(10e15), name: 'Marea Universal' },
    { val: D(100e15), name: 'Eterno Mediodía' },
    { val: D(1e18), name: 'Multiverso en Llamas' },
    { val: D(10e18), name: 'Génesis Continuo' },
    { val: D(100e18), name: 'Sinfonía Radiante' },
    { val: D(1e21), name: 'Límite de Chandrasekhar' },
    { val: D(1e24), name: 'Cosmos Exponencial' },
    { val: D(1e27), name: 'Hiperdensidad Estelar' },
    { val: D(1e30), name: 'Monopolio Térmico' },
    { val: D(1e33), name: 'Chispa Infinita' },
  ];

  for (const e of energyLevels) {
    list.push({
      id: `ach_energy_${e.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: e.name,
      description: `Acumula ${e.val.toExponential(0)} de energía total producida.`,
      category: 'energy',
      condition: (s) => s.totalEnergyProduced.gte(e.val),
    });
  }

  // 3. SPS Milestones (15 achievements)
  const spsLevels = [
    { val: D(1), name: 'Primer Goteo' },
    { val: D(10), name: 'Arroyo de Luz' },
    { val: D(100), name: 'Río de Fotones' },
    { val: D(1_000), name: 'Torrente Estelar' },
    { val: D(10_000), name: 'Cascada de Fusión' },
    { val: D(100_000), name: 'Tsunami Cósmico' },
    { val: D(1e6), name: 'Flujo Superlumínico' },
    { val: D(10e6), name: 'Régimen Hiperactivo' },
    { val: D(100e6), name: 'Cataratas de Andrómeda' },
    { val: D(1e9), name: 'Diluvio Galáctico' },
    { val: D(10e9), name: 'Manantial de Quásares' },
    { val: D(100e9), name: 'Fuente Universal' },
    { val: D(1e12), name: 'Superflujo Dimensional' },
    { val: D(1e15), name: 'Transfusión del Multiverso' },
    { val: D(1e18), name: 'Emanación Absoluta' },
  ];

  for (const sp of spsLevels) {
    list.push({
      id: `ach_sps_${sp.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: sp.name,
      description: `Alcanza una producción de ${sp.val.toExponential(0)} energía por segundo.`,
      category: 'energy',
      condition: (s) => s.energyPerSecond.gte(sp.val),
    });
  }

  // 4. Generator Owned Milestones (16 generators * 4 tiers = 64 achievements)
  const genCounts = [
    { n: 1, suffix: 'Naciente' },
    { n: 10, suffix: 'Agrupado' },
    { n: 50, suffix: 'Dominante' },
    { n: 100, suffix: 'Centenario' },
  ];

  for (const gen of GENERATORS) {
    for (const gc of genCounts) {
      list.push({
        id: `ach_gen_${gen.id}_${gc.n}`,
        name: `${gen.name} ${gc.suffix}`,
        description: `Posee al menos ${gc.n} unidades de ${gen.name}.`,
        category: 'generators',
        condition: (s) => (s.generators[gen.id]?.owned ?? 0) >= gc.n,
      });
    }
  }

  // 5. Combo & Resonance (6 achievements)
  const comboTiers = [
    { n: 5, name: 'Sincronía Leve' },
    { n: 10, name: 'Armonía Cuántica' },
    { n: 15, name: 'Frecuencia Sonora' },
    { n: 20, name: 'Canto del Núcleo' },
    { n: 25, name: 'Sobrecarga Lumínica' },
    { n: 30, name: 'Resonancia Total', rewardSkinId: 'skin_rainbow_resonator' },
  ];

  for (const cb of comboTiers) {
    list.push({
      id: `ach_combo_${cb.n}`,
      name: cb.name,
      description: `Alcanza un combo de Resonancia de ×${(1 + (cb.n / 30) * 2).toFixed(1)} (${cb.n} clics rápidos).`,
      category: 'combo',
      rewardSkinId: cb.rewardSkinId,
      condition: (s) => s.maxResonanceComboReached >= cb.n,
    });
  }

  // 6. Comets (6 achievements)
  const cometTiers = [
    { n: 1, name: 'Deseo Fugaz' },
    { n: 5, name: 'Cazador de Estelas' },
    { n: 15, name: 'Recolector de Polvo' },
    { n: 30, name: 'Lluvia Dorada' },
    { n: 50, name: 'Guardián del Cielo' },
    { n: 100, name: 'Cometa Domado', rewardSkinId: 'skin_comet_gold' },
  ];

  for (const cm of cometTiers) {
    list.push({
      id: `ach_comets_${cm.n}`,
      name: cm.name,
      description: `Atrapa ${cm.n} cometas dorados.`,
      category: 'comets',
      rewardSkinId: cm.rewardSkinId,
      condition: (s) => s.totalCometsCaught >= cm.n,
    });
  }

  // 7. Prestige & Big Bang (10 achievements)
  const prestigeTiers = [
    { id: 'bb_1', name: 'El Gran Reinicio', desc: 'Desata tu primer Big Bang.', cond: (s: any) => s.bigBangsTotal >= 1, rewardSkinId: 'skin_void_black_hole' },
    { id: 'bb_2', name: 'Segunda Oportunidad', desc: 'Realiza 2 Big Bangs.', cond: (s: any) => s.bigBangsTotal >= 2 },
    { id: 'bb_5', name: 'Ciclo Perpetuo', desc: 'Realiza 5 Big Bangs.', cond: (s: any) => s.bigBangsTotal >= 5 },
    { id: 'bb_10', name: 'Señor del Ciclo', desc: 'Realiza 10 Big Bangs y abre el Multiverso.', cond: (s: any) => s.bigBangsTotal >= 10 },
    { id: 'bb_25', name: 'Maestro del Samsara', desc: 'Realiza 25 Big Bangs.', cond: (s: any) => s.bigBangsTotal >= 25 },
    { id: 'dm_1', name: 'Materia Oculta', desc: 'Consigue tu primer punto de Materia Oscura.', cond: (s: any) => s.darkMatterTotal.gte(1) },
    { id: 'dm_10', name: 'Gravedad Sombra', desc: 'Acumula 10 Materia Oscura.', cond: (s: any) => s.darkMatterTotal.gte(10) },
    { id: 'dm_100', name: 'Filamentos Oscuros', desc: 'Acumula 100 Materia Oscura.', cond: (s: any) => s.darkMatterTotal.gte(100) },
    { id: 'dm_1000', name: 'Monolito Sombrío', desc: 'Acumula 1.000 Materia Oscura.', cond: (s: any) => s.darkMatterTotal.gte(1000) },
    { id: 'dm_10000', name: 'Arquitecto Cósmico', desc: 'Acumula 10.000 Materia Oscura.', cond: (s: any) => s.darkMatterTotal.gte(10000) },
  ];

  for (const pt of prestigeTiers) {
    list.push({
      id: `ach_prestige_${pt.id}`,
      name: pt.name,
      description: pt.desc,
      category: 'prestige',
      rewardSkinId: pt.rewardSkinId,
      condition: pt.cond,
    });
  }

  // 8. Secret Achievements (18 achievements)
  const secrets = [
    { id: 'sec_speed_click', name: 'Dedos de Luz', desc: 'Haz 15 clics en menos de 2 segundos.', cond: (s: any) => s.clicksInTwoSeconds >= 15 },
    { id: 'sec_max_combo_hold', name: 'Paciencia en el Clímax', desc: 'Mantén el combo máximo (x3) durante 5 segundos seguidos.', cond: (s: any) => s.maxComboDuration >= 5 },
    { id: 'sec_comet_during_max_combo', name: 'Momento Dorado', desc: 'Atrapa un cometa dorado teniendo el combo máximo de Resonancia activado.', cond: (s: any) => s.caughtCometAtMaxCombo },
    { id: 'sec_pure_clicker', name: 'Monje de la Chispa', desc: 'Alcanza 1.000 de energía sin comprar ningún generador.', cond: (s: any) => s.totalEnergyProduced.gte(1000) && s.totalGeneratorsOwned === 0 },
    { id: 'sec_atomic_age', name: 'Solo Átomos', desc: 'Alcanza 100.000 de energía teniendo únicamente Átomos comprados.', cond: (s: any) => s.totalEnergyProduced.gte(100000) && s.generators['atom']?.owned > 0 && s.totalNonAtomGenerators === 0 },
    { id: 'sec_the_answer', name: '42', desc: 'Ten exactamente 42 unidades de cualquier generador.', cond: (s: any) => Object.values(s.generators).some((g: any) => g.owned === 42) },
    { id: 'sec_night_owl', name: 'Vigilia Cósmica', desc: 'Juega entre las 3:00 y las 4:00 de la madrugada.', cond: (s: any) => s.playedAtNightHour },
    { id: 'sec_offline_master', name: 'El Largo Sueño', desc: 'Regresa al juego tras al menos 4 horas de ausencia.', cond: (s: any) => s.offlineDurationSeconds >= 14400 },
    { id: 'sec_zen_seeker', name: 'Silencio Absoluto', desc: 'Permanece en el modo Zen durante más de 60 segundos.', cond: (s: any) => s.timeInZenMode >= 60 },
    { id: 'sec_black_hole_gazer', name: 'Mirando al Abismo', desc: 'Contempla el centro del agujero negro durante 30 segundos.', cond: (s: any) => s.blackHoleGazeSeconds >= 30 },
    { id: 'sec_era_8', name: 'Despertar Universal', desc: 'Alcanza la Era de la Conciencia.', cond: (s: any) => s.currentEraIndex >= 7 },
    { id: 'sec_era_16', name: 'Génesis Infinito', desc: 'Alcanza la Era de la Chispa Suprema.', cond: (s: any) => s.currentEraIndex >= 15 },
    { id: 'sec_balanced_universe', name: 'Simetría Cuántica', desc: 'Ten al menos 10 unidades de los primeros 5 generadores al mismo tiempo.', cond: (s: any) => ['atom', 'gas_cloud', 'protostar', 'dwarf_star', 'pulsar'].every(id => (s.generators[id]?.owned ?? 0) >= 10) },
    { id: 'sec_rapid_fire_comets', name: 'Tríada Celestial', desc: 'Atrapa 3 cometas en menos de 5 minutos.', cond: (s: any) => s.cometsInFiveMinutes >= 3 },
    { id: 'sec_news_reader', name: 'Lector Empedernido', desc: 'Lee o deja pasar al menos 20 noticias del ticker cósmico.', cond: (s: any) => s.newsReadCount >= 20 },
    { id: 'sec_backup_keeper', name: 'Memorias del Vacío', desc: 'Exporta tu partida a una cadena de texto para tener una copia de seguridad.', cond: (s: any) => s.hasExportedSave },
    { id: 'sec_constellation_artist', name: 'Dibujante Estelar', desc: 'Traza tu primera constelación completa en el cielo.', cond: (s: any) => s.constellationsDrawn >= 1 },
    { id: 'sec_observer_friend', name: 'Saludo al Observador', desc: 'Haz clic sobre el Observador para escuchar su pensamiento.', cond: (s: any) => s.clickedObserver },
  ];

  for (const sc of secrets) {
    list.push({
      id: `ach_sec_${sc.id}`,
      name: sc.name,
      description: sc.desc,
      category: 'secrets',
      secret: true,
      condition: sc.cond,
    });
  }

  return list;
}

export const ACHIEVEMENTS: AchievementDefinition[] = generateAllAchievements();
