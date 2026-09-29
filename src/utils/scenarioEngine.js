/**
 * Deterministic scenario engine (FYP2.md §28-31). Pure functions only — no
 * React, no Supabase. Every number is calculated from the caller's own
 * business_assumptions; nothing here invents a financial value that isn't
 * traceable to an input or a clearly-labelled, documented default.
 *
 * All monetary/unit inputs come from business_assumptions
 * (src/utils/businessProfileSchema.js's `assumptions` fields).
 */

export const CASE_TYPES = ['conservative', 'expected', 'growth']

const CONSERVATIVE_MULTIPLIER = 0.7 // matches FYP2.md §28's own worked example (100 -> 70)
const DEFAULT_GROWTH_RATE_PERCENT = 40 // matches FYP2.md §28's own worked example (100 -> 140)

const OPERATING_COST_FIELDS = ['marketing_cost', 'platform_fees', 'shipping_cost', 'labour_cost', 'fixed_costs', 'other_expenses']

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

function sumOperatingCosts(assumptions) {
  const present = OPERATING_COST_FIELDS.filter((field) => isNumber(assumptions[field]))
  if (present.length === 0) return { total: null, formula: 'No operating cost fields provided.' }
  const total = present.reduce((sum, field) => sum + assumptions[field], 0)
  const formula = `${present.map((field) => `${field} (RM${assumptions[field]})`).join(' + ')} = RM${total.toFixed(2)}`
  return { total, formula }
}

/**
 * Builds one scenario ('conservative' | 'expected' | 'growth').
 * Returns { caseType, multiplier, units, revenue, variableCosts, grossProfit,
 *           operatingCosts, operatingResult, formulas: [{label, expression}],
 *           insufficientFields: string[] }
 * A field appears in `insufficientFields` (not a fabricated 0) whenever an
 * input needed to compute it was missing.
 */
export function buildScenario(assumptions = {}, caseType) {
  if (!CASE_TYPES.includes(caseType)) throw new Error(`Unknown scenario case: ${caseType}`)

  const formulas = []
  const insufficientFields = []

  let multiplier = 1
  if (caseType === 'conservative') {
    multiplier = CONSERVATIVE_MULTIPLIER
    formulas.push({
      label: 'Scenario adjustment',
      expression: `Conservative assumes ${Math.round((1 - CONSERVATIVE_MULTIPLIER) * 100)}% fewer units than expected.`,
    })
  } else if (caseType === 'growth') {
    const growthRatePercent = isNumber(assumptions.expected_growth_rate)
      ? assumptions.expected_growth_rate
      : DEFAULT_GROWTH_RATE_PERCENT
    multiplier = 1 + growthRatePercent / 100
    formulas.push({
      label: 'Scenario adjustment',
      expression: isNumber(assumptions.expected_growth_rate)
        ? `Growth uses your stated growth rate: +${growthRatePercent}% units.`
        : `Growth uses a default assumption of +${growthRatePercent}% units (no growth rate provided).`,
    })
  } else {
    formulas.push({ label: 'Scenario adjustment', expression: 'Expected uses your stated assumptions as-is.' })
  }

  // Units
  let units = null
  if (isNumber(assumptions.expected_monthly_units)) {
    units = Math.round(assumptions.expected_monthly_units * multiplier)
    formulas.push({
      label: 'Units',
      expression: `${assumptions.expected_monthly_units} × ${multiplier.toFixed(2)} = ${units}`,
    })
  } else {
    insufficientFields.push('expected_monthly_units')
  }

  // Revenue: prefer units x price; fall back to scaling a directly-stated monthly revenue.
  let revenue = null
  if (units !== null && isNumber(assumptions.selling_price)) {
    revenue = Math.round(units * assumptions.selling_price * 100) / 100
    formulas.push({ label: 'Revenue', expression: `Units (${units}) × Selling Price (RM${assumptions.selling_price}) = RM${revenue}` })
  } else if (isNumber(assumptions.expected_monthly_revenue)) {
    revenue = Math.round(assumptions.expected_monthly_revenue * multiplier * 100) / 100
    formulas.push({
      label: 'Revenue',
      expression: `Expected Monthly Revenue (RM${assumptions.expected_monthly_revenue}) × ${multiplier.toFixed(2)} = RM${revenue}`,
    })
  } else {
    insufficientFields.push('revenue')
  }

  // Variable costs (units x cost per unit)
  let variableCosts = null
  if (units !== null && isNumber(assumptions.cost_per_unit)) {
    variableCosts = Math.round(units * assumptions.cost_per_unit * 100) / 100
    formulas.push({ label: 'Variable Costs', expression: `Units (${units}) × Cost per Unit (RM${assumptions.cost_per_unit}) = RM${variableCosts}` })
  } else {
    insufficientFields.push('variableCosts')
  }

  // Gross profit
  let grossProfit = null
  if (revenue !== null && variableCosts !== null) {
    grossProfit = Math.round((revenue - variableCosts) * 100) / 100
    formulas.push({ label: 'Gross Profit', expression: `Revenue (RM${revenue}) − Variable Costs (RM${variableCosts}) = RM${grossProfit}` })
  } else {
    insufficientFields.push('grossProfit')
  }

  // Operating costs — constant across scenarios (flat monthly figures, not per-unit rates).
  const { total: operatingCosts, formula: operatingCostsFormula } = sumOperatingCosts(assumptions)
  if (operatingCosts !== null) {
    formulas.push({ label: 'Operating Costs (same in every scenario)', expression: operatingCostsFormula })
  } else {
    insufficientFields.push('operatingCosts')
  }

  // Operating result
  let operatingResult = null
  if (grossProfit !== null && operatingCosts !== null) {
    operatingResult = Math.round((grossProfit - operatingCosts) * 100) / 100
    formulas.push({
      label: 'Estimated Operating Result',
      expression: `Gross Profit (RM${grossProfit}) − Operating Costs (RM${operatingCosts}) = RM${operatingResult}`,
    })
  } else {
    insufficientFields.push('operatingResult')
  }

  return {
    caseType,
    multiplier,
    units,
    revenue,
    variableCosts,
    grossProfit,
    operatingCosts,
    operatingResult,
    formulas,
    insufficientFields,
  }
}

export function buildAllScenarios(assumptions = {}) {
  return Object.fromEntries(CASE_TYPES.map((caseType) => [caseType, buildScenario(assumptions, caseType)]))
}

/** Break-even units/revenue using TOTAL monthly operating costs (all six cost fields), not just fixed_costs alone. */
export function calculateBreakEven(assumptions = {}) {
  const { total: operatingCosts, formula: costsFormula } = sumOperatingCosts(assumptions)
  const hasPrice = isNumber(assumptions.selling_price)
  const hasCostPerUnit = isNumber(assumptions.cost_per_unit)

  if (operatingCosts === null || !hasPrice || !hasCostPerUnit) {
    return { units: null, revenue: null, formula: null, insufficient: true }
  }

  const contributionMargin = assumptions.selling_price - assumptions.cost_per_unit
  if (contributionMargin <= 0) {
    return { units: null, revenue: null, formula: null, insufficient: true, reason: 'Selling price must exceed cost per unit.' }
  }

  const units = Math.ceil(operatingCosts / contributionMargin)
  const revenue = Math.round(units * assumptions.selling_price * 100) / 100

  return {
    units,
    revenue,
    formula: `Break-even Units = Total Monthly Costs (RM${operatingCosts.toFixed(2)}, from: ${costsFormula}) ÷ (Price RM${assumptions.selling_price} − Cost per Unit RM${assumptions.cost_per_unit}) = ${units} units → Break-even Revenue = ${units} × RM${assumptions.selling_price} = RM${revenue}`,
    insufficient: false,
  }
}

export function calculateGrossMarginPercent(revenue, grossProfit) {
  if (!isNumber(revenue) || revenue === 0 || !isNumber(grossProfit)) return null
  return Math.round((grossProfit / revenue) * 1000) / 10
}

export function calculateMarketingCostRatioPercent(marketingCost, revenue) {
  if (!isNumber(marketingCost) || !isNumber(revenue) || revenue === 0) return null
  return Math.round((marketingCost / revenue) * 1000) / 10
}
