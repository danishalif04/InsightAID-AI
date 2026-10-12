import { fetchDailyAggregates, fetchProcessedRows } from './socialDataService'
import { computeMentionVolumeSeries, computePlatformComparison, computeTrendingHashtags, selectTopPosts } from '@/utils/socialAnalytics'

/**
 * Influencer/follower tracking has no real backing anywhere in this project
 * (author_id_hash is deliberately anonymized, no follower count is ever
 * captured during ingestion) — the page renders that as a permanent
 * 'Unavailable' capability rather than pretending to fetch it.
 */
export async function getSocialIntelligenceData() {
  const [processedRows, dailyAggregateRows] = await Promise.all([
    fetchProcessedRows(),
    fetchDailyAggregates({ days: 30 }),
  ])

  return {
    platformComparison: computePlatformComparison(processedRows, dailyAggregateRows),
    mentionVolumeSeries: computeMentionVolumeSeries(dailyAggregateRows, 7),
    trendingHashtags: computeTrendingHashtags(processedRows, 10),
    posts: selectTopPosts(processedRows, 30),
  }
}
