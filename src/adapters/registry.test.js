import { describe, expect, it, vi } from 'vitest'
import { SOURCE_STATUS } from './sourceStatus'

vi.mock('./salesDataAdapter', () => ({ salesDataAdapter: { id: 'sales', name: 'Sales Data', checkStatus: vi.fn() } }))
vi.mock('./shopeeAdapter', () => ({ shopeeAdapter: { id: 'shopee', name: 'Shopee (Dataset Mode)', checkStatus: vi.fn() } }))
vi.mock('./tiktokAdapter', () => ({ tiktokAdapter: { id: 'tiktok', name: 'TikTok API', checkStatus: vi.fn() } }))
vi.mock('./xAdapter', () => ({ xAdapter: { id: 'x', name: 'X API', checkStatus: vi.fn() } }))
vi.mock('./threadsAdapter', () => ({ threadsAdapter: { id: 'threads', name: 'Threads API', checkStatus: vi.fn() } }))

describe('getAllSourceStatuses', () => {
  it('returns a status for every adapter even when one throws (FYP2.md §66 failure isolation)', async () => {
    const { salesDataAdapter } = await import('./salesDataAdapter')
    const { shopeeAdapter } = await import('./shopeeAdapter')
    const { tiktokAdapter } = await import('./tiktokAdapter')
    const { xAdapter } = await import('./xAdapter')
    const { threadsAdapter } = await import('./threadsAdapter')

    salesDataAdapter.checkStatus.mockResolvedValue({ status: SOURCE_STATUS.CONNECTED, lastSync: null, recordCount: 5 })
    shopeeAdapter.checkStatus.mockRejectedValue(new Error('network down'))
    tiktokAdapter.checkStatus.mockResolvedValue({ status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 })
    xAdapter.checkStatus.mockResolvedValue({ status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 })
    threadsAdapter.checkStatus.mockResolvedValue({ status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 })

    const { getAllSourceStatuses } = await import('./registry')
    const results = await getAllSourceStatuses()

    expect(results).toHaveLength(5)

    const sales = results.find((r) => r.id === 'sales')
    expect(sales.status).toBe(SOURCE_STATUS.CONNECTED)

    // The failing adapter becomes its OWN error status, not a thrown exception.
    const shopee = results.find((r) => r.id === 'shopee')
    expect(shopee.status).toBe(SOURCE_STATUS.ERROR)
    expect(shopee.detail).toMatch(/network down/)

    // Every other adapter is completely unaffected by shopee's failure.
    expect(results.find((r) => r.id === 'tiktok').status).toBe(SOURCE_STATUS.NOT_CONFIGURED)
    expect(results.find((r) => r.id === 'x').status).toBe(SOURCE_STATUS.NOT_CONFIGURED)
    expect(results.find((r) => r.id === 'threads').status).toBe(SOURCE_STATUS.NOT_CONFIGURED)
  })

  it('never fabricates a CONNECTED status for an adapter that failed', async () => {
    const { salesDataAdapter } = await import('./salesDataAdapter')
    salesDataAdapter.checkStatus.mockRejectedValue(new Error('boom'))

    const { shopeeAdapter } = await import('./shopeeAdapter')
    const { tiktokAdapter } = await import('./tiktokAdapter')
    const { xAdapter } = await import('./xAdapter')
    const { threadsAdapter } = await import('./threadsAdapter')
    shopeeAdapter.checkStatus.mockResolvedValue({ status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 })
    tiktokAdapter.checkStatus.mockResolvedValue({ status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 })
    xAdapter.checkStatus.mockResolvedValue({ status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 })
    threadsAdapter.checkStatus.mockResolvedValue({ status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 })

    const { getAllSourceStatuses } = await import('./registry')
    const results = await getAllSourceStatuses()

    expect(results.find((r) => r.id === 'sales').status).not.toBe(SOURCE_STATUS.CONNECTED)
    expect(results.find((r) => r.id === 'sales').status).toBe(SOURCE_STATUS.ERROR)
  })
})
