import { describe, expect, it } from 'vitest'
import { breakEvenRevenueMulti, dailyTarget, marginTable, monthlyExpenses, readiness } from '../index'
import { nextStepFor } from '../nextStep'
import { DEMO_SHOP } from '../../data/demoShop'

/**
 * Exercises the exact engine pipeline src/features/localshop/pages/Overview.jsx
 * runs, against the demo shop. This catches a shape mismatch between the
 * engine and the screen (a wrong field name, an unhandled `ok:false`)
 * without needing a browser — the Playwright spec covers real rendering.
 */
describe('Overview data pipeline (Kedai Makmur)', () => {
  const expenses = monthlyExpenses(DEMO_SHOP.expenses)
  const bep = breakEvenRevenueMulti(expenses.fixed, DEMO_SHOP.products)
  const ready = readiness(DEMO_SHOP)

  it('produces every figure the Overview tiles display', () => {
    expect(DEMO_SHOP.products).toHaveLength(28)
    expect(expenses.ok).toBe(true)
    expect(expenses.fixed).toBe(2500)
    expect(bep.ok).toBe(true)
    expect(Math.round(bep.avgMarginPct)).toBe(35)
    expect(Math.round(bep.value)).toBeGreaterThan(7000)

    const daily = dailyTarget(bep.value)
    expect(daily.ok).toBe(true)
    expect(daily.value).toBeGreaterThan(0)
  })

  it('gives the readiness ladder a mix of ready and locked capabilities', () => {
    expect(ready.percent).toBeGreaterThan(0)
    expect(ready.percent).toBeLessThan(100)
    expect(ready.capabilities.some((c) => c.status === 'ready')).toBe(true)
    expect(ready.capabilities.some((c) => c.status === 'locked')).toBe(true)
    // Every capability the screen renders must carry a label and a status.
    ready.capabilities.forEach((capability) => {
      expect(capability.label).toBeTruthy()
      expect(['ready', 'partial', 'locked']).toContain(capability.status)
    })
  })

  it('suggests recording daily sales next, since that is the demo shop real gap', () => {
    expect(nextStepFor(ready)).toMatch(/daily sales/i)
  })

  it('gives the product-margin tool a top row to preview', () => {
    const table = marginTable(DEMO_SHOP.products)
    expect(table.rows.length).toBeGreaterThan(0)
    expect(table.rows[0].name).toBeTruthy()
    expect(table.rows[0].marginPct).toBe(37.5)
  })

  it('renders nothing numeric for an empty shop instead of zeros', () => {
    const empty = monthlyExpenses([])
    expect(empty.ok).toBe(false)
    expect(breakEvenRevenueMulti(undefined, []).ok).toBe(false)
    expect(nextStepFor(readiness({}))).toBeTruthy()
  })
})
