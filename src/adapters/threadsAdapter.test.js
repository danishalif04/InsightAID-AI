import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SOURCE_STATUS } from './sourceStatus'

const { supabase, ingestRows } = vi.hoisted(() => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
  ingestRows: vi.fn(),
}))
vi.mock('@/config/supabaseClient', () => ({ supabase }))
vi.mock('@/services/dataPipelineService', () => ({ ingestRows }))

function chainMock(resolvedValue) {
  const mock = {
    select: () => mock,
    eq: () => mock,
    order: () => mock,
    limit: () => mock,
    then: (resolve) => resolve(resolvedValue),
  }
  return mock
}

describe('threadsAdapter.checkStatus', () => {
  beforeEach(() => {
    supabase.from.mockReset()
    supabase.functions.invoke.mockReset()
    ingestRows.mockReset()
  })

  it('reports NOT_CONFIGURED when the Threads secrets are not set', async () => {
    const { threadsAdapter } = await import('./threadsAdapter')
    supabase.functions.invoke.mockResolvedValue({ data: { sources: { threads: { status: 'not_configured' } } }, error: null })

    const result = await threadsAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.NOT_CONFIGURED)
  })

  it('reports AUTH_REQUIRED when configured but never successfully synced', async () => {
    const { threadsAdapter } = await import('./threadsAdapter')
    supabase.functions.invoke.mockResolvedValue({ data: { sources: { threads: { status: 'not_configured_but_present' } } }, error: null })
    supabase.from.mockReturnValueOnce(chainMock({ count: 0, error: null }))

    const result = await threadsAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.AUTH_REQUIRED)
  })

  it('reports real CONNECTED with a real count, filtered to Threads rows only (not X\'s)', async () => {
    const { threadsAdapter } = await import('./threadsAdapter')
    supabase.functions.invoke.mockResolvedValue({ data: { sources: { threads: { status: 'not_configured_but_present' } } }, error: null })
    supabase.from
      .mockReturnValueOnce(chainMock({ count: 3, error: null }))
      .mockReturnValueOnce(chainMock({ data: [{ collected_at: '2026-10-14T00:00:00Z' }], error: null }))

    const result = await threadsAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.CONNECTED)
    expect(result.recordCount).toBe(3)
  })
})

describe('threadsAdapter.sync', () => {
  beforeEach(() => {
    supabase.from.mockReset()
    supabase.functions.invoke.mockReset()
    ingestRows.mockReset()
  })

  it('maps NOT_CONFIGURED through unchanged', async () => {
    const { threadsAdapter } = await import('./threadsAdapter')
    supabase.from.mockReturnValue(chainMock({ data: [], error: null }))
    supabase.functions.invoke.mockResolvedValue({ data: { error: 'NOT_CONFIGURED', message: 'THREADS_ACCESS_TOKEN is not set.' }, error: null })

    const result = await threadsAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.NOT_CONFIGURED)
    expect(ingestRows).not.toHaveBeenCalled()
  })

  it('maps a real 403/expired-token response to AUTH_REQUIRED, never a fake CONNECTED', async () => {
    const { threadsAdapter } = await import('./threadsAdapter')
    supabase.from.mockReturnValue(chainMock({ data: [], error: null }))
    supabase.functions.invoke.mockResolvedValue({
      data: { error: 'AUTH_REQUIRED', message: 'Threads could not validate the access token.' },
      error: null,
    })

    const result = await threadsAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.AUTH_REQUIRED)
    expect(ingestRows).not.toHaveBeenCalled()
  })

  it('maps a real 429 to RATE_LIMITED', async () => {
    const { threadsAdapter } = await import('./threadsAdapter')
    supabase.from.mockReturnValue(chainMock({ data: [], error: null }))
    supabase.functions.invoke.mockResolvedValue({ data: { error: 'RATE_LIMITED', message: 'Rate limited.' }, error: null })

    const result = await threadsAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.RATE_LIMITED)
  })

  it('ingests real new posts through the same pipeline CSV uploads use, on success', async () => {
    const { threadsAdapter } = await import('./threadsAdapter')
    supabase.from.mockReturnValue(chainMock({ data: [], error: null })) // no previously-synced posts
    supabase.functions.invoke.mockResolvedValue({
      data: {
        account: { id: '123', username: 'acme' },
        posts: [{ id: 'p1', text: 'Great product', timestamp: '2026-10-14T00:00:00+0000', replies: [{ id: 'r1' }] }],
        repliesAvailable: true,
      },
      error: null,
    })
    ingestRows.mockResolvedValue({ validation: {}, rawCount: 1, processedCount: 1 })

    const result = await threadsAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.CONNECTED)
    expect(ingestRows).toHaveBeenCalledWith('social', expect.any(Array), 'api_sync', null)
    const rows = ingestRows.mock.calls[0][1]
    expect(rows[0].content).toBe('Great product')
    expect(rows[0].comments).toBe('1')
  })

  it('skips posts already synced in a previous run, never re-inserting duplicates', async () => {
    const { threadsAdapter } = await import('./threadsAdapter')
    supabase.from.mockReturnValue(
      chainMock({ data: [{ payload: { platform: 'Threads', source_post_id: 'p1' } }], error: null })
    )
    supabase.functions.invoke.mockResolvedValue({
      data: {
        account: { id: '123', username: 'acme' },
        posts: [{ id: 'p1', text: 'Already synced before', timestamp: '2026-10-14T00:00:00+0000', replies: [] }],
        repliesAvailable: true,
      },
      error: null,
    })

    const result = await threadsAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.CONNECTED)
    expect(result.message).toMatch(/already synced/i)
    expect(ingestRows).not.toHaveBeenCalled()
  })

  it('reports a real zero-results CONNECTED state, never fabricating posts', async () => {
    const { threadsAdapter } = await import('./threadsAdapter')
    supabase.from.mockReturnValue(chainMock({ data: [], error: null }))
    supabase.functions.invoke.mockResolvedValue({
      data: { account: { id: '123', username: 'acme' }, posts: [], repliesAvailable: true },
      error: null,
    })

    const result = await threadsAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.CONNECTED)
    expect(result.message).toMatch(/0 real posts/)
    expect(ingestRows).not.toHaveBeenCalled()
  })
})
