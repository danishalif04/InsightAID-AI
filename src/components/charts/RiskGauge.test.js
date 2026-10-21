import { describe, expect, it } from 'vitest'
import { angleForScore } from './riskGaugeMath'

describe('angleForScore', () => {
  it('maps 0 to the gauge start angle', () => {
    expect(angleForScore(0)).toBe(90)
  })

  it('maps 100 to the gauge end angle', () => {
    expect(angleForScore(100)).toBe(-270)
  })

  it('maps 50 to the midpoint of the sweep', () => {
    expect(angleForScore(50)).toBe(90 + 0.5 * (-270 - 90))
  })

  it('clamps out-of-range scores instead of extrapolating', () => {
    expect(angleForScore(-10)).toBe(angleForScore(0))
    expect(angleForScore(150)).toBe(angleForScore(100))
  })
})
