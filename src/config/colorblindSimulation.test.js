import { describe, expect, it } from 'vitest'
import { hexToRgb, minPairwiseDistanceUnderCvd, rgbDistance, simulateCvd } from './colorblindSimulation'

describe('hexToRgb', () => {
  it('parses a 6-digit hex color', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#0072b2')).toEqual({ r: 0, g: 114, b: 178 })
  })

  it('throws on something that is not a 6-digit hex color, never guesses', () => {
    expect(() => hexToRgb('red')).toThrow()
    expect(() => hexToRgb('#fff')).toThrow()
  })
})

describe('simulateCvd', () => {
  it('leaves pure grey unchanged under every type (no color info to lose)', () => {
    for (const type of ['protanopia', 'deuteranopia', 'tritanopia']) {
      const result = simulateCvd('#808080', type)
      expect(result.r).toBeCloseTo(128, 0)
      expect(result.g).toBeCloseTo(128, 0)
      expect(result.b).toBeCloseTo(128, 0)
    }
  })

  it('throws on an unknown CVD type rather than silently falling back', () => {
    expect(() => simulateCvd('#ff0000', 'made-up-type')).toThrow()
  })
})

describe('rgbDistance / minPairwiseDistanceUnderCvd', () => {
  it('is zero for two identical colors', () => {
    expect(rgbDistance({ r: 10, g: 20, b: 30 }, { r: 10, g: 20, b: 30 })).toBe(0)
  })

  it('finds the weakest (minimum) pair, not an average', () => {
    // Two colors that stay far apart under every CVD type, plus a pair that
    // collapses toward each other under protanopia specifically (known
    // real finding this test suite is modeled on: PLATFORM.tiktok/x pre-fix).
    const min = minPairwiseDistanceUnderCvd(['#0ea5e9', '#6366f1', '#000000'], 'protanopia')
    const direct = rgbDistance(simulateCvd('#0ea5e9', 'protanopia'), simulateCvd('#6366f1', 'protanopia'))
    expect(min).toBeCloseTo(direct, 1)
  })
})
