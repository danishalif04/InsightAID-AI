import { supabase } from '@/config/supabaseClient'
import { getCrisisHistory } from './crisisService'
import { getLatestForecastRun } from './forecastResultsService'

/** model_versions (Phase 6) is shared/read-only-to-authenticated, not
 * per-user — see supabase/migrations/0004_model_versions.sql. Empty until
 * someone actually runs ml/sentiment/notebooks/train_sentiment_xlmr.ipynb
 * against real data and uploads the results. */
async function getModelVersions() {
  const { data, error } = await supabase.from('model_versions').select('*').order('trained_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getModelPerformanceData() {
  const [modelVersions, forecastRun, crisisHistory] = await Promise.all([
    getModelVersions(),
    getLatestForecastRun(),
    getCrisisHistory(50).catch(() => []),
  ])

  return { modelVersions, forecastRows: forecastRun.rows, crisisHistory }
}
