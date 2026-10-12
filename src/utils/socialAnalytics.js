/**
 * Pure derivations from the real Phase 4 pipeline (processed_data +
 * daily_aggregates rows, see supabase/migrations/0003_data_pipeline.sql)
 * for Dashboard / Sentiment Analysis / Social Intelligence (Phase 10,
 * FYP2.md §40/§61/§65). No Supabase calls here — callers fetch rows, these
 * functions only compute from what they're given, and return null/empty
 * rather than a fabricated number when there isn't enough to compute from.
 */

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

function formatShortDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** One row per day, collapsed across source/platform: mentionVolume/commentVolume
 * summed, positiveRatio/negativeRatio averaged weighted by comment_volume
 * (falls back to an unweighted mean when nothing that day had comment_volume).
 * A day with no rows at all for a ratio stays null, never 0. */
function collapseAggregatesByDate(dailyAggregateRows) {
  const byDate = new Map()

  for (const row of dailyAggregateRows) {
    if (!byDate.has(row.date)) {
      byDate.set(row.date, {
        date: row.date,
        mentionVolume: 0,
        commentVolume: 0,
        posValues: [],
        posWeight: 0,
        posSum: 0,
        negValues: [],
        negWeight: 0,
        negSum: 0,
      })
    }
    const bucket = byDate.get(row.date)
    bucket.mentionVolume += row.mention_volume ?? 0
    bucket.commentVolume += row.comment_volume ?? 0
    const weight = row.comment_volume ?? 0

    if (isNumber(row.positive_ratio)) {
      bucket.posValues.push(row.positive_ratio)
      bucket.posSum += row.positive_ratio * weight
      bucket.posWeight += weight
    }
    if (isNumber(row.negative_ratio)) {
      bucket.negValues.push(row.negative_ratio)
      bucket.negSum += row.negative_ratio * weight
      bucket.negWeight += weight
    }
  }

  return [...byDate.values()]
    .map((bucket) => ({
      date: bucket.date,
      mentionVolume: bucket.mentionVolume,
      commentVolume: bucket.commentVolume,
      positiveRatio:
        bucket.posValues.length === 0
          ? null
          : bucket.posWeight > 0
            ? bucket.posSum / bucket.posWeight
            : bucket.posValues.reduce((a, b) => a + b, 0) / bucket.posValues.length,
      negativeRatio:
        bucket.negValues.length === 0
          ? null
          : bucket.negWeight > 0
            ? bucket.negSum / bucket.negWeight
            : bucket.negValues.reduce((a, b) => a + b, 0) / bucket.negValues.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Latest day's positive/neutral/negative % plus the change vs. ~7 days
 * earlier. Returns null when there's no ratio data at all to report. */
export function computeSentimentScores(dailyAggregateRows = []) {
  const collapsed = collapseAggregatesByDate(dailyAggregateRows)
  if (collapsed.length === 0) return null

  const latest = collapsed[collapsed.length - 1]
  if (latest.positiveRatio === null && latest.negativeRatio === null) return null

  const comparison = collapsed[Math.max(0, collapsed.length - 8)]
  const neutralOf = (positive, negative) => (positive != null && negative != null ? Math.max(0, 1 - positive - negative) : null)

  const latestNeutral = neutralOf(latest.positiveRatio, latest.negativeRatio)
  const comparisonNeutral = neutralOf(comparison.positiveRatio, comparison.negativeRatio)

  const toCard = (id, label, value, prevValue) => ({
    id,
    label,
    value: value == null ? null : Math.round(value * 1000) / 10,
    delta: value != null && prevValue != null ? Math.round((value - prevValue) * 1000) / 10 : null,
  })

  return [
    toCard('positive', 'Positive', latest.positiveRatio, comparison.positiveRatio),
    toCard('neutral', 'Neutral', latestNeutral, comparisonNeutral),
    toCard('negative', 'Negative', latest.negativeRatio, comparison.negativeRatio),
  ]
}

/** Trend series for the last `days` days: [{date, positive, neutral, negative}].
 * Values are percentages (0-100); a day with no ratio data has null values
 * for that day rather than being dropped or zeroed, so a chart shows a real gap. */
export function computeSentimentTrend(dailyAggregateRows = [], days = 14) {
  const collapsed = collapseAggregatesByDate(dailyAggregateRows).slice(-days)
  return collapsed.map((point) => {
    const positive = point.positiveRatio == null ? null : Math.round(point.positiveRatio * 1000) / 10
    const negative = point.negativeRatio == null ? null : Math.round(point.negativeRatio * 1000) / 10
    const neutral = positive != null && negative != null ? Math.round((100 - positive - negative) * 10) / 10 : null
    return { date: formatShortDate(point.date), positive, neutral, negative }
  })
}

/** Per-platform mention volume, average engagement, average sentiment
 * (rescaled from the [-1,1] sentiment_score to a 0-100 "% positive" figure),
 * and most common language, from real processed_data/daily_aggregates rows. */
export function computePlatformComparison(processedRows = [], dailyAggregateRows = []) {
  const platforms = new Set([
    ...processedRows.map((row) => row.platform).filter(Boolean),
    ...dailyAggregateRows.map((row) => row.platform).filter(Boolean),
  ])
  if (platforms.size === 0) return []

  return [...platforms].map((platform) => {
    const platformRows = processedRows.filter((row) => row.platform === platform)
    const platformAggregates = dailyAggregateRows.filter((row) => row.platform === platform)

    const mentionVolume = platformAggregates.length
      ? platformAggregates.reduce((sum, row) => sum + (row.mention_volume ?? 0), 0)
      : platformRows.length

    const engagementValues = platformRows.map((row) => row.engagement).filter(isNumber)
    const avgEngagement = engagementValues.length ? engagementValues.reduce((a, b) => a + b, 0) / engagementValues.length : null

    const sentimentValues = platformRows.map((row) => row.sentiment_score).filter(isNumber)
    const avgSentimentScore = sentimentValues.length ? sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length : null

    const languageCounts = new Map()
    for (const row of platformRows) {
      if (!row.language) continue
      languageCounts.set(row.language, (languageCounts.get(row.language) ?? 0) + 1)
    }
    let topLanguage = null
    let topLanguageCount = 0
    for (const [language, count] of languageCounts) {
      if (count > topLanguageCount) {
        topLanguage = language
        topLanguageCount = count
      }
    }

    return {
      platform,
      mentionVolume,
      avgEngagement: avgEngagement == null ? null : Math.round(avgEngagement * 10) / 10,
      // sentiment_score is normalized to [-1, 1] (ratingSentimentHeuristic.js) — rescaled
      // to a 0-100 "% positive sentiment" figure for display, a linear transform of a
      // real number, not a new one.
      sentimentScorePercent: avgSentimentScore == null ? null : Math.round(((avgSentimentScore + 1) / 2) * 1000) / 10,
      topLanguage,
    }
  })
}

/** Per-platform daily mention volume for the last `days` days:
 * [{date, [platform]: count, ...}] — shaped for a grouped bar/line chart. */
export function computeMentionVolumeSeries(dailyAggregateRows = [], days = 7) {
  if (dailyAggregateRows.length === 0) return []

  const platforms = [...new Set(dailyAggregateRows.map((row) => row.platform).filter(Boolean))]
  const byDate = new Map()

  for (const row of dailyAggregateRows) {
    if (!byDate.has(row.date)) byDate.set(row.date, { date: row.date })
    if (row.platform) {
      const bucket = byDate.get(row.date)
      bucket[row.platform] = (bucket[row.platform] ?? 0) + (row.mention_volume ?? 0)
    }
  }

  const recentDates = [...byDate.keys()].sort().slice(-days)
  return recentDates.map((date) => {
    const bucket = byDate.get(date)
    const point = { date: formatShortDate(date) }
    for (const platform of platforms) point[platform] = bucket[platform] ?? 0
    return point
  })
}

/** Aggregates the real hashtag strings captured during ingestion
 * (processed_data.features.hashtags — see featureEngineering.js) by
 * frequency. Rows without a features.hashtags array (e.g. non-text
 * templates) are silently skipped, not treated as zero hashtags. */
export function computeTrendingHashtags(processedRows = [], limit = 8) {
  const counts = new Map()
  for (const row of processedRows) {
    const tags = row.features?.hashtags
    if (!Array.isArray(tags)) continue
    for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([hashtag, mentions]) => ({ hashtag, mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, limit)
}

const LANGUAGE_LABELS = { en: 'English', ms: 'Bahasa Melayu', zh: 'Mandarin', 'ms-en': 'Code-mixed (MY/EN)', unknown: 'Unknown' }

/** Real language-detection breakdown (Dataset Management's "language mix"
 * widget) from the `language` column processed_data rows already carry —
 * see src/utils/textPreprocessing.js's detectLanguage(). Returns [] for an
 * empty input rather than fabricating a 100%-unknown row. */
export function computeLanguageBreakdown(languages = []) {
  const known = languages.filter(Boolean)
  if (known.length === 0) return []

  const counts = new Map()
  for (const language of known) counts.set(language, (counts.get(language) ?? 0) + 1)

  return [...counts.entries()]
    .map(([code, count]) => ({
      code,
      language: LANGUAGE_LABELS[code] ?? code,
      percent: Math.round((count / known.length) * 1000) / 10,
    }))
    .sort((a, b) => b.percent - a.percent)
}

/** Real posts (real text, real platform/language, real engagement), ranked
 * by engagement. `sentiment` is whatever the rating heuristic produced for
 * that row (or null — never guessed) - see ratingSentimentHeuristic.js. */
export function selectTopPosts(processedRows = [], limit = 6) {
  return [...processedRows]
    .filter((row) => row.cleaned_text || row.raw_text)
    .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      platform: row.platform,
      language: row.language,
      text: row.cleaned_text || row.raw_text,
      sentiment: row.sentiment ?? null,
      sentimentConfidence: row.sentiment_confidence ?? null,
      engagement: row.engagement ?? 0,
    }))
}
