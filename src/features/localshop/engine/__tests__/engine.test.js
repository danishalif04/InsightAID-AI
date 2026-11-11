import { describe, expect, it } from 'vitest'
import {
  breakEvenRevenue,
  breakEvenRevenueMulti,
  breakEvenUnits,
  cashRunway,
  contributionPerUnit,
  costPressure,
  dailyTarget,
  grossMarginPct,
  marginTable,
  mitigationOptions,
  monthlyExpenses,
  operatingResult,
  readiness,
  scenarioSet,
  startupCapital,
} from '../index'
import { DEMO_FIXED_COSTS, DEMO_SHOP } from '../../data/demoShop'

// ---------------------------------------------------------------------------
// The exact fixtures from the build plan (§5) and the AI Orchestration Agent
// Plan PDF. These are the figures a demo is shown against, so they are
// asserted literally rather than recomputed from the implementation.
// ---------------------------------------------------------------------------

describe('fixture 1 — fixed 2,500, price 10, var cost 6', () => {
  it('gives contribution 4, BEP 625 units, revenue RM6,250, daily target 21', () => {
    expect(contributionPerUnit(10, 6).value).toBe(4)
    expect(breakEvenUnits(2500, 10, 6).value).toBe(625)
    expect(breakEvenRevenue(2500, 10, 6).value).toBe(6250)
    expect(dailyTarget(625).value).toBe(21)
  })
})

describe('fixture 2 — price 9, cost 5, fixed 2,500, 500 units', () => {
  it('gives contribution 4, margin 44.4%, BEP 625, operating result -RM500', () => {
    expect(contributionPerUnit(9, 5).value).toBe(4)
    expect(grossMarginPct(9, 5).value).toBeCloseTo(44.4, 1)
    expect(breakEvenUnits(2500, 9, 5).value).toBe(625)
    expect(operatingResult(500, 9, 5, 2500).value).toBe(-500)
  })
})

describe('fixture 3 — coffee cost 5.00 -> 5.50 at price 8.00', () => {
  it('drops margin 37.5% -> 31.25% and needs RM8.80 to hold the old margin', () => {
    const pressure = costPressure(8, 5, 5.5)
    expect(pressure.marginBeforePct).toBe(37.5)
    expect(pressure.marginAfterPct).toBe(31.25)
    expect(pressure.marginDeltaPp).toBeCloseTo(-6.25, 2)
    expect(pressure.priceToHoldMargin).toBe(8.8)
  })

  it('offers mitigation options that show their own arithmetic', () => {
    const options = mitigationOptions(costPressure(8, 5, 5.5)).options
    expect(options.map((o) => o.id)).toContain('adjust_price')
    expect(options.find((o) => o.id === 'adjust_price').detail).toContain('8.80')
  })
})

describe('fixture 4 — demo shop: fixed 2,500 at ~35% average margin', () => {
  it('has 28 products and RM2,500 of fixed costs', () => {
    expect(DEMO_SHOP.products).toHaveLength(28)
    expect(DEMO_FIXED_COSTS).toBe(2500)
  })

  it('breaks even at about RM7,143 of monthly sales', () => {
    const result = breakEvenRevenueMulti(DEMO_FIXED_COSTS, DEMO_SHOP.products)
    expect(result.ok).toBe(true)
    expect(result.avgMarginPct).toBeCloseTo(35, 0)
    expect(result.value).toBeGreaterThan(7050)
    expect(result.value).toBeLessThan(7250)
    // The unweighted average must be disclosed as an assumption.
    expect(result.assumptions).toContain('equal sales mix')
  })
})

describe('fixture 5 — margin table', () => {
  it('matches the spec: water 33.3, bread 33.3, coffee 37.5, biscuits 37.5', () => {
    const byName = Object.fromEntries(
      marginTable(DEMO_SHOP.products).rows.map((row) => [row.name, row.marginPct])
    )
    expect(byName['Mineral Water']).toBeCloseTo(33.3, 1)
    expect(byName.Bread).toBeCloseTo(33.3, 1)
    expect(byName.Coffee).toBe(37.5)
    expect(byName.Biscuits).toBe(37.5)
  })

  it('ranks highest margin first and warns margin is not total profit', () => {
    const table = marginTable(DEMO_SHOP.products)
    expect(table.rows[0].marginPct).toBeGreaterThanOrEqual(table.rows[table.rows.length - 1].marginPct)
    expect(table.note).toMatch(/sales quantities/i)
  })
})

// ---------------------------------------------------------------------------
// Missing / degenerate inputs must never produce NaN or Infinity.
// ---------------------------------------------------------------------------

describe('missing and degenerate inputs', () => {
  it('reports which inputs are missing instead of computing', () => {
    expect(breakEvenUnits(undefined, 10, 6)).toEqual({ ok: false, missing: ['fixed'] })
    expect(grossMarginPct(null, 6).ok).toBe(false)
    expect(cashRunway(5000, null)).toEqual({ ok: false, missing: ['monthlyOutflow'] })
  })

  it('refuses a non-positive contribution rather than returning Infinity', () => {
    const result = breakEvenUnits(2500, 6, 6)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('non_positive_contribution')
  })

  it('never yields NaN or Infinity from a zero price', () => {
    const result = grossMarginPct(0, 5)
    expect(result.ok).toBe(false)
    expect(Number.isFinite(result.value)).toBe(false) // undefined, not NaN
  })
})

// ---------------------------------------------------------------------------
// Remaining engine functions
// ---------------------------------------------------------------------------

describe('monthlyExpenses', () => {
  it('splits fixed vs variable and shares by category', () => {
    const result = monthlyExpenses(DEMO_SHOP.expenses)
    expect(result.total).toBe(2750)
    expect(result.fixed).toBe(2500)
    expect(result.variable).toBe(250)
    expect(result.byCategory[0].category).toBe('Rental')
    expect(result.byCategory[0].sharePct).toBeCloseTo(43.6, 1)
  })
})

describe('scenarioSet', () => {
  it('returns current, optimistic and conservative, all labelled assumptions', () => {
    const result = scenarioSet({ units: 500, price: 9, varCost: 5, fixed: 2500 })
    const byName = Object.fromEntries(result.scenarios.map((s) => [s.name, s]))
    expect(byName.current.value).toBe(-500)
    expect(byName.optimistic.units).toBe(600) // 500 x 1.2
    expect(byName.conservative.units).toBe(400) // 500 x 0.8
    expect(byName.conservative.fixed).toBe(2500)
    expect(result.assumptionNote).toMatch(/not a predicted outcome/i)
  })
})

describe('startupCapital', () => {
  it('totals the demo shop setup costs and shows the RM15,000 funding gap', () => {
    const result = startupCapital(DEMO_SHOP.startupItems, {
      availableCapital: 15000,
      monthlyFixed: DEMO_FIXED_COSTS,
    })
    expect(result.total).toBe(29400)
    expect(result.buffer).toBe(7500) // 3 months x RM2,500
    expect(result.cashNeeded).toBe(36900)
    expect(result.gap).toBe(21900)
    expect(result.shortfall).toBe(true)
    expect(result.assumptions.join(' ')).toMatch(/zero revenue/i)
  })

  it('lists categories the owner has not filled in', () => {
    const result = startupCapital({ rental_deposit: 4500 }, {})
    expect(result.total).toBe(4500)
    expect(result.missingCategories).toContain('Renovation')
    expect(result.missingCategories).toHaveLength(7)
  })
})

describe('readiness', () => {
  it('unlocks planning capabilities for the demo shop but keeps sales-history ones locked', () => {
    const result = readiness(DEMO_SHOP)
    const byId = Object.fromEntries(result.capabilities.map((c) => [c.id, c]))
    expect(byId.product_margin.status).toBe('ready')
    expect(byId.break_even.status).toBe('ready')
    expect(byId.startup_capital.status).toBe('ready')
    // No sales history exists in this pathway — these must never read as ready.
    expect(byId.sales_trend.status).toBe('locked')
    expect(byId.forecasting.status).toBe('locked')
    expect(byId.sentiment.status).toBe('locked')
    expect(byId.forecasting.needs[0]).toMatch(/daily sales/i)
    expect(result.percent).toBeGreaterThan(0)
    expect(result.percent).toBeLessThan(100)
  })

  it('locks everything for an empty shop', () => {
    const result = readiness({})
    expect(result.percent).toBe(0)
    expect(result.capabilities.every((c) => c.status === 'locked')).toBe(true)
  })
})
