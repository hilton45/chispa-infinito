export type Locale = 'es' | 'en';

export const DICTIONARY: Record<Locale, Record<string, string>> = {
  es: {
    app_title: 'CHISPA ∞',
    energy_label: 'Energía Cósmica',
    sps_label: 'por segundo',
    click_label: 'por clic',
    next_goal: 'Siguiente objetivo',
    tab_generators: 'Órbitas',
    tab_upgrades: 'Mejoras',
    tab_bigbang: 'Big Bang',
    tab_multiverse: 'Multiverso',
    tab_constellations: 'Conciencia',
    tab_eternity: 'Eternidad',
    tab_achievements: 'Logros',
    tab_encyclopedia: 'Archivo',
    tab_settings: 'Ajustes',
    buy_max: 'Máx',
    milestone_next: 'Próximo hito ×2',
    undiscovered: '??? · Sigue expandiendo tu energía',
    bigbang_ready: 'El cosmos vibra al límite. Puedes desencadenar un Big Bang.',
    bigbang_btn: 'Desatar Big Bang',
    bigbang_confirm: 'Pulsa otra vez para confirmar el reinicio cósmico',
    offline_title: 'Mientras no estabas…',
    offline_desc: 'El universo siguió girando en silencio durante tu ausencia.',
    offline_collect: 'Reclamar energía',
    zen_mode: 'Modo Zen',
    pause_btn: 'Pausa',
    resume_btn: 'Reanudar',
  },
  en: {
    app_title: 'SPARK ∞',
    energy_label: 'Cosmic Energy',
    sps_label: 'per second',
    click_label: 'per click',
    next_goal: 'Next objective',
    tab_generators: 'Orbits',
    tab_upgrades: 'Upgrades',
    tab_bigbang: 'Big Bang',
    tab_multiverse: 'Multiverse',
    tab_constellations: 'Consciousness',
    tab_eternity: 'Eternity',
    tab_achievements: 'Achievements',
    tab_encyclopedia: 'Archive',
    tab_settings: 'Settings',
    buy_max: 'Max',
    milestone_next: 'Next ×2 milestone',
    undiscovered: '??? · Keep expanding your energy',
    bigbang_ready: 'The cosmos vibrates at its limit. You can trigger a Big Bang.',
    bigbang_btn: 'Trigger Big Bang',
    bigbang_confirm: 'Click again to confirm cosmic rebirth',
    offline_title: 'While you were away…',
    offline_desc: 'The universe kept spinning silently in your absence.',
    offline_collect: 'Claim energy',
    zen_mode: 'Zen Mode',
    pause_btn: 'Pause',
    resume_btn: 'Resume',
  },
};

let currentLocale: Locale = 'es';

export function setLocale(loc: Locale): void {
  currentLocale = loc;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string): string {
  return DICTIONARY[currentLocale]?.[key] ?? DICTIONARY.es[key] ?? key;
}
