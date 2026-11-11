import { describe, expect, it } from 'vitest'
import { hasCoreAssumptions, ILLUSTRATIVE_ASSUMPTIONS, resolveDisplayAssumptions } from './illustrativeExample'

describe('illustrativeExample', () => {
  it('reports no core assumptions for an empty profile', () => {
    expect(hasCoreAssumptions({})).toBe(false)
    expect(hasCoreAssumptions({ selling_price: 10 })).toBe(false)
    expect(hasCoreAssumptions({ cost_per_unit: 6 })).toBe(false)
  })

  it('reports core assumptions once both price and cost are real numbers', () => {
    expect(hasCoreAssumptions({ selling_price: 10, cost_per_unit: 6 })).toBe(true)
  })

  it('falls back to the illustrative example when nothing real is saved', () => {
    const result = resolveDisplayAssumptions({})
    expect(result.isIllustrative).toBe(true)
    expect(result.values).toBe(ILLUSTRATIVE_ASSUMPTIONS)
  })

  it('uses the real values unchanged once core assumptions exist, never blending in the illustrative numbers', () => {
    const real = { selling_price: 25, cost_per_unit: 10 }
    const result = resolveDisplayAssumptions(real)
    expect(result.isIllustrative).toBe(false)
    expect(result.values).toBe(real)
  })
})
