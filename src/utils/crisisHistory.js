/**
 * Historical crisis-risk series + episode grouping — built entirely by
 * re-running the existing, already-tested detectCrisis() (crisisDetection.js)
 * once per day over a growing prefix of the series, never duplicating its
 * scoring logic. detectCrisis() always scores only the LAST point of
 * whatever series it's given against the points before it, so truncating
 * the series up to day N and calling it gives day N's real historical
 * score — exactly what it would have returned had that been "today" at
 * the time.
 */

import { detectCrisis } from './crisisDetection'

/**
 * @param {Array<{date:string, negativeRatio?:number, mentionVolume?:number, avgRating?:number}>} dailySeries sorted or not — sorted here
 * @param {object} [thresholds] passed straight through to detectCrisis
 * @returns {Array<{date, riskScore, riskLevel, dataSufficient, signals}>}
 */
export function computeCrisisHistory(dailySeries = [], thresholds = undefined) {
  const series = [...dailySeries].sort((a, b) => new Date(a.date) - new Date(b.date))

  return series.map((_, index) => {
    const prefix = series.slice(0, index + 1)
    const result =
      thresholds === undefined ? detectCrisis(prefix) : detectCrisis(prefix, thresholds)
    const latest = prefix[prefix.length - 1]

    return {
      date: latest.date,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      dataSufficient: result.dataSufficient,
      signals: result.allSignals.map((signal) => ({
        id: signal.id,
        level: signal.level,
        value: signal.value,
        triggered: signal.level !== 'normal' && signal.level !== 'insufficient_data',
        evidence: signal.evidence,
      })),
    }
  })
}

/**
 * Groups consecutive warning/critical days (from computeCrisisHistory's
 * output) into episodes. A single 'normal' or 'insufficient_data' day
 * ends the current episode — episodes never span a day that wasn't
 * actually flagged.
 *
 * @param {ReturnType<typeof computeCrisisHistory>} history
 * @returns {Array<{start:string, end:string, peakScore:number, peakDay:string, riskLevel:'warning'|'critical', triggeredSignals:string[]}>}
 */
export function groupCrisisEpisodes(history = []) {
  const episodes = []
  let current = null

  const isActive = (point) => point.riskLevel === 'warning' || point.riskLevel === 'critical'

  for (const point of history) {
    if (isActive(point)) {
      if (!current) {
        current = {
          start: point.date,
          end: point.date,
          peakScore: point.riskScore,
          peakDay: point.date,
          riskLevel: point.riskLevel,
          triggeredSignalSet: new Set(point.signals.filter((s) => s.triggered).map((s) => s.id)),
        }
      } else {
        current.end = point.date
        if (point.riskScore > current.peakScore) {
          current.peakScore = point.riskScore
          current.peakDay = point.date
        }
        if (point.riskLevel === 'critical') current.riskLevel = 'critical'
        for (const signal of point.signals) {
          if (signal.triggered) current.triggeredSignalSet.add(signal.id)
        }
      }
    } else if (current) {
      episodes.push(finalizeEpisode(current))
      current = null
    }
  }
  if (current) episodes.push(finalizeEpisode(current))

  return episodes
}

function finalizeEpisode(episode) {
  const { triggeredSignalSet, ...rest } = episode
  return { ...rest, triggeredSignals: [...triggeredSignalSet] }
}
