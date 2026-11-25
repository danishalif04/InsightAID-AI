import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
}))
vi.mock('@/config/supabaseClient', () => ({ supabase }))

describe('submitRecommendationFeedback', () => {
  beforeEach(() => {
    supabase.from.mockReset()
  })

  it('inserts a row keyed by rule_id, not a recommendations table row id', async () => {
    const { submitRecommendationFeedback } = await import('./recommendationService')
    const insert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert })

    await submitRecommendationFeedback('crisis_critical_response', true)

    expect(supabase.from).toHaveBeenCalledWith('recommendation_feedback')
    expect(insert).toHaveBeenCalledWith({ rule_id: 'crisis_critical_response', useful: true })
  })

  it('throws on a real insert failure', async () => {
    const { submitRecommendationFeedback } = await import('./recommendationService')
    supabase.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: { message: 'permission denied' } }) })

    await expect(submitRecommendationFeedback('warning_risk_review', false)).rejects.toMatchObject({ message: 'permission denied' })
  })
})

describe('fetchExplanations with the explanation cache (SPARK item 7)', () => {
  const recs = [
    { id: 'a', category: 'risk', priority: 'high', title: 'A', evidence: ['x'] },
    { id: 'b', category: 'growth', priority: 'low', title: 'B', evidence: ['y'] },
  ]
  const ctx = [{ factor: 'stage', value: 'Operating' }]

  function mockTable({ rows = [], error = null }) {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const select = vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: rows, error }) }))
    supabase.from.mockReturnValue({ select, upsert })
    return { upsert }
  }

  beforeEach(() => {
    supabase.from.mockReset()
    supabase.functions = { invoke: vi.fn() }
  })

  it('does not call the AI when every recommendation is cached', async () => {
    const { fetchExplanations } = await import('./recommendationService')
    const { explanationCacheKey } = await import('@/utils/explanationCache')
    const rows = await Promise.all(recs.map(async (r) => ({ cache_key: await explanationCacheKey(r, ctx), rationale: `R${r.id}`, context: `C${r.id}` })))
    mockTable({ rows })

    const result = await fetchExplanations(recs, ctx)

    expect(supabase.functions.invoke).not.toHaveBeenCalled()
    expect(result).toEqual({ explanations: { a: { rationale: 'Ra', context: 'Ca' }, b: { rationale: 'Rb', context: 'Cb' } }, unavailable: false })
  })

  it('asks the AI only for misses and stores the new wording', async () => {
    const { fetchExplanations } = await import('./recommendationService')
    const { explanationCacheKey } = await import('@/utils/explanationCache')
    const keyB = await explanationCacheKey(recs[1], ctx)
    const { upsert } = mockTable({ rows: [{ cache_key: keyB, rationale: 'Rb', context: 'Cb' }] })
    supabase.functions.invoke.mockResolvedValue({ data: { explanations: { a: { rationale: 'Ra', context: 'Ca' } } }, error: null })

    const result = await fetchExplanations(recs, ctx)

    expect(supabase.functions.invoke.mock.calls[0][1].body.recommendations.map((r) => r.id)).toEqual(['a'])
    expect(result.explanations).toEqual({ a: { rationale: 'Ra', context: 'Ca' }, b: { rationale: 'Rb', context: 'Cb' } })
    expect(upsert.mock.calls[0][0]).toEqual([{ cache_key: await explanationCacheKey(recs[0], ctx), rule_id: 'a', rationale: 'Ra', context: 'Ca' }])
  })

  it('treats a missing cache table as empty and still asks the AI for everything', async () => {
    const { fetchExplanations } = await import('./recommendationService')
    mockTable({ error: { message: 'relation does not exist' } })
    supabase.functions.invoke.mockResolvedValue({ data: { explanations: {} }, error: null })

    await fetchExplanations(recs, ctx)

    expect(supabase.functions.invoke.mock.calls[0][1].body.recommendations).toHaveLength(2)
  })

  it('reports the AI as unavailable only when nothing could be explained', async () => {
    const { fetchExplanations } = await import('./recommendationService')
    mockTable({})
    supabase.functions.invoke.mockResolvedValue({ data: null, error: { message: 'down' } })

    expect(await fetchExplanations(recs, ctx)).toEqual({ explanations: {}, unavailable: true })
  })
})
