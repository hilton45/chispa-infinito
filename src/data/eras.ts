import { D, Decimal } from '@/utils/Decimal';

export interface EraDefinition {
  index: number; // 0 to 15
  name: string;
  hue: number; // Degrees 0-360
  saturation: number; // 90-100%
  lightness: number; // 55-70%
  quote: string;
  energyThreshold: Decimal;
  skyBackground: string;
}

export const ERAS: EraDefinition[] = [
  // 1. Plasma (205°)
  {
    index: 0,
    name: 'Era del Plasma',
    hue: 205,
    saturation: 95,
    lightness: 60,
    quote: 'En el principio no había forma, solo partículas calientes y luz atrapada.',
    energyThreshold: D(0),
    skyBackground: '#05040f',
  },
  // 2. Estelar (42°)
  {
    index: 1,
    name: 'Era Estelar',
    hue: 42,
    saturation: 98,
    lightness: 62,
    quote: 'La gravedad vence la dispersión. Nace el primer fuego nuclear.',
    energyThreshold: D(1_000),
    skyBackground: '#060512',
  },
  // 3. Nebulosas (305°)
  {
    index: 2,
    name: 'Era de las Nebulosas',
    hue: 305,
    saturation: 92,
    lightness: 64,
    quote: 'Las gigantes rojas mueren y esparcen polvo de diamantes y carbono.',
    energyThreshold: D(100_000),
    skyBackground: '#080515',
  },
  // 4. Galáctica (225°)
  {
    index: 3,
    name: 'Era Galáctica',
    hue: 225,
    saturation: 96,
    lightness: 58,
    quote: 'Espirales gigantes de millones de mundos bailan en torno a abismos.',
    energyThreshold: D(15_000_000),
    skyBackground: '#050617',
  },
  // 5. Cósmica (150°)
  {
    index: 4,
    name: 'Era Cósmica',
    hue: 150,
    saturation: 94,
    lightness: 62,
    quote: 'Filamentos de luz intergaláctica unen los extremos del cosmos.',
    energyThreshold: D(3e9), // 3B
    skyBackground: '#040d12',
  },
  // 6. Eterna (22°)
  {
    index: 5,
    name: 'Era Eterna',
    hue: 22,
    saturation: 96,
    lightness: 65,
    quote: 'La energía fluye sin fricción. El universo respira como un solo cuerpo.',
    energyThreshold: D(500e9), // 500B
    skyBackground: '#0f0608',
  },
  // 7. Multiverso (265°)
  {
    index: 6,
    name: 'Era del Multiverso',
    hue: 265,
    saturation: 95,
    lightness: 66,
    quote: 'Las membranas de otros universos rozan el nuestro con chispas de realidad.',
    energyThreshold: D(50e12), // 50T
    skyBackground: '#090518',
  },
  // 8. Conciencia (175°)
  {
    index: 7,
    name: 'Era de la Conciencia',
    hue: 175,
    saturation: 92,
    lightness: 60,
    quote: 'El universo ya no solo existe: ahora sabe que existe.',
    energyThreshold: D(5e15), // 5Qa
    skyBackground: '#041014',
  },
  // 9. Singularidad (330°)
  {
    index: 8,
    name: 'Era de la Singularidad',
    hue: 330,
    saturation: 95,
    lightness: 63,
    quote: 'La materia y la información convergen en un punto de densidad infinita.',
    energyThreshold: D(500e15), // 500Qa
    skyBackground: '#12040d',
  },
  // 10. Inflación Cuántica (85°)
  {
    index: 9,
    name: 'Era de la Inflación Cuántica',
    hue: 85,
    saturation: 90,
    lightness: 58,
    quote: 'El tejido espacial se expande más rápido que cualquier pensamiento.',
    energyThreshold: D(50e18), // 50Qi
    skyBackground: '#080f05',
  },
  // 11. Dimensión Escondida (280°)
  {
    index: 10,
    name: 'Era de las Dimensiones Extra',
    hue: 280,
    saturation: 96,
    lightness: 68,
    quote: 'Calabi-Yau se desdobla. Espacios invisibles albergan nuevas leyes.',
    energyThreshold: D(5e21), // 5Sx
    skyBackground: '#0a0418',
  },
  // 12. Resonancia de Branas (195°)
  {
    index: 11,
    name: 'Era de la Resonancia',
    hue: 195,
    saturation: 94,
    lightness: 62,
    quote: 'Las cuerdas primordiales tocan una sinfonía que sostiene la materia.',
    energyThreshold: D(500e21), // 500Sx
    skyBackground: '#040b15',
  },
  // 13. Telaraña Primordial (120°)
  {
    index: 12,
    name: 'Era de la Red Primordial',
    hue: 120,
    saturation: 92,
    lightness: 58,
    quote: 'Un mapa infinito de conexiones donde cada punto contiene al todo.',
    energyThreshold: D(50e24), // 50Sp
    skyBackground: '#051208',
  },
  // 14. Frecuencia Omega (350°)
  {
    index: 13,
    name: 'Era de la Frecuencia Omega',
    hue: 350,
    saturation: 98,
    lightness: 65,
    quote: 'El pulso final y el primero se sincronizan a través de los eones.',
    energyThreshold: D(5e27), // 5Oc
    skyBackground: '#150408',
  },
  // 15. Horizonte Infinito (60°)
  {
    index: 14,
    name: 'Era del Horizonte Infinito',
    hue: 60,
    saturation: 96,
    lightness: 62,
    quote: 'Ya no hay fronteras entre creador, observador y cosmos.',
    energyThreshold: D(500e27), // 500Oc
    skyBackground: '#0f0e04',
  },
  // 16. Chispa Suprema (45°)
  {
    index: 15,
    name: 'Era de la Chispa Suprema',
    hue: 45,
    saturation: 100,
    lightness: 68,
    quote: 'El círculo se cierra. La primera chispa sonríe, y vuelve a empezar.',
    energyThreshold: D(50e30), // 50No
    skyBackground: '#0b0820',
  },
];

export function getEraForEnergy(totalEnergy: Decimal): EraDefinition {
  let activeEra = ERAS[0];
  for (const era of ERAS) {
    if (totalEnergy.gte(era.energyThreshold)) {
      activeEra = era;
    } else {
      break;
    }
  }
  return activeEra;
}
