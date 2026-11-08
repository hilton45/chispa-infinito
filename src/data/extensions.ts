import { D, Decimal } from '@/utils/Decimal';

export interface CosmicExtension {
  id: string;
  name: string;
  category: 'Automatización' | 'Recolección' | 'Aceleración' | 'Energía' | 'Persistencia';
  currency: 'energy' | 'darkMatter' | 'realityFragments';
  cost: Decimal;
  costLabel: string;
  badge: string;
  icon: string;
  description: string;
}

export const COSMIC_EXTENSIONS: CosmicExtension[] = [
  {
    id: 'ext_autoclicker',
    name: 'Pulsador Cuántico Automático',
    category: 'Automatización',
    currency: 'darkMatter',
    cost: D(150),
    costLabel: '150 Materia Oscura',
    badge: 'AUTO 10/s',
    icon: '⚡',
    description:
      'Envía pulsos cuánticos automáticos de 10 clics por segundo al núcleo a máxima potencia sin esfuerzo.',
  },
  {
    id: 'ext_comet_magnet',
    name: 'Sonda Gravitacional Atrae-Cometas',
    category: 'Recolección',
    currency: 'darkMatter',
    cost: D(300),
    costLabel: '300 Materia Oscura',
    badge: 'AUTO-CATCH',
    icon: '☄️',
    description:
      'Genera un pozo de gravedad que captura automáticamente cualquier cometa dorado tan pronto como aparece en el cosmos.',
  },
  {
    id: 'ext_time_warp',
    name: 'Compresor Temporal Cuántico (x2)',
    category: 'Aceleración',
    currency: 'realityFragments',
    cost: D(100),
    costLabel: '100 Fragmentos de Realidad',
    badge: 'TIEMPO ×2',
    icon: '⌛',
    description:
      'Pliega el flujo del espacio-tiempo local: la producción, órbitas y recargas avanzan al doble de velocidad.',
  },
  {
    id: 'ext_quantum_vacuum',
    name: 'Reactor de Vacío de Punto Cero',
    category: 'Energía',
    currency: 'darkMatter',
    cost: D(500),
    costLabel: '500 Materia Oscura',
    badge: '+100% SPS',
    icon: '⚛️',
    description:
      'Extrae energía continua de las fluctuaciones del vacío cuántico para un multiplicador perpetuo de ×2 a toda tu producción.',
  },
  {
    id: 'ext_offline_chamber',
    name: 'Cámara de Hibernación Estelar',
    category: 'Persistencia',
    currency: 'darkMatter',
    cost: D(200),
    costLabel: '200 Materia Oscura',
    badge: '48h / 100%',
    icon: '🛡️',
    description:
      'Mantiene la coherencia cuántica cuando estás ausente, acumulando hasta 48 horas de producción al 100% de eficiencia.',
  },
];
