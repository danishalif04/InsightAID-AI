import { describe, expect, it } from 'vitest'
import {
  buildEpisodeStages,
  computeCrisisHistory,
  computeRevenueLag,
  groupCrisisEpisodes,
  selectFocusEpisode,
} from './crisisHistory'

// Deliberately NOT 2026-09-02..07 (the real Embun Botanica crisis window) —
// this fixture anchors on an arbitrary, clearly-synthetic date range to
// prove episode detection is date-agnostic, not hard-coded to that window.
function day(offset, overrides = {}) {
  const date = new Date('2025-03-01T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return {
    date: date.toISOString().slice(0, 10),
    negativeRatio: 0.1,
    mentionVolume: 100,
    avgRating: 4.5,
    ...overrides,
  }
}

function flatBaseline(days) {
  return Array.from({ length: days }, (_, i) => day(i))
}

describe('computeCrisisHistory', () => {
  it('returns one point per input day, each scored against only the days before it', () => {
    const series = flatBaseline(10)
    const history = computeCrisisHistory(series)
    expect(history).toHaveLength(10)
    expect(history.every((point) => point.riskLevel === 'normal')).toBe(true)
  })

  it("matches detectCrisis' own score for the full series' last day", () => {
    const series = [
      ...flatBaseline(7),
      day(7, { negativeRatio: 0.6, mentionVolume: 400, avgRating: 2.5 }),
    ]
    const history = computeCrisisHistory(series)
    expect(history[history.length - 1].riskLevel).toBe('critical')
    expect(history[history.length - 1].riskScore).toBeGreaterThanOrEqual(60)
  })

  it('passes the raw per-day metrics through unchanged, for charts that need the actual values', () => {
    const point = computeCrisisHistory([
      day(0, { negativeRatio: 0.3, mentionVolume: 120, avgRating: 4.1 }),
    ])[0]
    expect(point.negativeRatio).toBe(0.3)
    expect(point.mentionVolume).toBe(120)
    expect(point.avgRating).toBe(4.1)
    expect(point.commentVolume).toBeNull() // not provided in this fixture — null, not 0 or guessed
  })

  it('a day with insufficient history still gets a real point, not a skipped one', () => {
    const history = computeCrisisHistory([day(0)])
    expect(history).toHaveLength(1)
    expect(history[0].dataSufficient).toBe(true) // negative_ratio_level needs no baseline
  })
})

describe('groupCrisisEpisodes', () => {
  it('detects a real episode from an injected spike, using only the data — no hard-coded dates', () => {
    const series = [
      ...flatBaseline(7),
      day(7, { negativeRatio: 0.6, mentionVolume: 400, avgRating: 2.5 }),
      day(8, { negativeRatio: 0.55, mentionVolume: 380, avgRating: 2.6 }),
      day(9, { negativeRatio: 0.5, mentionVolume: 350, avgRating: 2.7 }),
      day(10), // back to the flat baseline pattern
      day(11),
    ]
    const history = computeCrisisHistory(series)
    const episodes = groupCrisisEpisodes(history)

    expect(episodes).toHaveLength(1)
    expect(episodes[0].start).toBe(day(7).date)
    expect(episodes[0].end).toBe(day(9).date)
    expect(episodes[0].riskLevel).toBe('critical')
    expect(episodes[0].peakDay).toBe(day(7).date)
    expect(episodes[0].triggeredSignals).toContain('negative_ratio_level')
  })

  it('returns no episodes when nothing ever leaves normal', () => {
    expect(groupCrisisEpisodes(computeCrisisHistory(flatBaseline(14)))).toEqual([])
  })

  it('splits two separate spikes into two separate episodes', () => {
    const series = [
      ...flatBaseline(7),
      day(7, { negativeRatio: 0.6, mentionVolume: 400, avgRating: 2.5 }),
      ...Array.from({ length: 6 }, (_, i) => day(8 + i)), // back to normal for a while
      day(14, { negativeRatio: 0.55, mentionVolume: 380, avgRating: 2.6 }),
    ]
    const episodes = groupCrisisEpisodes(computeCrisisHistory(series))
    expect(episodes).toHaveLength(2)
  })
})

function salesDay(offset, revenue) {
  const date = new Date('2025-03-01T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return { date: date.toISOString().slice(0, 10), revenue }
}

describe('computeRevenueLag', () => {
  const episode = { start: day(7).date, end: day(9).date }

  it('finds a same-day drop and reports a real baseline', () => {
    const sales = [
      ...Array.from({ length: 7 }, (_, i) => salesDay(i, 1000)),
      salesDay(7, 700), // 30% drop on the episode's first day, exceeds the 15% threshold
    ]
    const result = computeRevenueLag(episode, sales)
    expect(result).toEqual({
      lagDays: 0,
      baselineRevenue: 1000,
      dropDate: day(7).date,
      dropRevenue: 700,
    })
  })

  it('finds a drop that lags a few days behind the first signal', () => {
    const sales = [
      ...Array.from({ length: 7 }, (_, i) => salesDay(i, 1000)),
      salesDay(7, 980),
      salesDay(8, 960),
      salesDay(9, 600), // the real drop, 2 days after episode.start
    ]
    const result = computeRevenueLag(episode, sales)
    expect(result.lagDays).toBe(2)
    expect(result.dropDate).toBe(day(9).date)
  })

  it('returns null, not a guessed 0, when there is no sales history before the episode', () => {
    expect(computeRevenueLag(episode, [salesDay(7, 700)])).toBeNull()
  })

  it('returns null when revenue never actually drops within the look-ahead window', () => {
    const sales = Array.from({ length: 25 }, (_, i) => salesDay(i, 1000))
    expect(computeRevenueLag(episode, sales)).toBeNull()
  })
})

describe('buildEpisodeStages', () => {
  it('sequences first-signal/critical/peak/back-to-normal from real episode + history facts', () => {
    const series = [
      ...flatBaseline(7),
      day(7, { negativeRatio: 0.6, mentionVolume: 400, avgRating: 2.5 }),
      day(8, { negativeRatio: 0.55, mentionVolume: 380, avgRating: 2.6 }),
      day(9, { negativeRatio: 0.5, mentionVolume: 350, avgRating: 2.7 }),
      day(10),
      day(11),
    ]
    const history = computeCrisisHistory(series)
    const [episode] = groupCrisisEpisodes(history)

    const stages = buildEpisodeStages(episode, history)
    const byId = Object.fromEntries(stages.map((stage) => [stage.id, stage]))

    expect(byId.first_signal.date).toBe(day(7).date)
    expect(byId.first_signal.signalId).toBeTruthy()
    expect(byId.critical.date).toBe(day(7).date)
    expect(byId.peak.date).toBe(episode.peakDay)
    expect(byId.peak.riskScore).toBe(episode.peakScore)
    expect(byId.back_to_normal.date).toBe(day(10).date)
    expect(byId.back_to_normal.daysSinceStart).toBe(3)
  })

  it('returns an empty array for a null episode rather than throwing', () => {
    expect(buildEpisodeStages(null, [])).toEqual([])
  })
})

describe('selectFocusEpisode', () => {
  const earlier = { start: day(7).date, end: day(9).date, peakScore: 60 }
  const later = { start: day(20).date, end: day(21).date, peakScore: 40 }

  it('picks the episode containing the viewed date when there is one', () => {
    expect(selectFocusEpisode([earlier, later], day(8).date)).toBe(earlier)
  })

  it('falls back to the most recent episode when no date is viewed (or it matches none)', () => {
    expect(selectFocusEpisode([earlier, later], null)).toBe(later)
    expect(selectFocusEpisode([earlier, later], day(100).date)).toBe(later)
  })

  it('returns null, not a guess, when there are no episodes at all', () => {
    expect(selectFocusEpisode([], day(8).date)).toBeNull()
  })
})
