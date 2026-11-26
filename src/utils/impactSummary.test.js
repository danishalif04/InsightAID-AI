import { describe, expect, it } from 'vitest'
import { computeImpact, reviewsFromProcessedRows } from './impactSummary'
import { addDays } from './prepPlanner'

function payloads(days, unitsFn, extra = {}) {
  return Array.from({ length: days }, (_, i) => ({
    date: addDays('2026-01-05', i), product: 'Nasi Lemak', quantity_sold: unitsFn(i), cost: unitsFn(i) * 1.8, ...extra,
  }))
}

describe('computeImpact', () => {
  it('returns null with no per item sales', () => {
    expect(computeImpact({ salesPayloads: [] })).toBeNull()
    expect(computeImpact({ salesPayloads: [{ date: '2026-01-01', revenue: 10 }] })).toBeNull()
  })

  it('returns null rather than guessing when no item has a shelf life', () => {
    expect(computeImpact({ salesPayloads: payloads(60, () => 10) })).toBeNull()
  })

  it('compares before and after on the same days and reports the stockout change', () => {
    const units = [30, 10, 30, 10, 30, 10, 30, 10, 30, 10]
    const result = computeImpact({ salesPayloads: payloads(70, (i) => units[Math.floor(i / 7) % 10], { shelf_life_days: 1 }) })
    expect(result.itemCount).toBe(1)
    expect(result.after.wasteRM).toBeLessThan(result.before.wasteRM)
    expect(result.saving.rm).toBeCloseTo(result.before.wasteRM - result.after.wasteRM)
    expect(result.stockoutChange).toBe(result.after.stockoutUnits - result.before.stockoutUnits)
  })
})

describe('reviewsFromProcessedRows', () => {
  it('uses published date first and keeps product as the item', () => {
    const [r] = reviewsFromProcessedRows([
      { published_at: '2026-02-01T10:00:00Z', collected_at: '2026-02-03T00:00:00Z', product: 'Karipap', raw_text: 'basi', sentiment: 'negative', rating: '1' },
    ])
    expect(r).toEqual({ date: '2026-02-01', item: 'Karipap', text: 'basi', sentiment: 'negative', rating: 1 })
  })
})
