import { describe, expect, it } from 'vitest'
import { aggregateDaily, computeReviewFeatures, computeTextFeatures } from './featureEngineering'

describe('computeTextFeatures', () => {
  it('computes length/token/hashtag/mention/punctuation counts', () => {
    const features = computeTextFeatures({
      cleanedText: 'Loving this #skincare from @brandname, so good!',
      language: 'en',
      hashtags: ['skincare'],
      mentions: ['brandname'],
      hasUrl: false,
      hasRepeatedChars: false,
    })
    expect(features.hashtagCount).toBe(1)
    expect(features.hashtags).toEqual(['skincare'])
    expect(features.mentionCount).toBe(1)
    expect(features.language).toBe('en')
    expect(features.tokenCount).toBeGreaterThan(0)
    expect(features.punctuationCount).toBeGreaterThan(0)
  })

  it('detects negation in English and Malay', () => {
    expect(computeTextFeatures({ cleanedText: 'This is not good', language: 'en' }).hasNegation).toBe(true)
    expect(computeTextFeatures({ cleanedText: 'Tak best langsung', language: 'ms' }).hasNegation).toBe(true)
    expect(computeTextFeatures({ cleanedText: 'This is great', language: 'en' }).hasNegation).toBe(false)
  })

  it('never fabricates a platform feature when none was given', () => {
    const features = computeTextFeatures({ cleanedText: 'hello' })
    expect('platform' in features).toBe(false)
  })

  it('handles an empty/missing row without throwing', () => {
    expect(() => computeTextFeatures({})).not.toThrow()
    expect(computeTextFeatures({}).textLength).toBe(0)
  })
})

describe('computeReviewFeatures', () => {
  it('only includes fields that are actually present', () => {
    expect(computeReviewFeatures({ rating: 5 })).toEqual({ rating: 5 })
    expect(computeReviewFeatures({})).toEqual({})
    expect(computeReviewFeatures({ rating: 4, product: 'Serum', category: 'Skincare' })).toEqual({
      rating: 4,
      product: 'Serum',
      category: 'Skincare',
    })
  })
})

describe('aggregateDaily', () => {
  it('groups rows by date/source/platform and computes comment volume', () => {
    const rows = [
      { collectedAt: '2026-01-01T10:00:00Z', source: 'reviews', platform: 'Shopee' },
      { collectedAt: '2026-01-01T12:00:00Z', source: 'reviews', platform: 'Shopee' },
      { collectedAt: '2026-01-02T10:00:00Z', source: 'reviews', platform: 'Shopee' },
    ]
    const result = aggregateDaily(rows)
    expect(result).toHaveLength(2)
    expect(result.find((r) => r.date === '2026-01-01').commentVolume).toBe(2)
    expect(result.find((r) => r.date === '2026-01-02').commentVolume).toBe(1)
  })

  it('computes avg rating sentiment and positive/negative ratios only from labelled rows', () => {
    const rows = [
      { collectedAt: '2026-01-01T10:00:00Z', source: 'reviews', sentiment: 'positive', sentimentScore: 1 },
      { collectedAt: '2026-01-01T11:00:00Z', source: 'reviews', sentiment: 'negative', sentimentScore: -1 },
      { collectedAt: '2026-01-01T12:00:00Z', source: 'reviews' }, // unlabelled
    ]
    const [result] = aggregateDaily(rows)
    expect(result.avgRatingSentiment).toBe(0) // (1 + -1) / 2
    expect(result.positiveRatio).toBe(0.5)
    expect(result.negativeRatio).toBe(0.5)
    expect(result.commentVolume).toBe(3) // the unlabelled row still counts toward volume
  })

  it('returns null (not 0) sentiment aggregates for a group with no labelled rows', () => {
    const rows = [{ collectedAt: '2026-01-01T10:00:00Z', source: 'social', platform: 'TikTok' }]
    const [result] = aggregateDaily(rows)
    expect(result.avgRatingSentiment).toBeNull()
    expect(result.positiveRatio).toBeNull()
    expect(result.negativeRatio).toBeNull()
  })

  it('sums engagement into mention volume only when engagement values exist', () => {
    const rows = [
      { collectedAt: '2026-01-01T10:00:00Z', source: 'social', platform: 'TikTok', engagement: 100 },
      { collectedAt: '2026-01-01T11:00:00Z', source: 'social', platform: 'TikTok', engagement: 50 },
    ]
    const [result] = aggregateDaily(rows)
    expect(result.mentionVolume).toBe(150)
  })

  it('skips rows with no collectedAt date rather than throwing or mis-grouping them', () => {
    const rows = [{ source: 'social' }]
    expect(aggregateDaily(rows)).toEqual([])
  })
})
