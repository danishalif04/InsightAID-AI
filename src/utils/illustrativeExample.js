/**
 * Illustrative example assumptions — shown ONLY when a Malaysian Local
 * Shop account has no real price/cost assumptions saved yet, so the
 * dashboard's planning sections (Business Overview, Financial Health,
 * What-If Simulator, Business Planning Mode) render something concrete
 * and interactive instead of blank "insufficient data" placeholders on
 * first visit.
 *
 * These are the EXACT numbers from the Local Shop dashboard spec's own
 * worked example (knowledge_updated_nov2026.md's Break-even illustration:
 * fixed costs RM2,500, price RM10, unit cost RM6 -> 625 units / RM6,250
 * break-even revenue) — not invented here. Every component that uses this
 * fallback must show a clear "Illustrative example" label; it is never
 * silently blended with a user's real saved values; and it is never
 * written back to the database (the WhatIfSimulator pre-fills its
 * editable inputs with it, but Save/persist flows elsewhere use only the
 * user's own real form state).
 */

export const ILLUSTRATIVE_ASSUMPTIONS = {
  selling_price: 10,
  cost_per_unit: 6,
  fixed_costs: 2500,
  marketing_cost: 0,
  platform_fees: 0,
  shipping_cost: 0,
  labour_cost: 0,
  other_expenses: 0,
  expected_monthly_units: 650,
  number_of_products: 5,
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

/** True once the account has its own real price + cost on file — the minimum needed for any planning calculation to mean something. */
export function hasCoreAssumptions(values = {}) {
  return isNumber(values.selling_price) && isNumber(values.cost_per_unit)
}

/** @returns {{values: object, isIllustrative: boolean}} */
export function resolveDisplayAssumptions(values = {}) {
  if (hasCoreAssumptions(values)) return { values, isIllustrative: false }
  return { values: ILLUSTRATIVE_ASSUMPTIONS, isIllustrative: true }
}
