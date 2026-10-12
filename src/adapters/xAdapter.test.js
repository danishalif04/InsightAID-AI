import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SOURCE_STATUS } from './sourceStatus'

const { supabase, getProfile, ingestRows } = vi.hoisted(() => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
  getProfile: vi.fn(),
  ingestRows: vi.fn(),
}))
vi.mock('@/config/supabaseClient', () => ({ supabase }))
vi.mock('@/services/businessProfileService', () => ({ getProfile }))
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

describe('xAdapter.checkStatus', () => {
  beforeEach(() => {
    supabase.from.mockReset()
    supabase.functions.invoke.mockReset()
    getProfile.mockReset()
    ingestRows.mockReset()
  })

  it('reports NOT_CONFIGURED when the X_BEARER_TOKEN secret is not set', async () => {
    const { xAdapter } = await import('./xAdapter')
    supabase.functions.invoke.mockResolvedValue({ data: { sources: { x: { status: 'not_configured' } } }, error: null })

    const result = await xAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.NOT_CONFIGURED)
  })

  it('reports AUTH_REQUIRED when configured but never successfully synced', async () => {
    const { xAdapter } = await import('./xAdapter')
    supabase.functions.invoke.mockResolvedValue({ data: { sources: { x: { status: 'not_configured_but_present' } } }, error: null })
    supabase.from.mockReturnValueOnce(chainMock({ count: 0, error: null }))

    const result = await xAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.AUTH_REQUIRED)
  })

  it('reports real CONNECTED with a real count once rows exist from a real sync', async () => {
    const { xAdapter } = await import('./xAdapter')
    supabase.functions.invoke.mockResolvedValue({ data: { sources: { x: { status: 'not_configured_but_present' } } }, error: null })
    supabase.from
      .mockReturnValueOnce(chainMock({ count: 5, error: null }))
      .mockReturnValueOnce(chainMock({ data: [{ created_at: '2026-09-20T00:00:00Z' }], error: null }))

    const result = await xAdapter.checkStatus()
    expect(result.status).toBe(SOURCE_STATUS.CONNECTED)
    expect(result.recordCount).toBe(5)
  })
})

describe('xAdapter.sync', () => {
  beforeEach(() => {
    supabase.from.mockReset()
    supabase.functions.invoke.mockReset()
    getProfile.mockReset()
    ingestRows.mockReset()
  })

  it('refuses to guess a search query when no business profile exists', async () => {
    const { xAdapter } = await import('./xAdapter')
    getProfile.mockResolvedValue({ exists: false, values: {}, provenance: {} })

    const result = await xAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.AUTH_REQUIRED)
    expect(result.message).toMatch(/business name/i)
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('maps a real X 403 to AUTH_REQUIRED, never a fake CONNECTED (Free-tier limitation)', async () => {
    const { xAdapter } = await import('./xAdapter')
    getProfile.mockResolvedValue({ exists: true, values: { business_name: 'Acme' }, provenance: {} })
    supabase.functions.invoke.mockResolvedValue({
      data: { error: 'AUTH_REQUIRED', message: 'X rejected this request as unauthorized/forbidden.' },
      error: null,
    })

    const result = await xAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.AUTH_REQUIRED)
    expect(ingestRows).not.toHaveBeenCalled()
  })

  it('maps a real 429 to RATE_LIMITED', async () => {
    const { xAdapter } = await import('./xAdapter')
    getProfile.mockResolvedValue({ exists: true, values: { business_name: 'Acme' }, provenance: {} })
    supabase.functions.invoke.mockResolvedValue({ data: { error: 'RATE_LIMITED', message: 'Rate limited.' }, error: null })

    const result = await xAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.RATE_LIMITED)
  })

  it('ingests real posts through the same pipeline CSV uploads use, on success', async () => {
    const { xAdapter } = await import('./xAdapter')
    getProfile.mockResolvedValue({ exists: true, values: { business_name: 'Acme' }, provenance: {} })
    supabase.functions.invoke.mockResolvedValue({
      data: { posts: [{ id: '1', text: 'Great product', createdAt: '2026-03-01T00:00:00.000Z', likeCount: 5 }] },
      error: null,
    })
    ingestRows.mockResolvedValue({ validation: {}, rawCount: 1, processedCount: 1 })

    const result = await xAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.CONNECTED)
    expect(ingestRows).toHaveBeenCalledWith('social', expect.any(Array), 'api_sync', null)
    const rows = ingestRows.mock.calls[0][1]
    expect(rows[0].content).toBe('Great product')
  })

  it('reports a real zero-results CONNECTED state, never fabricating posts', async () => {
    const { xAdapter } = await import('./xAdapter')
    getProfile.mockResolvedValue({ exists: true, values: { business_name: 'Acme' }, provenance: {} })
    supabase.functions.invoke.mockResolvedValue({ data: { posts: [] }, error: null })

    const result = await xAdapter.sync()
    expect(result.status).toBe(SOURCE_STATUS.CONNECTED)
    expect(result.message).toMatch(/0 real posts/)
    expect(ingestRows).not.toHaveBeenCalled()
  })
})
