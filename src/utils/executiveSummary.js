/**
 * Composes the Dashboard/Reports "executive summary" text deterministically
 * from real, already-computed values (FYP2.md §40/§61 — "all values must
 * come from actual system outputs"). No Gemini call here: this is plain
 * sentence assembly from numbers that already exist, not something that
 * needs an LLM to phrase, and keeping it deterministic means it's fully
 * unit-testable and never varies for the same inputs.
 */

function capitalize(word) {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * @param {object} params
 * @param {Array|null} [params.sentimentScores] result of socialAnalytics.js's computeSentimentScores()
 * @param {object|null} [params.crisis] result of crisisDetection.js's detectCrisis()
 * @param {object|null} [params.bestForecastRow] the is_best row from forecastResultsService.getLatestForecastRun()
 */
export function composeExecutiveSummary({ sentimentScores = null, crisis = null, bestForecastRow = null } = {}) {
  const parts = []

  const positive = sentimentScores?.find((score) => score.id === 'positive')
  if (positive?.value != null) {
    const deltaText = positive.delta != null ? ` (${positive.delta >= 0 ? '+' : ''}${positive.delta} pts vs. last week)` : ''
    parts.push(`Sentiment is ${positive.value}% positive${deltaText}.`)
  }

  if (crisis?.dataSufficient) {
    parts.push(`Crisis risk is ${crisis.riskLevel} (score ${crisis.riskScore}/100).`)
  } else if (crisis) {
    parts.push('Crisis risk could not be fully assessed yet — not enough history.')
  }

  if (bestForecastRow) {
    const lastPoint = bestForecastRow.forecast_points?.[bestForecastRow.forecast_points.length - 1]
    const revenueText = lastPoint?.predicted != null ? ` of RM${Math.round(lastPoint.predicted).toLocaleString()}` : ''
    const modelLabel = capitalize((bestForecastRow.model_type ?? '').replace(/_/g, ' '))
    parts.push(`${modelLabel} projects revenue${revenueText} by the end of the ${bestForecastRow.horizon_days}-day forecast horizon.`)
  }

  if (parts.length === 0) {
    return 'Not enough data yet to generate an executive summary — upload sales, review, or social data to get started.'
  }
  return parts.join(' ')
}
