/**
 * Model Performance page computations (FYP2.md §72). Pure functions only —
 * every value comes from real rows the caller fetched from `model_versions`
 * (Phase 6) or `forecast_results` (Phase 7); nothing here invents a metric.
 * Where no real run exists, callers get `null`/empty and must render "Not
 * yet evaluated" — never a fabricated number (§72: "Never fabricate metrics").
 */

/** One row per (model_type, eval_path) — the most recently trained. Multiple
 * training runs for the same model/path collapse to the latest only. */
export function latestPerModelVariant(modelVersions = []) {
  const map = new Map()
  for (const row of modelVersions) {
    const key = `${row.model_type}|${row.eval_path}`
    const existing = map.get(key)
    if (!existing || new Date(row.trained_at) > new Date(existing.trained_at)) map.set(key, row)
  }
  return [...map.values()].sort((a, b) => a.model_type.localeCompare(b.model_type) || a.eval_path.localeCompare(b.eval_path))
}

function percentImprovement(baseline, enhanced) {
  if (baseline == null || enhanced == null || baseline === 0) return null
  return Math.round(((baseline - enhanced) / baseline) * 1000) / 10
}

/** Baseline = Prophet sales_only, Enhanced = Prophet sentiment_enhanced —
 * the one pair FYP2.md §50's Model A/B split actually applies to. Returns
 * null when neither exists yet (no forecasting run has happened). */
export function summarizeForecastComparison(forecastRows = []) {
  const baseline = forecastRows.find((r) => r.model_type === 'prophet' && r.variant === 'sales_only')
  const enhanced = forecastRows.find((r) => r.model_type === 'prophet' && r.variant === 'sentiment_enhanced')
  if (!baseline && !enhanced) return null

  return {
    baseline,
    enhanced,
    maeImprovementPercent: percentImprovement(baseline?.mae, enhanced?.mae),
    rmseImprovementPercent: percentImprovement(baseline?.rmse, enhanced?.rmse),
    mapeImprovementPercent: percentImprovement(baseline?.mape, enhanced?.mape),
  }
}

/** Real counts from real crisis_events history — never "validated" or
 * "correct" counts, since no manually-labelled crisis ground truth exists
 * anywhere in this project (that would need a human reviewing each alert
 * after the fact, a workflow that isn't built). */
export function summarizeCrisisPerformance(crisisHistory = []) {
  return {
    totalAlerts: crisisHistory.length,
    warningAlerts: crisisHistory.filter((e) => e.risk_level === 'warning').length,
    criticalAlerts: crisisHistory.filter((e) => e.risk_level === 'critical').length,
  }
}
