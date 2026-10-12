/**
 * Rule-based crisis detection (FYP2.md §52-53). Pure functions only — no
 * React, no Supabase. Every signal is computed from the daily series the
 * caller passes in; nothing here invents a number, and a signal that can't
 * be computed (not enough history) is marked 'insufficient_data', never
 * silently treated as normal.
 *
 * Input: `dailySeries`, an array of { date, negativeRatio, mentionVolume,
 * avgRating } sorted ascending by date (negativeRatio 0-1, mentionVolume a
 * count, avgRating on a 1-5 scale — any of the three may be null/undefined
 * for a given day if that data point genuinely doesn't exist; that day is
 * excluded from baseline/anomaly math for that field, not coerced to 0).
 */

import {
  BASELINE_WINDOW_DAYS,
  CRISIS_THRESHOLDS,
  MIN_BASELINE_POINTS,
  RISK_LEVEL_THRESHOLDS,
  SEVERITY_POINTS,
} from '@/config/crisisThresholds'

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

/** Mean/stdDev of `field` over the up-to-BASELINE_WINDOW_DAYS points immediately
 * before the latest one (the latest point itself is never part of its own baseline). */
function computeBaseline(series, field) {
  const priorPoints = series.slice(0, -1).slice(-BASELINE_WINDOW_DAYS)
  const values = priorPoints.map((point) => point[field]).filter(isNumber)
  if (values.length < MIN_BASELINE_POINTS) return { mean: null, stdDev: null, n: values.length }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return { mean, stdDev: Math.sqrt(variance), n: values.length }
}

function levelFor(value, thresholds) {
  if (value >= thresholds.critical) return 'critical'
  if (value >= thresholds.warning) return 'warning'
  return 'normal'
}

function insufficientSignal(id, reason) {
  return { id, level: 'insufficient_data', evidence: reason, value: null }
}

function evaluateNegativeRatioLevel(latest, thresholds) {
  const id = 'negative_ratio_level'
  if (!isNumber(latest.negativeRatio)) return insufficientSignal(id, 'No negative-sentiment-ratio data for the latest day.')

  const level = levelFor(latest.negativeRatio, thresholds.negativeRatioLevel)
  const pct = Math.round(latest.negativeRatio * 1000) / 10
  return {
    id,
    level,
    value: latest.negativeRatio,
    evidence: `Negative sentiment ratio is ${pct}% of today's mentions.`,
  }
}

function evaluateNegativeRatioVelocity(series, latest, thresholds) {
  const id = 'negative_ratio_velocity'
  const baseline = computeBaseline(series, 'negativeRatio')
  if (!isNumber(latest.negativeRatio) || baseline.mean === null) {
    return insufficientSignal(id, `Not enough history (need ${MIN_BASELINE_POINTS}+ prior days) to establish a baseline.`)
  }

  const delta = latest.negativeRatio - baseline.mean
  const level = delta <= 0 ? 'normal' : levelFor(delta, thresholds.negativeRatioVelocity)
  const deltaPct = Math.round(delta * 1000) / 10
  return {
    id,
    level,
    value: delta,
    baseline: baseline.mean,
    evidence:
      delta > 0
        ? `Negative sentiment ratio rose by ${deltaPct} percentage points versus the ${baseline.n}-day baseline.`
        : `Negative sentiment ratio is at or below its ${baseline.n}-day baseline.`,
  }
}

function evaluateMentionVolumeLevel(series, latest, thresholds) {
  const id = 'mention_volume_level'
  const baseline = computeBaseline(series, 'mentionVolume')
  if (!isNumber(latest.mentionVolume) || baseline.mean === null || baseline.mean <= 0) {
    return insufficientSignal(id, `Not enough history (need ${MIN_BASELINE_POINTS}+ prior days with mentions) to establish a baseline.`)
  }

  const ratio = latest.mentionVolume / baseline.mean
  const level = levelFor(ratio, thresholds.mentionVolumeLevel)
  return {
    id,
    level,
    value: ratio,
    baseline: baseline.mean,
    evidence: `Mention volume (${latest.mentionVolume}) is ${ratio.toFixed(1)}x the ${baseline.n}-day baseline average (${baseline.mean.toFixed(1)}).`,
  }
}

function evaluateMentionVolumeVelocity(series, latest, thresholds) {
  const id = 'mention_volume_velocity'
  const previous = series.length >= 2 ? series[series.length - 2] : null
  if (!isNumber(latest.mentionVolume) || !previous || !isNumber(previous.mentionVolume) || previous.mentionVolume <= 0) {
    return insufficientSignal(id, 'No prior day with mention data to compare against.')
  }

  const change = (latest.mentionVolume - previous.mentionVolume) / previous.mentionVolume
  const level = change <= 0 ? 'normal' : levelFor(change, thresholds.mentionVolumeVelocity)
  const changePct = Math.round(change * 1000) / 10
  return {
    id,
    level,
    value: change,
    evidence:
      change > 0
        ? `Mention volume increased by ${changePct}% versus the previous day (${previous.mentionVolume} -> ${latest.mentionVolume}).`
        : `Mention volume did not increase versus the previous day.`,
  }
}

function evaluateRatingDeterioration(series, latest, thresholds) {
  const id = 'rating_deterioration'
  const baseline = computeBaseline(series, 'avgRating')
  if (!isNumber(latest.avgRating) || baseline.mean === null) {
    return insufficientSignal(id, `Not enough rated history (need ${MIN_BASELINE_POINTS}+ prior days) to establish a baseline.`)
  }

  const drop = baseline.mean - latest.avgRating
  const level = drop <= 0 ? 'normal' : levelFor(drop, thresholds.ratingDeterioration)
  return {
    id,
    level,
    value: drop,
    baseline: baseline.mean,
    evidence:
      drop > 0
        ? `Average rating decreased by ${drop.toFixed(2)} (from ${baseline.mean.toFixed(2)} to ${latest.avgRating.toFixed(2)}) versus the ${baseline.n}-day baseline.`
        : `Average rating is at or above its ${baseline.n}-day baseline.`,
  }
}

// Below this, a baseline is treated as "no real variance" rather than trusting
// floating-point arithmetic to ever produce an exact 0 stdDev for constant input.
const ZERO_VARIANCE_EPSILON = 1e-9

function evaluateZScoreAnomaly(id, series, latest, field, thresholds, label) {
  const baseline = computeBaseline(series, field)
  if (
    !isNumber(latest[field]) ||
    baseline.mean === null ||
    baseline.stdDev === null ||
    baseline.stdDev < ZERO_VARIANCE_EPSILON
  ) {
    return insufficientSignal(id, `Not enough history/variance (need ${MIN_BASELINE_POINTS}+ prior days) to compute an anomaly score.`)
  }

  const z = (latest[field] - baseline.mean) / baseline.stdDev
  const level = levelFor(Math.abs(z), thresholds)
  return {
    id,
    level,
    value: z,
    baseline: baseline.mean,
    evidence: `${label} is ${Math.abs(z).toFixed(1)} standard deviations ${z >= 0 ? 'above' : 'below'} its ${baseline.n}-day baseline (z-score).`,
  }
}

/** @returns {{riskLevel:'normal'|'warning'|'critical', riskScore:number, dataSufficient:boolean, triggeredSignals:object[], allSignals:object[], detectedAt:string}} */
export function detectCrisis(dailySeries = [], thresholds = CRISIS_THRESHOLDS) {
  const series = [...dailySeries].sort((a, b) => new Date(a.date) - new Date(b.date))
  const detectedAt = new Date().toISOString()

  if (series.length === 0) {
    return { riskLevel: 'normal', riskScore: 0, dataSufficient: false, triggeredSignals: [], allSignals: [], detectedAt }
  }

  const latest = series[series.length - 1]

  const allSignals = [
    evaluateNegativeRatioLevel(latest, thresholds),
    evaluateNegativeRatioVelocity(series, latest, thresholds),
    evaluateMentionVolumeLevel(series, latest, thresholds),
    evaluateMentionVolumeVelocity(series, latest, thresholds),
    evaluateRatingDeterioration(series, latest, thresholds),
    evaluateZScoreAnomaly('sentiment_anomaly', series, latest, 'negativeRatio', thresholds.sentimentAnomaly, 'Negative sentiment ratio'),
    evaluateZScoreAnomaly('review_volume_anomaly', series, latest, 'mentionVolume', thresholds.reviewVolumeAnomaly, 'Mention volume'),
  ]

  const computedSignals = allSignals.filter((signal) => signal.level !== 'insufficient_data')
  const triggeredSignals = computedSignals.filter((signal) => signal.level !== 'normal')

  const riskScore = Math.min(
    100,
    triggeredSignals.reduce((sum, signal) => sum + (SEVERITY_POINTS[signal.level] ?? 0), 0)
  )

  let riskLevel = 'normal'
  if (riskScore >= RISK_LEVEL_THRESHOLDS.critical) riskLevel = 'critical'
  else if (riskScore >= RISK_LEVEL_THRESHOLDS.warning) riskLevel = 'warning'

  return {
    riskLevel,
    riskScore,
    dataSufficient: computedSignals.length > 0,
    triggeredSignals,
    allSignals,
    detectedAt,
  }
}
