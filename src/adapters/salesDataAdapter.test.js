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

describe('salesDataAdapter', () => {
  beforeEach(() => {
    supabase.from.mockReset()
  })

  it('reports NOT_CONFIGURED when there are no sales rows', async () => {
    const { salesDataAdapter } = await import('./salesDataAdapter')
    supabase.from.mockReturnValueOnce(chainMock({ count: 0, error: null }))

    const result = await salesDataAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.NOT_CONFIGURED)
    expect(result.recordCount).toBe(0)
  })

  it('reports CONNECTED with a real record count and last-sync timestamp when rows exist', async () => {
    const { salesDataAdapter } = await import('./salesDataAdapter')
    supabase.from
      .mockReturnValueOnce(chainMock({ count: 42, error: null }))
      .mockReturnValueOnce(chainMock({ data: [{ created_at: '2026-09-01T00:00:00Z' }], error: null }))

    const result = await salesDataAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.CONNECTED)
    expect(result.recordCount).toBe(42)
    expect(result.lastSync).toBe('2026-09-01T00:00:00Z')
  })

  it('propagates a query error rather than silently reporting a fake status', async () => {
    const { salesDataAdapter } = await import('./salesDataAdapter')
    supabase.from.mockReturnValueOnce(chainMock({ count: null, error: new Error('db unreachable') }))

    await expect(salesDataAdapter.checkStatus()).rejects.toThrow('db unreachable')
  })
})
