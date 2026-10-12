import { fetchDailyAggregates, fetchProcessedRows } from './socialDataService'
import { computeSentimentScores, computeSentimentTrend, computeTrendingHashtags, selectTopPosts } from '@/utils/socialAnalytics'

/**
 * Emotion breakdown and region/geo sentiment have no real backing anywhere
 * in this project (no emotion classifier beyond 3-class sentiment, no
 * location ever captured during ingestion — see docs/CRISIS_AND_RECOMMENDATIONS.md-
 * style honesty applied here too) — the page renders those as a permanent
 * 'Unavailable' capability, not as empty data, so this service doesn't
 * pretend to fetch them.
 */
export async function getSentimentAnalysisData() {
  const [processedRows, dailyAggregateRows] = await Promise.all([
    fetchProcessedRows(),
    fetchDailyAggregates({ days: 14 }),
  ])

  return {
    sentimentScores: computeSentimentScores(dailyAggregateRows),
    sentimentTrend: computeSentimentTrend(dailyAggregateRows, 7),
    trendingHashtags: computeTrendingHashtags(processedRows, 10),
    posts: selectTopPosts(processedRows, 30),
  }
}
