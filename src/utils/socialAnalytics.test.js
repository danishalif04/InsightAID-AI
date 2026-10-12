import { describe, expect, it } from 'vitest'
import {
  computeLanguageBreakdown,
  computeMentionVolumeSeries,
  computePlatformComparison,
  computeSentimentScores,
  computeSentimentTrend,
  computeTrendingHashtags,
  selectTopPosts,
} from './socialAnalytics'

function aggRow(date, overrides = {}) {
  return {
    date,
    source: 'social',
    platform: 'tiktok',
    mention_volume: 10,
    comment_volume: 5,
    avg_rating_sentiment: 0.2,
    positive_ratio: 0.6,
    negative_ratio: 0.1,
    ...overrides,
  }
}

describe('computeSentimentScores', () => {
  it('returns null when there is no ratio data at all', () => {
    expect(computeSentimentScores([])).toBeNull()
    expect(computeSentimentScores([aggRow('2026-01-01', { positive_ratio: null, negative_ratio: null })])).toBeNull()
  })

  it('computes positive/neutral/negative percentages from the latest day', () => {
    const scores = computeSentimentScores([aggRow('2026-01-01', { positive_ratio: 0.5, negative_ratio: 0.2 })])
    const positive = scores.find((s) => s.id === 'positive')
    const neutral = scores.find((s) => s.id === 'neutral')
    const negative = scores.find((s) => s.id === 'negative')
    expect(positive.value).toBe(50)
    expect(negative.value).toBe(20)
    expect(neutral.value).toBe(30)
  })

  it('computes delta versus ~7 days earlier', () => {
    const rows = [
      aggRow('2026-01-01', { positive_ratio: 0.4, negative_ratio: 0.1 }),
      ...Array.from({ length: 6 }, (_, i) => aggRow(`2026-01-0${i + 2}`, { positive_ratio: 0.4, negative_ratio: 0.1 })),
      aggRow('2026-01-08', { positive_ratio: 0.6, negative_ratio: 0.1 }),
    ]
    const scores = computeSentimentScores(rows)
    const positive = scores.find((s) => s.id === 'positive')
    expect(positive.value).toBe(60)
    expect(positive.delta).toBe(20)
  })

  it('collapses multiple platforms on the same day via comment-volume-weighted average', () => {
    const rows = [
      aggRow('2026-01-01', { platform: 'tiktok', positive_ratio: 0.8, negative_ratio: 0.0, comment_volume: 8 }),
      aggRow('2026-01-01', { platform: 'x', positive_ratio: 0.2, negative_ratio: 0.4, comment_volume: 2 }),
    ]
    const scores = computeSentimentScores(rows)
    // weighted: (0.8*8 + 0.2*2) / 10 = 0.68
    expect(scores.find((s) => s.id === 'positive').value).toBe(68)
  })
})

describe('computeSentimentTrend', () => {
  it('returns a chart-ready point per day with null gaps preserved', () => {
    const rows = [aggRow('2026-01-01'), aggRow('2026-01-02', { positive_ratio: null, negative_ratio: null })]
    const trend = computeSentimentTrend(rows, 14)
    expect(trend).toHaveLength(2)
    expect(trend[0].positive).toBe(60)
    expect(trend[1].positive).toBeNull()
    expect(trend[1].neutral).toBeNull()
  })

  it('limits to the requested number of most recent days', () => {
    const rows = Array.from({ length: 20 }, (_, i) => aggRow(`2026-01-${String(i + 1).padStart(2, '0')}`))
    expect(computeSentimentTrend(rows, 5)).toHaveLength(5)
  })
})

describe('computePlatformComparison', () => {
  it('returns an empty array when there is no data', () => {
    expect(computePlatformComparison([], [])).toEqual([])
  })

  it('computes mention volume, engagement, sentiment %, and top language per platform', () => {
    const processedRows = [
      { platform: 'tiktok', engagement: 100, sentiment_score: 1, language: 'ms' },
      { platform: 'tiktok', engagement: 50, sentiment_score: -1, language: 'ms' },
      { platform: 'tiktok', engagement: 70, sentiment_score: 0, language: 'en' },
    ]
    const dailyAggregateRows = [aggRow('2026-01-01', { platform: 'tiktok', mention_volume: 40 })]

    const result = computePlatformComparison(processedRows, dailyAggregateRows)
    const tiktok = result.find((p) => p.platform === 'tiktok')
    expect(tiktok.mentionVolume).toBe(40)
    expect(tiktok.avgEngagement).toBe(Math.round(((100 + 50 + 70) / 3) * 10) / 10)
    expect(tiktok.sentimentScorePercent).toBe(50) // avg score 0 -> (0+1)/2*100 = 50
    expect(tiktok.topLanguage).toBe('ms')
  })

  it('falls back to a real row count for mention volume when no daily_aggregates exist', () => {
    const processedRows = [{ platform: 'x' }, { platform: 'x' }, { platform: 'x' }]
    const result = computePlatformComparison(processedRows, [])
    expect(result.find((p) => p.platform === 'x').mentionVolume).toBe(3)
  })
})

describe('computeMentionVolumeSeries', () => {
  it('returns per-platform daily volumes for the requested window', () => {
    const rows = [
      aggRow('2026-01-01', { platform: 'tiktok', mention_volume: 20 }),
      aggRow('2026-01-01', { platform: 'x', mention_volume: 5 }),
      aggRow('2026-01-02', { platform: 'tiktok', mention_volume: 30 }),
    ]
    const series = computeMentionVolumeSeries(rows, 7)
    expect(series).toHaveLength(2)
    expect(series[0].tiktok).toBe(20)
    expect(series[0].x).toBe(5)
    expect(series[1].tiktok).toBe(30)
    expect(series[1].x).toBe(0) // platform present overall but not that day -> real 0, not omitted
  })
})

describe('computeTrendingHashtags', () => {
  it('counts real hashtags captured during ingestion and ranks by frequency', () => {
    const rows = [
      { features: { hashtags: ['skincare', 'glowup'] } },
      { features: { hashtags: ['skincare'] } },
      { features: {} }, // no hashtags array -> skipped, not treated as zero
      {},
    ]
    const result = computeTrendingHashtags(rows, 5)
    expect(result[0]).toEqual({ hashtag: 'skincare', mentions: 2 })
    expect(result.find((h) => h.hashtag === 'glowup').mentions).toBe(1)
  })

  it('respects the limit', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ features: { hashtags: [`tag${i}`] } }))
    expect(computeTrendingHashtags(rows, 3)).toHaveLength(3)
  })
})

describe('computeLanguageBreakdown', () => {
  it('returns an empty array for no input, never a fabricated 100% row', () => {
    expect(computeLanguageBreakdown([])).toEqual([])
  })

  it('computes real percentages and ignores null/undefined entries', () => {
    const result = computeLanguageBreakdown(['en', 'en', 'ms', null, undefined])
    const en = result.find((r) => r.code === 'en')
    const ms = result.find((r) => r.code === 'ms')
    expect(en.percent).toBeCloseTo(66.7, 1)
    expect(ms.percent).toBeCloseTo(33.3, 1)
  })

  it('sorts by percent descending', () => {
    const result = computeLanguageBreakdown(['zh', 'en', 'en', 'en'])
    expect(result[0].code).toBe('en')
  })
})

describe('selectTopPosts', () => {
  it('ranks real posts by engagement and preserves a null sentiment rather than guessing', () => {
    const rows = [
      { id: 1, cleaned_text: 'low engagement post', engagement: 5, sentiment: null },
      { id: 2, cleaned_text: 'high engagement post', engagement: 500, sentiment: 'positive' },
    ]
    const result = selectTopPosts(rows, 2)
    expect(result[0].id).toBe(2)
    expect(result[1].sentiment).toBeNull()
  })

  it('excludes rows with no text at all', () => {
    const rows = [{ id: 1, engagement: 100 }, { id: 2, cleaned_text: 'has text', engagement: 1 }]
    const result = selectTopPosts(rows, 5)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })
})
