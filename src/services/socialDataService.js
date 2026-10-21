import { supabase } from '@/config/supabaseClient'

/**
 * Shared reads of the real Phase 4 pipeline (processed_data/daily_aggregates)
 * for Dashboard, Sentiment Analysis, and Social Intelligence — one query
 * shape, reused, not re-derived per page. Pages never call supabase directly.
 */

const PROCESSED_COLUMNS =
  'id, platform, language, cleaned_text, raw_text, sentiment, sentiment_score, sentiment_confidence, engagement, rating, features, published_at, collected_at'

/**
 * `from`/`to` (ISO date strings) are new, optional — added for the
 * redesign's FilterProvider (src/contexts/FilterProvider.jsx) so pages can
 * pass its resolved range instead of only ever reading the latest `limit`
 * rows. Omitting them keeps every existing caller's behavior identical.
 */
export async function fetchProcessedRows({ limit = 500, from = null, to = null } = {}) {
  let query = supabase
    .from('processed_data')
    .select(PROCESSED_COLUMNS)
    .order('collected_at', { ascending: false })
  if (from) query = query.gte('collected_at', from)
  if (to) query = query.lte('collected_at', to)
  query = query.limit(limit)

  const { data, error } = await query
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

/**
 * `from`/`to` (ISO date strings), when given, take priority over `days` —
 * same FilterProvider-range use case as fetchProcessedRows above. Calling
 * this exactly as before (`{ days }` or no args) behaves identically to
 * before this change.
 */
export async function fetchDailyAggregates({ days = 30, from = null, to = null } = {}) {
  let query = supabase
    .from('daily_aggregates')
    .select(
      'date, source, platform, mention_volume, comment_volume, avg_rating_sentiment, positive_ratio, negative_ratio'
    )

  if (from) {
    query = query.gte('date', from)
  } else {
    const since = new Date()
    since.setDate(since.getDate() - days)
    query = query.gte('date', since.toISOString().slice(0, 10))
  }
  if (to) query = query.lte('date', to)

  const { data, error } = await query.order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}
