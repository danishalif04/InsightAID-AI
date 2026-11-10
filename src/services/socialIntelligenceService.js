import { fetchDailyAggregates, fetchProcessedRows } from './socialDataService'
import { computeMentionVolumeSeries, computePlatformComparison, computeTrendingHashtags, selectTopPosts } from '@/utils/socialAnalytics'

/**
 * Influencer/follower tracking has no real backing anywhere in this project
 * (author_id_hash is deliberately anonymized, no follower count is ever
 * captured during ingestion) — the page renders that as a permanent
 * 'Unavailable' capability rather than pretending to fetch it.
 */
/** `granularity`: 'month' widens the fetch/slice window to a year so the
 * mention-volume chart's Day/Month toggle has real history to bucket. */
export async function getSocialIntelligenceData({ granularity = 'day' } = {}) {
  const isMonthly = granularity === 'month'
  const [processedRows, dailyAggregateRows] = await Promise.all([
    fetchProcessedRows(),
    fetchDailyAggregates({ days: isMonthly ? 365 : 30 }),
  ])

  return {
    platformComparison: computePlatformComparison(processedRows, dailyAggregateRows),
    mentionVolumeSeries: computeMentionVolumeSeries(dailyAggregateRows, isMonthly ? 365 : 7),
    trendingHashtags: computeTrendingHashtags(processedRows, 10),
    posts: selectTopPosts(processedRows, 30),
  }
}
