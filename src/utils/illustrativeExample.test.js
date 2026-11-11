import { describe, expect, it } from 'vitest'
import {
  hasCoreAssumptions,
  ILLUSTRATIVE_ASSUMPTIONS,
  ILLUSTRATIVE_STARTUP_CAPITAL,
  resolveDisplayAssumptions,
} from './illustrativeExample'
import { calculateBreakEven, calculateGrossMarginPercent } from './scenarioEngine'

describe('illustrativeExample — matches the spec mock it mimics', () => {
  it('keeps total operating costs at exactly RM2,500 while still splitting across categories', () => {
    const operatingCosts = ['marketing_cost', 'platform_fees', 'shipping_cost', 'labour_cost', 'fixed_costs', 'other_expenses']
    const total = operatingCosts.reduce((sum, field) => sum + ILLUSTRATIVE_ASSUMPTIONS[field], 0)
    expect(total).toBe(2500)
    // More than one non-zero category, so the expense chart shows a real ranked comparison.
    expect(operatingCosts.filter((field) => ILLUSTRATIVE_ASSUMPTIONS[field] > 0).length).toBeGreaterThan(1)
  })

  it('produces the mock\'s 35% margin and ~RM7,143 break-even revenue', () => {
    const { selling_price: price, cost_per_unit: cost, expected_monthly_units: units } = ILLUSTRATIVE_ASSUMPTIONS
    expect(calculateGrossMarginPercent(price * units, (price - cost) * units)).toBe(35)

    const breakEven = calculateBreakEven(ILLUSTRATIVE_ASSUMPTIONS)
    expect(breakEven.insufficient).toBe(false)
    expect(breakEven.revenue).toBeGreaterThan(7000)
    expect(breakEven.revenue).toBeLessThan(7300)
  })

  it('has a startup capital example that totals more than the available capital, so a funding gap is visible', () => {
    const total = Object.values(ILLUSTRATIVE_STARTUP_CAPITAL.items).reduce((sum, value) => sum + value, 0)
    expect(total).toBeGreaterThan(ILLUSTRATIVE_STARTUP_CAPITAL.availableCapital)
  })
})

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
