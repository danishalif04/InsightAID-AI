/**
 * BM/EN strings for the Local Shop pathway.
 *
 * Deliberately a plain dictionary rather than a new i18n dependency — the
 * build plan forbids unapproved dependencies, and this pathway's string
 * count doesn't justify one. `t()` falls back to English, then to the key
 * itself, so a missing translation degrades visibly rather than crashing.
 */

export const LANGUAGES = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'ms', label: 'Bahasa Melayu', short: 'BM' },
]

export const STRINGS = {
  en: {
    'nav.overview': 'Business Overview',
    'nav.business': 'My Business',
    'nav.products': 'Products & Pricing',
    'nav.financial': 'Financial Planning',
    'nav.whatif': 'What-If Simulator',
    'nav.capital': 'Startup Capital',
    'nav.economic': 'Economic Intelligence',
    'nav.assistant': 'AI Business Assistant',
    'nav.actions': 'Action Centre',
    'nav.section': 'Local Shop',

    'overview.title': 'My Business at a Glance',
    'overview.subtitle': 'Your business profile and planning indicators — not a sales history you do not have yet.',
    'overview.loadDemo': 'Load demo shop (Kedai Makmur)',
    'overview.products': 'Registered products',
    'overview.fixedCosts': 'Monthly fixed costs',
    'overview.avgMargin': 'Average contribution margin',
    'overview.breakEven': 'Monthly break-even sales',
    'overview.dailyTarget': 'Daily sales target',
    'overview.readiness': 'Business readiness',
    'overview.suggests': 'InsightAid AI suggests',
    'overview.tools': 'Analysis tools',
    'overview.empty': 'No shop set up yet. Load the demo shop to explore, or add your business details.',

    'readiness.ready': 'Ready',
    'readiness.partial': 'Partial',
    'readiness.locked': 'Locked',
    'readiness.needs': 'Needs',

    'provenance.Calculated': 'Calculated',
    'provenance.Your input': 'Your input',
    'provenance.Assumption': 'Assumption',
    'provenance.AI-explained': 'AI-explained',
    'provenance.Illustrative': 'Illustrative',

    'common.askAi': 'Ask AI',
    'common.units': 'units',
    'common.perDay': '/day',
    'common.notEnough': 'Not enough information yet',
    'common.illustrative': 'Illustrative demo data — not a real shop.',
    'common.simulation': 'Simulation, not a forecast.',
  },
  ms: {
    'nav.overview': 'Gambaran Perniagaan',
    'nav.business': 'Perniagaan Saya',
    'nav.products': 'Produk & Harga',
    'nav.financial': 'Perancangan Kewangan',
    'nav.whatif': 'Simulator Apa-Jika',
    'nav.capital': 'Modal Permulaan',
    'nav.economic': 'Risikan Ekonomi',
    'nav.assistant': 'Pembantu Perniagaan AI',
    'nav.actions': 'Pusat Tindakan',
    'nav.section': 'Kedai Tempatan',

    'overview.title': 'Perniagaan Saya Sekilas Pandang',
    'overview.subtitle': 'Profil perniagaan dan penunjuk perancangan anda — bukan sejarah jualan yang belum ada.',
    'overview.loadDemo': 'Muat kedai contoh (Kedai Makmur)',
    'overview.products': 'Produk didaftarkan',
    'overview.fixedCosts': 'Kos tetap bulanan',
    'overview.avgMargin': 'Purata margin sumbangan',
    'overview.breakEven': 'Jualan pulang modal bulanan',
    'overview.dailyTarget': 'Sasaran jualan harian',
    'overview.readiness': 'Kesediaan perniagaan',
    'overview.suggests': 'InsightAid AI mencadangkan',
    'overview.tools': 'Alat analisis',
    'overview.empty': 'Belum ada kedai. Muat kedai contoh untuk meneroka, atau isi maklumat perniagaan anda.',

    'readiness.ready': 'Sedia',
    'readiness.partial': 'Separa',
    'readiness.locked': 'Terkunci',
    'readiness.needs': 'Perlu',

    'provenance.Calculated': 'Dikira',
    'provenance.Your input': 'Input anda',
    'provenance.Assumption': 'Andaian',
    'provenance.AI-explained': 'Dijelaskan AI',
    'provenance.Illustrative': 'Ilustrasi',

    'common.askAi': 'Tanya AI',
    'common.units': 'unit',
    'common.perDay': '/hari',
    'common.notEnough': 'Maklumat belum mencukupi',
    'common.illustrative': 'Data demo ilustrasi — bukan kedai sebenar.',
    'common.simulation': 'Simulasi, bukan ramalan.',
  },
}

/** @param {string} lang @param {string} key @returns {string} */
export function translate(lang, key) {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key
}
