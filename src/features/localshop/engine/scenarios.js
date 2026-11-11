import { breakEvenUnits, grossMarginPct } from './breakEven'
import { fail, missingOf, ok, round } from './core'

/** units × (price − varCost) − fixed */
export function operatingResult(units, price, varCost, fixed) {
  const missing = missingOf({ units, price, varCost, fixed })
  if (missing.length) return fail(missing)

  const contribution = round(price - varCost)
  const revenue = round(units * price)
  const variableCosts = round(units * varCost)
  const grossProfit = round(revenue - variableCosts)
  const margin = grossMarginPct(price, varCost)

  return ok({
    units,
    revenue,
    variableCosts,
    grossProfit,
    contribution,
    fixed: round(fixed),
    value: round(grossProfit - fixed),
    marginPct: margin.ok ? margin.value : null,
  })
}

export const SCENARIO_DEFAULTS = {
  optimistic: { unitsFactor: 1.2, costFactor: 1 },
  conservative: { unitsFactor: 0.8, costFactor: 1.1 },
}

/**
 * Three parallel results from one base case. Every variant is an
 * ASSUMPTION, never a prediction — the factors are returned alongside so
 * the UI can state exactly what was assumed.
 */
export function scenarioSet(base, overrides = {}) {
  const { units, price, varCost, fixed } = base ?? {}
  const missing = missingOf({ units, price, varCost, fixed })
  if (missing.length) return fail(missing)

  const factors = {
    current: { unitsFactor: 1, costFactor: 1 },
    optimistic: { ...SCENARIO_DEFAULTS.optimistic, ...(overrides.optimistic ?? {}) },
    conservative: { ...SCENARIO_DEFAULTS.conservative, ...(overrides.conservative ?? {}) },
  }

  const scenarios = Object.entries(factors).map(([name, factor]) => {
    const result = operatingResult(
      Math.round(units * factor.unitsFactor),
      price,
      round(varCost * factor.costFactor),
      fixed
    )
    const bep = breakEvenUnits(fixed, price, round(varCost * factor.costFactor))
    return {
      name,
      factor,
      ...(result.ok ? result : { ok: false }),
      breakEvenUnits: bep.ok ? bep.value : null,
    }
  })

  return ok({ scenarios, assumptionNote: 'Assumption — not a predicted outcome.' })
}
