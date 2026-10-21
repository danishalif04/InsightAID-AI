import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}))
vi.mock('@/config/supabaseClient', () => ({ supabase }))

function deleteChain(resolvedValue) {
  const chain = {
    delete: () => chain,
    eq: () => Promise.resolve(resolvedValue),
  }
  return chain
}

describe('resetUploadedDatasets', () => {
  beforeEach(() => {
    supabase.from.mockReset()
    supabase.auth.getUser.mockReset()
  })

  it('throws without touching any table when there is no signed-in user', async () => {
    const { resetUploadedDatasets } = await import('./accountResetService')
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    await expect(resetUploadedDatasets()).rejects.toThrow('Not signed in.')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('deletes every dataset table and everything derived from it, scoped to the current user', async () => {
    const { resetUploadedDatasets } = await import('./accountResetService')
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const calls = []
    supabase.from.mockImplementation((table) => {
      calls.push(table)
      return deleteChain({ error: null })
    })

    await resetUploadedDatasets()
    expect(calls.sort()).toEqual([
      'business_assumptions',
      'business_profiles',
      'crisis_events',
      'daily_aggregates',
      'forecast_results',
      'raw_data',
      'recommendations',
    ])
  })

  it('never touches model_versions (shared/global, not per-user)', async () => {
    const { resetUploadedDatasets } = await import('./accountResetService')
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const calls = []
    supabase.from.mockImplementation((table) => {
      calls.push(table)
      return deleteChain({ error: null })
    })

    await resetUploadedDatasets()
    expect(calls).not.toContain('model_versions')
  })

  it('throws if the raw_data delete fails', async () => {
    const { resetUploadedDatasets } = await import('./accountResetService')
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    supabase.from.mockImplementation((table) =>
      deleteChain({ error: table === 'raw_data' ? { message: 'permission denied' } : null })
    )

    await expect(resetUploadedDatasets()).rejects.toMatchObject({ message: 'permission denied' })
  })
})
