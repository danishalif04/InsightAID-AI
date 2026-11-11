import { grossMarginPct } from './breakEven'
import { fail, missingOf, ok, round } from './core'

/**
 * What a change in unit cost does to margin, and the price that would
 * hold the original margin:  priceToHoldMargin = newCost / (1 − oldMargin)
 *
 * This is the shop's OWN recorded cost moving. It says nothing about why
 * the cost moved — national CPI is shown separately as context and is
 * never presented as the cause.
 */
export function costPressure(price, oldCost, newCost) {
  const missing = missingOf({ price, oldCost, newCost })
  if (missing.length) return fail(missing)
  if (price <= 0) return fail([], 'non_positive_price')

  const before = grossMarginPct(price, oldCost)
  const after = grossMarginPct(price, newCost)
  if (!before.ok) return before
  if (!after.ok) return after

  const oldMarginRatio = (price - oldCost) / price
  const result = {
    price: round(price),
    oldCost: round(oldCost),
    newCost: round(newCost),
    costDelta: round(newCost - oldCost),
    marginBeforePct: before.value,
    marginAfterPct: after.value,
    marginDeltaPp: round(after.value - before.value),
  }

  if (oldMarginRatio < 1) {
    result.priceToHoldMargin = round(newCost / (1 - oldMarginRatio))
  }

  return ok(result)
}

/**
 * Deterministic mitigation options with the arithmetic behind each one.
 * These are options to consider, never instructions — nothing is applied
 * automatically.
 */
export function mitigationOptions(pressure) {
  if (!pressure?.ok) return fail(['pressure'])
  const options = []

  if (pressure.priceToHoldMargin) {
    options.push({
      id: 'adjust_price',
      label: 'Raise selling price to hold the original margin',
      detail: `RM${pressure.price.toFixed(2)} → RM${pressure.priceToHoldMargin.toFixed(2)} keeps the margin at ${pressure.marginBeforePct}%.`,
    })
  }
  options.push({
    id: 'switch_supplier',
    label: 'Compare suppliers',
    detail: `Returning the unit cost to RM${pressure.oldCost.toFixed(2)} restores the ${pressure.marginBeforePct}% margin at the current price.`,
  })
  options.push({
    id: 'accept_margin',
    label: 'Absorb the increase',
    detail: `Keeping the price at RM${pressure.price.toFixed(2)} means a ${Math.abs(pressure.marginDeltaPp)}pp lower margin (${pressure.marginAfterPct}%).`,
  })

  return ok({ options })
}
