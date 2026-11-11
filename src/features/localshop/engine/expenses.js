import { fail, isNum, ok, round } from './core'

/**
 * Totals recorded expenses and splits them fixed vs variable, with a
 * per-category share. Rows missing an amount are reported in `skipped`
 * rather than silently counted as zero.
 */
export function monthlyExpenses(items) {
  const usable = (items ?? []).filter((item) => isNum(item?.amount))
  const skipped = (items ?? []).length - usable.length
  if (usable.length === 0) return fail(['items'], 'no_recorded_expenses')

  const total = usable.reduce((sum, item) => sum + item.amount, 0)
  const fixed = usable.filter((i) => i.kind !== 'variable').reduce((sum, i) => sum + i.amount, 0)
  const variable = round(total - fixed)

  const byCategory = usable
    .map((item) => ({
      category: item.category ?? 'Other',
      amount: round(item.amount),
      kind: item.kind === 'variable' ? 'variable' : 'fixed',
      controllable: item.controllable === true,
      sharePct: total > 0 ? round((item.amount / total) * 100, 1) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  return ok({
    total: round(total),
    fixed: round(fixed),
    variable,
    fixedSharePct: total > 0 ? round((fixed / total) * 100, 1) : 0,
    byCategory,
    skipped,
  })
}
