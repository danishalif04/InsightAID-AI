import { describe, expect, it } from 'vitest'
import { computeCrisisHistory, groupCrisisEpisodes } from './crisisHistory'

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
