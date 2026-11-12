/**
 * Response-time measurement for the Objective 3 acceptance criterion
 * ("response under 3 seconds"), so that the target is reported from a
 * measurement rather than asserted.
 *
 * Scope, stated honestly because the dissertation cites this file:
 * this measures the PURE COMPUTATION the analytics layer performs to turn a
 * prepared dataset into the figures shown on screen - crisis detection, the
 * social-analytics series behind the sentiment page, and the recommendation
 * rules. It excludes network latency, Supabase query time, React rendering
 * and the optional LLM rewording call. The number is therefore a floor on
 * the end-to-end response, not the end-to-end response itself, and Chapter 4
 * must say so.
 *
 * Run `npx vitest run src/utils/responseTime.test.js --reporter=verbose` to
 * print the per-stage table.
 */

import { describe, it, expect } from 'vitest'
import { performance } from 'node:perf_hooks'

import { detectCrisis } from '@/utils/crisisDetection'
import { generateRecommendations } from '@/utils/recommendationRules'
import {
  computeSentimentScores,
  computeSentimentTrend,
  computePlatformComparison,
  computeMentionVolumeSeries,
  computeTrendingHashtags,
} from '@/utils/socialAnalytics'

const RUNS = 30
const DAYS = 365
const POSTS = 2810
const PLATFORMS = ['shopee', 'tiktok', 'x', 'threads']
const TARGET_MS = 3000

// Deterministic generator: the same dataset every run, so the measurement is
// reproducible and a regression is a real regression, not a reshuffle.
let seed = 42
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

const dailyAggregates = Array.from({ length: DAYS }, (_, i) => ({
  date: new Date(Date.UTC(2024, 8, 1) + i * 86400000).toISOString().slice(0, 10),
  platform: PLATFORMS[i % PLATFORMS.length],
  mention_volume: Math.round(4 + rand() * 12),
  comment_volume: Math.round(2 + rand() * 8),
  negative_ratio: 0.1 + rand() * 0.3,
  positive_ratio: 0.5 + rand() * 0.3,
  avg_rating_sentiment: 3.4 + rand() * 1.2,
}))

const dailySeries = dailyAggregates.map((r) => ({
  date: r.date,
  negativeRatio: r.negative_ratio,
  mentionVolume: r.mention_volume,
  avgRating: r.avg_rating_sentiment,
}))

const processedRows = Array.from({ length: POSTS }, (_, i) => ({
  id: i,
  platform: PLATFORMS[i % PLATFORMS.length],
  published_at: dailyAggregates[i % DAYS].date,
  content: `demo post ${i} #skincare #glow #local`,
  language: ['en', 'ms', 'zh', 'mixed'][i % 4],
  sentiment_label: ['positive', 'neutral', 'negative'][i % 3],
  engagement: Math.round(rand() * 400),
  rating: 1 + Math.round(rand() * 4),
}))

const STAGES = {
  'Crisis detection (7 signals)': () => detectCrisis(dailySeries),
  'Sentiment scores': () => computeSentimentScores(dailyAggregates),
  'Sentiment trend (14 d)': () => computeSentimentTrend(dailyAggregates, 14),
  'Platform comparison': () => computePlatformComparison(processedRows, dailyAggregates),
  'Mention volume series': () => computeMentionVolumeSeries(dailyAggregates, 7),
  'Trending hashtags': () => computeTrendingHashtags(processedRows, 8),
  'Recommendation rules': () =>
    generateRecommendations({
      crisisLevel: 'warning',
      negativeRatio: 0.5,
      sentimentTrend: 'declining',
      dataPointCount: POSTS,
      revenueTarget: 50000,
      currentRevenue: 38000,
    }),
}

const percentile = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}

describe('dashboard computation response time', () => {
  it(`completes the full computation well under the ${TARGET_MS} ms target`, () => {
    const perRunTotals = new Array(RUNS).fill(0)
    const rows = []

    for (const [name, fn] of Object.entries(STAGES)) {
      fn() // warm-up: the first call pays one-off JIT cost a live page does not
      const times = []
      for (let r = 0; r < RUNS; r += 1) {
        const t0 = performance.now()
        fn()
        const dt = performance.now() - t0
        times.push(dt)
        perRunTotals[r] += dt
      }
      rows.push({
        stage: name,
        mean: times.reduce((a, b) => a + b, 0) / times.length,
        p95: percentile(times, 95),
      })
    }

    const mean = perRunTotals.reduce((a, b) => a + b, 0) / RUNS
    const p95 = percentile(perRunTotals, 95)

    const table = rows
      .map((r) => `  ${r.stage.padEnd(30)} mean ${r.mean.toFixed(2).padStart(8)} ms   p95 ${r.p95.toFixed(2).padStart(8)} ms`)
      .join('\n')
    console.log(
      `\nResponse-time measurement (${RUNS} runs, ${POSTS} posts, ${DAYS} days)\n${table}\n` +
        `  ${'TOTAL'.padEnd(30)} mean ${mean.toFixed(2).padStart(8)} ms   p95 ${p95.toFixed(2).padStart(8)} ms\n` +
        `  Target < ${TARGET_MS} ms: ${mean < TARGET_MS ? 'met' : 'NOT met'} (computation only).\n`,
    )

    expect(mean).toBeLessThan(TARGET_MS)
    expect(p95).toBeLessThan(TARGET_MS)
  })
})
