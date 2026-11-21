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
      // The raw inputs for this day, passed through unchanged — added for
      // the redesign's SyncedStack (mention volume/negative ratio/avg
      // rating/comment volume as their own real lines), which needs the
      // actual metric values, not just the derived risk score.
      mentionVolume: latest.mentionVolume ?? null,
      commentVolume: latest.commentVolume ?? null,
      negativeRatio: latest.negativeRatio ?? null,
      avgRating: latest.avgRating ?? null,
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

/**
 * Real lag in days between an episode's first day and the first day its
 * revenue visibly drops relative to its own pre-episode baseline. Returns
 * null — never a guessed 0 — when there isn't enough sales history before
 * the episode to establish a baseline, or revenue never actually drops
 * within the look-ahead window; this must read as "can't be computed from
 * what we have," not "no lag."
 *
 * @param {{start:string}} episode one entry from groupCrisisEpisodes()
 * @param {Array<{date:string, revenue:number}>} dailySalesSeries sparse, from salesSeries.computeDailySalesSeries — NOT zero-filled
 * @param {{baselineDays?:number, dropThreshold?:number, lookaheadDays?:number}} [options] dropThreshold: fractional drop vs baseline counted as "the drop" (default 0.15 = 15%)
 * @returns {{lagDays:number, baselineRevenue:number, dropDate:string, dropRevenue:number}|null}
 */
export function computeRevenueLag(episode, dailySalesSeries = [], options = {}) {
  const { baselineDays = 7, dropThreshold = 0.15, lookaheadDays = 14 } = options
  if (!episode || dailySalesSeries.length === 0) return null

  const byDate = new Map(dailySalesSeries.map((point) => [point.date, point.revenue]))
  const priorDates = [...byDate.keys()]
    .filter((date) => date < episode.start)
    .sort()
    .slice(-baselineDays)
  if (priorDates.length < Math.min(3, baselineDays)) return null

  const baselineRevenue =
    priorDates.reduce((sum, date) => sum + byDate.get(date), 0) / priorDates.length
  if (!(baselineRevenue > 0)) return null

  const startDate = new Date(episode.start)
  for (let offset = 0; offset <= lookaheadDays; offset += 1) {
    const cursor = new Date(startDate)
    cursor.setUTCDate(cursor.getUTCDate() + offset)
    const iso = cursor.toISOString().slice(0, 10)
    const revenue = byDate.get(iso)
    if (revenue == null) continue
    if (revenue <= baselineRevenue * (1 - dropThreshold)) {
      return {
        lagDays: offset,
        baselineRevenue: Math.round(baselineRevenue * 100) / 100,
        dropDate: iso,
        dropRevenue: revenue,
      }
    }
  }
  return null
}

/**
 * Vertical timeline stages for one episode — first signal / Warning /
 * Critical (only if actually reached) / Peak / back to Normal — each with
 * its real date and day-offset from the episode's start. Pure presentation
 * sequencing over facts `computeCrisisHistory`/`groupCrisisEpisodes`
 * already computed; no new detection logic, and no precision/recall or
 * any accuracy metric (no ground-truth crisis label exists anywhere in
 * this schema — never fabricate one).
 *
 * @param {ReturnType<typeof groupCrisisEpisodes>[number]} episode
 * @param {ReturnType<typeof computeCrisisHistory>} history the SAME history array the episode was grouped from
 */
export function buildEpisodeStages(episode, history = []) {
  if (!episode) return []
  const daysBetween = (fromDate, toDate) =>
    Math.round((new Date(toDate) - new Date(fromDate)) / 86400000)

  const firstPoint = history.find((point) => point.date === episode.start)
  const firstTriggeredSignal = firstPoint?.signals.find((signal) => signal.triggered)?.id ?? null

  const firstCriticalPoint = history.find(
    (point) =>
      point.date >= episode.start && point.date <= episode.end && point.riskLevel === 'critical'
  )
  const backToNormalPoint = history.find(
    (point) => point.date > episode.end && point.riskLevel === 'normal'
  )

  const stages = [
    {
      id: 'first_signal',
      label: 'First signal triggered',
      date: episode.start,
      daysSinceStart: 0,
      signalId: firstTriggeredSignal,
    },
    { id: 'warning', label: 'Entered Warning', date: episode.start, daysSinceStart: 0 },
  ]
  if (firstCriticalPoint) {
    stages.push({
      id: 'critical',
      label: 'Escalated to Critical',
      date: firstCriticalPoint.date,
      daysSinceStart: daysBetween(episode.start, firstCriticalPoint.date),
    })
  }
  stages.push({
    id: 'peak',
    label: 'Peak risk',
    date: episode.peakDay,
    daysSinceStart: daysBetween(episode.start, episode.peakDay),
    riskScore: episode.peakScore,
  })
  stages.push({
    id: 'back_to_normal',
    label: backToNormalPoint
      ? 'Back to Normal'
      : 'Still active, no later Normal day in the loaded range',
    date: backToNormalPoint?.date ?? null,
    daysSinceStart: backToNormalPoint ? daysBetween(episode.start, backToNormalPoint.date) : null,
  })
  return stages
}

/**
 * Picks which episode the page should focus its drill-down views (Sankey,
 * evidence wall, episode timeline, replay) on: the episode containing
 * `viewedDate` if one does, otherwise the most recent episode in the
 * loaded range (ties broken by higher peak score), otherwise null — an
 * honest "no episode to show" rather than guessing one.
 *
 * @param {ReturnType<typeof groupCrisisEpisodes>} episodes
 * @param {string|null} [viewedDate]
 */
export function selectFocusEpisode(episodes = [], viewedDate = null) {
  if (viewedDate) {
    const containing = episodes.find(
      (episode) => viewedDate >= episode.start && viewedDate <= episode.end
    )
    if (containing) return containing
  }
  if (episodes.length === 0) return null
  return [...episodes].sort((a, b) => b.end.localeCompare(a.end) || b.peakScore - a.peakScore)[0]
}
