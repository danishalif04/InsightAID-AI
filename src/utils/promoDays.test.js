import { describe, expect, it } from 'vitest'
import { detectPromoDays } from './promoDays'

describe('detectPromoDays', () => {
  it('returns [] when no day has any discount at all', () => {
    const series = [
      { date: '2026-01-01', avgDiscount: null },
      { date: '2026-01-02', avgDiscount: 0 },
    ]
    expect(detectPromoDays(series)).toEqual([])
  })

  it("flags a day whose discount is well above the series' own average", () => {
    const series = [
      { date: '2026-01-01', avgDiscount: 2 },
      { date: '2026-01-02', avgDiscount: 2 },
      { date: '2026-01-03', avgDiscount: 2 },
      { date: '2026-01-04', avgDiscount: 10 }, // clearly a promo day
    ]
    const promoDays = detectPromoDays(series)
    expect(promoDays).toHaveLength(1)
    expect(promoDays[0].date).toBe('2026-01-04')
  })

  it('does not flag everything when the baseline itself is near zero', () => {
    const series = [
      { date: '2026-01-01', avgDiscount: 0.1 },
      { date: '2026-01-02', avgDiscount: 0.1 },
      { date: '2026-01-03', avgDiscount: 0.2 }, // 2x the baseline, but still trivial in absolute terms
    ]
    expect(detectPromoDays(series)).toEqual([])
  })

  it('does not flag days with uniformly normal discount', () => {
    const series = [
      { date: '2026-01-01', avgDiscount: 5 },
      { date: '2026-01-02', avgDiscount: 5 },
      { date: '2026-01-03', avgDiscount: 5 },
    ]
    expect(detectPromoDays(series)).toEqual([])
  })
})
