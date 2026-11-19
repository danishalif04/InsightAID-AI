/**
 * Contrast + colour-vision audit for the post-submission re-test.
 * Uses the project's own contrastRatio.js and colorblindSimulation.js
 * unmodified. Run from the repository root:
 *   node results/post_submission_2026-11/audit_contrast.mjs before
 */
import { contrastRatio } from '../../src/utils/contrastRatio.js'
import { minPairwiseDistanceUnderCvd, CVD_TYPES } from '../../src/config/colorblindSimulation.js'
import * as T from '../../src/config/colorTokens.js'

export const LIGHT_BG = { canvas: '#f6f8f7', surface: '#ffffff' }
export const DARK_BG = { surface: '#0a100d', elevated: '#0f1713' }

export function palette(tokens) {
  const { BRAND_COLOR, SENTIMENT_COLORS: S, PLATFORM_COLORS: P, CRISIS_COLORS: C, FORECAST_COLORS: F } = tokens
  return [
    { category: 'brand', role: 'brand', hex: BRAND_COLOR },
    ...Object.entries(S).map(([role, hex]) => ({ category: 'sentiment', role, hex })),
    ...Object.entries(P).map(([role, hex]) => ({ category: 'platform', role, hex })),
    ...Object.entries(C).map(([role, hex]) => ({ category: 'crisis', role, hex })),
    ...Object.entries(F).map(([role, hex]) => ({ category: 'forecast', role, hex })),
  ]
}

export const r2 = (n) => Math.round(n * 100) / 100
export const minVs = (hex, bgs) => r2(Math.min(...Object.values(bgs).map((bg) => contrastRatio(hex, bg))))

export function auditRows(entries, pick = (e) => e.hex) {
  return entries.map((e) => {
    const hex = pick(e)
    const light = minVs(hex, LIGHT_BG)
    const dark = minVs(hex, DARK_BG)
    return { ...e, hex, light, dark, pass: light >= 3 && dark >= 3 }
  })
}

export function cvdByCategory(entries, pick = (e) => e.hex) {
  const cats = {}
  for (const e of entries) (cats[e.category] ??= []).push(pick(e))
  const out = {}
  for (const [cat, hexes] of Object.entries(cats)) {
    if (hexes.length < 2) continue
    out[cat] = Object.fromEntries(CVD_TYPES.map((t) => [t, r2(minPairwiseDistanceUnderCvd(hexes, t))]))
  }
  return out
}

if (process.argv[2] === 'before') {
  const rows = auditRows(palette(T))
  console.log('ROLE'.padEnd(22), 'HEX'.padEnd(9), 'LIGHT'.padStart(6), 'DARK'.padStart(7), '  VERDICT')
  for (const x of rows) {
    console.log(
      `${x.category}.${x.role}`.padEnd(22), x.hex.padEnd(9),
      String(x.light).padStart(6), String(x.dark).padStart(7),
      '  ' + (x.pass ? 'pass' : `FAIL (${x.light < 3 ? 'light' : ''}${x.light < 3 && x.dark < 3 ? '+' : ''}${x.dark < 3 ? 'dark' : ''})`))
  }
  const fails = rows.filter((x) => !x.pass)
  console.log(`\n${rows.length} colours · ${rows.length - fails.length} pass · ${fails.length} FAIL`)
  console.log('CVD min pairwise distance by category:', JSON.stringify(cvdByCategory(palette(T))))
}
