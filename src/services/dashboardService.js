import { fetchDailyAggregates, fetchProcessedRows } from './socialDataService'
import { fetchRawSalesPayloads } from './salesService'
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
import { computeProductBreakdown, normalizeSalesRows } from '@/utils/salesSeries'
import { composeExecutiveSummary } from '@/utils/executiveSummary'

const TOP_BOTTOM_COUNT = 5

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
 * AI-written rationale/context, so there was never a reason to pay
 * for that network round-trip here; AiRecommendations.jsx and Reports
 * still get the full AI-explained version where it's actually shown.
 *
 * The foundational fetch (processed_data/daily_aggregates) is allowed to
 * throw — if that fails, the page shows a real error. Everything else is
 * isolated per FYP2.md §66: one piece failing degrades that widget to
 * "not available," never the whole dashboard.
 */
/**
 * `granularity`: 'day' (default) keeps this function's original windows
 * (30-day aggregate fetch, 14/7-day trend/volume slices). 'month' widens
 * the fetch and slice windows to a full year so the Dashboard's Day/Month
 * toggle has enough real history to bucket into calendar months
 * (src/utils/chartGranularity.js does the actual bucketing, in the page,
 * not here — this function only decides how much raw daily data to hand
 * back).
 */
export async function getDashboardData(mode, { granularity = 'day' } = {}) {
  const isMonthly = granularity === 'month'
  const [processedRows, dailyAggregateRows, context, forecastRun, salesPayloads] = await Promise.all([
    fetchProcessedRows(),
    fetchDailyAggregates({ days: isMonthly ? 365 : 30 }),
    buildContext(mode).catch(() => ({ mode, profile: { exists: false, values: {}, provenance: {} }, crisis: null, dataReadiness: null })),
    getLatestForecastRun().catch(() => ({ runId: null, rows: [] })),
    fetchRawSalesPayloads().catch(() => []),
  ])

  const { crisis } = context
  const sentimentScores = computeSentimentScores(dailyAggregateRows)
  const bestForecastRow = getBestRow(forecastRun.rows)
  const recommendations = generateRecommendations(context)

  // Ranked by revenue, highest first (computeProductBreakdown's own sort —
  // see salesSeries.js). Top/bottom N of the SAME list, not two separate
  // queries, so "low performing" never shows a product that doesn't also
  // have real sales rows. A business with <=2*N products naturally has the
  // two slices overlap; the page's empty/short-list handling covers that.
  const productBreakdown = computeProductBreakdown(normalizeSalesRows(salesPayloads))
  const topProducts = productBreakdown.slice(0, TOP_BOTTOM_COUNT)
  const bottomProducts = productBreakdown.slice(-TOP_BOTTOM_COUNT).reverse()

  return {
    sentimentScores,
    sentimentTrend: computeSentimentTrend(dailyAggregateRows, isMonthly ? 365 : 14),
    platformComparison: computePlatformComparison(processedRows, dailyAggregateRows),
    mentionVolumeSeries: computeMentionVolumeSeries(dailyAggregateRows, isMonthly ? 365 : 7),
    trendingHashtags: computeTrendingHashtags(processedRows, 6),
    topProducts,
    bottomProducts,
    crisis,
    bestForecastRow,
    recommendations: recommendations.slice(0, 3),
    executiveSummary: composeExecutiveSummary({ sentimentScores, crisis, bestForecastRow }),
  }
}
