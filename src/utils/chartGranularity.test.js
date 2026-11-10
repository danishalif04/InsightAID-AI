import { describe, expect, it } from 'vitest'
import { aggregateToMonthly } from './chartGranularity'

describe('aggregateToMonthly', () => {
  it('sums sumKeys and averages avgKeys within each calendar month', () => {
    const rows = [
      { date: '2026-01-05', volume: 10, score: 80 },
      { date: '2026-01-20', volume: 20, score: 60 },
      { date: '2026-02-03', volume: 5, score: 90 },
    ]
    const result = aggregateToMonthly(rows, { sumKeys: ['volume'], avgKeys: ['score'] })
    expect(result).toEqual([
      { date: '2026-01', label: 'Jan 2026', volume: 30, score: 70 },
      { date: '2026-02', label: 'Feb 2026', volume: 5, score: 90 },
    ])
  })

  it('never fabricates a month with zero underlying rows', () => {
    // Jan and March have real rows; February has none — it must not appear.
    const rows = [
      { date: '2026-01-10', volume: 1 },
      { date: '2026-03-10', volume: 1 },
    ]
    const result = aggregateToMonthly(rows, { sumKeys: ['volume'] })
    expect(result.map((r) => r.date)).toEqual(['2026-01', '2026-03'])
  })

  it('sorts months chronologically regardless of input row order', () => {
    const rows = [
      { date: '2026-03-01', volume: 3 },
      { date: '2026-01-01', volume: 1 },
      { date: '2026-02-01', volume: 2 },
    ]
    const result = aggregateToMonthly(rows, { sumKeys: ['volume'] })
    expect(result.map((r) => r.date)).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('averages only real numeric values, never treating a missing value as 0', () => {
    const rows = [
      { date: '2026-01-01', score: 100 },
      { date: '2026-01-02', score: null },
    ]
    const result = aggregateToMonthly(rows, { avgKeys: ['score'] })
    // Average of just the one real 100, not (100+0)/2 = 50.
    expect(result[0].score).toBe(100)
  })

  it('returns an empty array for no rows or rows with no date', () => {
    expect(aggregateToMonthly([], { sumKeys: ['volume'] })).toEqual([])
    expect(aggregateToMonthly([{ volume: 5 }], { sumKeys: ['volume'] })).toEqual([])
  })

  it('handles dynamic per-platform sum keys (e.g. mention-volume-by-platform series)', () => {
    const rows = [
      { date: '2026-01-01', tiktok: 10, x: 5 },
      { date: '2026-01-15', tiktok: 20, x: 0 },
    ]
    const result = aggregateToMonthly(rows, { sumKeys: ['tiktok', 'x'] })
    expect(result).toEqual([{ date: '2026-01', label: 'Jan 2026', tiktok: 30, x: 5 }])
  })
})
