import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
}))
vi.mock('@/config/supabaseClient', () => ({ supabase }))

describe('fetchRawSalesPayloads', () => {
  beforeEach(() => {
    supabase.from.mockReset()
  })

  it('pages past PostgREST\'s 1000-row default cap instead of silently truncating', async () => {
    const { fetchRawSalesPayloads } = await import('./salesService')

    // Simulate 1,500 real rows: a first full page of 1000, then a second,
    // shorter page of 500 — the exact shape that triggered the real bug
    // once found in run-forecast/index.ts (a >1000-row account silently
    // losing everything past row 1000).
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ payload: { date: `page1-${i}` } }))
    const page2 = Array.from({ length: 500 }, (_, i) => ({ payload: { date: `page2-${i}` } }))

    let call = 0
    supabase.from.mockImplementation(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: () => {
          call += 1
          return Promise.resolve({ data: call === 1 ? page1 : page2, error: null })
        },
      }
      return chain
    })

    const payloads = await fetchRawSalesPayloads()
    expect(payloads).toHaveLength(1500)
    expect(payloads[0]).toEqual({ date: 'page1-0' })
    expect(payloads[1499]).toEqual({ date: 'page2-499' })
    expect(call).toBe(2)
  })

  it('stops after one page when there are fewer than 1000 rows', async () => {
    const { fetchRawSalesPayloads } = await import('./salesService')
    const rows = [{ payload: { date: 'only-one' } }]
    let call = 0
    supabase.from.mockImplementation(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: () => {
          call += 1
          return Promise.resolve({ data: rows, error: null })
        },
      }
      return chain
    })

    const payloads = await fetchRawSalesPayloads()
    expect(payloads).toEqual([{ date: 'only-one' }])
    expect(call).toBe(1)
  })

  it('throws on a real read error instead of silently returning partial data', async () => {
    const { fetchRawSalesPayloads } = await import('./salesService')
    supabase.from.mockImplementation(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: () => Promise.resolve({ data: null, error: { message: 'permission denied' } }),
      }
      return chain
    })

    await expect(fetchRawSalesPayloads()).rejects.toMatchObject({ message: 'permission denied' })
  })
})
