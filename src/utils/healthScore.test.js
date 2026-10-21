import { describe, expect, it } from 'vitest'
import { computeEngagementTrend, computeHealthScore, computeRevenueMomentum } from './healthScore'

describe('computeRevenueMomentum', () => {
  function series(revenues) {
    return revenues.map((revenue, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      revenue,
    }))
  }

  it('returns null without at least 2 full windows', () => {
    expect(computeRevenueMomentum(series([10, 20, 30]), 7)).toBeNull()
  })

  it('returns 50 (centered) for flat revenue', () => {
    expect(computeRevenueMomentum(series(Array(14).fill(100)), 7)).toBe(50)
  })

  it('returns a higher score for revenue that doubled', () => {
    const flat7 = Array(7).fill(100)
    const doubled7 = Array(7).fill(200)
    expect(computeRevenueMomentum(series([...flat7, ...doubled7]), 7)).toBe(100) // +100% change, clamped at 100
  })

  it('returns a lower score for revenue that collapsed', () => {
    const flat7 = Array(7).fill(100)
    const collapsed7 = Array(7).fill(0)
    expect(computeRevenueMomentum(series([...flat7, ...collapsed7]), 7)).toBe(0)
  })

  it('returns null when the prior window average is 0 (would divide by zero)', () => {
    expect(
      computeRevenueMomentum(series([...Array(7).fill(0), ...Array(7).fill(50)]), 7)
    ).toBeNull()
  })
})

describe('computeEngagementTrend', () => {
  function series(counts) {
    return counts.map((count, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      tiktok: count,
    }))
  }

  it('returns null with too little history', () => {
    expect(computeEngagementTrend(series([1, 2]), ['tiktok'], 7)).toBeNull()
  })

  it('sums across multiple platforms', () => {
    const rows = Array(14)
      .fill(null)
      .map((_, i) => ({ date: `d${i}`, tiktok: 10, x: 10 }))
    expect(computeEngagementTrend(rows, ['tiktok', 'x'], 7)).toBe(50) // flat -> centered
  })
})

describe('computeHealthScore', () => {
  it('reports every missing input by name when none are available', () => {
    const result = computeHealthScore({
      sentimentScore: null,
      crisisRiskScore: null,
      crisisDataSufficient: false,
      revenueMomentumScore: null,
      engagementTrendScore: null,
    })
    expect(result.score).toBeNull()
    expect(result.missingInputs.sort()).toEqual([
      'crisisRisk',
      'engagementTrend',
      'revenueMomentum',
      'sentiment',
    ])
  })

  it('treats a crisis riskScore with dataSufficient=false as missing, not a real "no risk"', () => {
    const result = computeHealthScore({
      sentimentScore: 80,
      crisisRiskScore: 0,
      crisisDataSufficient: false,
      revenueMomentumScore: 60,
      engagementTrendScore: 60,
    })
    expect(result.missingInputs).toContain('crisisRisk')
    expect(result.subScores.crisisRisk).toBeNull()
  })

  it('computes a weighted score from whatever inputs are available, renormalized', () => {
    const result = computeHealthScore({
      sentimentScore: 100,
      crisisRiskScore: 0,
      crisisDataSufficient: true, // crisisRisk sub-score = 100
      revenueMomentumScore: null,
      engagementTrendScore: null,
    })
    // only sentiment (0.3) and crisisRisk (0.3) available, both scored 100 -> renormalized average = 100
    expect(result.score).toBe(100)
    expect(result.missingInputs.sort()).toEqual(['engagementTrend', 'revenueMomentum'])
  })

  it('a worse crisis score pulls the overall score down', () => {
    const good = computeHealthScore({
      sentimentScore: 80,
      crisisRiskScore: 0,
      crisisDataSufficient: true,
      revenueMomentumScore: 80,
      engagementTrendScore: 80,
    })
    const bad = computeHealthScore({
      sentimentScore: 80,
      crisisRiskScore: 100,
      crisisDataSufficient: true,
      revenueMomentumScore: 80,
      engagementTrendScore: 80,
    })
    expect(bad.score).toBeLessThan(good.score)
  })
})
