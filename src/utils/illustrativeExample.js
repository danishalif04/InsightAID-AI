/**
 * Illustrative example assumptions — shown ONLY when a Malaysian Local
 * Shop account has no real price/cost assumptions saved yet, so the
 * dashboard's planning sections (Business Overview, Financial Health,
 * What-If Simulator, Business Planning Mode) render something concrete
 * and interactive instead of blank "insufficient data" placeholders on
 * first visit.
 *
 * These mimic the Local Shop dashboard spec's own "ILLUSTRATIVE BUSINESS
 * PROFILE" mock (knowledge_updated_nov2026.md's §A example: "Kedai
 * Makmur" — 28 registered products, RM2,500 monthly fixed costs, 35%
 * average contribution margin, ~RM7,143 monthly break-even sales) — not
 * invented here. Every component that uses this fallback must show a
 * clear "Illustrative example" label; it is never silently blended with a
 * user's real saved values; and it is never written back to the database
 * (the WhatIfSimulator pre-fills its editable inputs with it, but
 * Save/persist flows elsewhere use only the user's own real form state).
 */

// The six operating-cost fields deliberately sum to exactly RM2,500 (the
// mock's "Monthly fixed costs RM2,500"), but are split across categories
// rather than dumped in one field — so the expense-breakdown chart shows a
// real ranked comparison instead of a single bar, and Cost Pressure
// Analysis has a non-zero figure whichever category is selected.
export const ILLUSTRATIVE_ASSUMPTIONS = {
  selling_price: 20,
  cost_per_unit: 13, // (20-13)/20 = 35% margin, matching the mock's "Average contribution margin 35%" exactly
  fixed_costs: 1200, // rent
  labour_cost: 700,
  other_expenses: 250, // utilities
  marketing_cost: 200,
  shipping_cost: 100,
  platform_fees: 50,
  expected_monthly_units: 400,
  number_of_products: 28,
}

/** One-off setup costs for the Startup Capital Planner's illustrative preview (totals RM29,400 against RM25,000 available — a visible funding gap). */
export const ILLUSTRATIVE_STARTUP_CAPITAL = {
  items: {
    renovation: 8000,
    equipment: 6000,
    initial_stock: 5000,
    rental_deposit: 4500,
    emergency_reserve: 3000,
    marketing_setup: 1500,
    licences: 800,
    utilities_deposit: 600,
  },
  availableCapital: 25000,
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
