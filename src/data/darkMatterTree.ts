export interface DarkMatterNode {
  id: string;
  name: string;
  description: string;
  branch: 'production' | 'click' | 'comets' | 'automation' | 'offline';
  cost: number; // in Dark Matter
  prerequisites: string[];
  icon?: string;
}

export const DARK_MATTER_NODES: DarkMatterNode[] = [
  // --- Rama de Producción ---
  {
    id: 'dm_spark_start',
    name: 'Chispa Inicial',
    description: 'Empiezas cada Big Bang con 100 de energía en el banco.',
    branch: 'production',
    cost: 1,
    prerequisites: [],
  },
  {
    id: 'dm_prod_1',
    name: 'Densidad Relativista I',
    description: 'Aumenta toda la producción de energía un +25% permanente.',
    branch: 'production',
    cost: 2,
    prerequisites: ['dm_spark_start'],
  },
  {
    id: 'dm_friendly_gravity',
    name: 'Gravedad Amiga',
    description: 'Reduce el coste de todos los generadores un -10%.',
    branch: 'production',
    cost: 5,
    prerequisites: ['dm_prod_1'],
  },
  {
    id: 'dm_prod_2',
    name: 'Densidad Relativista II',
    description: 'Aumenta toda la producción de energía un +50% permanente.',
    branch: 'production',
    cost: 10,
    prerequisites: ['dm_friendly_gravity'],
  },
  {
    id: 'dm_cosmic_geometry',
    name: 'Geometría Hiperbólica',
    description: 'Reduce el multiplicador de coste de generadores de 1.15 a 1.14.',
    branch: 'production',
    cost: 25,
    prerequisites: ['dm_prod_2'],
  },
  {
    id: 'dm_prod_3',
    name: 'Singularidad Estable',
    description: 'Duplica (+100%) toda la producción de energía del cosmos.',
    branch: 'production',
    cost: 50,
    prerequisites: ['dm_cosmic_geometry'],
  },

  // --- Rama de Clic y Resonancia ---
  {
    id: 'dm_click_base',
    name: 'Chispa Incandescente',
    description: 'Aumenta el poder base de cada clic de 1 a 10.',
    branch: 'click',
    cost: 1,
    prerequisites: [],
  },
  {
    id: 'dm_resonance_ext',
    name: 'Resonancia Ampliada',
    description: 'El combo máximo sube de 30 a 50 (multiplicador máximo sube a ×5.0).',
    branch: 'click',
    cost: 3,
    prerequisites: ['dm_click_base'],
  },
  {
    id: 'dm_resonance_decay',
    name: 'Inercia Lumínica',
    description: 'El tiempo de gracia antes de que decaiga el combo aumenta de 0.7 s a 1.5 s.',
    branch: 'click',
    cost: 6,
    prerequisites: ['dm_resonance_ext'],
  },
  {
    id: 'dm_echo_master',
    name: 'Eco Cuántico',
    description: 'Duplica la bonificación que los clics reciben de la producción por segundo.',
    branch: 'click',
    cost: 12,
    prerequisites: ['dm_resonance_decay'],
  },
  {
    id: 'dm_hyper_resonance',
    name: 'Hiper-Resonancia',
    description: 'Los clics rápidos tienen un 15% de probabilidad de sumar +2 al combo de golpe.',
    branch: 'click',
    cost: 25,
    prerequisites: ['dm_echo_master'],
  },

  // --- Rama de Cometas ---
  {
    id: 'dm_comet_magnet',
    name: 'Imán de Cometas',
    description: 'Los cometas dorados aparecen un 30% más frecuentemente.',
    branch: 'comets',
    cost: 2,
    prerequisites: [],
  },
  {
    id: 'dm_comet_duration',
    name: 'Estela Larga',
    description: 'Los efectos temporales de los cometas (Frenesí, Clic Divino) duran un 50% más.',
    branch: 'comets',
    cost: 5,
    prerequisites: ['dm_comet_magnet'],
  },
  {
    id: 'dm_comet_gold',
    name: 'Cometa de Midas',
    description: 'El efecto de Lluvia Estelar otorga el doble de energía instantánea.',
    branch: 'comets',
    cost: 12,
    prerequisites: ['dm_comet_duration'],
  },
  {
    id: 'dm_auto_comets',
    name: 'Captura Gravitatoria',
    description: 'Los cometas que cruzan la pantalla se atrapan automáticamente al salir.',
    branch: 'comets',
    cost: 30,
    prerequisites: ['dm_comet_gold'],
  },

  // --- Rama de Automatización ---
  {
    id: 'dm_auto_atom',
    name: 'Autómata Cuántico: Átomo',
    description: 'Compra Átomos automáticamente cuando hay suficiente energía disponible.',
    branch: 'automation',
    cost: 2,
    prerequisites: [],
  },
  {
    id: 'dm_auto_tier1',
    name: 'Autómata Cuántico: Gas y Estrellas',
    description: 'Compra Nubes de gas, Protoestrellas y Estrellas enanas automáticamente.',
    branch: 'automation',
    cost: 6,
    prerequisites: ['dm_auto_atom'],
  },
  {
    id: 'dm_auto_tier2',
    name: 'Autómata Cuántico: Galaxias',
    description: 'Compra Púlsares, Nebulosas, Agujeros negros y Galaxias automáticamente.',
    branch: 'automation',
    cost: 15,
    prerequisites: ['dm_auto_tier1'],
  },
  {
    id: 'dm_auto_upgrades',
    name: 'Autómata de Mejoras',
    description: 'Compra automáticamente las mejoras más asequibles de la lista.',
    branch: 'automation',
    cost: 25,
    prerequisites: ['dm_auto_tier2'],
  },
  {
    id: 'dm_auto_bigbang',
    name: 'Ciclo Eterno',
    description: 'Permite configurar un reinicio automático de Big Bang al alcanzar cierta Materia Oscura.',
    branch: 'automation',
    cost: 50,
    prerequisites: ['dm_auto_upgrades'],
  },

  // --- Rama de Tiempo y Offline ---
  {
    id: 'dm_cosmic_memory',
    name: 'Memoria Cósmica',
    description: 'La eficiencia offline sube al 100% y el límite de tiempo se extiende a 24 horas.',
    branch: 'offline',
    cost: 4,
    prerequisites: [],
  },
  {
    id: 'dm_temporal_warp',
    name: 'Curvatura Temporal',
    description: 'Al regresar de una ausencia offline, recibes 3 minutos de Frenesí (×2) de bienvenida.',
    branch: 'offline',
    cost: 10,
    prerequisites: ['dm_cosmic_memory'],
  },
  {
    id: 'dm_chronos_echo',
    name: 'Eco de Cronos',
    description: 'Los primeros 5 minutos tras cada Big Bang producen el triple (×3) de energía.',
    branch: 'offline',
    cost: 20,
    prerequisites: ['dm_temporal_warp'],
  },
];
