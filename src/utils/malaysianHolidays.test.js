import { describe, expect, it } from 'vitest'
import {
  getAllMalaysianHolidays,
  getMalaysianHolidayOnDate,
  getMalaysianHolidaysByCategory,
  getMalaysianHolidaysInRange,
} from './malaysianHolidays'

describe('malaysianHolidays (reads the generated calendar, does no date math itself)', () => {
  it('loads a real, non-empty, sorted calendar', () => {
    const all = getAllMalaysianHolidays()
    expect(all.length).toBeGreaterThan(50)
    const dates = all.map((e) => e.date)
    expect(dates).toEqual([...dates].sort())
  })

  it('knows a real fixed-date national holiday exactly', () => {
    expect(getMalaysianHolidayOnDate('2026-08-31')?.name).toBe('Hari Kebangsaan')
  })

  it('knows a real library-computed lunar-calendar holiday, not guessed', () => {
    const cny2026 = getAllMalaysianHolidays().filter((e) => e.date.startsWith('2026') && e.name.includes('Tahun Baharu Cina'))
    expect(cny2026.length).toBeGreaterThan(0)
  })

  it('returns null for a date with no event, never inventing one', () => {
    expect(getMalaysianHolidayOnDate('2026-01-02')).toBeNull()
  })

  it('filters by a date range inclusively', () => {
    const inRange = getMalaysianHolidaysInRange('2026-08-30', '2026-09-01')
    expect(inRange.some((e) => e.date === '2026-08-31')).toBe(true)
    expect(inRange.every((e) => e.date >= '2026-08-30' && e.date <= '2026-09-01')).toBe(true)
  })

  it('returns [] for an invalid/missing range rather than throwing', () => {
    expect(getMalaysianHolidaysInRange(null, '2026-09-01')).toEqual([])
    expect(getMalaysianHolidaysInRange('2026-08-30', undefined)).toEqual([])
  })

  it('filters by category — e-commerce campaign days are exactly 11.11 and 12.12', () => {
    const campaigns = getMalaysianHolidaysByCategory('ecommerce_campaign').filter((e) => e.date.startsWith('2026'))
    expect(campaigns.map((e) => e.date).sort()).toEqual(['2026-11-11', '2026-12-12'])
  })

  it('every event is sourced, never an unexplained date', () => {
    for (const event of getAllMalaysianHolidays()) {
      expect(event.source).toBeTruthy()
      expect(event.category).toBeTruthy()
    }
  })
})
