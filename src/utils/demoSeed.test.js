import { describe, expect, it } from 'vitest'
import koperasi from '@/data/koperasiSiswaMaju.json'
import { buildDemoRecords, weekShift } from './demoSeed'
import { computeImpact, reviewsFromProcessedRows } from './impactSummary'
import { fromSalesPayloads } from './prepPlanner'

describe('weekShift', () => {
  it('moves forward in whole weeks so data ends before today', () => {
    expect(weekShift('2026-11-24', '2026-11-25')).toBe(0)
    expect(weekShift('2026-11-24', '2026-12-01')).toBe(0)
    expect(weekShift('2026-11-24', '2026-12-02')).toBe(7)
    expect(weekShift('2026-11-24', '2026-12-22')).toBe(21)
  })

  it('never moves data backwards', () => {
    expect(weekShift('2026-11-24', '2026-11-01')).toBe(0)
  })
})

describe('buildDemoRecords', () => {
  const today = '2026-12-22'
  const { sales, reviews, shiftDays, to } = buildDemoRecords(koperasi, { today })

  it('keeps every row, keeps weekdays, ends before the visit', () => {
    expect(sales).toHaveLength(koperasi.sales.length)
    expect(reviews).toHaveLength(koperasi.reviews.length)
    expect(shiftDays % 7).toBe(0)
    expect(to < today).toBe(true)
    const dayOf = (d) => new Date(`${d}T00:00:00Z`).getUTCDay()
    expect(dayOf(sales[0].date)).toBe(dayOf(koperasi.sales[0][0]))
  })

  it('writes the sales columns the planner and impact card need, with cost as a line total', () => {
    const nasi = sales.find((s) => s.product === 'Nasi Lemak')
    expect(Object.keys(nasi)).toEqual(['date', 'product', 'category', 'quantity_sold', 'unit_price', 'revenue', 'discount', 'cost', 'shelf_life_days'])
    expect(Number(nasi.cost)).toBeCloseTo(Number(nasi.quantity_sold) * 1.8)
    const parsed = fromSalesPayloads(sales)
    const item = parsed.items.find((i) => i.item === 'Nasi Lemak')
    expect(item.unitCost).toBeCloseTo(1.8, 6)
    expect(item.shelfLifeDays).toBe(1)
  })

  it('carries no personal identifiers', () => {
    for (const r of reviews) expect(Object.keys(r).sort()).toEqual(['date', 'platform', 'product', 'rating', 'review_text'])
  })

  it('gives a demo visitor a working Before vs After card', () => {
    const processedRows = reviews.map((r) => ({ collected_at: `${r.date}T00:00:00Z`, product: r.product, raw_text: r.review_text, rating: Number(r.rating), sentiment: Number(r.rating) <= 2 ? 'negative' : 'positive' }))
    const impact = computeImpact({ salesPayloads: sales, processedRows })
    expect(impact.itemCount).toBe(koperasi.items.length)
    expect(reviewsFromProcessedRows(processedRows)).toHaveLength(reviews.length)
  })
})
