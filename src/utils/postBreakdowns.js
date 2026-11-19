/**
 * Breakdowns computed from captured posts, used to replace three panels that
 * could never show anything.
 *
 * WHY THESE EXIST
 * ---------------
 * Three sections of the app were permanent dead ends, each for a real reason
 * that is not going to change:
 *
 *   Emotion Analysis   - the project classifies 3-class sentiment only
 *                        (positive/neutral/negative). There is no emotion
 *                        classifier and building one is not in scope.
 *   Region Breakdown   - no location field is captured during ingestion, so
 *                        a post cannot be attributed to a state.
 *   Top Influencers    - author identity is anonymised at ingestion and no
 *                        follower count is captured. This is required by
 *                        PDPA 2010 (CLAUDE.md rule 7), so it is a deliberate
 *                        property of the system, not a gap to fill.
 *
 * Rather than leave three "Unavailable" notices, each is replaced by
 * something computed from data the system genuinely holds, and which says
 * more about this project than the original would have:
 *
 *   confidence distribution - where the classifier is unsure (objective O1)
 *   language x sentiment    - the per-language split O1 is actually graded on
 *   engagement by sentiment - whether negative posts travel further, which is
 *                             the signal crisis detection depends on
 *
 * Nothing here invents a value. Every function returns empty when the field
 * it needs is absent, and the caller shows an honest empty state. Pure
 * functions, no Supabase, no React (CLAUDE.md).
 */

/** Confidence bands. Deliberately coarse: the point is "sure vs unsure". */
export const CONFIDENCE_BANDS = Object.freeze([
  { id: 'low', label: 'Below 60%', min: 0, max: 0.6 },
  { id: 'fair', label: '60-75%', min: 0.6, max: 0.75 },
  { id: 'good', label: '75-90%', min: 0.75, max: 0.9 },
  { id: 'high', label: '90% and above', min: 0.9, max: Infinity },
])

const SENTIMENTS = Object.freeze(['positive', 'neutral', 'negative'])

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function round(value, places = 1) {
  const f = 10 ** places
  return Math.round(value * f) / f
}

/**
 * How confident the classifier was, bucketed.
 *
 * Posts with no confidence score are counted in `missing` and excluded from
 * the bands, rather than being treated as zero — a missing score is not a
 * low score, and conflating them would understate the model.
 *
 * @returns {{bands: Array, scored: number, missing: number, meanConfidence: number|null, lowShare: number|null}}
 */
export function computeConfidenceDistribution(posts = []) {
  const rows = Array.isArray(posts) ? posts : []
  const scored = rows.filter((p) => isFiniteNumber(p?.sentimentConfidence))
  const missing = rows.length - scored.length

  const bands = CONFIDENCE_BANDS.map((band) => {
    const count = scored.filter(
      (p) => p.sentimentConfidence >= band.min && p.sentimentConfidence < band.max
    ).length
    return {
      id: band.id,
      label: band.label,
      count,
      sharePct: scored.length > 0 ? round((count / scored.length) * 100) : 0,
    }
  })

  const mean = scored.length > 0
    ? scored.reduce((sum, p) => sum + p.sentimentConfidence, 0) / scored.length
    : null

  const lowCount = bands.find((b) => b.id === 'low')?.count ?? 0

  return {
    bands,
    scored: scored.length,
    missing,
    meanConfidence: mean === null ? null : round(mean, 3),
    lowShare: scored.length > 0 ? round((lowCount / scored.length) * 100) : null,
  }
}

/**
 * Sentiment split per detected language.
 *
 * This is the breakdown objective O1 is graded on (accuracy >= 75% for each
 * language separately), so it is the most load-bearing view of this dataset
 * the page can show.
 *
 * Rows are ordered by volume, so the languages carrying the dataset come
 * first. A post with no sentiment is counted in `unrated` and left out of the
 * percentages — an unrated post is not a neutral one.
 */
export function computeLanguageSentiment(posts = [], labels = {}) {
  const rows = Array.isArray(posts) ? posts : []
  const byLanguage = new Map()

  for (const post of rows) {
    const key = post?.language || 'unknown'
    if (!byLanguage.has(key)) {
      byLanguage.set(key, { language: key, label: labels[key] ?? key, total: 0, unrated: 0, positive: 0, neutral: 0, negative: 0 })
    }
    const entry = byLanguage.get(key)
    entry.total += 1
    if (SENTIMENTS.includes(post?.sentiment)) entry[post.sentiment] += 1
    else entry.unrated += 1
  }

  return [...byLanguage.values()]
    .map((entry) => {
      const rated = entry.positive + entry.neutral + entry.negative
      return {
        ...entry,
        rated,
        positivePct: rated > 0 ? round((entry.positive / rated) * 100) : 0,
        neutralPct: rated > 0 ? round((entry.neutral / rated) * 100) : 0,
        negativePct: rated > 0 ? round((entry.negative / rated) * 100) : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
}

/**
 * Mean engagement per sentiment, with the negative-to-positive ratio.
 *
 * The ratio is the useful number: above 1 means negative posts travel further
 * than positive ones on this dataset, which is the mechanism crisis detection
 * exists to catch. Returned as null rather than Infinity when there is
 * nothing to divide by, so the UI shows "not enough data" instead of a
 * meaningless figure.
 */
export function computeEngagementBySentiment(posts = []) {
  const rows = (Array.isArray(posts) ? posts : []).filter(
    (p) => SENTIMENTS.includes(p?.sentiment) && isFiniteNumber(p?.engagement)
  )

  const groups = SENTIMENTS.map((sentiment) => {
    const group = rows.filter((p) => p.sentiment === sentiment)
    const total = group.reduce((sum, p) => sum + p.engagement, 0)
    const sorted = group.map((p) => p.engagement).sort((a, b) => a - b)
    const median = sorted.length === 0
      ? 0
      : sorted.length % 2
        ? sorted[sorted.length >> 1]
        : (sorted[(sorted.length >> 1) - 1] + sorted[sorted.length >> 1]) / 2
    return {
      sentiment,
      count: group.length,
      total,
      mean: group.length > 0 ? round(total / group.length) : 0,
      // Median as well as mean on purpose: engagement is long-tailed, and one
      // viral post can make the mean describe nothing that actually happened.
      median: round(median),
    }
  })

  const positive = groups.find((g) => g.sentiment === 'positive')
  const negative = groups.find((g) => g.sentiment === 'negative')
  const ratio = positive && negative && positive.mean > 0 && negative.count > 0 && positive.count > 0
    ? round(negative.mean / positive.mean, 2)
    : null

  return { groups, negativeToPositiveRatio: ratio, rated: rows.length }
}
