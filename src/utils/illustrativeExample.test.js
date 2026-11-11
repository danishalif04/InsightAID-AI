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

  it("produces the mock's 35% margin and ~RM7,143 break-even revenue", () => {
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

describe('hasCoreAssumptions', () => {
  it('needs both price and cost to be real numbers', () => {
    expect(hasCoreAssumptions({})).toBe(false)
    expect(hasCoreAssumptions({ selling_price: 10 })).toBe(false)
    expect(hasCoreAssumptions({ cost_per_unit: 6 })).toBe(false)
    expect(hasCoreAssumptions({ selling_price: 10, cost_per_unit: 6 })).toBe(true)
  })
})

describe('resolveDisplayAssumptions — a real saved value always wins', () => {
  it('fills everything from the example when nothing is saved, and says so', () => {
    const { values, isIllustrative, assumedFields } = resolveDisplayAssumptions({})
    expect(isIllustrative).toBe(true)
    expect(values.selling_price).toBe(ILLUSTRATIVE_ASSUMPTIONS.selling_price)
    expect(values.cost_per_unit).toBe(ILLUSTRATIVE_ASSUMPTIONS.cost_per_unit)
    expect(assumedFields).toContain('selling price')
    expect(assumedFields).toContain('monthly operating costs')
  })

  it('keeps a real selling price and derives only the missing cost per unit from it', () => {
    // usertest2's real shape: a price and units entered, no cost per unit yet.
    const { values, isIllustrative, assumedFields } = resolveDisplayAssumptions({
      selling_price: 18,
      expected_monthly_units: 150,
      marketing_cost: 300,
    })

    expect(values.selling_price).toBe(18) // real value preserved, NOT replaced by the example's 20
    expect(values.expected_monthly_units).toBe(150) // real value preserved
    expect(values.cost_per_unit).toBe(11.7) // derived at the example's 35% margin: 18 x 0.65
    expect(isIllustrative).toBe(true)
    expect(assumedFields).toContain('cost per unit')
    expect(assumedFields).not.toContain('selling price')
    expect(assumedFields).not.toContain('monthly units sold')
  })

  it('derives a missing selling price from a real cost per unit', () => {
    const { values, assumedFields } = resolveDisplayAssumptions({ cost_per_unit: 13 })
    expect(values.cost_per_unit).toBe(13)
    expect(values.selling_price).toBe(20) // 13 / 0.65
    expect(assumedFields).toContain('selling price')
  })

  it('never invents extra cost categories once the owner has recorded any cost', () => {
    const { values, assumedFields } = resolveDisplayAssumptions({
      selling_price: 18,
      cost_per_unit: 10,
      marketing_cost: 300,
    })
    expect(values.marketing_cost).toBe(300)
    expect(values.fixed_costs).toBeUndefined()
    expect(values.labour_cost).toBeUndefined()
    expect(assumedFields).not.toContain('monthly operating costs')
  })

  it('reports nothing assumed when every field is already real', () => {
    const complete = { ...ILLUSTRATIVE_ASSUMPTIONS }
    const { isIllustrative, assumedFields } = resolveDisplayAssumptions(complete)
    expect(isIllustrative).toBe(false)
    expect(assumedFields).toEqual([])
  })
})
