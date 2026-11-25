import { describe, expect, it, vi } from 'vitest'
import { shareInFlight } from './shareInFlight'

describe('shareInFlight', () => {
  it('runs the function once for calls made while it is still running', async () => {
    let resolve
    const fn = vi.fn(() => new Promise((r) => { resolve = r }))
    const shared = shareInFlight(fn)
    const a = shared()
    const b = shared()
    await Promise.resolve()
    resolve('value')
    await expect(a).resolves.toBe('value')
    await expect(b).resolves.toBe('value')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('starts a fresh call once the previous one has settled (no caching)', async () => {
    const fn = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    const shared = shareInFlight(fn)
    await expect(shared()).resolves.toBe(1)
    await expect(shared()).resolves.toBe(2)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('shares a rejection, then allows a retry', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
    const shared = shareInFlight(fn)
    const a = shared()
    const b = shared()
    await expect(a).rejects.toThrow('boom')
    await expect(b).rejects.toThrow('boom')
    await expect(shared()).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
