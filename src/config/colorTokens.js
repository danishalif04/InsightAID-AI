/**
 * Single source of truth for every semantic color this app uses on a chart
 * or in a status badge. Two places mirror these exact hex values on
 * purpose (plain JS can't generate Tailwind's `@theme` CSS at build time
 * without a new build-step dependency, which this redesign isn't adding):
 *   - `src/styles/index.css`'s `@theme` block (CSS custom properties, for
 *     Tailwind utility classes / non-chart UI)
 *   - `src/theme/chartTheme.js` (plain hex, since Recharts renders SVG
 *     fills/strokes directly and can't read a CSS variable through a
 *     Tailwind class)
 * Change a value here, then copy it into both places — keeping ONE table
 * as the documented origin (rather than two independent tables) is what
 * this file buys: a human diff-reviewer can see when they drift.
 *
 * Audit findings this resolves (docs/audit/INSIGHTAID_SYSTEM_AUDIT.md
 * §5.2): the brand/accent green (`#22c55e`) was previously reused for
 * "positive sentiment" AND "TikTok" AND every primary button — collapsed
 * here into separate, non-overlapping categories. Two different crisis
 * "critical" reds (`#ef4444` in chartTheme.js vs `#dc2626` in
 * index.css's `--color-danger`) are unified to one.
 *
 * No hex value below is reused across categories — verified by the test
 * in colorTokens.test.js.
 */

/** Brand/UI — buttons, navigation, logo. NEVER used for a data value
 * (sentiment, platform, crisis, forecast) — that reuse is exactly what
 * the audit flagged. */
export const BRAND_COLOR = '#22c55e'

/** Sentiment — colorblind-safe trio (Okabe-Ito palette: blue + vermillion
 * read as clearly different hues under every common color-vision
 * deficiency, unlike the classic red/green pairing). Deliberately NOT the
 * brand green. */
export const SENTIMENT_COLORS = {
  positive: '#0072b2', // Okabe-Ito blue
  neutral: '#78716c', // warm grey (stone-500)
  negative: '#d55e00', // Okabe-Ito vermillion
}

/** Platform — 4 distinct hues, none shared with sentiment/crisis/forecast.
 * These are chart-identity colors, not the platforms' own brand colors
 * (Shopee/TikTok/X/Threads brand palettes collapse toward black/white/
 * near-identical reds, which doesn't work as 4 distinguishable chart
 * series) — documented here so the choice isn't mistaken for an attempt
 * at brand-accurate colors. */
export const PLATFORM_COLORS = {
  shopee: '#f59e0b', // amber-500
  tiktok: '#0ea5e9', // sky-500
  // Phase 6 chart audit: was indigo-500 (#6366f1) — simulated-CVD check
  // (src/config/colorblindSimulation.js) found this only 30.1 units from
  // `tiktok` under protanopia, the weakest pair in this palette. Rose-700
  // widens that to 73.5/107.8/79.1 across protanopia/deuteranopia/
  // tritanopia with no new collision introduced (verified in colorTokens.test.js).
  x: '#be123c', // rose-700
  threads: '#a855f7', // purple-500
}

/** Crisis level — exactly one danger red (`critical`), replacing the two
 * that existed before (`#ef4444` in chartTheme.js, `#dc2626` in
 * index.css). `normal` is intentionally NOT the brand green — see
 * BRAND_COLOR's note above. */
export const CRISIS_COLORS = {
  normal: '#64748b', // slate-500
  // Phase 6 chart audit: was amber-600 (#d97706) — simulated-CVD check
  // found this only 27.5 units from `critical` under tritanopia, the
  // weakest pair found across every palette in this file (warning and
  // critical becoming hard to tell apart is the worst possible place for
  // that to happen). Yellow-600 widens that to 47.6/32.1/40.0, verified
  // in colorTokens.test.js.
  warning: '#ca8a04', // yellow-600
  critical: '#dc2626', // matches existing --color-danger — the ONE unified red
}

/** Forecast chart series — distinct from every category above.
 * `actual` reuses the existing dark-pine brand-900 token: it's desaturated
 * enough to read as "neutral historical data," not a second brand accent. */
export const FORECAST_COLORS = {
  actual: '#1e2f29', // brand-900
  forecast: '#7c3aed', // violet-600
  baseline: '#0d9488', // teal-600
  scenario: '#db2777', // pink-600
}

/** Flattened lookup used by the cross-category uniqueness test, and handy
 * for anything that wants to scan every assigned hex. */
export const ALL_COLOR_CATEGORIES = {
  brand: { brand: BRAND_COLOR },
  sentiment: SENTIMENT_COLORS,
  platform: PLATFORM_COLORS,
  crisis: CRISIS_COLORS,
  forecast: FORECAST_COLORS,
}
