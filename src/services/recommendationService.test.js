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
