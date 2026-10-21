import { describe, expect, it } from 'vitest'
import { smoothSeries } from './sentimentSmoothing'

function point(date, positive, neutral, negative) {
  return { date, positive, neutral, negative }
}

describe('smoothSeries', () => {
  it('averages only the available points in the trailing window', () => {
    const data = [point('d1', 10, 10, 10), point('d2', 20, 10, 10), point('d3', 30, 10, 10)]
    const result = smoothSeries(data, 2)
    // d3's window is [d2, d3] -> positive avg (20+30)/2 = 25
    expect(result[2].positive).toBe(25)
  })

  it('never fabricates a value for a point whose entire window is null', () => {
    const data = [point('d1', null, null, null), point('d2', null, null, null)]
    const result = smoothSeries(data, 7)
    expect(result[1].positive).toBeNull()
    expect(result[1].neutral).toBeNull()
    expect(result[1].negative).toBeNull()
  })

  it('averages real values while skipping null days in the same window', () => {
    const data = [point('d1', 10, 0, 0), point('d2', null, null, null), point('d3', 30, 0, 0)]
    const result = smoothSeries(data, 7)
    expect(result[2].positive).toBe(20) // (10+30)/2, the null day excluded, not treated as 0
  })

  it('preserves the date on every output point', () => {
    const data = [point('2026-01-01', 50, 30, 20)]
    const result = smoothSeries(data, 7)
    expect(result[0].date).toBe('2026-01-01')
  })
})
