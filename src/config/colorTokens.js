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
/**
 * POST-SUBMISSION CONTRAST RE-TEST (2026-11-19).
 *
 * The dissertation (Table 4.7) reports 4 of these 15 colours below the W3C
 * 3:1 minimum for graphical objects, measured against the LIGHT theme only.
 * Re-auditing against BOTH themes — and taking the worst case of each
 * theme's two real chart surfaces rather than the best — found SIX
 * failures, not four: the light-theme four plus `platform.x` (2.90 on dark)
 * and `forecast.actual` (1.30 on dark, the worst value in the palette).
 *
 * Six values below were therefore replaced. Each replacement is the colour
 * CLOSEST to the original in sRGB that satisfies all three constraints at
 * once: hue within +/-12 degrees of the original, >= 3:1 against both
 * themes, and >= 30 units of simulated colour-blind separation from the
 * rest of its category (the floor this file's own test already enforces).
 * Minimal change, not a redesign — `platform.x` moved 5.5 RGB units.
 *
 * Protocol, full before/after table and the reproduction command:
 * results/post_submission_2026-11/{PROTOCOL,RESULTS}.md. The submitted
 * artefacts (reports/CHART_AUDIT.md and the ml results folders) are
 * untouched.
 */

// Was #22c55e (2.14:1 on light). Still the same green, one step deeper.
// NOTE: Tailwind's `--color-accent-500` brand ramp in src/styles/index.css
// remains #22c55e — it is a UI token, outside this chart-colour audit's
// pre-registered scope, and is recorded as a follow-up in RESULTS.md.
export const BRAND_COLOR = '#22a45f'

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
  shopee: '#db7509', // was #f59e0b (2.01:1 on light) — same amber, deepened
  tiktok: '#0e96e9', // was #0ea5e9 (2.60:1 on light) — same sky blue, deepened
  // Phase 6 chart audit: was indigo-500 (#6366f1) — simulated-CVD check
  // (src/config/colorblindSimulation.js) found this only 30.1 units from
  // `tiktok` under protanopia, the weakest pair in this palette. Rose-700
  // widens that to 73.5/107.8/79.1 across protanopia/deuteranopia/
  // tritanopia with no new collision introduced (verified in colorTokens.test.js).
  x: '#c3103b', // was #be123c (2.90:1 on dark) — 5.5 RGB units, hue unchanged
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
  warning: '#cf7b0f', // was #ca8a04 (2.75:1 on light) — amber, 7 degrees warmer
  critical: '#dc2626', // matches existing --color-danger — the ONE unified red
}

/** Forecast chart series — distinct from every category above.
 * `actual` reuses the existing dark-pine brand-900 token: it's desaturated
 * enough to read as "neutral historical data," not a second brand accent. */
export const FORECAST_COLORS = {
  actual: '#217044', // was #1e2f29 (1.30:1 on dark — worst in the palette)
  forecast: '#7c3aed', // violet-600
  baseline: '#0d9488', // teal-600
  scenario: '#db2777', // pink-600
}

/**
 * Sequential ramps for charts whose bars are a *magnitude* — one hue,
 * monotonically lighter, so the shade carries the same information the bar
 * length does.
 *
 * Why not a hue per bar, which would look livelier: a six-colour
 * categorical palette cannot pass an all-pairs colour-vision check, and in
 * these charts every bar is on screen at once, so every pair matters — not
 * just neighbours. The candidate palette tried first failed twice: emerald
 * against pink measured ΔE 1.1 under deuteranopia (indistinguishable), and
 * amber against orange measured ΔE 6.7 even with full colour vision. Both
 * charts using these ramps are already ranked and already label every bar
 * on the axis, so identity is carried by the label and the ramp is free to
 * carry size. Two hues so the two charts don't read as the same chart.
 *
 * Each ramp is monotonic in relative luminance and every step clears 2:1
 * against its own surface — measured, not assumed:
 *   green/light 2.54:1 · green/dark 3.32:1 · blue/light 4.10:1 · blue/dark 3.07:1
 */
export const MAGNITUDE_RAMPS = {
  green: {
    light: ['#064e3b', '#065f46', '#047857', '#059669', '#10b981'],
    dark: ['#047857', '#059669', '#10b981', '#34d399', '#6ee7b7'],
  },
  blue: {
    light: ['#082f49', '#0c4a6e', '#075985', '#0369a1', '#0284c7'],
    dark: ['#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc'],
  },
}

/**
 * Step of a sequential ramp for one value.
 *
 * Scaled across the chart's own [min, max] rather than from zero, because
 * real business values often cluster: this shop's product margins all sit
 * between 33% and 37.5%, and a zero-based scale puts every bar on the top
 * step, which is no encoding at all. Normalising to the observed range
 * spreads the ramp over the spread that actually exists. The bar lengths
 * remain zero-based and carry the absolute magnitude; the shade carries
 * position within the range.
 *
 * When every value is identical there is no range to show, so each bar
 * takes the mid step rather than an arbitrary end.
 *
 * @param {number} value this bar's value
 * @param {{min?: number, max: number, isDark?: boolean, hue?: 'green'|'blue'}} options
 * @returns {string} hex colour
 */
export function magnitudeStep(value, { min = 0, max, isDark = true, hue = 'green' } = {}) {
  const ramp = (MAGNITUDE_RAMPS[hue] ?? MAGNITUDE_RAMPS.green)[isDark ? 'dark' : 'light']
  const mid = Math.floor((ramp.length - 1) / 2)
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return ramp[mid]
  const span = max - min
  if (span <= 0) return ramp[mid]
  const ratio = Math.min(Math.max((value - min) / span, 0), 1)
  return ramp[Math.round(ratio * (ramp.length - 1))]
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
