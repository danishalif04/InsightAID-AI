import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}))
vi.mock('@/config/supabaseClient', () => ({ supabase }))

function selectChain(resolvedValue) {
  const chain = {
    select: () => chain,
    maybeSingle: () => Promise.resolve(resolvedValue),
  }
  return chain
}

function insertChain(resolvedValue) {
  const chain = {
    select: () => chain,
    single: () => Promise.resolve(resolvedValue),
  }
  return chain
}

describe('getMyProfile', () => {
  beforeEach(() => {
    supabase.from.mockReset()
    supabase.auth.getUser.mockReset()
  })

  it('returns the row directly when it already exists', async () => {
    const { getMyProfile } = await import('./profileService')
    supabase.from.mockReturnValueOnce(selectChain({ data: { id: 'u1', full_name: 'Existing' }, error: null }))

    const result = await getMyProfile()
    expect(result).toEqual({ id: 'u1', full_name: 'Existing' })
    expect(supabase.auth.getUser).not.toHaveBeenCalled()
  })

  it('self-heals by inserting a default row when none exists', async () => {
    const { getMyProfile } = await import('./profileService')
    supabase.from
      .mockReturnValueOnce(selectChain({ data: null, error: null }))
      .mockReturnValueOnce({ insert: () => insertChain({ data: { id: 'u1', email: 'a@b.com' }, error: null }) })
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } })

    const result = await getMyProfile()
    expect(result).toEqual({ id: 'u1', email: 'a@b.com' })
  })

  it('re-fetches instead of throwing when a concurrent caller already won the insert race', async () => {
    const { getMyProfile } = await import('./profileService')
    supabase.from
      .mockReturnValueOnce(selectChain({ data: null, error: null }))
      .mockReturnValueOnce({
        insert: () => insertChain({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }),
      })
      .mockReturnValueOnce(selectChain({ data: { id: 'u1', email: 'a@b.com' }, error: null }))
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } })

    const result = await getMyProfile()
    expect(result).toEqual({ id: 'u1', email: 'a@b.com' })
  })

  it('throws on a real insert failure that is not the race-condition conflict', async () => {
    const { getMyProfile } = await import('./profileService')
    supabase.from
      .mockReturnValueOnce(selectChain({ data: null, error: null }))
      .mockReturnValueOnce({ insert: () => insertChain({ data: null, error: { code: '42501', message: 'permission denied' } }) })
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } })

    await expect(getMyProfile()).rejects.toMatchObject({ code: '42501' })
  })
})
