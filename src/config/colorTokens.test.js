import { describe, expect, it } from 'vitest'
import { ALL_COLOR_CATEGORIES } from './colorTokens'
import { CVD_TYPES, minPairwiseDistanceUnderCvd } from './colorblindSimulation'

describe('colorTokens', () => {
  it('never assigns the same hex value to two different categories', () => {
    const seen = new Map()
    for (const [category, colors] of Object.entries(ALL_COLOR_CATEGORIES)) {
      for (const [key, hex] of Object.entries(colors)) {
        const normalized = hex.toLowerCase()
        if (seen.has(normalized)) {
          throw new Error(
            `${normalized} is used by both ${seen.get(normalized)} and ${category}.${key} — colors must not be reused across categories.`
          )
        }
        seen.set(normalized, `${category}.${key}`)
      }
    }
    expect(seen.size).toBeGreaterThan(0)
  })

  it('every value is a valid 6-digit hex color', () => {
    for (const colors of Object.values(ALL_COLOR_CATEGORIES)) {
      for (const hex of Object.values(colors)) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  /**
   * Phase 6 (FYP II master prompt): "check whether the existing palette is
   * actually color-blind safe... if it isn't, fix it with a test, don't
   * just assert it is." This simulates protanopia/deuteranopia/tritanopia
   * (src/config/colorblindSimulation.js) and checks that within EVERY
   * multi-color category (brand has only one color — nothing to confuse it
   * with), no two colors become near-indistinguishable to a viewer with
   * that deficiency. Threshold of 30 is deliberately below the current
   * worst real measurement (32.1, CRISIS under deuteranopia) so this test
   * actually catches a regression — it originally caught a real issue: the
   * pre-fix CRISIS warning/critical pair measured 27.5 under tritanopia,
   * and PLATFORM tiktok/x measured 30.1 under protanopia (see the "Phase 6
   * chart audit" comments on CRISIS_COLORS.warning / PLATFORM_COLORS.x
   * above for what replaced them and why).
   */
  it('stays distinguishable within each category under simulated color blindness', () => {
    for (const [category, colors] of Object.entries(ALL_COLOR_CATEGORIES)) {
      const hexes = Object.values(colors)
      if (hexes.length < 2) continue // nothing to confuse a single color with
      for (const type of CVD_TYPES) {
        const minDistance = minPairwiseDistanceUnderCvd(hexes, type)
        expect(minDistance, `${category} has a pair too close under simulated ${type}`).toBeGreaterThan(30)
      }
    }
  })
})
