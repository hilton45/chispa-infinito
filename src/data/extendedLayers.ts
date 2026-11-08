/**
 * Extended Layers Content (Layers 2-5):
 * - Multiverse Parallel Universes & Cosmic Challenges
 * - Consciousness Constellation Map (40 constellations) & The Observer
 * - Eternity Cosmic Clock & New Game+ Modifiers
 * - Astronomical Encyclopedia (real verified scientific data)
 * - Daily & Weekly Missions
 */

export interface ParallelUniverseDef {
  id: string;
  name: string;
  ruleDescription: string;
  rewardDescription: string;
  costMultiplierMod: number;
  spsMod: number;
  clickEnabled: boolean;
  cometFreqMod: number;
  milestoneBaseMod: number;
  fragmentRatePerSec: number;
}

export const PARALLEL_UNIVERSES: ParallelUniverseDef[] = [
  {
    id: 'uni_dense',
    name: 'Universo Denso',
    ruleDescription: 'Costes de generadores ×0.5, pero los clics manuales están desactivados.',
    rewardDescription: '+30% producción pasiva global por nivel de atención.',
    costMultiplierMod: 0.5,
    spsMod: 1.3,
    clickEnabled: false,
    cometFreqMod: 1.0,
    milestoneBaseMod: 2.0,
    fragmentRatePerSec: 0.5,
  },
  {
    id: 'uni_cold',
    name: 'Universo Frío',
    ruleDescription: 'Producción base ×0.5, pero los cometas aparecen ×3 veces más rápido.',
    rewardDescription: '+25% poder de cometas dorados por nivel de atención.',
    costMultiplierMod: 1.0,
    spsMod: 0.5,
    clickEnabled: true,
    cometFreqMod: 3.0,
    milestoneBaseMod: 2.0,
    fragmentRatePerSec: 0.8,
  },
  {
    id: 'uni_harmonic',
    name: 'Universo Armónico',
    ruleDescription: 'Los costes escalan ligeramente más rápido, pero cada hito otorga ×2.5.',
    rewardDescription: '+20% multiplicador de hitos en tu universo principal.',
    costMultiplierMod: 1.2,
    spsMod: 1.5,
    clickEnabled: true,
    cometFreqMod: 1.0,
    milestoneBaseMod: 2.5,
    fragmentRatePerSec: 1.2,
  },
  {
    id: 'uni_hyper',
    name: 'Universo Relativista',
    ruleDescription: 'La Resonancia exige ritmo constante pero multiplica hasta ×6.',
    rewardDescription: '+35% energía por clic y eco armónico global.',
    costMultiplierMod: 1.0,
    spsMod: 1.4,
    clickEnabled: true,
    cometFreqMod: 1.4,
    milestoneBaseMod: 2.0,
    fragmentRatePerSec: 1.8,
  },
  {
    id: 'uni_void',
    name: 'Universo del Vacío Puro',
    ruleDescription: 'Solo los generadores cósmicos superiores brillan con eficiencia extrema.',
    rewardDescription: '+50% obtención de Materia Oscura en cada Big Bang.',
    costMultiplierMod: 0.85,
    spsMod: 2.0,
    clickEnabled: true,
    cometFreqMod: 1.2,
    milestoneBaseMod: 2.2,
    fragmentRatePerSec: 2.5,
  },
];

export interface CosmicChallengeDef {
  id: string;
  name: string;
  restriction: string;
  goalEnergyExp: number; // e.g. 7 for 1e7
  rewardDescription: string;
  rewardBonusSPS: number;
}

export const COSMIC_CHALLENGES: CosmicChallengeDef[] = [
  {
    id: 'chal_no_click_upgrades',
    name: 'Silencio Manual',
    restriction: 'Alcanza 1e7 de energía sin comprar mejoras de clic.',
    goalEnergyExp: 7,
    rewardDescription: 'Permanente: +50% producción de todos los generadores.',
    rewardBonusSPS: 0.5,
  },
  {
    id: 'chal_minimalist',
    name: 'Austeridad Cuántica',
    restriction: 'Alcanza 5e7 de energía con un máximo de 25 unidades por generador.',
    goalEnergyExp: 7.7,
    rewardDescription: 'Permanente: Coste de todos los generadores -12%.',
    rewardBonusSPS: 0.6,
  },
  {
    id: 'chal_stellar_only',
    name: 'Forja Estelar',
    restriction: 'Alcanza 1e8 de energía usando solo los primeros 5 generadores.',
    goalEnergyExp: 8,
    rewardDescription: 'Permanente: Los hitos de generadores dan +15% extra.',
    rewardBonusSPS: 0.75,
  },
  {
    id: 'chal_inflated',
    name: 'Inflación Severa',
    restriction: 'Alcanza 1e9 de energía con costes incrementados.',
    goalEnergyExp: 9,
    rewardDescription: 'Permanente: Duplica (+100%) la producción global.',
    rewardBonusSPS: 1.0,
  },
];

export interface ConstellationDef {
  id: string;
  index: number;
  name: string;
  bonusDescription: string;
  costAttention: number;
  spsBonus: number;
  points: Array<[number, number]>; // Normalized [0.05..0.95] coordinates
}

const CONSTELLATION_NAMES = [
  'El Fénix Primordial', 'La Lira de Cuásares', 'El Reloj de Arena', 'La Corona Boreal',
  'El Navío de Fotones', 'La Serpiente de Gas', 'El Ojo del Observador', 'El Árbol de Filamentos',
  'La Balanza de Planck', 'El Cisne Negro', 'El Compás Estelar', 'La Llave del Vacío',
  'El Pegaso Relativista', 'El Cáliz de Plasma', 'La Flecha del Tiempo', 'El Escudo de Orión',
  'La Espiral Dorada', 'El Yunque de Neutrones', 'La Linterna Errante', 'El Puente de Einstein',
  'La Arpa de Cuerdas', 'El Dragón de Nebulosa', 'La Brújula Áurea', 'El Loto Cósmico',
  'El Martillo de Fusión', 'La Tejedora de Branas', 'El Faro del Horizonte', 'La Cuna de Estrellas',
  'El Espejo Simétrico', 'La Tortuga del Mundo', 'El Pájaro de Luz', 'La Red Sináptica',
  'El Tridente Gravitatorio', 'La Rueda del Ciclo', 'El Guardián Silencioso', 'La Flor de Supernova',
  'El Abanico de Polvo', 'La Escalera Infinita', 'El Corazón del Núcleo', 'La Primera Chispa',
];

export const CONSTELLATIONS: ConstellationDef[] = CONSTELLATION_NAMES.map((name, idx) => {
  // Deterministic recognizable geometric star pattern per constellation
  const cx = 0.12 + ((idx * 19) % 76) * 0.01;
  const cy = 0.12 + ((idx * 31) % 74) * 0.01;
  const r = 0.045;
  const a1 = idx * 0.8;
  const a2 = a1 + 1.9;
  const a3 = a2 + 1.7;
  const a4 = a3 + 1.5;

  const points: Array<[number, number]> = [
    [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r],
    [cx + Math.cos(a2) * r * 0.7, cy + Math.sin(a2) * r * 0.7],
    [cx + Math.cos(a3) * r * 1.1, cy + Math.sin(a3) * r * 1.1],
    [cx + Math.cos(a4) * r * 0.85, cy + Math.sin(a4) * r * 0.85],
  ];

  const spsBonus = 0.15 + idx * 0.05;
  return {
    id: `const_${idx + 1}`,
    index: idx + 1,
    name,
    bonusDescription: `+${Math.round(spsBonus * 100)}% producción cósmica y brillo estelar permanente.`,
    costAttention: Math.round(10 * Math.pow(1.22, idx)),
    spsBonus,
    points,
  };
});

export const OBSERVER_QUOTES: string[] = [
  'Interesante. Hace un rato esto era una sola luz.',
  'No hace falta correr. El universo no tiene prisa.',
  'Cada vez que miras una órbita, sus partículas parecen esforzarse un poco más.',
  'He contado tus clics. Tienes buen sentido del ritmo.',
  '¿Sabías que los átomos que creaste al principio siguen ahí dentro?',
  'El vacío nunca estuvo vacío del todo; solo esperaba una excusa.',
  'Cuando reinicias el cosmos, algo en el fondo recuerda la melodía.',
  'Las constelaciones que trazas le hacen compañía a las estrellas solitarias.',
  'Respira. Hasta las galaxias tardan millones de años en dar una vuelta.',
  'Mirar también es una forma de encender el fuego.',
];

export interface EncyclopediaEntry {
  genId: string;
  title: string;
  subtitle: string;
  scaleReal: string;
  temperatureOrEnergy: string;
  massOrDensity: string;
  scientificFact: string;
}

export const ENCYCLOPEDIA_ENTRIES: EncyclopediaEntry[] = [
  {
    genId: 'atom',
    title: 'Átomo de Hidrógeno',
    subtitle: 'El elemento primordial (75% de la materia bariónica)',
    scaleReal: 'Radio de Bohr: 5,29 × 10⁻¹¹ m',
    temperatureOrEnergy: 'Energía de ionización: 13,6 eV',
    massOrDensity: 'Masa: 1,67 × 10⁻²⁷ kg (1 uma)',
    scientificFact: 'Los primeros átomos neutros se formaron unos 380.000 años tras el Big Bang durante la época de la recombinación, liberando el fondo cósmico de microondas.',
  },
  {
    genId: 'gas_cloud',
    title: 'Nube Molecular Gigante',
    subtitle: 'Viveros estelares de gas y polvo interestelar',
    scaleReal: 'Diámetro: 15 a 600 años luz',
    temperatureOrEnergy: 'Temperatura: 10 a 20 K (−263 °C)',
    massOrDensity: 'Masa: 1.000 a 10⁷ masas solares (M☉)',
    scientificFact: 'Las nubes moleculares son tan frías que permiten que el hidrógeno exista en forma diatómica (H₂) y que la gravedad supere la presión térmica para iniciar el colapso estelar.',
  },
  {
    genId: 'protostar',
    title: 'Protoestrella (Objeto Herbig-Haro)',
    subtitle: 'Embrión estelar en fase de acreción hidrostática',
    scaleReal: 'Diámetro del disco: ~100 a 1.000 UA',
    temperatureOrEnergy: 'Núcleo: 1 × 10⁶ a 10 × 10⁶ K',
    massOrDensity: 'Masa típica: 0,1 a 50 M☉',
    scientificFact: 'Antes de encender la fusión del hidrógeno-1, la protoestrella brilla por contracción gravitatoria (mecanismo de Kelvin-Helmholtz) y expulsa chorros bipolares supersónicos por sus polos.',
  },
  {
    genId: 'dwarf_star',
    title: 'Estrella de Secuencia Principal',
    subtitle: 'Reactor termonuclear en equilibrio hidrostático',
    scaleReal: 'Radio solar (R☉): 696.340 km',
    temperatureOrEnergy: 'Fotosfera: 3.000–6.000 K · Núcleo: 1,5 × 10⁷ K',
    massOrDensity: 'Masa: 0,08 a 1,4 M☉',
    scientificFact: 'Las enanas rojas consumen su hidrógeno tan despacio por convección completa que pueden vivir más de un billón de años, cien veces la edad actual del universo.',
  },
  {
    genId: 'pulsar',
    title: 'Púlsar (Estrella de Neutrones)',
    subtitle: 'Remanente estelar ultradenso y magnetizado',
    scaleReal: 'Diámetro: ~20 a 24 km',
    temperatureOrEnergy: 'Campo magnético: 10⁸ a 10¹⁴ Gauss',
    massOrDensity: 'Masa: ~1,4 a 2,1 M☉ · Densidad: ~4 × 10¹⁷ kg/m³',
    scientificFact: 'Una cucharadita de materia de estrella de neutrones pesaría unos mil millones de toneladas en la Tierra. Los púlsares de milisegundo giran hasta 716 veces por segundo.',
  },
  {
    genId: 'nebula',
    title: 'Nebulosa de Emisión y Planetaria',
    subtitle: 'Gas ionizado por radiación ultravioleta extrema',
    scaleReal: 'Extensión: 1 a 100 años luz',
    temperatureOrEnergy: 'Gas ionizado H II: ~10.000 K',
    massOrDensity: 'Densidad: 10² a 10⁴ partículas/cm³',
    scientificFact: 'Los colores verdosos y rojizos característicos de las nebulosas provienen de líneas de emisión de hidrógeno alfa (656,3 nm) y oxígeno doblemente ionizado [O III] (500,7 nm).',
  },
  {
    genId: 'black_hole',
    title: 'Agujero Negro Astrofísico',
    subtitle: 'Región de curvatura espacio-temporal extrema',
    scaleReal: 'Radio de Schwarzschild: Rs = 2GM/c² (~3 km por M☉)',
    temperatureOrEnergy: 'Disco de acreción: >10⁷ K (emisión de rayos X)',
    massOrDensity: 'Estelares: 5–100 M☉ · Supermasivos: 10⁶–10¹⁰ M☉',
    scientificFact: 'En la esfera de fotones (a 1,5 veces el radio de Schwarzschild), la gravedad es tan intensa que la propia luz se ve obligada a viajar en órbitas circulares.',
  },
  {
    genId: 'galaxy',
    title: 'Galaxia Espiral',
    subtitle: 'Sistema gravitacionalmente ligado de estrellas, gas y materia oscura',
    scaleReal: 'Diámetro: 30.000 a 200.000 años luz',
    temperatureOrEnergy: 'Luminosidad: ~10¹⁰ a 10¹¹ luminosidades solares',
    massOrDensity: 'Masa total: ~10¹² M☉ (~200–400 mil millones de estrellas)',
    scientificFact: 'Las curvas de rotación galáctica son planas en los bordes exteriores, una de las evidencias observacionales clave de que las galaxias están inmersas en halos de materia oscura.',
  },
  {
    genId: 'galaxy_cluster',
    title: 'Cúmulo Galáctico',
    subtitle: 'Las mayores estructuras virializadas del cosmos',
    scaleReal: 'Diámetro: 10 a 30 millones de años luz',
    temperatureOrEnergy: 'Gas intracúmulo: 10⁷ a 10⁸ K (plasma de rayos X)',
    massOrDensity: 'Masa: 10¹⁴ a 10¹⁵ M☉ (contiene 100 a 1.000 galaxias)',
    scientificFact: 'Aproximadamente el 85% de la masa de un cúmulo es materia oscura, el 12% es plasma caliente intracúmulo y solo el 3% corresponde a estrellas dentro de las galaxias.',
  },
  {
    genId: 'universe',
    title: 'Universo Observable',
    subtitle: 'Esfera de horizonte de partículas centrada en el observador',
    scaleReal: 'Diámetro comóvil: 93.000 millones de años luz (8,8 × 10²⁶ m)',
    temperatureOrEnergy: 'Fondo Cósmico de Microondas (CMB): 2,725 K',
    massOrDensity: 'Masa ordinaria: ~1,5 × 10⁵³ kg (~2 billones de galaxias)',
    scientificFact: 'A gran escala (>300 millones de años luz), la materia se distribuye en la Red Cósmica: filamentos luminosos separados por enormes vacíos cósmicos.',
  },
  {
    genId: 'quasar',
    title: 'Cuásar (Núcleo Galáctico Activo)',
    subtitle: 'Agujero negro supermasivo alimentándose a ritmo extremo',
    scaleReal: 'Región emisora central: tamaño del Sistema Solar',
    temperatureOrEnergy: 'Luminosidad bolométrica: hasta 10⁴¹ W (1.000× la Vía Láctea)',
    massOrDensity: 'Masa central: 10⁸ a 10¹⁰ M☉',
    scientificFact: 'El disco de acreción de un cuásar convierte hasta el 30% de la masa en reposo de la materia que cae en radiación pura, frente al 0,7% de la fusión nuclear estelar.',
  },
  {
    genId: 'brane',
    title: 'D-Brana Cosmologica',
    subtitle: 'Hipersuperficie extendida en teoría de cuerdas y teoría M',
    scaleReal: 'Escala fundamental: longitud de Planck (1,616 × 10⁻³⁵ m)',
    temperatureOrEnergy: 'Energía de Planck: 1,22 × 10¹⁹ GeV',
    massOrDensity: 'Tensión de brana: proporcional a 1/gs',
    scientificFact: 'En los modelos de mundo-brana, nuestro universo tridimensional podría ser una 3-brana inmersa en un espacio-tiempo de mayor dimensión («el bulto»), donde solo la gravedad escapa entre branas.',
  },
  {
    genId: 'cosmic_string',
    title: 'Cuerda Cósmica',
    subtitle: 'Defecto topológico unidimensional de transiciones de fase tempranas',
    scaleReal: 'Grosor: ~10⁻³⁰ m · Longitud: escala cosmológica',
    temperatureOrEnergy: 'Escala de Gran Unificación (GUT): ~10¹⁶ GeV',
    massOrDensity: 'Densidad lineal: ~10²¹ kg/m (1 km pesa como la Tierra)',
    scientificFact: 'Una cuerda cósmica no atrae gravitacionalmente objetos en reposo a su alrededor, pero crea un déficit angular cónico en el espacio-tiempo que produce imágenes dobles por lente gravitacional.',
  },
  {
    genId: 'multiverse_bubble',
    title: 'Burbuja de Inflación Eterna',
    subtitle: 'Universo de bolsillo nucleado por decaimiento del falso vacío',
    scaleReal: 'Expansión exterior: cuasi-exponencial (espacio de De Sitter)',
    temperatureOrEnergy: 'Potencial del campo inflatón: ~10¹⁵–10¹⁶ GeV',
    massOrDensity: 'Densidad crítica: ρc = 3H²/(8πG)',
    scientificFact: 'En la teoría de la inflación eterna (Guth, Linde, Vilenkin), el falso vacío se expande más rápido de lo que decae, generando continuamente universos burbuja desconectados.',
  },
  {
    genId: 'cosmic_mind',
    title: 'Red de Complejidad Universal',
    subtitle: 'Paralelismo estructural entre la red cósmica y las redes neuronales',
    scaleReal: 'Escala comparada: 10⁻³ m (cerebro) vs 10²⁵ m (red cósmica)',
    temperatureOrEnergy: 'Flujo de información sujeta al límite de Bekenstein',
    massOrDensity: 'Nodos galácticos: ~10¹¹ · Neuronas humanas: ~8,6 × 10¹⁰',
    scientificFact: 'Estudios cuantitativos de astrofísica y neurociencia (Vazza & Feletti, 2020) demostraron que el espectro de fluctuaciones de densidad de la red cósmica y del córtex cerebral siguen leyes de potencia sorprendentemente similares.',
  },
  {
    genId: 'original_spark',
    title: 'La Singularidad Inicial (Época de Planck)',
    subtitle: 'El instante t = 0 donde espacio, tiempo y energía emergen',
    scaleReal: 'Tiempo de Planck: 5,39 × 10⁻⁴⁴ s',
    temperatureOrEnergy: 'Temperatura de Planck: 1,416 × 10³² K',
    massOrDensity: 'Densidad de Planck: 5,155 × 10⁹⁶ kg/m³',
    scientificFact: 'Durante la época de Planck, las cuatro fuerzas fundamentales (gravedad, electromagnetismo, nuclear fuerte y débil) estaban unificadas en una sola interacción primordial.',
  },
];

export interface MissionDef {
  id: string;
  period: 'daily' | 'weekly';
  title: string;
  targetText: string;
  rewardText: string;
  isCompleted: (state: any) => boolean;
}

export const MISSIONS: MissionDef[] = [
  // 3 Daily Missions
  {
    id: 'daily_clicks_50',
    period: 'daily',
    title: 'Pulso Matutino',
    targetText: 'Realiza al menos 50 clics manuales en el núcleo.',
    rewardText: '+5 min de producción solar instantánea',
    isCompleted: (s) => s.totalClicks >= 50,
  },
  {
    id: 'daily_combo_15',
    period: 'daily',
    title: 'Frecuencia Sincronizada',
    targetText: 'Alcanza un combo de Resonancia de 15 o superior.',
    rewardText: '+10 min de producción solar instantánea',
    isCompleted: (s) => s.maxResonanceComboReached >= 15,
  },
  {
    id: 'daily_comet_1',
    period: 'daily',
    title: 'Vigilante del Cielo',
    targetText: 'Atrapa al menos 1 cometa dorado en vuelo.',
    rewardText: '+15 min de producción solar instantánea',
    isCompleted: (s) => s.totalCometsCaught >= 1,
  },
  // 3 Weekly Missions
  {
    id: 'weekly_bigbang_1',
    period: 'weekly',
    title: 'Renovación del Ciclo',
    targetText: 'Completa al menos 1 Big Bang.',
    rewardText: '+5 Materia Oscura adicional',
    isCompleted: (s) => s.bigBangsTotal >= 1,
  },
  {
    id: 'weekly_comets_10',
    period: 'weekly',
    title: 'Cosecha de Estelas',
    targetText: 'Atrapa 10 cometas dorados.',
    rewardText: '+30 min de producción cósmica',
    isCompleted: (s) => s.totalCometsCaught >= 10,
  },
  {
    id: 'weekly_era_4',
    period: 'weekly',
    title: 'Ascenso Galáctico',
    targetText: 'Alcanza la Era Galáctica o superior.',
    rewardText: 'Aceleración temporal de Reloj Cósmico (+120 s)',
    isCompleted: (s) => s.currentEraIndex >= 3,
  },
];

/**
 * Generates a 100% code-driven procedural SVG illustration for an encyclopedia entry.
 */
export function generateEncyclopediaSVG(_genId: string, index: number): string {
  const hue = (index * 38 + 190) % 360;
  const hue2 = (hue + 55) % 360;
  return `
    <svg viewBox="0 0 80 80" width="58" height="58" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0; border-radius:12px; background:radial-gradient(circle, hsla(${hue},90%,22%,0.55), #05040f); border:1px solid hsla(${hue},90%,65%,0.35);">
      <circle cx="40" cy="40" r="28" fill="none" stroke="hsla(${hue},95%,65%,0.3)" stroke-width="1.2" stroke-dasharray="4 3"/>
      <ellipse cx="40" cy="40" rx="32" ry="14" transform="rotate(${index * 22} 40 40)" fill="none" stroke="hsla(${hue2},95%,70%,0.55)" stroke-width="1.5"/>
      <circle cx="40" cy="40" r="${8 + (index % 4) * 2}" fill="hsl(${hue},95%,68%)" opacity="0.85"/>
      <circle cx="40" cy="40" r="4.5" fill="#ffffff"/>
      <circle cx="${40 + Math.cos(index) * 22}" cy="${40 + Math.sin(index) * 14}" r="3" fill="hsl(${hue2},100%,78%)"/>
    </svg>
  `;
}

