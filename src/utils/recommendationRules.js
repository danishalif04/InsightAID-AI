/**
 * Recommendation rule engine — Layer 1 of FYP2.md §54's two-layer
 * architecture ("Analytical Rules + Gemini Explanation Layer"). Pure
 * functions only — no React, no Supabase, no Gemini call. Every
 * recommendation returned here fires from a real, computed condition
 * (crisis signals, break-even math, data readiness, scenario projections)
 * — nothing is invented, and per FYP2.md §55, this layer must work
 * completely on its own with no Gemini involvement at all.
 *
 * `buildBusinessContextFactors()` implements §56's factor list; any factor
 * this app cannot actually compute renders the exact required string,
 * `INSUFFICIENT_INFO_TEXT`, rather than a guess.
 */

import { buildScenario, calculateBreakEven } from './scenarioEngine'
import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds'

export const INSUFFICIENT_INFO_TEXT = 'Insufficient information to evaluate this factor.'

export const CATEGORIES = ['Marketing', 'Operations', 'Customer Service', 'Product', 'Growth', 'Investment']

/**
 * Coombs (2007) Situational Crisis Communication Theory response-strategy
 * labels — see docs/REFERENCES_TO_VERIFY.md for the citation and the
 * per-rule reasoning (marked [VERIFY], confirm against Coombs' own paper
 * before citing the exact wording in the dissertation). Only attached to
 * recommendations that represent an actual public-response POSTURE
 * decision, never to a diagnostic/investigation step.
 */
export const SCCT_STRATEGIES = {
  rebuild: { label: 'Rebuild', description: 'Accept responsibility; offer compensation or an apology.' },
  diminish: { label: 'Diminish', description: 'Acknowledge and contextualize while the cause is still being confirmed.' },
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

function nonNormalSignal(crisis, id) {
  const signal = crisis?.allSignals?.find((s) => s.id === id)
  if (!signal || signal.level === 'normal' || signal.level === 'insufficient_data') return null
  return signal
}

/**
 * @param {object} context
 * @param {'startup'|'ecommerce'} [context.mode]
 * @param {{exists:boolean, values:object, provenance:object}} [context.profile]
 * @param {object|null} [context.crisis] result of src/utils/crisisDetection.js's detectCrisis(), or null
 * @param {object|null} [context.dataReadiness] result of src/utils/dataReadiness.js's calculateReadiness(), or null
 * @returns {Array<{id,category,priority:'high'|'medium'|'low',title,evidence:string[],modes:string[]}>}
 */
export function generateRecommendations(context = {}) {
  const { mode = 'startup', profile = { exists: false, values: {}, provenance: {} }, crisis = null, dataReadiness = null } = context
  const assumptions = profile.values ?? {}
  const recommendations = []

  const push = (rec) => recommendations.push({ modes: ['startup', 'ecommerce'], ...rec })

  if (!profile.exists) {
    push({
      id: 'missing_business_profile',
      category: 'Operations',
      priority: 'medium',
      title: 'Complete your business profile',
      evidence: ['No business profile has been saved yet, recommendations that depend on it cannot run.'],
    })
  }

  // Directly implements FYP2.md §54's worked example: "IF negative sentiment
  // rises significantly AND review volume increases THEN recommend
  // investigating customer complaints."
  if (crisis) {
    const negativeVelocity = nonNormalSignal(crisis, 'negative_ratio_velocity')
    const volumeLevel = nonNormalSignal(crisis, 'mention_volume_level')
    const volumeVelocity = nonNormalSignal(crisis, 'mention_volume_velocity')

    let investigateComplaintsFired = false
    if (negativeVelocity && (volumeLevel || volumeVelocity)) {
      push({
        id: 'investigate_complaints',
        category: 'Customer Service',
        priority: negativeVelocity.level === 'critical' ? 'high' : 'medium',
        title: 'Investigate customer complaints',
        evidence: [negativeVelocity.evidence, volumeLevel?.evidence, volumeVelocity?.evidence].filter(Boolean),
      })
      investigateComplaintsFired = true
    }

    if (crisis.riskLevel === 'critical') {
      push({
        id: 'crisis_critical_response',
        category: 'Operations',
        priority: 'high',
        title: 'Activate crisis response',
        evidence: crisis.triggeredSignals.map((signal) => signal.evidence),
        scctStrategy: 'rebuild',
      })
    } else if (crisis.riskLevel === 'warning' && crisis.dataSufficient && !investigateComplaintsFired) {
      // Previously a real gap: 'warning' had no dedicated recommendation at
      // all unless it happened to be the one specific negative-velocity +
      // volume combination above — a business sitting at e.g. 30/100 from a
      // rating drop or a one-off negative-ratio spike got nothing. This
      // covers every other way a risk score can land in the warning band,
      // using the same real triggered-signal evidence the Crisis Detection
      // page itself shows, never a fabricated cause.
      push({
        id: 'warning_risk_review',
        category: 'Operations',
        priority: 'medium',
        title: 'Review triggered risk signals before they escalate',
        evidence: crisis.triggeredSignals.map((signal) => signal.evidence),
        scctStrategy: 'diminish',
      })
    }

    if (crisis.riskLevel === 'normal' && crisis.dataSufficient && (dataReadiness?.level ?? 0) >= RECOMMENDATION_THRESHOLDS.highDataReadinessLevel) {
      push({
        id: 'strong_positive_momentum',
        category: 'Growth',
        priority: 'low',
        title: 'Consider scaling marketing spend',
        evidence: [`Crisis risk is normal with sufficient data, and data readiness is ${dataReadiness.level}/5 (${dataReadiness.levelLabel}), no negative signals are currently triggered.`],
      })
    }
  }

  if (dataReadiness && dataReadiness.level <= RECOMMENDATION_THRESHOLDS.lowDataReadinessLevel) {
    const unmet = dataReadiness.checklist.filter((item) => !item.met).map((item) => item.label)
    push({
      id: 'low_data_readiness',
      category: 'Growth',
      priority: 'medium',
      title: 'Collect more data to unlock deeper insights',
      evidence: [
        `Data readiness is level ${dataReadiness.level}/5 (${dataReadiness.levelLabel}).`,
        ...(unmet.length ? [`Missing: ${unmet.join(', ')}.`] : []),
      ],
    })
  }

  const breakEven = calculateBreakEven(assumptions)
  const expectedScenario = buildScenario(assumptions, 'expected')
  if (!breakEven.insufficient && expectedScenario.units != null && expectedScenario.units < breakEven.units) {
    push({
      id: 'breakeven_gap',
      category: 'Investment',
      priority: 'high',
      title: 'Review pricing or costs, expected volume falls short of break-even',
      evidence: [`Expected monthly units (${expectedScenario.units}) is below the ${breakEven.units}-unit break-even point.`],
    })
  }

  const growthScenario = buildScenario(assumptions, 'growth')
  if (isNumber(assumptions.revenue_target) && assumptions.revenue_target > 0 && growthScenario.revenue != null) {
    const shortfall = (assumptions.revenue_target - growthScenario.revenue) / assumptions.revenue_target
    if (shortfall >= RECOMMENDATION_THRESHOLDS.growthShortfallTolerance) {
      push({
        id: 'growth_below_target',
        category: 'Marketing',
        priority: 'medium',
        title: 'Reassess growth channels, projected growth falls short of your target',
        evidence: [
          `Growth-case revenue (RM${growthScenario.revenue.toFixed(2)}) is ${Math.round(shortfall * 100)}% below your revenue target (RM${assumptions.revenue_target}).`,
        ],
      })
    }
  }

  return recommendations.filter((rec) => rec.modes.includes(mode))
}

const FACTOR_DEFINITIONS = [
  { id: 'business_type', label: 'Business type', get: (ctx) => ctx.profile?.values?.business_type ?? null },
  { id: 'business_stage', label: 'Business stage', get: (ctx) => ctx.profile?.values?.business_stage ?? null },
  { id: 'product_category', label: 'Product category', get: (ctx) => ctx.profile?.values?.product_category ?? null },
  // No 'capital' column exists anywhere in this app's schema (confirmed
  // against business_profiles/business_assumptions) — always insufficient
  // rather than proxying it to an unrelated field like fixed_costs.
  { id: 'capital', label: 'Capital', get: () => null },
  {
    id: 'sales',
    label: 'Sales',
    get: (ctx) => (ctx.dataReadiness?.checklist?.find((item) => item.id === 'sales')?.met ? 'Sales data on file.' : null),
  },
  {
    id: 'sentiment',
    label: 'Sentiment',
    get: (ctx) =>
      ctx.crisis?.dataSufficient
        ? `Crisis risk level: ${ctx.crisis.riskLevel} (risk score ${ctx.crisis.riskScore}/100).`
        : null,
  },
  { id: 'forecast', label: 'Forecast', get: (ctx) => ctx.forecastSummary ?? null },
  { id: 'crisis', label: 'Crisis risk', get: (ctx) => ctx.crisis?.riskLevel ?? null },
  {
    id: 'channels',
    label: 'Marketing channels',
    get: (ctx) => (ctx.profile?.values?.marketing_channels?.length ? ctx.profile.values.marketing_channels.join(', ') : null),
  },
  {
    id: 'data_readiness',
    label: 'Data readiness',
    get: (ctx) => (ctx.dataReadiness ? `${ctx.dataReadiness.level}/5 (${ctx.dataReadiness.levelLabel})` : null),
  },
  {
    id: 'business_goals',
    label: 'Business goals',
    get: (ctx) => {
      const v = ctx.profile?.values ?? {}
      const goals = [
        isNumber(v.revenue_target) ? `Revenue target RM${v.revenue_target}` : null,
        isNumber(v.sales_target) ? `Sales target ${v.sales_target}` : null,
        isNumber(v.customer_target) ? `Customer target ${v.customer_target}` : null,
      ].filter(Boolean)
      return goals.length ? goals.join('; ') : null
    },
  },
]

/** Implements FYP2.md §56's factor list. `context.forecastSummary` is an
 * optional string the caller may provide (e.g. from forecastResultsService)
 * — omitted, this factor is honestly 'insufficient', never guessed. */
export function buildBusinessContextFactors(context = {}) {
  return FACTOR_DEFINITIONS.map(({ id, label, get }) => {
    let value
    try {
      value = get(context)
    } catch {
      value = null
    }
    return { id, label, value: value ?? INSUFFICIENT_INFO_TEXT, insufficient: value == null }
  })
}
