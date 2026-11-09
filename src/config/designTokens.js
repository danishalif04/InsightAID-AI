/**
 * "Dark glow" editorial redesign — single source of truth for the new
 * design system (colors, type, motion, radii). Feeds both
 * src/styles/index.css's `@theme` CSS vars (so Tailwind utilities like
 * `bg-surface`/`text-muted` work everywhere) and any JS/SVG context that
 * needs a raw hex (e.g. a Framer Motion gradient, a canvas glow).
 *
 * This is additive to the EXISTING palette in index.css (brand/accent/
 * sentiment/platform/crisis/forecast tokens, src/config/colorTokens.js) —
 * nothing here removes or renames those; pages not yet redesigned keep
 * using them unchanged. New page redesigns should prefer these tokens.
 *
 * Muted-text values below are not asserted — see
 * src/config/designTokens.test.js, which runs the real WCAG contrast
 * formula (src/utils/contrastRatio.js) against every background each
 * color can appear on and fails if any combination drops under AA (4.5:1).
 * This specifically fixes a real bug Phase 7's axe-core sweep found:
 * the app's previous reliance on Tailwind's own default slate-400/500
 * measured 2.63–4.46:1 in Standard mode, under AA, on nearly every page.
 */

export const GLOW_DARK = {
  bg: '#050807',
  surface: '#0A100D',
  surfaceElevated: '#0F1713',
  border: 'rgba(255, 255, 255, 0.07)',
  text: '#F2F5F3',
  // Two-tier muted text, dark mode. Verified by designTokens.test.js
  // against all three dark backgrounds above (surfaceElevated is the
  // hardest case — lightest of the three dark backgrounds).
  textMuted: '#9AA39D', // vs surfaceElevated: 7.03:1
  textSubtle: '#8A9690', // vs surfaceElevated: 5.94:1
  brandGreen: '#22C55E',
  emerald: '#10B981',
  mint: '#6EE7B7',
  deepGreen: '#064E3B',
}

export const GLOW_LIGHT = {
  // Reuses the app's existing light canvas/surface (index.css's
  // --color-canvas/--color-surface) — the brief only asks for the DARK
  // mode to adopt the new glow aesthetic; light mode just needs to stay
  // clean, readable, and real-AA, not get its own new background system.
  canvas: '#F6F8F7',
  surface: '#FFFFFF',
  text: '#15211C', // existing --color-brand-950, already high-contrast
  // Two-tier muted text, light mode. Verified against BOTH canvas and
  // surface (canvas is the harder case — closer to the text color than
  // pure white, and real pages mix both backgrounds).
  textMuted: '#52635E', // vs canvas: 5.96:1, vs white: 6.35:1
  textSubtle: '#5E6E69', // vs canvas: 5.04:1, vs white: 5.37:1
  brandGreen: '#16A34A', // existing --color-accent-600, darkened for AA on white
}

/** Glow spotlight — a radial gradient positioned at the top of a page,
 * low-opacity emerald, per the "nextra-hero" reference's lighting mood.
 * Returned as a CSS `background` value so callers (AppShell, PageHero)
 * don't need to know the exact gradient stops. */
export function glowBackground({ opacity = 0.18 } = {}) {
  return `radial-gradient(60% 50% at 50% -10%, rgba(16, 185, 129, ${opacity}) 0%, rgba(16, 185, 129, 0) 70%)`
}

export const TYPEFACE = {
  // UI body/nav/labels — Manrope (brief's choice; Geist isn't on Google
  // Fonts, Manrope is the closer, immediately-loadable real alternative).
  ui: "'Manrope', 'Inter', ui-sans-serif, system-ui, sans-serif",
  // The 1-3 accent-italic words inside a page title (e.g. "Business
  // *Forecasting*"). Never the whole title — see PageHero's `highlight` prop.
  serifAccent: "'Instrument Serif', Georgia, serif",
}

export const MOTION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  // Framer Motion `transition` presets — callers merge their own `delay`.
  // Respect prefers-reduced-motion (and FYP II Phase 7's Low-Sensory mode,
  // which disables Framer Motion outright, see useLowSensoryMode) by
  // checking that signal BEFORE spreading these, not inside this file —
  // this module has no DOM access, stays a pure token source.
  fadeUp: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  pillSpring: { type: 'spring', stiffness: 400, damping: 30 },
}

export const RADII = {
  pill: '9999px',
  card: '1.5rem', // rounded-2xl-ish
  cardLarge: '2rem', // rounded-3xl-ish, hero/featured cards only
}
