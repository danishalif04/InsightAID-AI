import { describe, expect, it } from 'vitest'
import {
  addDays,
  buildItemSeries,
  buildPrepPlan,
  flagItemsFromReviews,
  fromSalesPayloads,
  lastWeekQuantity,
  nextPlanDate,
  simulateWaste,
  wasteSaving,
  weekdayAverageForecast,
} from './prepPlanner'
import koperasi from '@/data/koperasiSiswaMaju.json'

const ITEM = { item: 'Nasi Lemak', itemZh: '椰浆饭', section: 'cafe', unitCost: 1.8, shelfLifeDays: 1 }

/** Daily rows from 2026-01-05 (a Monday) for `days` days with a fixed units function. */
function rowsFor(item, days, unitsFn) {
  return Array.from({ length: days }, (_, i) => ({ date: addDays('2026-01-05', i), item, units: unitsFn(i) }))
}

describe('forecast helpers', () => {
  const series = buildItemSeries(rowsFor('Nasi Lemak', 35, (i) => 10 + (i % 7)))
  const byDate = series.get('Nasi Lemak')

  it('averages the same weekday over the last four weeks', () => {
    // 2026-02-09 is a Monday, i % 7 === 0 on every Monday, so every value is 10
    expect(weekdayAverageForecast(byDate, '2026-02-09')).toBe(10)
    expect(weekdayAverageForecast(byDate, '2026-02-10')).toBe(11)
  })

  it('returns null rather than guessing when no history exists', () => {
    expect(weekdayAverageForecast(byDate, '2025-01-01')).toBeNull()
    expect(lastWeekQuantity(byDate, '2025-01-01')).toBeNull()
  })

  it('sums duplicate rows for the same item and day', () => {
    const s = buildItemSeries([{ date: '2026-01-01', item: 'A', units: 2 }, { date: '2026-01-01', item: 'A', units: 3 }])
    expect(s.get('A').get('2026-01-01')).toBe(5)
  })

  it('plans for the next weekday the shop actually opens', () => {
    // Open Monday to Saturday, last data on Saturday 10 Jan: Sunday is skipped
    const s = buildItemSeries(rowsFor('A', 6, () => 1).map((r, i) => ({ ...r, date: addDays('2026-01-05', i) })))
    expect(nextPlanDate(s)).toBe('2026-01-12')
  })
})

describe('review flags', () => {
  const reviews = [
    { date: '2026-02-05', sentiment: 'negative', text: 'Nasi Lemak basi hari ini' },
    { date: '2026-02-06', rating: 1, text: '椰浆饭不新鲜' },
    { date: '2026-02-06', sentiment: 'positive', text: 'Nasi Lemak sedap' },
    { date: '2026-02-09', sentiment: 'negative', text: 'Nasi Lemak again bad' }, // same day: excluded
    { date: '2026-01-20', sentiment: 'negative', text: 'Nasi Lemak old complaint' }, // outside lookback
  ]

  it('counts only negative reviews naming the item inside the lookback, before the day', () => {
    const flag = flagItemsFromReviews(reviews, [ITEM], { asOf: '2026-02-09' }).get('Nasi Lemak')
    expect(flag.count).toBe(2)
    expect(flag.freshness).toBe(true)
  })

  it('uses the explicit item field when a review has one', () => {
    const flags = flagItemsFromReviews([{ date: '2026-02-08', sentiment: 'negative', item: 'Karipap', text: 'Nasi Lemak mentioned' }], [ITEM], { asOf: '2026-02-09' })
    expect(flags.has('Nasi Lemak')).toBe(false)
  })
})

describe('buildPrepPlan', () => {
  const series = buildItemSeries(rowsFor('Nasi Lemak', 35, () => 20))

  it('applies the buffer and states the rule', () => {
    const { planDate, rows } = buildPrepPlan({ series, items: [ITEM], bufferPct: 10 })
    expect(planDate).toBe('2026-02-09')
    expect(rows[0].quantity).toBe(22)
    expect(rows[0].rule).toMatch(/10% safety buffer/)
  })

  it('reduces flagged items and says why', () => {
    const reviews = [{ date: '2026-02-07', sentiment: 'negative', text: 'Nasi Lemak stale' }]
    const { rows } = buildPrepPlan({ series, items: [ITEM], reviews, bufferPct: 10, flagReductionPct: 20 })
    expect(rows[0].quantity).toBe(Math.ceil(20 * 1.1 * 0.8))
    expect(rows[0].rule).toMatch(/freshness complaint/)
  })
})

describe('simulateWaste', () => {
  it('a perishable item: forecast habit wastes less on a noisy series, and units are conserved', () => {
    const units = [30, 10, 30, 10, 30, 10, 30, 10, 30, 10]
    const series = buildItemSeries(rowsFor('Nasi Lemak', 70, (i) => units[Math.floor(i / 7) % units.length]))
    const result = simulateWaste({ series, items: [ITEM], bufferPct: 0 })
    const { lastWeek, forecast } = result.totals
    expect(forecast.wasteUnits).toBeLessThan(lastWeek.wasteUnits)
    for (const r of [lastWeek, forecast]) {
      expect(r.orderedUnits).toBe(r.soldUnits + r.wasteUnits)
    }
    expect(lastWeek.wasteRM).toBeCloseTo(lastWeek.wasteUnits * 1.8)
  })

  it('excludes items with no known shelf life instead of guessing one', () => {
    const series = buildItemSeries(rowsFor('Mystery', 40, () => 5))
    const result = simulateWaste({ series, items: [{ item: 'Mystery', unitCost: 1 }] })
    expect(result.excluded).toEqual(['Mystery'])
    expect(result.items).toEqual([])
  })

  it('long shelf life stock carries over instead of being wasted daily', () => {
    const series = buildItemSeries(rowsFor('Water', 60, (i) => (i % 2 ? 5 : 15)))
    const result = simulateWaste({ series, items: [{ item: 'Water', unitCost: 0.9, shelfLifeDays: 365 }] })
    expect(result.totals.lastWeek.wasteUnits).toBe(0)
  })

  it('wasteSaving reports null percent when there is no baseline waste', () => {
    const zero = { wasteUnits: 0, wasteRM: 0 }
    expect(wasteSaving({ lastWeek: zero, forecast: zero }).pct).toBeNull()
  })
})

describe('fromSalesPayloads', () => {
  it('derives unit cost from line totals and leaves shelf life unknown when absent', () => {
    const { items, salesRows } = fromSalesPayloads([
      { date: '2026-01-01', product: 'Soap', quantity_sold: '10', cost: '20' },
      { date: '2026-01-02', product: 'Soap', quantity_sold: 10, cost: 30 },
      { date: '2026-01-02', product: '', quantity_sold: 4 },
      { date: '2026-01-02', product: 'Bread', quantity_sold: 'x' },
    ])
    expect(salesRows).toHaveLength(2)
    expect(items).toEqual([{ item: 'Soap', section: null, unitPrice: null, unitCost: 2.5, shelfLifeDays: null }])
  })
})

describe('Koperasi Siswa Maju sample (synthetic)', () => {
  const series = buildItemSeries(koperasi.sales.map(([date, item, units]) => ({ date, item, units })))
  const reviews = koperasi.reviews.map(([date, language, rating, sentiment, item, text]) => ({ date, language, rating, sentiment, item, text }))

  it('is labelled synthetic and plans every item for 2026-11-25', () => {
    expect(koperasi.synthetic).toBe(true)
    const plan = buildPrepPlan({ series, items: koperasi.items, reviews })
    expect(plan.planDate).toBe('2026-11-25')
    expect(plan.rows.every((r) => Number.isInteger(r.quantity))).toBe(true)
  })

  it('flags nasi lemak with a freshness complaint after the stale batch of 6 Oct 2026', () => {
    const flag = flagItemsFromReviews(reviews, koperasi.items, { asOf: '2026-10-08' }).get('Nasi Lemak')
    expect(flag?.freshness).toBe(true)
  })
})
