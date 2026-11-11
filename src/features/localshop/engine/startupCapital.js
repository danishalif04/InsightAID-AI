import { fail, isNum, ok, round } from './core'

/** The eight standard one-off setup categories an owner is asked for. */
export const STARTUP_CATEGORIES = [
  { id: 'rental_deposit', label: 'Rental deposit' },
  { id: 'renovation', label: 'Renovation' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'initial_stock', label: 'Initial stock' },
  { id: 'licences', label: 'Licences & registration' },
  { id: 'utilities_deposit', label: 'Utility deposits' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'emergency_reserve', label: 'Emergency reserve' },
]

/**
 * total = Σ items; cashNeeded = total + monthsBuffer × monthlyFixed.
 *
 * The buffer assumes ZERO revenue during those months — a deliberately
 * cautious assumption that must be shown to the owner, since a real shop
 * would normally take some money in.
 */
export function startupCapital(items, { availableCapital, monthsBuffer = 3, monthlyFixed } = {}) {
  const entries = STARTUP_CATEGORIES.map((category) => ({
    ...category,
    amount: isNum(items?.[category.id]) ? items[category.id] : null,
  }))
  const recorded = entries.filter((entry) => entry.amount !== null && entry.amount > 0)
  if (recorded.length === 0) return fail(['items'], 'no_recorded_items')

  const total = round(recorded.reduce((sum, entry) => sum + entry.amount, 0))
  const missingCategories = entries.filter((entry) => entry.amount === null).map((entry) => entry.label)

  const result = {
    total,
    allocation: recorded
      .map((entry) => ({ ...entry, sharePct: round((entry.amount / total) * 100, 1) }))
      .sort((a, b) => b.amount - a.amount),
    missingCategories,
    monthsBuffer,
    assumptions: [],
  }

  if (isNum(monthlyFixed)) {
    result.buffer = round(monthsBuffer * monthlyFixed)
    result.cashNeeded = round(total + result.buffer)
    result.assumptions.push(`${monthsBuffer}-month buffer assumes zero revenue in those months`)
  } else {
    result.cashNeeded = total
    result.assumptions.push('No monthly fixed costs recorded, so no operating buffer is included')
  }

  if (isNum(availableCapital)) {
    result.availableCapital = round(availableCapital)
    result.gap = round(result.cashNeeded - availableCapital)
    result.shortfall = result.gap > 0
  }

  return ok(result)
}

/** Months of runway. Needs BOTH figures — returns `missing` rather than guessing either. */
export function cashRunway(cash, monthlyOutflow) {
  if (!isNum(cash) || !isNum(monthlyOutflow)) {
    return fail([!isNum(cash) && 'cash', !isNum(monthlyOutflow) && 'monthlyOutflow'].filter(Boolean))
  }
  if (monthlyOutflow <= 0) return fail([], 'non_positive_outflow')
  return ok({ value: round(cash / monthlyOutflow, 1), unit: 'months' })
}
