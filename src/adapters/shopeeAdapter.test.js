import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SOURCE_STATUS } from './sourceStatus'

const { supabase } = vi.hoisted(() => ({ supabase: { from: vi.fn() } }))
vi.mock('@/config/supabaseClient', () => ({ supabase }))

function chainMock(resolvedValue) {
  const mock = {
    select: () => mock,
    eq: () => mock,
    ilike: () => mock,
    order: () => mock,
    limit: () => mock,
    then: (resolve) => resolve(resolvedValue),
  }
  return mock
}

describe('shopeeAdapter', () => {
  beforeEach(() => {
    supabase.from.mockReset()
  })

  it('is dataset mode, not an API — matches FYP2.md §37', async () => {
    const { shopeeAdapter } = await import('./shopeeAdapter')
    expect(shopeeAdapter.mode).toBe('dataset')
  })

  it('reports NOT_CONFIGURED when no Shopee-platform rows exist', async () => {
    const { shopeeAdapter } = await import('./shopeeAdapter')
    supabase.from.mockReturnValueOnce(chainMock({ count: 0, error: null }))

    const result = await shopeeAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.NOT_CONFIGURED)
  })

  it('reports CONNECTED with a real count when Shopee-platform rows exist', async () => {
    const { shopeeAdapter } = await import('./shopeeAdapter')
    supabase.from
      .mockReturnValueOnce(chainMock({ count: 7, error: null }))
      .mockReturnValueOnce(chainMock({ data: [{ created_at: '2026-09-15T00:00:00Z' }], error: null }))

    const result = await shopeeAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.CONNECTED)
    expect(result.recordCount).toBe(7)
  })

  it('sync() points to the upload flow instead of attempting a live call', async () => {
    const { shopeeAdapter } = await import('./shopeeAdapter')
    supabase.from.mockReturnValueOnce(chainMock({ count: 0, error: null }))

    const result = await shopeeAdapter.sync()
    expect(result.message).toMatch(/dataset mode/i)
  })
})
