import { describe, expect, it } from 'vitest'
import { buildCalendarWeeks } from './calendarHeatmapMath'

describe('buildCalendarWeeks', () => {
  it('returns [] for no points', () => {
    expect(buildCalendarWeeks([])).toEqual([])
  })

  it('pads every week to 7 days, starting on Sunday', () => {
    const weeks = buildCalendarWeeks([{ date: '2026-01-07', value: 10 }]) // a Wednesday
    expect(weeks).toHaveLength(1)
    expect(weeks[0]).toHaveLength(7)
    expect(weeks[0][0].date).toBe('2026-01-04') // the preceding Sunday
  })

  it('leaves days with no data as null, not zero', () => {
    const weeks = buildCalendarWeeks([
      { date: '2026-01-04', value: 5 },
      { date: '2026-01-06', value: 9 },
    ])
    const byDate = Object.fromEntries(weeks.flat().map((cell) => [cell.date, cell.value]))
    expect(byDate['2026-01-05']).toBeNull()
    expect(byDate['2026-01-04']).toBe(5)
    expect(byDate['2026-01-06']).toBe(9)
  })

  it('spans multiple weeks for a multi-week range', () => {
    const weeks = buildCalendarWeeks([
      { date: '2026-01-01', value: 1 },
      { date: '2026-01-20', value: 2 },
    ])
    expect(weeks.length).toBeGreaterThan(1)
  })
})
