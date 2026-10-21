/**
 * Business Health Score (0-100) from four real inputs. Pure — callers
 * compute each sub-score from already-fetched data via the existing
 * services/utils (computeSentimentScores, runCrisisDetection,
 * salesSeries.js, computeMentionVolumeSeries) and pass the results in
 * here; nothing in this file calls Supabase.
 *
 * If an input genuinely can't be computed (not enough history, no data
 * yet), it's reported in `missingInputs` by name — never silently
 * defaulted to a neutral/guessed value. The overall score is still
 * computed from whichever inputs ARE available, with weights renormalized
 * over just those (so, e.g., losing engagementTrend doesn't quietly pull
 * the score toward 0 — it just means the other three now carry its
 * share). Only when EVERY input is missing does `score` itself become
 * null, which the caller must render as "Unavailable," not 0 or 50.
 */

export const HEALTH_SCORE_WEIGHTS = {
  sentiment: 0.3,
  crisisRisk: 0.3,
  revenueMomentum: 0.25,
  engagementTrend: 0.15,
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/** Maps a period-over-period % change to a 0-100 score centered at 50
 * (no change = 50; +50% or more = 100; -50% or more = 0; linear between). */
function momentumScore(changeRatio) {
  return Math.round(clamp(50 + changeRatio * 100, 0, 100))
}

/**
 * @param {Array<{date:string, revenue:number}>} dailySalesSeries sorted or not — sorted here (salesSeries.js's computeDailySalesSeries output)
 * @param {number} [windowDays=7]
 * @returns {number|null} null when there isn't at least 2 full windows of data
 */
export function computeRevenueMomentum(dailySalesSeries = [], windowDays = 7) {
  const sorted = [...dailySalesSeries].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < windowDays * 2) return null

  const average = (rows) => rows.reduce((sum, row) => sum + row.revenue, 0) / rows.length
  const recentAvg = average(sorted.slice(-windowDays))
  const priorAvg = average(sorted.slice(-windowDays * 2, -windowDays))
  if (priorAvg <= 0) return null

  return momentumScore((recentAvg - priorAvg) / priorAvg)
}

/**
 * @param {Array<Record<string, number|string>>} mentionVolumeSeries computeMentionVolumeSeries()'s output: [{date, [platform]: count, ...}]
 * @param {string[]} platforms the platform keys present in that series
 * @param {number} [windowDays=7]
 * @returns {number|null}
 */
export function computeEngagementTrend(mentionVolumeSeries = [], platforms = [], windowDays = 7) {
  if (mentionVolumeSeries.length < windowDays * 2 || platforms.length === 0) return null

  const sumWindow = (rows) =>
    rows.reduce(
      (sum, row) => sum + platforms.reduce((inner, platform) => inner + (row[platform] ?? 0), 0),
      0
    )
  const recentSum = sumWindow(mentionVolumeSeries.slice(-windowDays))
  const priorSum = sumWindow(mentionVolumeSeries.slice(-windowDays * 2, -windowDays))
  if (priorSum <= 0) return null

  return momentumScore((recentSum - priorSum) / priorSum)
}

/**
 * @param {object} inputs
 * @param {number|null} inputs.sentimentScore 0-100, e.g. computeSentimentScores()'s 'positive' card value
 * @param {number|null} inputs.crisisRiskScore 0-100 (higher = worse) — from detectCrisis()/runCrisisDetection()
 * @param {boolean} inputs.crisisDataSufficient detectCrisis()'s own dataSufficient flag — a riskScore of 0 from insufficient data is NOT the same as a real "no risk," so this must be true for crisisRiskScore to be used at all
 * @param {number|null} inputs.revenueMomentumScore computeRevenueMomentum()'s output
 * @param {number|null} inputs.engagementTrendScore computeEngagementTrend()'s output
 * @returns {{score:number|null, missingInputs:string[], subScores:Record<string, number|null>}}
 */
export function computeHealthScore({
  sentimentScore,
  crisisRiskScore,
  crisisDataSufficient,
  revenueMomentumScore,
  engagementTrendScore,
}) {
  const subScores = {
    sentiment: typeof sentimentScore === 'number' ? sentimentScore : null,
    crisisRisk:
      crisisDataSufficient && typeof crisisRiskScore === 'number' ? 100 - crisisRiskScore : null,
    revenueMomentum: typeof revenueMomentumScore === 'number' ? revenueMomentumScore : null,
    engagementTrend: typeof engagementTrendScore === 'number' ? engagementTrendScore : null,
  }

  const missingInputs = Object.entries(subScores)
    .filter(([, value]) => value == null)
    .map(([key]) => key)

  const available = Object.entries(subScores).filter(([, value]) => value != null)
  if (available.length === 0) {
    return { score: null, missingInputs, subScores }
  }

  const totalWeight = available.reduce((sum, [key]) => sum + HEALTH_SCORE_WEIGHTS[key], 0)
  const score = available.reduce(
    (sum, [key, value]) => sum + value * (HEALTH_SCORE_WEIGHTS[key] / totalWeight),
    0
  )

  return { score: Math.round(score), missingInputs, subScores }
}
