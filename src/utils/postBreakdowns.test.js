import { describe, expect, it } from 'vitest'
import {
  CONFIDENCE_BANDS,
  computeConfidenceDistribution,
  computeEngagementBySentiment,
  computeLanguageSentiment,
} from './postBreakdowns'

const post = (over = {}) => ({
  id: Math.random().toString(36).slice(2),
  language: 'en',
  platform: 'x',
  sentiment: 'positive',
  sentimentConfidence: 0.9,
  engagement: 100,
  ...over,
})

describe('computeConfidenceDistribution', () => {
  it('returns zeroed bands for no posts rather than throwing', () => {
    const r = computeConfidenceDistribution([])
    expect(r.scored).toBe(0)
    expect(r.meanConfidence).toBeNull()
    expect(r.lowShare).toBeNull()
    expect(r.bands).toHaveLength(CONFIDENCE_BANDS.length)
    expect(r.bands.every((b) => b.count === 0)).toBe(true)
  })

  it('buckets by band and shares sum to 100', () => {
    const r = computeConfidenceDistribution([
      post({ sentimentConfidence: 0.4 }),
      post({ sentimentConfidence: 0.7 }),
      post({ sentimentConfidence: 0.8 }),
      post({ sentimentConfidence: 0.95 }),
    ])
    expect(r.scored).toBe(4)
    expect(r.bands.map((b) => b.count)).toEqual([1, 1, 1, 1])
    expect(r.bands.reduce((s, b) => s + b.sharePct, 0)).toBeCloseTo(100, 1)
  })

  it('counts a missing confidence as missing, NOT as low', () => {
    const r = computeConfidenceDistribution([
      post({ sentimentConfidence: null }),
      post({ sentimentConfidence: undefined }),
      post({ sentimentConfidence: 0.95 }),
    ])
    expect(r.missing).toBe(2)
    expect(r.scored).toBe(1)
    expect(r.bands.find((b) => b.id === 'low').count).toBe(0)
  })

  it('places boundary values in the upper band', () => {
    const r = computeConfidenceDistribution([post({ sentimentConfidence: 0.6 }), post({ sentimentConfidence: 0.9 })])
    expect(r.bands.find((b) => b.id === 'low').count).toBe(0)
    expect(r.bands.find((b) => b.id === 'fair').count).toBe(1)
    expect(r.bands.find((b) => b.id === 'high').count).toBe(1)
  })

  it('reports the share below 60%', () => {
    const r = computeConfidenceDistribution([
      post({ sentimentConfidence: 0.2 }),
      post({ sentimentConfidence: 0.3 }),
      post({ sentimentConfidence: 0.99 }),
      post({ sentimentConfidence: 0.99 }),
    ])
    expect(r.lowShare).toBe(50)
  })

  it('ignores a non-numeric confidence instead of coercing it', () => {
    const r = computeConfidenceDistribution([post({ sentimentConfidence: '0.9' }), post({ sentimentConfidence: NaN })])
    expect(r.scored).toBe(0)
    expect(r.missing).toBe(2)
  })
})

describe('computeLanguageSentiment', () => {
  it('returns an empty list for no posts', () => {
    expect(computeLanguageSentiment([])).toEqual([])
  })

  it('groups by language and orders by volume', () => {
    const rows = computeLanguageSentiment([
      post({ language: 'ms' }),
      post({ language: 'en' }),
      post({ language: 'en' }),
      post({ language: 'en' }),
      post({ language: 'zh' }),
      post({ language: 'zh' }),
    ])
    expect(rows.map((r) => r.language)).toEqual(['en', 'zh', 'ms'])
    expect(rows[0].total).toBe(3)
  })

  it('splits sentiment and computes percentages over RATED posts only', () => {
    const rows = computeLanguageSentiment([
      post({ language: 'en', sentiment: 'positive' }),
      post({ language: 'en', sentiment: 'negative' }),
      post({ language: 'en', sentiment: null }),
    ])
    const en = rows[0]
    expect(en.total).toBe(3)
    expect(en.rated).toBe(2)
    expect(en.unrated).toBe(1)
    expect(en.positivePct).toBe(50)
    expect(en.negativePct).toBe(50)
  })

  it('does not treat an unrated post as neutral', () => {
    const rows = computeLanguageSentiment([post({ sentiment: undefined })])
    expect(rows[0].neutral).toBe(0)
    expect(rows[0].unrated).toBe(1)
    expect(rows[0].neutralPct).toBe(0)
  })

  it('falls back to "unknown" for a missing language', () => {
    const rows = computeLanguageSentiment([post({ language: null })])
    expect(rows[0].language).toBe('unknown')
  })

  it('uses supplied display labels', () => {
    const rows = computeLanguageSentiment([post({ language: 'ms' })], { ms: 'Bahasa Melayu' })
    expect(rows[0].label).toBe('Bahasa Melayu')
  })
})

describe('computeEngagementBySentiment', () => {
  it('returns zeroed groups and a null ratio for no posts', () => {
    const r = computeEngagementBySentiment([])
    expect(r.rated).toBe(0)
    expect(r.negativeToPositiveRatio).toBeNull()
    expect(r.groups.map((g) => g.sentiment)).toEqual(['positive', 'neutral', 'negative'])
  })

  it('computes mean and median per sentiment', () => {
    const r = computeEngagementBySentiment([
      post({ sentiment: 'positive', engagement: 10 }),
      post({ sentiment: 'positive', engagement: 20 }),
      post({ sentiment: 'positive', engagement: 30 }),
    ])
    const pos = r.groups.find((g) => g.sentiment === 'positive')
    expect(pos.mean).toBe(20)
    expect(pos.median).toBe(20)
  })

  it('reports a median that resists one viral outlier', () => {
    const r = computeEngagementBySentiment([
      post({ sentiment: 'negative', engagement: 10 }),
      post({ sentiment: 'negative', engagement: 10 }),
      post({ sentiment: 'negative', engagement: 100000 }),
    ])
    const neg = r.groups.find((g) => g.sentiment === 'negative')
    expect(neg.median).toBe(10)
    expect(neg.mean).toBeGreaterThan(30000)
  })

  it('computes the negative-to-positive ratio', () => {
    const r = computeEngagementBySentiment([
      post({ sentiment: 'positive', engagement: 100 }),
      post({ sentiment: 'negative', engagement: 250 }),
    ])
    expect(r.negativeToPositiveRatio).toBe(2.5)
  })

  it('returns null rather than Infinity when positives have no engagement', () => {
    const r = computeEngagementBySentiment([
      post({ sentiment: 'positive', engagement: 0 }),
      post({ sentiment: 'negative', engagement: 40 }),
    ])
    expect(r.negativeToPositiveRatio).toBeNull()
  })

  it('returns null when one side has no posts at all', () => {
    const r = computeEngagementBySentiment([post({ sentiment: 'negative', engagement: 40 })])
    expect(r.negativeToPositiveRatio).toBeNull()
  })

  it('ignores posts with no sentiment or no engagement number', () => {
    const r = computeEngagementBySentiment([
      post({ sentiment: null, engagement: 50 }),
      post({ sentiment: 'positive', engagement: null }),
      post({ sentiment: 'positive', engagement: 10 }),
    ])
    expect(r.rated).toBe(1)
  })

  it('never throws on malformed input', () => {
    for (const input of [null, undefined, 'nope', [null, undefined, {}]]) {
      expect(() => computeEngagementBySentiment(input)).not.toThrow()
      expect(() => computeLanguageSentiment(input)).not.toThrow()
      expect(() => computeConfidenceDistribution(input)).not.toThrow()
    }
  })
})
