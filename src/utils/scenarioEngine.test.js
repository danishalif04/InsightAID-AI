import { describe, expect, it } from 'vitest'
import {
  buildAllScenarios,
  buildScenario,
  calculateBreakEven,
  calculateGrossMarginPercent,
  calculateMarketingCostRatioPercent,
} from './scenarioEngine'

describe('buildScenario', () => {
  // FYP2.md §28's own worked example: 100 expected units at RM35 -> 70 / 100 / 140 units, RM2,450 / RM3,500 / RM4,900.
  const assumptions = { expected_monthly_units: 100, selling_price: 35 }

  it('reproduces the §28 worked example exactly, with no growth rate provided (default +40%)', () => {
    const scenarios = buildAllScenarios(assumptions)

    expect(scenarios.conservative.units).toBe(70)
    expect(scenarios.conservative.revenue).toBe(2450)

    expect(scenarios.expected.units).toBe(100)
    expect(scenarios.expected.revenue).toBe(3500)

    expect(scenarios.growth.units).toBe(140)
    expect(scenarios.growth.revenue).toBe(4900)
  })

  it('uses the user-provided growth rate instead of the default when present', () => {
    const growth = buildScenario({ ...assumptions, expected_growth_rate: 20 }, 'growth')
    expect(growth.units).toBe(120) // 100 * 1.2
    expect(growth.revenue).toBe(4200) // 120 * 35
    expect(growth.formulas.some((f) => f.expression.includes('stated growth rate'))).toBe(true)
  })

  it('labels the default growth rate as a default assumption when none is provided', () => {
    const growth = buildScenario(assumptions, 'growth')
    expect(growth.formulas.some((f) => f.expression.includes('default assumption'))).toBe(true)
  })

  it('never fabricates a value for a missing input — flags it as insufficient instead', () => {
    const result = buildScenario({}, 'expected')
    expect(result.units).toBeNull()
    expect(result.revenue).toBeNull()
    expect(result.grossProfit).toBeNull()
    expect(result.insufficientFields).toEqual(
      expect.arrayContaining(['expected_monthly_units', 'revenue', 'variableCosts', 'grossProfit', 'operatingCosts', 'operatingResult'])
    )
  })

  it('falls back to expected_monthly_revenue (scaled) when selling_price is absent', () => {
    const result = buildScenario({ expected_monthly_revenue: 1000 }, 'conservative')
    expect(result.revenue).toBe(700) // 1000 * 0.7
  })

  it('computes gross profit and operating result when all cost inputs are present', () => {
    const full = {
      expected_monthly_units: 100,
      selling_price: 35,
      cost_per_unit: 15,
      marketing_cost: 200,
      platform_fees: 50,
      shipping_cost: 100,
      labour_cost: 300,
      fixed_costs: 250,
      other_expenses: 100,
    }
    const result = buildScenario(full, 'expected')
    expect(result.variableCosts).toBe(1500) // 100 * 15
    expect(result.grossProfit).toBe(2000) // 3500 - 1500
    expect(result.operatingCosts).toBe(1000) // 200+50+100+300+250+100
    expect(result.operatingResult).toBe(1000) // 2000 - 1000
    expect(result.insufficientFields).toHaveLength(0)
  })

  it('keeps operating costs identical across all three scenarios (not scaled by the unit multiplier)', () => {
    const full = {
      expected_monthly_units: 100,
      selling_price: 35,
      cost_per_unit: 15,
      marketing_cost: 200,
      fixed_costs: 300,
    }
    const scenarios = buildAllScenarios(full)
    expect(scenarios.conservative.operatingCosts).toBe(scenarios.expected.operatingCosts)
    expect(scenarios.growth.operatingCosts).toBe(scenarios.expected.operatingCosts)
  })

  it('throws on an unknown case type rather than silently returning something', () => {
    expect(() => buildScenario(assumptions, 'best')).toThrow(/Unknown scenario case/)
  })
})

describe('calculateBreakEven', () => {
  it('computes break-even units and revenue from total operating costs and contribution margin', () => {
    const result = calculateBreakEven({
      selling_price: 35,
      cost_per_unit: 15,
      fixed_costs: 300,
      marketing_cost: 100,
    })
    // total costs = 400, contribution margin = 20 -> 20 units -> ceil(400/20) = 20
    expect(result.insufficient).toBe(false)
    expect(result.units).toBe(20)
    expect(result.revenue).toBe(700) // 20 * 35
    expect(result.formula).toContain('Break-even Units')
  })

  it('flags insufficient rather than dividing by zero when price equals cost per unit', () => {
    const result = calculateBreakEven({ selling_price: 20, cost_per_unit: 20, fixed_costs: 100 })
    expect(result.insufficient).toBe(true)
    expect(result.units).toBeNull()
  })

  it('flags insufficient when required inputs are missing', () => {
    const result = calculateBreakEven({ selling_price: 20 })
    expect(result.insufficient).toBe(true)
  })
})

describe('calculateGrossMarginPercent', () => {
  it('computes margin as a percentage', () => {
    expect(calculateGrossMarginPercent(1000, 400)).toBe(40)
  })

  it('returns null instead of Infinity/NaN when revenue is zero or missing', () => {
    expect(calculateGrossMarginPercent(0, 400)).toBeNull()
    expect(calculateGrossMarginPercent(null, 400)).toBeNull()
  })
})

describe('calculateMarketingCostRatioPercent', () => {
  it('computes the ratio as a percentage', () => {
    expect(calculateMarketingCostRatioPercent(100, 1000)).toBe(10)
  })

  it('returns null when revenue is zero or missing', () => {
    expect(calculateMarketingCostRatioPercent(100, 0)).toBeNull()
    expect(calculateMarketingCostRatioPercent(100, undefined)).toBeNull()
  })
})
