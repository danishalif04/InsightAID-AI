/**
 * Real WCAG 2.2 contrast-ratio math (relative luminance formula,
 * §1.4.3/§1.4.6) — FYP II Phase 7 needs REAL numbers for Low-Sensory (AA
 * target) and Senior (AAA target) mode, not an asserted "it's accessible."
 * Pure function, no DOM — testable without a browser.
 */

function hexToRgb(hex) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255
  return { r, g, b }
}

function channelLuminance(channel) {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

/** 0 (black) to 1 (white) relative luminance of a '#rrggbb' color. */
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

/** WCAG contrast ratio between two '#rrggbb' colors, 1 (identical) to 21 (black/white). */
export function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA)
  const lumB = relativeLuminance(hexB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
}

/** WCAG 2.2 pass/fail against the real published thresholds — never a
 * guessed cutoff. `large` = 18pt+/14pt-bold+ text or non-text UI components. */
export function meetsWcag(ratio, level = 'AA', large = false) {
  if (level === 'AAA') return large ? ratio >= 4.5 : ratio >= 7
  return large ? ratio >= 3 : ratio >= 4.5
}
