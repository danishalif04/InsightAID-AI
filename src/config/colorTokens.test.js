import { describe, expect, it } from 'vitest'
import { ALL_COLOR_CATEGORIES, MAGNITUDE_RAMPS, magnitudeStep } from './colorTokens'
import { CVD_TYPES, minPairwiseDistanceUnderCvd } from './colorblindSimulation'

/** Relative luminance (WCAG 2.x) — used to assert the sequential ramps are
 * actually monotonic, rather than trusting that they look ordered. */
function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

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

describe('magnitudeStep', () => {
  const RAMPS = [
    ['green light', MAGNITUDE_RAMPS.green.light],
    ['green dark', MAGNITUDE_RAMPS.green.dark],
    ['blue light', MAGNITUDE_RAMPS.blue.light],
    ['blue dark', MAGNITUDE_RAMPS.blue.dark],
  ]

  it('uses ramps that are monotonic in luminance, so shade tracks size', () => {
    for (const [name, ramp] of RAMPS) {
      const lums = ramp.map(relativeLuminance)
      for (let i = 1; i < lums.length; i++) {
        expect(lums[i], `${name}: ${ramp[i]} is not lighter than ${ramp[i - 1]}`).toBeGreaterThan(lums[i - 1])
      }
    }
  })

  it('maps the largest value to the lightest step and the smallest to the dimmest', () => {
    expect(magnitudeStep(100, { max: 100, isDark: true, hue: 'green' })).toBe(MAGNITUDE_RAMPS.green.dark.at(-1))
    expect(magnitudeStep(0, { max: 100, isDark: true, hue: 'green' })).toBe(MAGNITUDE_RAMPS.green.dark[0])
    expect(magnitudeStep(100, { max: 100, isDark: false, hue: 'blue' })).toBe(MAGNITUDE_RAMPS.blue.light.at(-1))
    expect(magnitudeStep(0, { max: 100, isDark: false, hue: 'blue' })).toBe(MAGNITUDE_RAMPS.blue.light[0])
  })

  it('picks the ramp that suits the active surface and the requested hue', () => {
    expect(MAGNITUDE_RAMPS.green.dark).toContain(magnitudeStep(50, { max: 100, isDark: true, hue: 'green' }))
    expect(MAGNITUDE_RAMPS.green.light).toContain(magnitudeStep(50, { max: 100, isDark: false, hue: 'green' }))
    expect(MAGNITUDE_RAMPS.blue.dark).toContain(magnitudeStep(50, { max: 100, isDark: true, hue: 'blue' }))
    expect(MAGNITUDE_RAMPS.blue.light).toContain(magnitudeStep(50, { max: 100, isDark: false, hue: 'blue' }))
  })

  it('keeps the two hues visibly apart, so the charts do not read alike', () => {
    for (const mode of ['light', 'dark']) {
      for (let i = 0; i < MAGNITUDE_RAMPS.green[mode].length; i++) {
        expect(MAGNITUDE_RAMPS.green[mode][i]).not.toBe(MAGNITUDE_RAMPS.blue[mode][i])
      }
    }
  })

  it('spreads the ramp across a clustered range instead of pinning to the top', () => {
    // Real case: product margins between 33% and 37.5%. Scaled from zero
    // every bar lands on the top step; scaled across the range they differ.
    const clustered = [33, 34, 35.5, 37, 37.5]
    const range = { min: Math.min(...clustered), max: Math.max(...clustered), isDark: true, hue: 'green' }
    const shades = clustered.map((v) => magnitudeStep(v, range))
    expect(new Set(shades).size).toBeGreaterThan(1)
    expect(shades[0]).toBe(MAGNITUDE_RAMPS.green.dark[0])
    expect(shades.at(-1)).toBe(MAGNITUDE_RAMPS.green.dark.at(-1))
  })

  it('gives every bar the mid step when all values are identical', () => {
    const flat = [10, 10, 10].map((v) => magnitudeStep(v, { min: 10, max: 10, isDark: true }))
    expect(new Set(flat).size).toBe(1)
    expect(MAGNITUDE_RAMPS.green.dark).toContain(flat[0])
  })

  it('falls back to the green ramp for an unknown hue rather than returning undefined', () => {
    expect(MAGNITUDE_RAMPS.green.dark).toContain(magnitudeStep(50, { max: 100, isDark: true, hue: 'chartreuse' }))
  })

  it('never divides by zero or returns undefined for degenerate input', () => {
    for (const [value, max] of [[0, 0], [5, 0], [NaN, 100], [10, NaN], [-5, 100]]) {
      expect(MAGNITUDE_RAMPS.green.dark).toContain(magnitudeStep(value, { max, isDark: true, hue: 'green' }))
    }
    expect(MAGNITUDE_RAMPS.green.dark).toContain(magnitudeStep(5, {}))
    expect(MAGNITUDE_RAMPS.green.dark).toContain(magnitudeStep(5))
  })
})
