import { supabase } from '@/config/supabaseClient'

/**
 * Full fresh-start reset for this user: every uploaded dataset (`raw_data`,
 * cascading into `processed_data`; `daily_aggregates`), everything VISUALLY
 * derived from it (`forecast_results`, `crisis_events`, `recommendations`),
 * AND the business profile (`business_profiles`, `business_assumptions`) —
 * so the next sign-in sees no profile at all and the Onboarding page's
 * "choice" step (have data? / don't have data yet?) shows again, exactly
 * like a brand-new account. Never touches `model_versions`, which is
 * shared/global, not per-user.
 */
export async function resetUploadedDatasets() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const results = await Promise.all(
    [
      'daily_aggregates',
      'raw_data',
      'forecast_results',
      'crisis_events',
      'recommendations',
      'business_assumptions',
      'business_profiles',
    ].map((table) => supabase.from(table).delete().eq('user_id', user.id))
  )

  const failed = results.find((result) => result.error)
  if (failed) throw failed.error
}
