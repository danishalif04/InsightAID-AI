import { supabase } from '@/config/supabaseClient'
import { detectCrisis } from '@/utils/crisisDetection'

/**
 * Wires the pure rule engine (src/utils/crisisDetection.js) to real
 * Supabase data. Pages never call supabase directly — same convention as
 * every other *Service.js file.
 */

/** Collapses daily_aggregates (one row per source/platform per day) into
 * one row per day — mentionVolume summed, negativeRatio averaged weighted
 * by comment_volume (falls back to an unweighted mean when every row that
 * day has 0 comment_volume). Mirrors ml/forecasting's data_loader.py so the
 * two pipelines treat multi-source days the same way. */
function collapseDailyAggregates(rows) {
  const byDate = new Map()

  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, { mentionVolume: 0, negSum: 0, negWeight: 0, negValues: [] })
    const bucket = byDate.get(row.date)
    bucket.mentionVolume += row.mention_volume ?? 0
    if (row.negative_ratio != null) {
      const weight = row.comment_volume ?? 0
      bucket.negSum += row.negative_ratio * weight
      bucket.negWeight += weight
      bucket.negValues.push(row.negative_ratio)
    }
  }

  return [...byDate.entries()].map(([date, bucket]) => ({
    date,
    mentionVolume: bucket.mentionVolume,
    negativeRatio:
      bucket.negWeight > 0
        ? bucket.negSum / bucket.negWeight
        : bucket.negValues.length > 0
          ? bucket.negValues.reduce((a, b) => a + b, 0) / bucket.negValues.length
          : null,
  }))
}

/** processed_data has no daily rating rollup — computed here from the raw
 * per-row `rating` column, never from daily_aggregates.avg_rating_sentiment
 * (a blended sentiment+rating figure, not a pure star-rating average). */
function collapseDailyRatings(rows) {
  const byDate = new Map()

  for (const row of rows) {
    const dateSource = row.published_at ?? row.collected_at
    if (!dateSource || row.rating == null) continue
    const key = new Date(dateSource).toISOString().slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, { sum: 0, count: 0 })
    const bucket = byDate.get(key)
    bucket.sum += row.rating
    bucket.count += 1
  }

  return new Map([...byDate.entries()].map(([date, bucket]) => [date, bucket.sum / bucket.count]))
}

/** Runs crisis detection live against the signed-in user's current data.
 * Returns detectCrisis()'s output unchanged — see src/utils/crisisDetection.js. */
export async function runCrisisDetection() {
  const [{ data: aggregateRows, error: aggregateError }, { data: ratingRows, error: ratingError }] = await Promise.all([
    supabase.from('daily_aggregates').select('date, mention_volume, comment_volume, negative_ratio'),
    supabase.from('processed_data').select('published_at, collected_at, rating').not('rating', 'is', null),
  ])
  if (aggregateError) throw aggregateError
  if (ratingError) throw ratingError

  const collapsedAggregates = collapseDailyAggregates(aggregateRows ?? [])
  const ratingByDate = collapseDailyRatings(ratingRows ?? [])

  const series = collapsedAggregates.map((point) => ({
    ...point,
    avgRating: ratingByDate.get(point.date) ?? null,
  }))

  return detectCrisis(series)
}

/** Persists a detection result to crisis_events, building the historical log. */
export async function saveCrisisEvent(result) {
  const { error } = await supabase.from('crisis_events').insert({
    risk_level: result.riskLevel,
    risk_score: result.riskScore,
    data_sufficient: result.dataSufficient,
    triggered_signals: result.triggeredSignals,
    all_signals: result.allSignals,
    detected_at: result.detectedAt,
  })
  if (error) throw error
}

export async function getCrisisHistory(limit = 20) {
  const { data, error } = await supabase
    .from('crisis_events')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
