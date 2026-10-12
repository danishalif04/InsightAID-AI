import { describe, expect, it } from 'vitest'
import { detectCrisis } from './crisisDetection'
import { CRISIS_THRESHOLDS } from '@/config/crisisThresholds'

function day(offset, overrides = {}) {
  const date = new Date('2026-01-01T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return { date: date.toISOString().slice(0, 10), negativeRatio: 0.1, mentionVolume: 100, avgRating: 4.5, ...overrides }
}

function flatBaseline(days = 7) {
  return Array.from({ length: days }, (_, i) => day(i))
}

describe('detectCrisis', () => {
  it('returns a safe empty result for an empty series', () => {
    const result = detectCrisis([])
    expect(result.riskLevel).toBe('normal')
    expect(result.riskScore).toBe(0)
    expect(result.dataSufficient).toBe(false)
    expect(result.triggeredSignals).toEqual([])
  })

  it('reports insufficient_data for baseline-dependent signals with too little history', () => {
    const result = detectCrisis([day(0, { negativeRatio: 0.9 })])
    const velocitySignal = result.allSignals.find((s) => s.id === 'negative_ratio_velocity')
    expect(velocitySignal.level).toBe('insufficient_data')
    // but the level check (no baseline needed) still computes
    const levelSignal = result.allSignals.find((s) => s.id === 'negative_ratio_level')
    expect(levelSignal.level).toBe('critical')
    expect(result.dataSufficient).toBe(true) // at least one signal computed
  })

  it('flags nothing when every signal matches a flat, unremarkable baseline', () => {
    const series = [...flatBaseline(7), day(7)] // latest identical to baseline
    const result = detectCrisis(series)
    expect(result.riskLevel).toBe('normal')
    expect(result.riskScore).toBe(0)
    expect(result.triggeredSignals).toEqual([])
  })

  it('detects a full-blown crisis across every computable signal', () => {
    const series = [
      ...flatBaseline(7),
      day(7, { negativeRatio: 0.6, mentionVolume: 400, avgRating: 2.5 }),
    ]
    const result = detectCrisis(series)

    expect(result.riskLevel).toBe('critical')
    expect(result.dataSufficient).toBe(true)
    expect(result.riskScore).toBeGreaterThanOrEqual(60)

    const ids = result.triggeredSignals.map((s) => s.id)
    expect(ids).toContain('negative_ratio_level')
    expect(ids).toContain('negative_ratio_velocity')
    expect(ids).toContain('mention_volume_level')
    expect(ids).toContain('mention_volume_velocity')
    expect(ids).toContain('rating_deterioration')
  })

  it('negative_ratio_level respects the configured warning/critical boundaries exactly', () => {
    const warningSeries = [...flatBaseline(3), day(3, { negativeRatio: CRISIS_THRESHOLDS.negativeRatioLevel.warning })]
    const criticalSeries = [...flatBaseline(3), day(3, { negativeRatio: CRISIS_THRESHOLDS.negativeRatioLevel.critical })]
    const belowSeries = [...flatBaseline(3), day(3, { negativeRatio: CRISIS_THRESHOLDS.negativeRatioLevel.warning - 0.01 })]

    expect(detectCrisis(warningSeries).allSignals.find((s) => s.id === 'negative_ratio_level').level).toBe('warning')
    expect(detectCrisis(criticalSeries).allSignals.find((s) => s.id === 'negative_ratio_level').level).toBe('critical')
    expect(detectCrisis(belowSeries).allSignals.find((s) => s.id === 'negative_ratio_level').level).toBe('normal')
  })

  it('respects a caller-supplied threshold override (configurability)', () => {
    const series = [...flatBaseline(3), day(3, { negativeRatio: 0.2 })]
    const defaultResult = detectCrisis(series)
    expect(defaultResult.allSignals.find((s) => s.id === 'negative_ratio_level').level).toBe('normal')

    const stricter = {
      ...CRISIS_THRESHOLDS,
      negativeRatioLevel: { warning: 0.15, critical: 0.4 },
    }
    const strictResult = detectCrisis(series, stricter)
    expect(strictResult.allSignals.find((s) => s.id === 'negative_ratio_level').level).toBe('warning')
  })

  it('mention_volume_velocity compares only to the immediately preceding day, not the whole baseline', () => {
    const series = [
      ...flatBaseline(6),
      day(6, { mentionVolume: 100 }), // previous day
      day(7, { mentionVolume: 250 }), // +150% vs previous day -> critical velocity
    ]
    const result = detectCrisis(series)
    const velocity = result.allSignals.find((s) => s.id === 'mention_volume_velocity')
    expect(velocity.level).toBe('critical')
  })

  it('rating_deterioration only triggers on a real drop, never on an improvement', () => {
    const improvingSeries = [...flatBaseline(5), day(5, { avgRating: 5.0 })]
    const result = detectCrisis(improvingSeries)
    expect(result.allSignals.find((s) => s.id === 'rating_deterioration').level).toBe('normal')
  })

  it('sentiment_anomaly and review_volume_anomaly need real variance, not just enough points', () => {
    // 7 identical baseline days -> stdDev is 0 -> anomaly is insufficient_data, not a
    // divide-by-zero or a fabricated infinite z-score
    const series = [...flatBaseline(7), day(7, { negativeRatio: 0.5 })]
    const result = detectCrisis(series)
    const anomaly = result.allSignals.find((s) => s.id === 'sentiment_anomaly')
    expect(anomaly.level).toBe('insufficient_data')
  })

  it('sentiment_anomaly flags a statistically unusual day even below the fixed level threshold', () => {
    // small, stable negative ratio with one point that is a genuine outlier
    // relative to its own history, but still below the 0.3 fixed warning threshold
    const series = [
      day(0, { negativeRatio: 0.05 }),
      day(1, { negativeRatio: 0.06 }),
      day(2, { negativeRatio: 0.05 }),
      day(3, { negativeRatio: 0.07 }),
      day(4, { negativeRatio: 0.06 }),
      day(5, { negativeRatio: 0.05 }),
      day(6, { negativeRatio: 0.2 }), // well above its own tight baseline, still < 0.3
    ]
    const result = detectCrisis(series)
    const anomaly = result.allSignals.find((s) => s.id === 'sentiment_anomaly')
    const levelSignal = result.allSignals.find((s) => s.id === 'negative_ratio_level')
    expect(anomaly.level).not.toBe('normal')
    expect(levelSignal.level).toBe('normal')
  })

  it('risk_score is capped at 100 even if every signal is critical', () => {
    const series = [...flatBaseline(7), day(7, { negativeRatio: 0.9, mentionVolume: 1000, avgRating: 1.0 })]
    const result = detectCrisis(series)
    expect(result.riskScore).toBeLessThanOrEqual(100)
  })

  it('every triggered signal carries measurable evidence text (FYP2.md §53)', () => {
    const series = [...flatBaseline(7), day(7, { negativeRatio: 0.6, mentionVolume: 400, avgRating: 2.5 })]
    const result = detectCrisis(series)
    for (const signal of result.triggeredSignals) {
      expect(typeof signal.evidence).toBe('string')
      expect(signal.evidence.length).toBeGreaterThan(0)
    }
  })

  it('detectedAt is a real, current ISO timestamp, not a fixed/fabricated value', () => {
    const before = Date.now()
    const result = detectCrisis(flatBaseline(3))
    const after = Date.now()
    const detectedAtMs = new Date(result.detectedAt).getTime()
    expect(detectedAtMs).toBeGreaterThanOrEqual(before)
    expect(detectedAtMs).toBeLessThanOrEqual(after)
  })
})
