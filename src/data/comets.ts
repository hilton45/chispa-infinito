import { ActiveCometEffect } from '@/core/GameState';

export interface CometDefinition {
  id: string;
  name: string;
  subtitle: string;
  effectType: ActiveCometEffect['type'];
  multiplier: number;
  duration: number;
  color: number;
  weight: number;
  isRisk?: boolean;
}

export const COMET_TYPES: CometDefinition[] = [
  {
    id: 'comet_star_rain',
    name: 'Cometa de Lluvia Estelar',
    subtitle: '+15% del banco (hasta 15 min de producción)',
    effectType: 'star_rain',
    multiplier: 1,
    duration: 0,
    color: 0xfbbf24,
    weight: 22,
  },
  {
    id: 'comet_frenzy',
    name: 'Cometa de Frenesí',
    subtitle: 'Producción ×7 durante 30 s',
    effectType: 'frenzy',
    multiplier: 7,
    duration: 30,
    color: 0xf59e0b,
    weight: 20,
  },
  {
    id: 'comet_divine_click',
    name: 'Cometa de Clic Divino',
    subtitle: 'Clics ×50 durante 10 s',
    effectType: 'divine_click',
    multiplier: 50,
    duration: 10,
    color: 0x38bdf8,
    weight: 16,
  },
  {
    id: 'comet_time_echo',
    name: 'Cometa de Eco Temporal',
    subtitle: '+5 minutos de producción instantánea',
    effectType: 'milestone_rain',
    multiplier: 300,
    duration: 0,
    color: 0x2dd4bf,
    weight: 14,
  },
  {
    id: 'comet_milestone_rain',
    name: 'Cometa de Hitos Dorados',
    subtitle: 'Producción ×12 durante 15 s',
    effectType: 'frenzy',
    multiplier: 12,
    duration: 15,
    color: 0xa855f7,
    weight: 10,
  },
  {
    id: 'comet_cursed',
    name: 'Cometa Maldito del Abismo',
    subtitle: 'Riesgo cuántico: 70% de ×25 por 20 s, 30% de ×0.5 por 10 s',
    effectType: 'cursed_surge',
    multiplier: 25,
    duration: 20,
    color: 0xf43f5e,
    weight: 8,
    isRisk: true,
  },
  {
    id: 'comet_supernova',
    name: 'Cometa Supernova',
    subtitle: 'Producción ×15 durante 20 s',
    effectType: 'frenzy',
    multiplier: 15,
    duration: 20,
    color: 0xfb923c,
    weight: 6,
  },
  {
    id: 'comet_pulsar_sync',
    name: 'Cometa de Púlsar',
    subtitle: 'Clics ×100 durante 8 s',
    effectType: 'divine_click',
    multiplier: 100,
    duration: 8,
    color: 0x06b6d4,
    weight: 6,
  },
  {
    id: 'comet_nebula_bloom',
    name: 'Cometa de Nebulosa',
    subtitle: 'Producción ×5 durante 60 s',
    effectType: 'frenzy',
    multiplier: 5,
    duration: 60,
    color: 0xe879f9,
    weight: 8,
  },
  {
    id: 'comet_quantum_leap',
    name: 'Cometa de Salto Cuántico',
    subtitle: '+10 minutos de producción instantánea',
    effectType: 'milestone_rain',
    multiplier: 600,
    duration: 0,
    color: 0x34d399,
    weight: 5,
  },
  {
    id: 'comet_dark_whisper',
    name: 'Cometa de Sombra Áurea',
    subtitle: 'Producción ×20 durante 12 s',
    effectType: 'frenzy',
    multiplier: 20,
    duration: 12,
    color: 0xc084fc,
    weight: 4,
  },
  {
    id: 'comet_primordial_spark',
    name: 'Cometa de la Primera Chispa',
    subtitle: 'Producción ×30 durante 15 s y Clics ×30',
    effectType: 'frenzy',
    multiplier: 30,
    duration: 15,
    color: 0xfef08a,
    weight: 2,
  },
];

export interface WeeklyEvent {
  id: string;
  name: string;
  description: string;
  boostedGeneratorId: string;
  generatorMultiplier: number;
  cometFrequencyBonus: number;
}

export const WEEKLY_EVENTS: WeeklyEvent[] = [
  {
    id: 'week_pulsar',
    name: 'Semana del Púlsar',
    description: 'Púlsares ×2 de producción y +20% frecuencia de cometas.',
    boostedGeneratorId: 'pulsar',
    generatorMultiplier: 2.0,
    cometFrequencyBonus: 1.2,
  },
  {
    id: 'week_nebula',
    name: 'Festival de las Nebulosas',
    description: 'Nebulosas ×2 de producción y cometas más brillantes.',
    boostedGeneratorId: 'nebula',
    generatorMultiplier: 2.0,
    cometFrequencyBonus: 1.15,
  },
  {
    id: 'week_black_hole',
    name: 'Horizonte Profundo',
    description: 'Agujeros negros ×2.5 de producción gravitatoria.',
    boostedGeneratorId: 'black_hole',
    generatorMultiplier: 2.5,
    cometFrequencyBonus: 1.1,
  },
  {
    id: 'week_galaxy',
    name: 'Danza de Espirales',
    description: 'Galaxias ×2 de producción y lluvia de cometas (+25%).',
    boostedGeneratorId: 'galaxy',
    generatorMultiplier: 2.0,
    cometFrequencyBonus: 1.25,
  },
];

export function getCurrentWeeklyEvent(now = new Date()): WeeklyEvent {
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (7 * 24 * 3600 * 1000)
  );
  return WEEKLY_EVENTS[Math.abs(weekNumber) % WEEKLY_EVENTS.length];
}

export function pickRandomComet(): CometDefinition {
  const totalWeight = COMET_TYPES.reduce((acc, c) => acc + c.weight, 0);
  let r = Math.random() * totalWeight;
  for (const c of COMET_TYPES) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return COMET_TYPES[0];
}
