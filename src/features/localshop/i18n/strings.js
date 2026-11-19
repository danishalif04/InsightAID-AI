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
    'provenance.AI-generated': 'AI-generated',
    'provenance.Illustrative': 'Illustrative',

    'common.askAi': 'Ask AI',
    'common.units': 'units',
    'common.perDay': '/day',
    'common.notEnough': 'Not enough information yet',
    'common.illustrative': 'Illustrative demo data — not a real shop.',
    'common.aiGenerated': 'AI-generated example — not a real shop and not your own records.',
    'generate.title': 'Generate a shop from your description',
    'generate.subtitle': 'Describe your business and the assistant will build a starting scenario. Every figure on the following pages is then calculated from it by the app, not by the AI.',
    'generate.sector': 'Business sector',
    'generate.target': 'Monthly revenue target (RM)',
    'generate.description': 'Describe your business',
    'generate.descriptionHint': 'What you sell, where, who buys from you, and what you want to find out.',
    'generate.action': 'Generate my shop',
    'generate.loading': 'Building your scenario…',
    'generate.failed': 'Could not generate a scenario',
    'generate.retry': 'Try again',
    'generate.orDemo': 'or load the demo shop instead',
    'generate.disclosure': 'The assistant supplies products, prices and costs only. Break-even, margins and every other figure are calculated by the app from those inputs.',
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
    'provenance.AI-generated': 'Jana AI',
    'provenance.Illustrative': 'Ilustrasi',

    'common.askAi': 'Tanya AI',
    'common.units': 'unit',
    'common.perDay': '/hari',
    'common.notEnough': 'Maklumat belum mencukupi',
    'common.illustrative': 'Data demo ilustrasi — bukan kedai sebenar.',
    'common.aiGenerated': 'Contoh janaan AI — bukan kedai sebenar dan bukan rekod anda sendiri.',
    'generate.title': 'Jana kedai daripada penerangan anda',
    'generate.subtitle': 'Terangkan perniagaan anda dan pembantu akan bina senario permulaan. Setiap angka di halaman seterusnya dikira oleh aplikasi, bukan oleh AI.',
    'generate.sector': 'Sektor perniagaan',
    'generate.target': 'Sasaran jualan bulanan (RM)',
    'generate.description': 'Terangkan perniagaan anda',
    'generate.descriptionHint': 'Apa yang anda jual, di mana, siapa pelanggan anda, dan apa yang anda ingin tahu.',
    'generate.action': 'Jana kedai saya',
    'generate.loading': 'Sedang bina senario anda…',
    'generate.failed': 'Tidak dapat menjana senario',
    'generate.retry': 'Cuba lagi',
    'generate.orDemo': 'atau muat kedai demo sebagai ganti',
    'generate.disclosure': 'Pembantu hanya beri produk, harga dan kos. Titik pulang modal, margin dan semua angka lain dikira oleh aplikasi daripada input tersebut.',
    'common.simulation': 'Simulasi, bukan ramalan.',
  },
}

/** @param {string} lang @param {string} key @returns {string} */
export function translate(lang, key) {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key
}
