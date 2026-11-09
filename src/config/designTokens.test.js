import { describe, expect, it } from 'vitest'
import { contrastRatio, meetsWcag } from '@/utils/contrastRatio'
import { GLOW_DARK, GLOW_LIGHT } from './designTokens'

describe('GLOW_DARK muted text — real AA contrast against every dark background it can sit on', () => {
  const backgrounds = [GLOW_DARK.bg, GLOW_DARK.surface, GLOW_DARK.surfaceElevated]

  it('textMuted clears AA against bg/surface/surfaceElevated', () => {
    for (const bg of backgrounds) {
      const ratio = contrastRatio(GLOW_DARK.textMuted, bg)
      expect(meetsWcag(ratio, 'AA')).toBe(true)
    }
  })

  it('textSubtle clears AA against bg/surface/surfaceElevated', () => {
    for (const bg of backgrounds) {
      const ratio = contrastRatio(GLOW_DARK.textSubtle, bg)
      expect(meetsWcag(ratio, 'AA')).toBe(true)
    }
  })
})

describe('GLOW_LIGHT muted text — real AA contrast against canvas and surface', () => {
  const backgrounds = [GLOW_LIGHT.canvas, GLOW_LIGHT.surface]

  it('textMuted clears AA against canvas and surface', () => {
    for (const bg of backgrounds) {
      const ratio = contrastRatio(GLOW_LIGHT.textMuted, bg)
      expect(meetsWcag(ratio, 'AA')).toBe(true)
    }
  })

  it('textSubtle clears AA against canvas and surface', () => {
    for (const bg of backgrounds) {
      const ratio = contrastRatio(GLOW_LIGHT.textSubtle, bg)
      expect(meetsWcag(ratio, 'AA')).toBe(true)
    }
  })

  it('brandGreen-on-white clears AA for the large/non-text threshold (its real use: buttons, pills, icons) — NOT small body text', () => {
    const ratio = contrastRatio(GLOW_LIGHT.brandGreen, GLOW_LIGHT.surface)
    expect(meetsWcag(ratio, 'AA', true)).toBe(true)
    // Documents the real limit, so nobody later uses this color for small
    // text and assumes it's covered by the check above: it genuinely isn't.
    expect(meetsWcag(ratio, 'AA', false)).toBe(false)
  })
})

describe('regression guard — this is the bug Phase 7 found, pinned so it can never silently come back', () => {
  it('Tailwind default slate-400/500 would fail AA on these same backgrounds (documents WHY these tokens exist)', () => {
    const slate400 = '#94a3b8'
    const slate500 = '#64748b'
    expect(meetsWcag(contrastRatio(slate400, GLOW_LIGHT.surface), 'AA')).toBe(false)
    expect(meetsWcag(contrastRatio(slate500, GLOW_LIGHT.canvas), 'AA')).toBe(false)
  })
})
