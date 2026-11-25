import { supabase } from '@/config/supabaseClient'

/**
 * Shared reads of the real Phase 4 pipeline (processed_data/daily_aggregates)
 * for Dashboard, Sentiment Analysis, and Social Intelligence — one query
 * shape, reused, not re-derived per page. Pages never call supabase directly.
 */

const PROCESSED_COLUMNS =
  'id, platform, language, product, cleaned_text, raw_text, sentiment, sentiment_score, sentiment_confidence, engagement, rating, features, published_at, collected_at'

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
 * The most recent `date` this user actually has in daily_aggregates, or
 * null if they have none yet. A demo/uploaded dataset's last real day is
 * frozen at upload time — it does not keep advancing with wall-clock
 * "today" the way a live-ingesting production account would. Anchoring
 * a "last N days" window on `new Date()` instead of this meant every
 * such window could silently drift entirely past the real data (found
 * live: an account's data ended 2026-10-21, and by 2026-11-10 "last 14
 * days" was entirely after that date, so every query returned zero rows
 * even though the data was there) — not a parsing/pipeline bug, a wrong
 * anchor. Fixing it here fixes every caller (Dashboard, Reports,
 * Sentiment Analysis, Social Intelligence) at once.
 */
async function fetchLatestAggregateDate() {
  const { data, error } = await supabase
    .from('daily_aggregates')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.date ?? null
}

/**
 * `from`/`to` (ISO date strings), when given, take priority over `days` —
 * same FilterProvider-range use case as fetchProcessedRows above.
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
    const latest = await fetchLatestAggregateDate()
    const anchor = latest ? new Date(latest) : new Date()
    anchor.setDate(anchor.getDate() - days)
    query = query.gte('date', anchor.toISOString().slice(0, 10))
  }
  if (to) query = query.lte('date', to)

  const { data, error } = await query.order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}
