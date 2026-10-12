import { describe, expect, it } from 'vitest'
import { INSUFFICIENT_INFO_TEXT, buildBusinessContextFactors, generateRecommendations } from './recommendationRules'

function signal(id, level, evidence = `${id} evidence`) {
  return { id, level, evidence, value: 0 }
}

function crisisWith(signals, overrides = {}) {
  const allSignals = signals
  const triggeredSignals = allSignals.filter((s) => s.level !== 'normal' && s.level !== 'insufficient_data')
  return {
    riskLevel: 'normal',
    riskScore: 0,
    dataSufficient: true,
    allSignals,
    triggeredSignals,
    detectedAt: new Date().toISOString(),
    ...overrides,
  }
}

const EXISTING_PROFILE = { exists: true, values: {}, provenance: {} }

describe('generateRecommendations', () => {
  it('recommends completing the profile when none exists', () => {
    const recs = generateRecommendations({})
    expect(recs.some((r) => r.id === 'missing_business_profile')).toBe(true)
  })

  it('fires nothing when a profile exists but no analytical condition is met', () => {
    const recs = generateRecommendations({ profile: EXISTING_PROFILE })
    expect(recs).toEqual([])
  })

  it('implements the FYP2.md §54 worked example: negative sentiment rising + volume rising -> investigate complaints', () => {
    const crisis = crisisWith([signal('negative_ratio_velocity', 'warning'), signal('mention_volume_level', 'warning')])
    const recs = generateRecommendations({ profile: EXISTING_PROFILE, crisis })
    const rec = recs.find((r) => r.id === 'investigate_complaints')
    expect(rec).toBeDefined()
    expect(rec.priority).toBe('medium')
    expect(rec.evidence.length).toBeGreaterThanOrEqual(2)
  })

  it('does not fire investigate_complaints on rising sentiment alone without a volume signal', () => {
    const crisis = crisisWith([signal('negative_ratio_velocity', 'warning')])
    const recs = generateRecommendations({ profile: EXISTING_PROFILE, crisis })
    expect(recs.some((r) => r.id === 'investigate_complaints')).toBe(false)
  })

  it('escalates investigate_complaints to high priority when the sentiment signal is critical', () => {
    const crisis = crisisWith([signal('negative_ratio_velocity', 'critical'), signal('mention_volume_velocity', 'critical')])
    const recs = generateRecommendations({ profile: EXISTING_PROFILE, crisis })
    expect(recs.find((r) => r.id === 'investigate_complaints').priority).toBe('high')
  })

  it('recommends activating crisis response only when risk level is critical', () => {
    const criticalCrisis = crisisWith([signal('negative_ratio_level', 'critical')], { riskLevel: 'critical', riskScore: 80 })
    const warningCrisis = crisisWith([signal('negative_ratio_level', 'warning')], { riskLevel: 'warning', riskScore: 30 })

    expect(generateRecommendations({ profile: EXISTING_PROFILE, crisis: criticalCrisis }).some((r) => r.id === 'crisis_critical_response')).toBe(true)
    expect(generateRecommendations({ profile: EXISTING_PROFILE, crisis: warningCrisis }).some((r) => r.id === 'crisis_critical_response')).toBe(false)
  })

  it('recommends scaling marketing only when risk is normal, data is sufficient, AND readiness is high', () => {
    const normalCrisis = crisisWith([], { riskLevel: 'normal', dataSufficient: true })
    const highReadiness = { level: 4, levelLabel: 'Customer Intelligence', percent: 80, checklist: [] }
    const lowReadiness = { level: 2, levelLabel: 'Basic Data', percent: 40, checklist: [{ id: 'sales', label: 'Sales Data', met: false }] }

    expect(
      generateRecommendations({ profile: EXISTING_PROFILE, crisis: normalCrisis, dataReadiness: highReadiness }).some(
        (r) => r.id === 'strong_positive_momentum'
      )
    ).toBe(true)
    expect(
      generateRecommendations({ profile: EXISTING_PROFILE, crisis: normalCrisis, dataReadiness: lowReadiness }).some(
        (r) => r.id === 'strong_positive_momentum'
      )
    ).toBe(false)
  })

  it('does not recommend scaling marketing when data was insufficient to compute crisis risk', () => {
    const normalButUnknownCrisis = crisisWith([], { riskLevel: 'normal', dataSufficient: false })
    const highReadiness = { level: 5, levelLabel: 'Full Analytics', percent: 100, checklist: [] }
    expect(
      generateRecommendations({ profile: EXISTING_PROFILE, crisis: normalButUnknownCrisis, dataReadiness: highReadiness }).some(
        (r) => r.id === 'strong_positive_momentum'
      )
    ).toBe(false)
  })

  it('recommends collecting more data at low readiness levels, listing what is missing', () => {
    const lowReadiness = {
      level: 1,
      levelLabel: 'No Data',
      percent: 20,
      checklist: [
        { id: 'sales', label: 'Sales Data', met: false },
        { id: 'reviews', label: 'Customer Reviews', met: false },
      ],
    }
    const recs = generateRecommendations({ profile: EXISTING_PROFILE, dataReadiness: lowReadiness })
    const rec = recs.find((r) => r.id === 'low_data_readiness')
    expect(rec).toBeDefined()
    expect(rec.evidence.join(' ')).toContain('Sales Data')
  })

  it('does not recommend collecting more data at moderate/high readiness', () => {
    const midReadiness = { level: 3, levelLabel: 'Operational Data', percent: 60, checklist: [] }
    const recs = generateRecommendations({ profile: EXISTING_PROFILE, dataReadiness: midReadiness })
    expect(recs.some((r) => r.id === 'low_data_readiness')).toBe(false)
  })

  it('flags a break-even gap when expected volume falls short of break-even units', () => {
    const profile = {
      exists: true,
      values: {
        selling_price: 50,
        cost_per_unit: 20,
        fixed_costs: 3000,
        expected_monthly_units: 50, // break-even needs 3000/30 = 100 units
      },
      provenance: {},
    }
    const recs = generateRecommendations({ profile })
    expect(recs.some((r) => r.id === 'breakeven_gap')).toBe(true)
  })

  it('does not flag a break-even gap when expected volume clears break-even', () => {
    const profile = {
      exists: true,
      values: { selling_price: 50, cost_per_unit: 20, fixed_costs: 3000, expected_monthly_units: 150 },
      provenance: {},
    }
    const recs = generateRecommendations({ profile })
    expect(recs.some((r) => r.id === 'breakeven_gap')).toBe(false)
  })

  it('flags a growth-target shortfall beyond the configured tolerance', () => {
    const profile = {
      exists: true,
      values: { expected_monthly_revenue: 1000, expected_growth_rate: 10, revenue_target: 5000 }, // growth ~1100, way under 5000
      provenance: {},
    }
    const recs = generateRecommendations({ profile })
    expect(recs.some((r) => r.id === 'growth_below_target')).toBe(true)
  })

  it('does not flag a growth-target shortfall within tolerance', () => {
    const profile = {
      exists: true,
      // growth-case revenue = 1000 * 1.10 = 1100, target 1100 -> 0% shortfall
      values: { expected_monthly_revenue: 1000, expected_growth_rate: 10, revenue_target: 1100 },
      provenance: {},
    }
    const recs = generateRecommendations({ profile })
    expect(recs.some((r) => r.id === 'growth_below_target')).toBe(false)
  })

  it('filters recommendations by mode', () => {
    const recsStartup = generateRecommendations({ mode: 'startup' })
    const recsEcommerce = generateRecommendations({ mode: 'ecommerce' })
    // no rule is currently mode-restricted, so both should see the same set —
    // this documents current behavior and guards the filter mechanism itself.
    expect(recsStartup.map((r) => r.id)).toEqual(recsEcommerce.map((r) => r.id))
  })
})

describe('buildBusinessContextFactors', () => {
  it('marks every factor insufficient given an empty context (FYP2.md §56)', () => {
    const factors = buildBusinessContextFactors({})
    for (const factor of factors) {
      expect(factor.insufficient).toBe(true)
      expect(factor.value).toBe(INSUFFICIENT_INFO_TEXT)
    }
  })

  it('capital is always insufficient — no schema field exists for it anywhere in this app', () => {
    const richContext = {
      profile: { exists: true, values: { business_type: 'Retail', revenue_target: 5000 }, provenance: {} },
      crisis: crisisWith([], { dataSufficient: true }),
      dataReadiness: { level: 5, levelLabel: 'Full Analytics', checklist: [{ id: 'sales', label: 'Sales Data', met: true }] },
      forecastSummary: 'Prophet forecasts RM6,000 next month.',
    }
    const factors = buildBusinessContextFactors(richContext)
    const capital = factors.find((f) => f.id === 'capital')
    expect(capital.insufficient).toBe(true)
    expect(capital.value).toBe(INSUFFICIENT_INFO_TEXT)
  })

  it('populates every other factor when the underlying data is available', () => {
    const richContext = {
      profile: {
        exists: true,
        values: { business_type: 'Retail', business_stage: 'Growth', product_category: 'Food', marketing_channels: ['TikTok', 'Instagram'], revenue_target: 5000 },
        provenance: {},
      },
      crisis: crisisWith([], { riskLevel: 'warning', dataSufficient: true }),
      dataReadiness: { level: 4, levelLabel: 'Customer Intelligence', checklist: [{ id: 'sales', label: 'Sales Data', met: true }] },
      forecastSummary: 'Prophet forecasts RM6,000 next month.',
    }
    const factors = buildBusinessContextFactors(richContext)
    for (const factor of factors) {
      if (factor.id === 'capital') continue
      expect(factor.insufficient).toBe(false)
      expect(factor.value).not.toBe(INSUFFICIENT_INFO_TEXT)
    }
  })
})
