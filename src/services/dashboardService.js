import { fetchDailyAggregates, fetchProcessedRows } from './socialDataService'
import { buildContext } from './recommendationService'
import { getBestRow, getLatestForecastRun } from './forecastResultsService'
import { generateRecommendations } from '@/utils/recommendationRules'
import {
  computeMentionVolumeSeries,
  computePlatformComparison,
  computeSentimentScores,
  computeSentimentTrend,
  computeTrendingHashtags,
} from '@/utils/socialAnalytics'
import { composeExecutiveSummary } from '@/utils/executiveSummary'

/**
 * Assembles the whole Dashboard page's data in one pass.
 *
 * Performance note (fixed after real-world testing showed slow loads):
 * this used to call runCrisisDetection() directly AND call
 * getRecommendations(mode), which internally re-ran crisis detection AND
 * re-fetched the business profile a second time via its own
 * buildContext() — roughly double the real Supabase round-trips this page
 * actually needed, across two sequential batches instead of one. Fixed by
 * calling buildContext() exactly once (it already includes crisis +
 * profile + data readiness) and deriving recommendations straight from
 * the pure rule engine (generateRecommendations()) instead of
 * getRecommendations() — Dashboard's "Latest AI Recommendations" widget
 * only ever renders title/category/priority/evidence[0], never the
 * Gemini-written rationale/context, so there was never a reason to pay
 * for that network round-trip here; AiRecommendations.jsx and Reports
 * still get the full Gemini-explained version where it's actually shown.
 *
 * The foundational fetch (processed_data/daily_aggregates) is allowed to
 * throw — if that fails, the page shows a real error. Everything else is
 * isolated per FYP2.md §66: one piece failing degrades that widget to
 * "not available," never the whole dashboard.
 */
export async function getDashboardData(mode) {
  const [processedRows, dailyAggregateRows, context, forecastRun] = await Promise.all([
    fetchProcessedRows(),
    fetchDailyAggregates({ days: 30 }),
    buildContext(mode).catch(() => ({ mode, profile: { exists: false, values: {}, provenance: {} }, crisis: null, dataReadiness: null })),
    getLatestForecastRun().catch(() => ({ runId: null, rows: [] })),
  ])

  const { crisis } = context
  const sentimentScores = computeSentimentScores(dailyAggregateRows)
  const bestForecastRow = getBestRow(forecastRun.rows)
  const recommendations = generateRecommendations(context)

  return {
    sentimentScores,
    sentimentTrend: computeSentimentTrend(dailyAggregateRows, 14),
    platformComparison: computePlatformComparison(processedRows, dailyAggregateRows),
    mentionVolumeSeries: computeMentionVolumeSeries(dailyAggregateRows, 7),
    trendingHashtags: computeTrendingHashtags(processedRows, 6),
    crisis,
    bestForecastRow,
    recommendations: recommendations.slice(0, 3),
    executiveSummary: composeExecutiveSummary({ sentimentScores, crisis, bestForecastRow }),
  }
}
