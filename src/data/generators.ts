import { D, Decimal } from '@/utils/Decimal';

export interface GeneratorDefinition {
  id: string;
  index: number; // 1 to 16
  name: string;
  description: string;
  orbitalDescription: string;
  baseCost: Decimal;
  baseProduction: Decimal;
  costMultiplier: number; // 1.15
  category: 'particle' | 'stellar' | 'cosmic' | 'transcendent';
}

export const MILESTONE_THRESHOLDS = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500] as const;

export const GENERATORS: GeneratorDefinition[] = [
  // --- Layer 0: Core 1-10 ---
  {
    id: 'atom',
    index: 1,
    name: 'Átomo',
    description: 'El primer ladrillo de materia. Pequeño pero incansable.',
    orbitalDescription: 'Electrones trazando órbitas con rastros luminosos.',
    baseCost: D(12),
    baseProduction: D(0.2),
    costMultiplier: 1.15,
    category: 'particle',
  },
  {
    id: 'gas_cloud',
    index: 2,
    name: 'Nube de gas',
    description: 'Hidrógeno y helio atraídos por la gravedad naciente.',
    orbitalDescription: 'Metabolas translúcidas con mezcla aditiva y deriva suave.',
    baseCost: D(90),
    baseProduction: D(1.5),
    costMultiplier: 1.15,
    category: 'particle',
  },
  {
    id: 'protostar',
    index: 3,
    name: 'Protoestrella',
    description: 'El colapso gravitatorio enciende la primera chispa nuclear.',
    orbitalDescription: 'Disco de acreción con destellos y chorros bipolares.',
    baseCost: D(800),
    baseProduction: D(9),
    costMultiplier: 1.15,
    category: 'stellar',
  },
  {
    id: 'dwarf_star',
    index: 4,
    name: 'Estrella enana',
    description: 'Fusión estable de hidrógeno. Brilla durante eones.',
    orbitalDescription: 'Esfera con granulación convectiva animada y oscurecimiento de limbo.',
    baseCost: D(9_000), // 9K
    baseProduction: D(55),
    costMultiplier: 1.15,
    category: 'stellar',
  },
  {
    id: 'pulsar',
    index: 5,
    name: 'Púlsar',
    description: 'Estrella de neutrones que barre el vacío con haces de radio.',
    orbitalDescription: 'Esfera hiperdensa con dos conos de luz giratorios a alta velocidad.',
    baseCost: D(100_000), // 100K
    baseProduction: D(320),
    costMultiplier: 1.15,
    category: 'stellar',
  },
  {
    id: 'nebula',
    index: 6,
    name: 'Nebulosa',
    description: 'Cunas y restos estelares tejiendo velos de colores.',
    orbitalDescription: 'Volumen denso con tres octavas de ruido fractal y brillo difuso.',
    baseCost: D(1_200_000), // 1.2M
    baseProduction: D(1_900),
    costMultiplier: 1.15,
    category: 'stellar',
  },
  {
    id: 'black_hole',
    index: 7,
    name: 'Agujero negro',
    description: 'Donde la gravedad supera a la propia luz.',
    orbitalDescription: 'Sombra del horizonte, anillo de fotones y lente gravitacional curvando el fondo.',
    baseCost: D(15_000_000), // 15M
    baseProduction: D(11_000),
    costMultiplier: 1.15,
    category: 'cosmic',
  },
  {
    id: 'galaxy',
    index: 8,
    name: 'Galaxia',
    description: 'Cientos de miles de millones de estrellas en rotación armónica.',
    orbitalDescription: 'Espiral logarítmica de brazos estelares con núcleo supermasivo.',
    baseCost: D(200_000_000), // 200M
    baseProduction: D(65_000),
    costMultiplier: 1.15,
    category: 'cosmic',
  },
  {
    id: 'galaxy_cluster',
    index: 9,
    name: 'Cúmulo galáctico',
    description: 'Enjambre de galaxias unidas por filamentos de materia oscura.',
    orbitalDescription: 'Cúmulo instanciado de puntos galácticos con deriva browniana y halo común.',
    baseCost: D(3_000_000_000), // 3B
    baseProduction: D(400_000),
    costMultiplier: 1.15,
    category: 'cosmic',
  },
  {
    id: 'universe',
    index: 10,
    name: 'Universo',
    description: 'La totalidad del espacio-tiempo observable en expansión continua.',
    orbitalDescription: 'Telaraña cósmica de filamentos y nodos resplandecientes.',
    baseCost: D(50_000_000_000), // 50B
    baseProduction: D(2_500_000),
    costMultiplier: 1.15,
    category: 'cosmic',
  },

  // --- Layer Extended: 11-16 ---
  {
    id: 'quasar',
    index: 11,
    name: 'Cuásar',
    description: 'El faro más poderoso del cosmos primordial.',
    orbitalDescription: 'Núcleo ultrabrillante con chorro relativista pulsante.',
    baseCost: D(7.5e12), // 7.5T
    baseProduction: D(16e6), // 16M
    costMultiplier: 1.15,
    category: 'transcendent',
  },
  {
    id: 'brane',
    index: 12,
    name: 'Brana',
    description: 'Membrana multidimensional que vibra en el hiperespacio.',
    orbitalDescription: 'Malla ondulante con desplazamiento sinusoidal y rejilla luminosa.',
    baseCost: D(120e12), // 120T
    baseProduction: D(100e6), // 100M
    costMultiplier: 1.15,
    category: 'transcendent',
  },
  {
    id: 'cosmic_string',
    index: 13,
    name: 'Cuerda cósmica',
    description: 'Defecto topológico lineal de masa y tensión colosales.',
    orbitalDescription: 'Línea con ondas estacionarias vibrantes y brillo aditivo.',
    baseCost: D(2e15), // 2Qa
    baseProduction: D(650e6), // 650M
    costMultiplier: 1.15,
    category: 'transcendent',
  },
  {
    id: 'multiverse_bubble',
    index: 14,
    name: 'Burbuja de multiverso',
    description: 'Un nuevo universo inflacionario formándose en el vacío cuántico.',
    orbitalDescription: 'Esfera iridiscente con interferencia de película delgada y reflejos.',
    baseCost: D(35e15), // 35Qa
    baseProduction: D(4e9), // 4B
    costMultiplier: 1.15,
    category: 'transcendent',
  },
  {
    id: 'cosmic_mind',
    index: 15,
    name: 'Mente cósmica',
    description: 'La estructura de filamentos despierta y empieza a reflexionar.',
    orbitalDescription: 'Red sináptica bioluminiscente con impulsos viajando por las aristas.',
    baseCost: D(600e15), // 600Qa
    baseProduction: D(27e9), // 27B
    costMultiplier: 1.15,
    category: 'transcendent',
  },
  {
    id: 'original_spark',
    index: 16,
    name: 'Chispa original',
    description: 'El eco del primer instante se recrea a sí mismo en una danza infinita.',
    orbitalDescription: 'Réplica dorada y recursiva del núcleo de la chispa primordial.',
    baseCost: D(10e18), // 10Qi
    baseProduction: D(200e9), // 200B
    costMultiplier: 1.15,
    category: 'transcendent',
  },
];

export function getMilestoneCount(owned: number): number {
  let count = 0;
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (owned >= threshold) count++;
    else break;
  }
  return count;
}

export function getNextMilestone(owned: number): { next: number | null; progress: number } {
  let prev = 0;
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (owned < threshold) {
      const progress = Math.max(0, Math.min(1, (owned - prev) / (threshold - prev)));
      return { next: threshold, progress };
    }
    prev = threshold;
  }
  return { next: null, progress: 1.0 };
}
