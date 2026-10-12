/**
 * Feature engineering (FYP2.md §45). Every feature is computed only from
 * fields that actually exist on the row/rows given — never invented.
 */

const NEGATION_WORDS = new Set(['not', 'no', 'never', "don't", 'cannot', "can't", 'tak', 'tidak', 'bukan'])

/** §45 "Text" features, computed from one preprocessed row. */
export function computeTextFeatures({ cleanedText, rawText, language, hashtags = [], mentions = [], hasUrl = false, hasRepeatedChars = false, platform } = {}) {
  const text = cleanedText ?? rawText ?? ''
  const tokens = text.trim() ? text.trim().split(/\s+/) : []
  const punctuationCount = (text.match(/[.,!?;:]/g) ?? []).length
  const lowerWords = text.toLowerCase().match(/[a-z']+/g) ?? []
  const hasNegation = lowerWords.some((word) => NEGATION_WORDS.has(word))

  const features = {
    language: language ?? 'unknown',
    textLength: text.length,
    tokenCount: tokens.length,
    hashtagCount: hashtags.length,
    // The tags themselves (lowercased), not just a count — needed for a real
    // "trending hashtags" aggregate (Phase 10). Previously only the count was
    // kept; the tags textPreprocessing.js already extracted were discarded.
    hashtags: hashtags.map((tag) => tag.toLowerCase()),
    mentionCount: mentions.length,
    hasUrl: Boolean(hasUrl),
    punctuationCount,
    hasRepeatedChars: Boolean(hasRepeatedChars),
    hasNegation,
  }
  if (platform) features.platform = platform
  return features
}

/** §45 "Reviews" features — only added when a rating is actually present. */
export function computeReviewFeatures({ rating, product, category } = {}) {
  const features = {}
  if (Number.isFinite(rating)) features.rating = rating
  if (product) features.product = product
  if (category) features.category = category
  return features
}

/**
 * §45 "Time Series" daily aggregates — grouped by (date, source, platform).
 * `avgRatingSentiment`/`positiveRatio`/`negativeRatio` are null for a group
 * with no rated rows, never fabricated as 0.
 * @param {Array<{collectedAt: string, source: string, platform?: string, engagement?: number, sentiment?: string, sentimentScore?: number}>} rows
 */
export function aggregateDaily(rows) {
  const groups = new Map()

  for (const row of rows) {
    const date = (row.collectedAt ?? '').slice(0, 10)
    if (!date) continue
    const platform = row.platform ?? null
    const key = `${date}|${row.source}|${platform ?? ''}`
    if (!groups.has(key)) groups.set(key, { date, source: row.source, platform, rows: [] })
    groups.get(key).rows.push(row)
  }

  return [...groups.values()].map(({ date, source, platform, rows: groupRows }) => {
    const commentVolume = groupRows.length
    const engagementValues = groupRows.map((row) => row.engagement).filter((value) => Number.isFinite(value))
    const mentionVolume = engagementValues.length > 0 ? engagementValues.reduce((sum, value) => sum + value, 0) : null

    const scoredRows = groupRows.filter((row) => Number.isFinite(row.sentimentScore))
    const avgRatingSentiment =
      scoredRows.length > 0
        ? Math.round((scoredRows.reduce((sum, row) => sum + row.sentimentScore, 0) / scoredRows.length) * 100) / 100
        : null

    const labelledRows = groupRows.filter((row) => row.sentiment)
    const positiveRatio =
      labelledRows.length > 0
        ? Math.round((labelledRows.filter((row) => row.sentiment === 'positive').length / labelledRows.length) * 100) / 100
        : null
    const negativeRatio =
      labelledRows.length > 0
        ? Math.round((labelledRows.filter((row) => row.sentiment === 'negative').length / labelledRows.length) * 100) / 100
        : null

    return { date, source, platform, commentVolume, mentionVolume, avgRatingSentiment, positiveRatio, negativeRatio }
  })
}
