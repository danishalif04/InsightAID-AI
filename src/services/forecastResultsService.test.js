import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabase } = vi.hoisted(() => ({
  supabase: { functions: { invoke: vi.fn() } },
}))
vi.mock('@/config/supabaseClient', () => ({ supabase }))

describe('runForecast', () => {
  beforeEach(() => {
    supabase.functions.invoke.mockReset()
  })

  it('returns the response data on success', async () => {
    const { runForecast } = await import('./forecastResultsService')
    supabase.functions.invoke.mockResolvedValue({ data: { runId: 'inapp-1' }, error: null })

    const result = await runForecast()
    expect(result).toEqual({ runId: 'inapp-1' })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('run-forecast', { method: 'POST' })
  })

  it('surfaces the real error body, not the generic non-2xx message', async () => {
    const { runForecast } = await import('./forecastResultsService')
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: { json: () => Promise.resolve({ error: 'INSUFFICIENT_DATA', message: 'Only 5 day(s) of sales data span your upload.' }) },
    }
    supabase.functions.invoke.mockResolvedValue({ data: null, error })

    await expect(runForecast()).rejects.toMatchObject({
      message: 'Only 5 day(s) of sales data span your upload.',
      code: 'INSUFFICIENT_DATA',
    })
  })

  it('falls back to the generic message when the error body cannot be read', async () => {
    const { runForecast } = await import('./forecastResultsService')
    const error = { message: 'network error', context: undefined }
    supabase.functions.invoke.mockResolvedValue({ data: null, error })

    await expect(runForecast()).rejects.toMatchObject({ message: 'network error' })
  })
})
