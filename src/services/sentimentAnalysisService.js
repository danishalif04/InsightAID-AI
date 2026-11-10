import { fetchDailyAggregates, fetchProcessedRows } from './socialDataService'
import {
  computeSentimentScoresSeries,
  computeSentimentTrend,
  computeTrendingHashtagsByDate,
  selectTopPosts,
} from '@/utils/socialAnalytics'

/**
 * Emotion breakdown and region/geo sentiment have no real backing anywhere
 * in this project (no emotion classifier beyond 3-class sentiment, no
 * location ever captured during ingestion — see docs/CRISIS_AND_RECOMMENDATIONS.md-
 * style honesty applied here too) — the page renders those as a permanent
 * 'Unavailable' capability, not as empty data, so this service doesn't
 * pretend to fetch them.
 */
/**
 * `granularity`: 'day' (default) keeps the original 14-day fetch / 7-day
 * trend window. 'month' widens the trend chart's own fetch/slice to a
 * full year so the page's Day/Month toggle has real history to bucket
 * into calendar months — the "viewing day" score-card picker below
 * (sentimentScoresSeries) is untouched either way, always 7 real days.
 */
export async function getSentimentAnalysisData({ granularity = 'day' } = {}) {
  const isMonthly = granularity === 'month'
  const [processedRows, dailyAggregateRows] = await Promise.all([
    fetchProcessedRows(),
    fetchDailyAggregates({ days: isMonthly ? 365 : 14 }),
  ])

  return {
    // One entry per day of the same 7-day window the trend chart shows,
    // so a "pick a day" control can track it exactly — see
    // computeSentimentScoresSeries's own doc comment. Defaults to the last
    // entry (today) for display, same as the old single-day shape did.
    sentimentScoresSeries: computeSentimentScoresSeries(dailyAggregateRows, 7),
    sentimentTrend: computeSentimentTrend(dailyAggregateRows, isMonthly ? 365 : 7),
    // Keyed by the exact same date strings as sentimentScoresSeries — the
    // page looks up `trendingHashtagsByDate[activeDay.date] ?? []`, so
    // "today's hashtags" tracks the picked day exactly like the score cards do.
    trendingHashtagsByDate: computeTrendingHashtagsByDate(processedRows, 10),
    posts: selectTopPosts(processedRows, 30),
  }
}
