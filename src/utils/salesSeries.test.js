import { describe, expect, it } from 'vitest'
import {
  computeCategoryBreakdown,
  computeDailySalesSeries,
  computeProductBreakdown,
  mergeActualsWithForecast,
  normalizeSalesRow,
  normalizeSalesRows,
} from './salesSeries'

const REAL_SAMPLE = {
  cost: '89.27',
  date: '2026-10-05',
  product: 'Rice Water Foaming Wash',
  revenue: '249.0',
  category: 'Cleanser',
  discount: '0.0',
  unit_price: '24.9',
  quantity_sold: '10',
}

describe('normalizeSalesRow', () => {
  it('parses a real raw_data payload shape into numbers', () => {
    const result = normalizeSalesRow(REAL_SAMPLE)
    expect(result).toEqual({
      date: '2026-10-05',
      product: 'Rice Water Foaming Wash',
      category: 'Cleanser',
      quantitySold: 10,
      unitPrice: 24.9,
      revenue: 249,
      discount: 0,
      cost: 89.27,
    })
  })

  it('returns null when revenue is missing', () => {
    expect(normalizeSalesRow({ date: '2026-01-01' })).toBeNull()
  })

  it('returns null when the date is missing or unparseable', () => {
    expect(normalizeSalesRow({ date: 'not-a-date', revenue: '10' })).toBeNull()
    expect(normalizeSalesRow({ revenue: '10' })).toBeNull()
  })

  it('leaves cost/discount as null rather than 0 when genuinely absent', () => {
    const result = normalizeSalesRow({ date: '2026-01-01', revenue: '10' })
    expect(result.cost).toBeNull()
    expect(result.discount).toBeNull()
  })
})

describe('computeDailySalesSeries', () => {
  it('sums multiple rows on the same day', () => {
    const rows = normalizeSalesRows([
      { date: '2026-01-01', revenue: '100', quantity_sold: '5', cost: '40' },
      { date: '2026-01-01', revenue: '50', quantity_sold: '2', cost: '20' },
    ])
    const series = computeDailySalesSeries(rows)
    expect(series).toHaveLength(1)
    expect(series[0]).toMatchObject({ date: '2026-01-01', revenue: 150, units: 7, cost: 60 })
  })

  it('computes gross margin as (revenue - cost) / revenue', () => {
    const rows = normalizeSalesRows([{ date: '2026-01-01', revenue: '200', cost: '80' }])
    expect(computeDailySalesSeries(rows)[0].grossMargin).toBe(60) // (200-80)/200 = 60%
  })

  it('never fabricates a margin when revenue is 0', () => {
    const rows = [
      {
        date: '2026-01-01',
        product: null,
        category: null,
        quantitySold: 0,
        unitPrice: 0,
        revenue: 0,
        discount: null,
        cost: null,
      },
    ]
    expect(computeDailySalesSeries(rows)[0].grossMargin).toBeNull()
  })

  it('sorts output ascending by date', () => {
    const rows = normalizeSalesRows([
      { date: '2026-01-03', revenue: '1' },
      { date: '2026-01-01', revenue: '1' },
      { date: '2026-01-02', revenue: '1' },
    ])
    expect(computeDailySalesSeries(rows).map((r) => r.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ])
  })
})

describe('computeProductBreakdown / computeCategoryBreakdown', () => {
  const rows = normalizeSalesRows([
    {
      date: '2026-01-01',
      product: 'Serum',
      category: 'Skincare',
      revenue: '300',
      cost: '100',
      quantity_sold: '3',
    },
    {
      date: '2026-01-02',
      product: 'Serum',
      category: 'Skincare',
      revenue: '100',
      cost: '50',
      quantity_sold: '1',
    },
    {
      date: '2026-01-02',
      product: 'Cleanser',
      category: 'Skincare',
      revenue: '50',
      cost: '40',
      quantity_sold: '2',
    },
  ])

  it('groups and sorts products by revenue descending', () => {
    const breakdown = computeProductBreakdown(rows)
    expect(breakdown[0]).toMatchObject({ product: 'Serum', revenue: 400, units: 4, cost: 150 })
    expect(breakdown[1].product).toBe('Cleanser')
  })

  it('groups categories across products', () => {
    const breakdown = computeCategoryBreakdown(rows)
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0]).toMatchObject({ category: 'Skincare', revenue: 450 })
  })
})

describe('mergeActualsWithForecast', () => {
  it('produces date-disjoint rows: history carries actual, forecast carries predicted/low/band', () => {
    const dailySeries = [
      { date: '2026-10-19', revenue: 100 },
      { date: '2026-10-20', revenue: 150 },
      { date: '2026-10-21', revenue: 200 },
    ]
    const forecastPoints = [
      { date: '2026-10-22', predicted: 180, lower: 50, upper: 300 },
      { date: '2026-10-23', predicted: 190, lower: 60, upper: 310 },
    ]

    const merged = mergeActualsWithForecast(dailySeries, forecastPoints)

    expect(merged).toHaveLength(5)
    expect(merged[0]).toMatchObject({ date: '2026-10-19', actual: 100 })
    expect(merged[0].predicted).toBeUndefined()
    expect(merged[3]).toMatchObject({ date: '2026-10-22', predicted: 180, low: 50, band: 250 })
    expect(merged[3].actual).toBeUndefined()
  })

  it('caps history to the requested window', () => {
    const dailySeries = Array.from({ length: 40 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      revenue: i,
    }))
    const merged = mergeActualsWithForecast(dailySeries, [], { historyDays: 10 })
    expect(merged).toHaveLength(10)
  })

  it('handles no historical data without throwing', () => {
    expect(
      mergeActualsWithForecast([], [{ date: '2026-10-22', predicted: 100, lower: 50, upper: 150 }])
    ).toHaveLength(1)
  })
})
