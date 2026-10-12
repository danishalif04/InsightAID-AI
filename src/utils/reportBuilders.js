/**
 * Report generation (FYP2.md §69-70) — pure functions only. Every value
 * placed in a section comes from the `context` object the caller
 * assembled from real services (src/services/reportContextService.js);
 * nothing here computes anything new or invents a number. Each data point
 * is explicitly tagged ACTUAL or SCENARIO/ESTIMATED (§69's own required
 * distinction) by which array it lives in — `actual` or `scenario` — never
 * mixed in one undifferentiated list.
 */

import { composeExecutiveSummary } from './executiveSummary'

function point(label, value) {
  return { label, value }
}

function section(id, title, { actual = [], scenario = [], narrative = null, note = null } = {}) {
  return { id, title, actual, scenario, narrative, note }
}

/** Splits business_profiles/business_assumptions values by provenance:
 * user-provided and AI-extracted-from-the-user's-own-description count as
 * ACTUAL (they trace back to something the user actually said); a
 * documented default the user never touched is SCENARIO/ESTIMATED — it's a
 * filled-in guess, not a fact. Fields with no provenance entry at all are
 * skipped (never rendered as either). */
function splitByProvenance(values = {}, provenance = {}) {
  const actual = []
  const scenario = []
  for (const [field, value] of Object.entries(values)) {
    if (value == null || value === '') continue
    const source = provenance[field]
    const displayValue = Array.isArray(value) ? value.join(', ') : value
    if (source === 'default_assumption') scenario.push(point(field, displayValue))
    else if (source === 'user_provided' || source === 'ai_extracted') actual.push(point(field, displayValue))
    // else: no provenance recorded for this field -> skip rather than guess which bucket it belongs in
  }
  return { actual, scenario }
}

function executiveSummarySection(context) {
  const text = composeExecutiveSummary({
    sentimentScores: context.sentimentScores,
    crisis: context.crisis,
    bestForecastRow: context.bestForecastRow,
  })
  return section('executive_summary', 'Executive Summary', { narrative: text })
}

function businessProfileSection(context) {
  const { actual, scenario } = splitByProvenance(context.profile.values, context.profile.provenance)
  return section('business_profile', 'Business Profile', {
    actual,
    scenario,
    note: !context.profile.exists ? 'No business profile has been saved yet.' : null,
  })
}

function dataAvailabilitySection(context) {
  const readiness = context.dataReadiness
  return section('data_availability', 'Data Availability', {
    actual: [
      point('Readiness level', `${readiness.level}/5 (${readiness.levelLabel})`),
      ...readiness.checklist.map((item) => point(item.label, item.met ? 'Available' : 'Not yet available')),
    ],
  })
}

function businessPerformanceSection(context) {
  const actual = []
  const positive = context.sentimentScores?.find((s) => s.id === 'positive')
  if (positive?.value != null) actual.push(point('Positive sentiment', `${positive.value}%`))
  if (context.crisis) {
    actual.push(point('Crisis risk level', context.crisis.riskLevel))
    actual.push(point('Crisis risk score', `${context.crisis.riskScore}/100`))
  }
  if (context.bestForecastRow) {
    actual.push(point('Best forecast model', context.bestForecastRow.model_type))
    if (context.bestForecastRow.mape != null) actual.push(point('Forecast model MAPE (backtested)', `${context.bestForecastRow.mape}%`))
  }
  return section('business_performance', 'Current Business Performance', {
    actual,
    note: actual.length === 0 ? 'Not enough data yet to summarize current performance.' : null,
  })
}

function customerSentimentSection(context) {
  const actual = (context.sentimentScores ?? []).map((s) => point(s.label, s.value != null ? `${s.value}%` : 'No data'))
  for (const hashtag of context.trendingHashtags ?? []) actual.push(point(`#${hashtag.hashtag}`, `${hashtag.mentions} mentions`))
  return section('customer_sentiment', 'Customer Sentiment', {
    actual,
    note: actual.length === 0 ? 'No sentiment data yet.' : null,
  })
}

function salesForecastSection(context) {
  const row = context.bestForecastRow
  if (!row) {
    return section('sales_forecast', 'Sales/Demand Forecast', { note: 'No forecasting run has produced a result yet.' })
  }

  const actual = [
    point('Model', row.model_type),
    point('Variant', row.variant),
    point('MAE (backtested)', row.mae),
    point('RMSE (backtested)', row.rmse),
    point('MAPE (backtested)', row.mape != null ? `${row.mape}%` : 'undefined'),
  ]
  const scenario = (row.forecast_points ?? []).map((p) => point(p.date, p.predicted != null ? `RM${Math.round(p.predicted).toLocaleString()}` : 'n/a'))

  return section('sales_forecast', 'Sales/Demand Forecast', {
    actual,
    scenario,
    note: 'MAE/RMSE/MAPE above measure the model\'s accuracy on past, already-known data. The dated figures are future projections — estimates, not facts.',
  })
}

function scenarioAnalysisSection(context) {
  const scenario = []
  for (const caseType of ['conservative', 'expected', 'growth']) {
    const s = context.scenarios?.[caseType]
    if (!s) continue
    if (s.revenue != null) scenario.push(point(`${caseType} revenue`, `RM${s.revenue.toLocaleString()}`))
    if (s.units != null) scenario.push(point(`${caseType} units`, s.units))
  }
  if (context.breakEven && !context.breakEven.insufficient) {
    scenario.push(point('Break-even units', context.breakEven.units))
    scenario.push(point('Break-even revenue', `RM${context.breakEven.revenue.toLocaleString()}`))
  }
  return section('scenario_analysis', 'Scenario Analysis', {
    scenario,
    note:
      scenario.length === 0
        ? 'Not enough business assumptions saved yet to compute scenario projections.'
        : 'These projections are scenario-based estimates using your assumptions, not historical-data forecasts.',
  })
}

function crisisRiskSection(context) {
  if (!context.crisis) {
    return section('crisis_risk', 'Crisis/Risk Indicators', { note: 'Crisis detection could not run — not enough data.' })
  }
  const actual = context.crisis.allSignals.map((signal) => point(signal.id.replace(/_/g, ' '), signal.evidence))
  return section('crisis_risk', 'Crisis/Risk Indicators', {
    actual,
    note: `Risk level: ${context.crisis.riskLevel} (score ${context.crisis.riskScore}/100).${context.crisis.dataSufficient ? '' : ' Based on limited data.'}`,
  })
}

function keyFindingsSection(context) {
  const findings = []
  const positive = context.sentimentScores?.find((s) => s.id === 'positive')
  if (positive?.value != null) findings.push(point('Sentiment', `${positive.value}% positive${positive.delta != null ? ` (${positive.delta >= 0 ? '+' : ''}${positive.delta} pts vs. last week)` : ''}`))
  if (context.crisis?.dataSufficient) findings.push(point('Crisis risk', `${context.crisis.riskLevel} (${context.crisis.riskScore}/100)`))
  if (context.bestForecastRow?.mape != null) findings.push(point('Forecast accuracy', `${context.bestForecastRow.model_type} model, ${context.bestForecastRow.mape}% MAPE`))
  if (context.recommendations?.length) findings.push(point('Open recommendations', `${context.recommendations.length} (${context.recommendations.filter((r) => r.priority === 'high').length} high priority)`))
  return section('key_findings', 'Key Findings', {
    actual: findings,
    note: findings.length === 0 ? 'Not enough data yet to generate key findings.' : null,
  })
}

function recommendationsSection(context) {
  const actual = (context.recommendations ?? []).map((rec) => point(`[${rec.priority}] ${rec.title}`, rec.evidence?.[0] ?? ''))
  return section('recommendations', 'Recommendations', {
    actual,
    note: actual.length === 0 ? 'No analytical conditions currently justify a recommendation.' : null,
  })
}

function dataImprovementsSection(context) {
  const unmet = (context.dataReadiness?.checklist ?? []).filter((item) => !item.met)
  return section('data_improvements', 'Required Data Improvements', {
    actual: unmet.map((item) => point(item.label, 'Not yet available')),
    note: unmet.length === 0 ? 'All tracked data categories currently have at least some data.' : null,
  })
}

const COMMON_LIMITATIONS = [
  'No sentiment model has been trained yet — sentiment for reviews with a star rating comes from a documented heuristic (rating_heuristic_v1), not a validated ML model. See docs/SENTIMENT_MODEL.md.',
  'Crisis risk thresholds are fixed defaults (src/config/crisisThresholds.js), not yet tuned per business.',
  'Recommendations are generated by a rule engine from real conditions; any narrative explanation is phrased by Gemini but never supplies its own numbers (FYP2.md §55).',
]

function assumptionsLimitationsSection(extra = []) {
  return section('assumptions_limitations', 'Assumptions and Limitations', {
    actual: [...COMMON_LIMITATIONS, ...extra].map((text, index) => point(`${index + 1}`, text)),
  })
}

function baseReport(type, title, context) {
  return { type, title, mode: context.mode, generatedAt: new Date().toISOString() }
}

export function buildBusinessHealthReport(context) {
  return {
    ...baseReport('business_health', 'Business Health Report', context),
    sections: [
      executiveSummarySection(context),
      businessProfileSection(context),
      dataAvailabilitySection(context),
      businessPerformanceSection(context),
      keyFindingsSection(context),
      recommendationsSection(context),
      assumptionsLimitationsSection(),
    ],
  }
}

export function buildEcommerceReport(context) {
  const actual = (context.platformComparison ?? []).flatMap((p) => [
    point(`${p.platform} mentions`, p.mentionVolume),
    point(`${p.platform} avg. engagement`, p.avgEngagement ?? 'n/a'),
  ])
  return {
    ...baseReport('ecommerce', 'E-Commerce Analytics Report', context),
    sections: [
      executiveSummarySection(context),
      businessProfileSection(context),
      section('business_performance', 'Platform Performance', { actual, note: actual.length === 0 ? 'No platform data yet.' : null }),
      customerSentimentSection(context),
      salesForecastSection(context),
      keyFindingsSection(context),
      recommendationsSection(context),
      assumptionsLimitationsSection(['Platform metrics (mentions, engagement) come from uploaded/ingested data only — no live marketplace API connection exists (see docs/API_INTEGRATION.md).']),
    ],
  }
}

export function buildSentimentReport(context) {
  return {
    ...baseReport('sentiment', 'Sentiment Report', context),
    sections: [
      executiveSummarySection(context),
      customerSentimentSection(context),
      keyFindingsSection(context),
      dataImprovementsSection(context),
      assumptionsLimitationsSection(['Emotion breakdown and region/geo sentiment are unavailable — no emotion classifier or location capture exists in this project.']),
    ],
  }
}

export function buildForecastReport(context) {
  return {
    ...baseReport('forecast', 'Forecast Report', context),
    sections: [
      executiveSummarySection(context),
      salesForecastSection(context),
      keyFindingsSection(context),
      assumptionsLimitationsSection(['Forecast accuracy (MAE/RMSE/MAPE) is measured via time-aware rolling-origin backtesting (FYP2.md §51), not a guarantee of future accuracy.']),
    ],
  }
}

export function buildCrisisReport(context) {
  return {
    ...baseReport('crisis', 'Crisis Report', context),
    sections: [
      executiveSummarySection(context),
      crisisRiskSection(context),
      keyFindingsSection(context),
      recommendationsSection(context),
      assumptionsLimitationsSection(),
    ],
  }
}

export function buildBusinessPlanningReport(context) {
  return {
    ...baseReport('business_planning', 'Business Planning Report', context),
    sections: [
      executiveSummarySection(context),
      businessProfileSection(context),
      dataAvailabilitySection(context),
      scenarioAnalysisSection(context),
      dataImprovementsSection(context),
      assumptionsLimitationsSection(['Every figure in Scenario Analysis is a projection computed from your stated assumptions (or a documented default) — never a historical-data forecast.']),
    ],
  }
}

export const REPORT_BUILDERS = {
  business_health: buildBusinessHealthReport,
  ecommerce: buildEcommerceReport,
  sentiment: buildSentimentReport,
  forecast: buildForecastReport,
  crisis: buildCrisisReport,
  business_planning: buildBusinessPlanningReport,
}
