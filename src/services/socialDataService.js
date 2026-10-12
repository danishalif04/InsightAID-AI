import { supabase } from '@/config/supabaseClient'

/**
 * Shared reads of the real Phase 4 pipeline (processed_data/daily_aggregates)
 * for Dashboard, Sentiment Analysis, and Social Intelligence — one query
 * shape, reused, not re-derived per page. Pages never call supabase directly.
 */

const PROCESSED_COLUMNS =
  'id, platform, language, cleaned_text, raw_text, sentiment, sentiment_score, sentiment_confidence, engagement, rating, features, published_at, collected_at'

export async function fetchProcessedRows({ limit = 500 } = {}) {
  const { data, error } = await supabase
    .from('processed_data')
    .select(PROCESSED_COLUMNS)
    .order('collected_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

/** Language column only, unlimited rows — used for Dataset Management's
 * real language-detection breakdown (replaces a hardcoded storage mock). */
export async function fetchLanguages() {
  const { data, error } = await supabase.from('processed_data').select('language')
  if (error) throw error
  return (data ?? []).map((row) => row.language)
}

export async function fetchDailyAggregates({ days = 30 } = {}) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('daily_aggregates')
    .select('date, source, platform, mention_volume, comment_volume, avg_rating_sentiment, positive_ratio, negative_ratio')
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}
