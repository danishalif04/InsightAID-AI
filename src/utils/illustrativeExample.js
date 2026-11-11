/**
 * Gap-filling assumptions for the Malaysian Local Shop dashboard, so its
 * planning sections (Business Overview, Financial Health, What-If
 * Simulator, Cost Pressure, Business Planning Mode) render something
 * concrete and interactive instead of blank "insufficient data"
 * placeholders while an owner is still part-way through onboarding.
 *
 * The example figures mimic the Local Shop dashboard spec's own
 * "ILLUSTRATIVE BUSINESS PROFILE" mock (knowledge_updated_nov2026.md's §A
 * example: "Kedai Makmur" — 28 registered products, RM2,500 monthly fixed
 * costs, 35% average contribution margin, ~RM7,143 monthly break-even
 * sales) — not invented here.
 *
 * Honesty contract, enforced by resolveDisplayAssumptions() below:
 * - A real saved value ALWAYS wins. Only genuinely missing fields are
 *   filled, which is exactly what this project's existing
 *   `default_assumption` provenance label (businessProfileSchema.js) and
 *   scenarioEngine.js's own default-growth-rate behaviour already do.
 * - Every filled field is named back to the caller in `assumedFields`, so
 *   the UI can tell the owner precisely which numbers aren't theirs
 *   rather than vaguely flagging the whole panel.
 * - Where a missing field can be DERIVED from a real one (cost per unit
 *   from a real selling price, at the mock's 35% margin), it is derived,
 *   so the owner's own figures stay visible and internally coherent.
 * - Nothing here is ever written back to the database. Save/persist flows
 *   use only the owner's own form state.
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
const round2 = (value) => Math.round(value * 100) / 100

/** The margin the mock's example price/cost pair implies — used to derive one of the pair from the other. */
const EXAMPLE_MARGIN_RATIO = 0.35

const OPERATING_COST_FIELDS = ['marketing_cost', 'platform_fees', 'shipping_cost', 'labour_cost', 'fixed_costs', 'other_expenses']

const FIELD_LABELS = {
  selling_price: 'selling price',
  cost_per_unit: 'cost per unit',
  expected_monthly_units: 'monthly units sold',
  number_of_products: 'number of products',
}

/** Joins assumed-field labels into a readable list, e.g. "cost per unit and monthly operating costs". */
export function describeAssumedFields(fields = []) {
  if (fields.length === 0) return ''
  if (fields.length === 1) return fields[0]
  return `${fields.slice(0, -1).join(', ')} and ${fields[fields.length - 1]}`
}

/** True once the account has its own real price + cost on file — the minimum needed for any planning calculation to mean something. */
export function hasCoreAssumptions(values = {}) {
  return isNumber(values.selling_price) && isNumber(values.cost_per_unit)
}

/**
 * Fills only the gaps in an owner's saved assumptions.
 * @returns {{values: object, isIllustrative: boolean, assumedFields: string[]}}
 *   `assumedFields` names every field that was filled in, for the UI to disclose.
 */
export function resolveDisplayAssumptions(values = {}) {
  const resolved = {}
  const assumedFields = []

  const take = (field, fallback) => {
    if (isNumber(values[field])) {
      resolved[field] = values[field]
      return
    }
    resolved[field] = fallback
    if (FIELD_LABELS[field]) assumedFields.push(FIELD_LABELS[field])
  }

  // Price and cost per unit are derived from each other where possible, so
  // a real figure the owner entered stays on screen and the pair remains
  // internally coherent at the example's margin.
  const realPrice = isNumber(values.selling_price) ? values.selling_price : null
  const realCost = isNumber(values.cost_per_unit) ? values.cost_per_unit : null
  if (realPrice !== null && realCost === null) {
    take('selling_price', realPrice)
    take('cost_per_unit', round2(realPrice * (1 - EXAMPLE_MARGIN_RATIO)))
  } else if (realCost !== null && realPrice === null) {
    take('cost_per_unit', realCost)
    take('selling_price', round2(realCost / (1 - EXAMPLE_MARGIN_RATIO)))
  } else {
    take('selling_price', ILLUSTRATIVE_ASSUMPTIONS.selling_price)
    take('cost_per_unit', ILLUSTRATIVE_ASSUMPTIONS.cost_per_unit)
  }

  take('expected_monthly_units', ILLUSTRATIVE_ASSUMPTIONS.expected_monthly_units)
  take('number_of_products', ILLUSTRATIVE_ASSUMPTIONS.number_of_products)

  // Operating costs are all-or-nothing on purpose: if the owner recorded
  // even one cost, only theirs is shown — inventing extra categories
  // would silently inflate their real cost base and their break-even.
  const hasAnyOperatingCost = OPERATING_COST_FIELDS.some((field) => isNumber(values[field]))
  for (const field of OPERATING_COST_FIELDS) {
    if (hasAnyOperatingCost) {
      if (isNumber(values[field])) resolved[field] = values[field]
    } else {
      resolved[field] = ILLUSTRATIVE_ASSUMPTIONS[field]
    }
  }
  if (!hasAnyOperatingCost) assumedFields.push('monthly operating costs')

  return { values: resolved, isIllustrative: assumedFields.length > 0, assumedFields }
}
