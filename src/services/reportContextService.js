import { buildContext as buildRecommendationContext, getRecommendationsFromContext } from './recommendationService'
import { getCrisisHistory } from './crisisService'
import { getBestRow, getLatestForecastRun } from './forecastResultsService'
import { fetchDailyAggregates, fetchProcessedRows } from './socialDataService'
import {
  computePlatformComparison,
  computeSentimentScores,
  computeSentimentTrend,
  computeTrendingHashtags,
  selectTopPosts,
} from '@/utils/socialAnalytics'
import { buildAllScenarios, calculateBreakEven } from '@/utils/scenarioEngine'

/**
 * Assembles everything report generation needs, once, by reusing every
 * already-built real service from Phases 3-10 (profile, data readiness,
 * crisis, forecast, recommendations, sentiment/social analytics, scenario
 * engine) — nothing here recomputes what already exists. The
 * (src/utils/reportBuilders.js) builders then pick the pieces each report
 * type actually needs.
 *
 * Performance note: buildRecommendationContext() (profile + crisis
 * detection + data-readiness counts, ~9 queries) used to run a second time
 * inside getRecommendations(mode) too. Fixed by building it once and
 * passing it to getRecommendationsFromContext() instead.
 */
export async function getReportContext(mode) {
  const [recContext, dailyAggregateRows, processedRows, crisisHistory, forecastRun] = await Promise.all([
    buildRecommendationContext(mode),
    fetchDailyAggregates({ days: 30 }),
    fetchProcessedRows(),
    getCrisisHistory(10).catch(() => []),
    getLatestForecastRun().catch(() => ({ runId: null, rows: [] })),
  ])

  const recommendationsResult = await getRecommendationsFromContext(recContext).catch(() => ({ recommendations: [], businessContext: [] }))

  const assumptions = recContext.profile.values

  return {
    mode,
    profile: recContext.profile,
    dataReadiness: recContext.dataReadiness,
    crisis: recContext.crisis,
    crisisHistory,
    sentimentScores: computeSentimentScores(dailyAggregateRows),
    sentimentTrend: computeSentimentTrend(dailyAggregateRows, 14),
    platformComparison: computePlatformComparison(processedRows, dailyAggregateRows),
    trendingHashtags: computeTrendingHashtags(processedRows, 8),
    topPosts: selectTopPosts(processedRows, 10),
    forecastRows: forecastRun.rows,
    bestForecastRow: getBestRow(forecastRun.rows),
    scenarios: buildAllScenarios(assumptions),
    breakEven: calculateBreakEven(assumptions),
    recommendations: recommendationsResult.recommendations,
    businessContextFactors: recommendationsResult.businessContext,
  }
}
