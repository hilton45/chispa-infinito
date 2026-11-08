export interface CosmicSkin {
  id: string;
  name: string;
  colorName: string;
  badge: string;
  accentHex: string;
  description: string;
}

export const COSMIC_SKINS: CosmicSkin[] = [
  {
    id: 'skin_default',
    name: 'Chispa de Era (Dinámico)',
    colorName: 'Azul Índigo / Adaptativo',
    badge: 'ORIGINAL',
    accentHex: '#38bdf8',
    description:
      'El aspecto cuántico primordial que muta su temperatura de color, corona y rayos con cada una de las 16 Eras.',
  },
  {
    id: 'skin_solar_flare',
    name: 'Fulgor Solar (Hipergigante)',
    colorName: 'Naranja Ígneo / Rojo',
    badge: 'TERMONUCLEAR',
    accentHex: '#ff7814',
    description:
      'Fotosfera naranja incandescente con llamaradas de plasma ardiente y manchas solares de alta convección.',
  },
  {
    id: 'skin_rainbow_resonator',
    name: 'Prisma Arcoíris (RGB Cromático)',
    colorName: 'Espectro Completo RGB',
    badge: 'CALEIDOSCOPIO',
    accentHex: '#f43f5e',
    description:
      'Un vórtice cromático continuo en rotación de 60 FPS con corona multicolor y anillos de difracción espectral.',
  },
  {
    id: 'skin_comet_gold',
    name: 'Núcleo de Midas (Oro Divino)',
    colorName: 'Oro Puro 24K',
    badge: 'LEGENDARIO',
    accentHex: '#ffd700',
    description:
      'Fotosfera de oro líquido resplandeciente, rayos áureos penetrantes y estela de polvo estelar brillante.',
  },
  {
    id: 'skin_void_black_hole',
    name: 'Singularidad Abisal (Agujero Negro)',
    colorName: 'Negro Absoluto & Violeta',
    badge: 'HORIZONTE',
    accentHex: '#9333ea',
    description:
      'Horizonte de sucesos de absorción cuántica con anillo de fotones ultrabrillante y lente gravitacional violeta.',
  },
  {
    id: 'skin_neon_cyberpunk',
    name: 'Neón Cyberpunk',
    colorName: 'Cian Neón & Magenta',
    badge: 'SINTÉTICO',
    accentHex: '#00f0ff',
    description:
      'Fusión hiperluminosa de cian de fibra óptica y magenta radiactivo con pulsos de alta frecuencia.',
  },
  {
    id: 'skin_emerald_aurora',
    name: 'Hiper-Espacio Esmeralda',
    colorName: 'Verde Aurora & Turquesa',
    badge: 'DIMENSIONAL',
    accentHex: '#10b981',
    description:
      'Radiación de plasma bio-luminiscente que emula las auroras boreales cósmicas en dimensiones superiores.',
  },
];
