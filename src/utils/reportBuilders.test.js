import { describe, expect, it } from 'vitest'
import {
  REPORT_BUILDERS,
  buildBusinessHealthReport,
  buildBusinessPlanningReport,
  buildCrisisReport,
  buildEcommerceReport,
  buildForecastReport,
  buildSentimentReport,
} from './reportBuilders'

function fullContext(overrides = {}) {
  return {
    mode: 'startup',
    profile: {
      exists: true,
      values: { business_name: 'Acme', business_stage: 'Growth', expected_growth_rate: 40 },
      provenance: { business_name: 'user_provided', business_stage: 'ai_extracted', expected_growth_rate: 'default_assumption' },
    },
    dataReadiness: {
      level: 3,
      levelLabel: 'Operational Data',
      checklist: [
        { id: 'sales', label: 'Sales Data', met: true },
        { id: 'reviews', label: 'Customer Reviews', met: false },
      ],
    },
    crisis: {
      riskLevel: 'warning',
      riskScore: 35,
      dataSufficient: true,
      allSignals: [{ id: 'negative_ratio_level', level: 'warning', evidence: 'Negative ratio is 32%.' }],
      triggeredSignals: [{ id: 'negative_ratio_level', level: 'warning', evidence: 'Negative ratio is 32%.' }],
    },
    crisisHistory: [],
    sentimentScores: [
      { id: 'positive', label: 'Positive', value: 60, delta: 2 },
      { id: 'neutral', label: 'Neutral', value: 25, delta: -1 },
      { id: 'negative', label: 'Negative', value: 15, delta: -1 },
    ],
    sentimentTrend: [],
    platformComparison: [{ platform: 'tiktok', mentionVolume: 100, avgEngagement: 12.5 }],
    trendingHashtags: [{ hashtag: 'skincare', mentions: 5 }],
    topPosts: [],
    forecastRows: [],
    bestForecastRow: {
      model_type: 'prophet',
      variant: 'sales_only',
      mae: 100,
      rmse: 120,
      mape: 8.5,
      forecast_points: [{ date: '2026-03-01', predicted: 5000 }],
    },
    scenarios: {
      conservative: { revenue: 7000, units: 140 },
      expected: { revenue: 10000, units: 200 },
      growth: { revenue: 14000, units: 280 },
    },
    breakEven: { insufficient: false, units: 150, revenue: 7500 },
    recommendations: [{ id: 'r1', priority: 'high', title: 'Investigate complaints', evidence: ['Negative ratio rising.'] }],
    businessContextFactors: [],
    ...overrides,
  }
}

function emptyContext(overrides = {}) {
  return {
    mode: 'startup',
    profile: { exists: false, values: {}, provenance: {} },
    dataReadiness: { level: 1, levelLabel: 'No Data', checklist: [{ id: 'sales', label: 'Sales Data', met: false }] },
    crisis: null,
    crisisHistory: [],
    sentimentScores: null,
    sentimentTrend: [],
    platformComparison: [],
    trendingHashtags: [],
    topPosts: [],
    forecastRows: [],
    bestForecastRow: null,
    scenarios: {},
    breakEven: { insufficient: true },
    recommendations: [],
    businessContextFactors: [],
    ...overrides,
  }
}

describe('report builders — shared shape', () => {
  it('every builder always includes an Assumptions and Limitations section', () => {
    for (const [type, builder] of Object.entries(REPORT_BUILDERS)) {
      const report = builder(fullContext())
      const last = report.sections.find((s) => s.id === 'assumptions_limitations')
      expect(last, `${type} report missing assumptions_limitations`).toBeDefined()
      expect(last.actual.length).toBeGreaterThan(0)
    }
  })

  it('every builder opens with an Executive Summary section (FYP2.md §69)', () => {
    for (const [type, builder] of Object.entries(REPORT_BUILDERS)) {
      const report = builder(fullContext())
      expect(report.sections[0].id, `${type} report`).toBe('executive_summary')
      expect(typeof report.sections[0].narrative).toBe('string')
    }
  })

  it('every builder produces a title, type, mode, and generatedAt', () => {
    for (const [type, builder] of Object.entries(REPORT_BUILDERS)) {
      const report = builder(fullContext())
      expect(report.type).toBe(type)
      expect(typeof report.title).toBe('string')
      expect(report.mode).toBe('startup')
      expect(new Date(report.generatedAt).getTime()).not.toBeNaN()
    }
  })

  it('every builder handles an empty context without throwing', () => {
    for (const builder of Object.values(REPORT_BUILDERS)) {
      expect(() => builder(emptyContext())).not.toThrow()
    }
  })
})

describe('buildBusinessHealthReport — provenance split', () => {
  it('separates user-provided/AI-extracted fields (ACTUAL) from default assumptions (SCENARIO)', () => {
    const report = buildBusinessHealthReport(fullContext())
    const profileSection = report.sections.find((s) => s.id === 'business_profile')
    expect(profileSection.actual.map((p) => p.label)).toEqual(expect.arrayContaining(['business_name', 'business_stage']))
    expect(profileSection.scenario.map((p) => p.label)).toEqual(['expected_growth_rate'])
    // never in both
    const actualLabels = new Set(profileSection.actual.map((p) => p.label))
    for (const p of profileSection.scenario) expect(actualLabels.has(p.label)).toBe(false)
  })

  it('skips fields with no recorded provenance rather than guessing a bucket', () => {
    const context = fullContext({
      profile: { exists: true, values: { mystery_field: 'x' }, provenance: {} },
    })
    const report = buildBusinessHealthReport(context)
    const profileSection = report.sections.find((s) => s.id === 'business_profile')
    expect(profileSection.actual).toEqual([])
    expect(profileSection.scenario).toEqual([])
  })
})

describe('buildForecastReport — actual vs scenario', () => {
  it('puts backtested accuracy in actual and future predictions in scenario', () => {
    const report = buildForecastReport(fullContext())
    const forecastSection = report.sections.find((s) => s.id === 'sales_forecast')
    expect(forecastSection.actual.some((p) => p.label.includes('MAPE'))).toBe(true)
    expect(forecastSection.scenario.some((p) => p.label === '2026-03-01')).toBe(true)
    // the predicted revenue number must not appear in actual
    expect(forecastSection.actual.some((p) => String(p.value).includes('5000'))).toBe(false)
  })

  it('notes when no forecast run exists yet, rather than showing empty sections silently', () => {
    const report = buildForecastReport(emptyContext())
    const forecastSection = report.sections.find((s) => s.id === 'sales_forecast')
    expect(forecastSection.note).toMatch(/no forecasting run/i)
  })
})

describe('buildBusinessPlanningReport — everything is scenario', () => {
  it('scenario analysis section has no actual data points at all', () => {
    const report = buildBusinessPlanningReport(fullContext())
    const scenarioSection = report.sections.find((s) => s.id === 'scenario_analysis')
    expect(scenarioSection.actual).toEqual([])
    expect(scenarioSection.scenario.length).toBeGreaterThan(0)
  })

  it('includes break-even figures when computable', () => {
    const report = buildBusinessPlanningReport(fullContext())
    const scenarioSection = report.sections.find((s) => s.id === 'scenario_analysis')
    expect(scenarioSection.scenario.some((p) => p.label === 'Break-even units')).toBe(true)
  })
})

describe('buildCrisisReport', () => {
  it('lists every signal as actual evidence, tied to the real risk level', () => {
    const report = buildCrisisReport(fullContext())
    const crisisSection = report.sections.find((s) => s.id === 'crisis_risk')
    expect(crisisSection.actual).toHaveLength(1)
    expect(crisisSection.note).toContain('warning')
  })

  it('handles crisis being null (detection could not run)', () => {
    const report = buildCrisisReport(emptyContext())
    const crisisSection = report.sections.find((s) => s.id === 'crisis_risk')
    expect(crisisSection.note).toMatch(/could not run/i)
  })
})

describe('buildSentimentReport', () => {
  it('includes real sentiment scores and hashtags as actual data', () => {
    const report = buildSentimentReport(fullContext())
    const sentimentSection = report.sections.find((s) => s.id === 'customer_sentiment')
    expect(sentimentSection.actual.some((p) => p.label === 'Positive')).toBe(true)
    expect(sentimentSection.actual.some((p) => p.label === '#skincare')).toBe(true)
  })
})

describe('buildEcommerceReport', () => {
  it('includes real platform metrics', () => {
    const report = buildEcommerceReport(fullContext())
    const platformSection = report.sections.find((s) => s.id === 'business_performance')
    expect(platformSection.actual.some((p) => p.label === 'tiktok mentions')).toBe(true)
  })
})
