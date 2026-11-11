import { fail, isNum, missingOf, ok, round } from './core'

/** price − varCost */
export function contributionPerUnit(price, varCost) {
  const missing = missingOf({ price, varCost })
  if (missing.length) return fail(missing)
  return ok({ value: round(price - varCost) })
}

/** (price − cost) / price × 100, to 2dp. */
export function grossMarginPct(price, cost) {
  const missing = missingOf({ price, cost })
  if (missing.length) return fail(missing)
  if (price === 0) return fail([], 'zero_price')
  return ok({ value: round(((price - cost) / price) * 100) })
}

/**
 * fixed / (price − varCost). Rounded UP for display: you cannot sell a
 * fraction of a unit, and rounding down would under-state the target.
 */
export function breakEvenUnits(fixed, price, varCost) {
  const missing = missingOf({ fixed, price, varCost })
  if (missing.length) return fail(missing)
  const contribution = price - varCost
  if (contribution <= 0) return fail([], 'non_positive_contribution')
  const exact = fixed / contribution
  return ok({ value: Math.ceil(exact), exact: round(exact), contribution: round(contribution) })
}

/** breakEvenUnits × price */
export function breakEvenRevenue(fixed, price, varCost) {
  const units = breakEvenUnits(fixed, price, varCost)
  if (!units.ok) return units
  return ok({ value: round(units.value * price), units: units.value })
}

/**
 * fixed / average contribution-margin RATIO across products.
 *
 * The average is UNWEIGHTED because a shop with no sales history has no
 * sales mix to weight by — so this carries an explicit
 * `assumptions: ['equal sales mix']` for the UI to surface. Weighting
 * would imply knowledge the shop does not have.
 */
export function breakEvenRevenueMulti(fixed, products) {
  if (!isNum(fixed)) return fail(['fixed'])
  const usable = (products ?? []).filter((p) => isNum(p?.price) && isNum(p?.cost) && p.price > 0)
  if (usable.length === 0) return fail(['products'], 'no_priced_products')

  const ratios = usable.map((p) => (p.price - p.cost) / p.price)
  const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length
  if (avgRatio <= 0) return fail([], 'non_positive_contribution')

  return ok({
    value: round(fixed / avgRatio),
    avgMarginPct: round(avgRatio * 100),
    productsCounted: usable.length,
    assumptions: ['equal sales mix'],
  })
}

/** ceil(units / days) — the daily pace implied by a monthly target. */
export function dailyTarget(units, days = 30) {
  const missing = missingOf({ units, days })
  if (missing.length) return fail(missing)
  if (days <= 0) return fail([], 'non_positive_days')
  return ok({ value: Math.ceil(units / days), days })
}
