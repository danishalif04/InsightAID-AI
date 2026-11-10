import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
}))
vi.mock('@/config/supabaseClient', () => ({ supabase }))

describe('fetchDailyAggregates', () => {
  beforeEach(() => {
    supabase.from.mockReset()
  })

  it('anchors the default lookback window on the latest real data date, not wall-clock today', async () => {
    const { fetchDailyAggregates } = await import('./socialDataService')

    let gteArg = null
    let fromCallCount = 0
    supabase.from.mockImplementation(() => {
      fromCallCount += 1
      // Call order in fetchDailyAggregates: the main query's own
      // `.from().select()` builds first (call 1, used via gte()+order()
      // below), then fetchLatestAggregateDate() runs its own `.from()`
      // (call 2, used via order()+limit()).
      if (fromCallCount === 1) {
        const chain = {
          select: () => chain,
          gte: (_col, value) => {
            gteArg = value
            return chain
          },
          order: () => Promise.resolve({ data: [], error: null }),
        }
        return chain
      }
      const chain = {
        select: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: [{ date: '2026-10-21' }], error: null }),
      }
      return chain
    })

    await fetchDailyAggregates({ days: 14 })
    // 2026-10-21 minus 14 days, not "today" minus 14 days.
    expect(gteArg).toBe('2026-10-07')
  })

  it('falls back to wall-clock today when the user has no aggregates yet', async () => {
    const { fetchDailyAggregates } = await import('./socialDataService')

    let gteArg = null
    let fromCallCount = 0
    supabase.from.mockImplementation(() => {
      fromCallCount += 1
      if (fromCallCount === 1) {
        const chain = {
          select: () => chain,
          gte: (_col, value) => {
            gteArg = value
            return chain
          },
          order: () => Promise.resolve({ data: [], error: null }),
        }
        return chain
      }
      const chain = {
        select: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: [], error: null }),
      }
      return chain
    })

    const expected = new Date()
    expected.setDate(expected.getDate() - 14)

    await fetchDailyAggregates({ days: 14 })
    expect(gteArg).toBe(expected.toISOString().slice(0, 10))
  })

  it('still lets an explicit `from` override the latest-date anchor entirely', async () => {
    const { fetchDailyAggregates } = await import('./socialDataService')

    let gteArg = null
    supabase.from.mockImplementation(() => {
      const chain = {
        select: () => chain,
        gte: (_col, value) => {
          gteArg = value
          return chain
        },
        order: () => Promise.resolve({ data: [], error: null }),
      }
      return chain
    })

    await fetchDailyAggregates({ from: '2025-01-01' })
    expect(gteArg).toBe('2025-01-01')
    // Only one from() call — the latest-date lookup must not run when `from` is given.
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })
})
