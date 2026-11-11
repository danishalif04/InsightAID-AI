import { breakEvenUnits, grossMarginPct } from './breakEven'
import { fail, isNum, missingOf, ok, round } from './core'

/** One product's contribution and gross margin. */
export function productMargin(product) {
  const price = product?.price
  const cost = product?.cost
  const missing = missingOf({ price, cost })
  if (missing.length) return fail(missing)

  const margin = grossMarginPct(price, cost)
  if (!margin.ok) return margin

  return ok({
    id: product.id ?? null,
    name: product.name ?? null,
    price,
    cost,
    contribution: round(price - cost),
    marginPct: margin.value,
  })
}

/** Every product that has both a price and a cost, ranked by margin (highest first). */
export function marginTable(products) {
  const rows = (products ?? []).map(productMargin).filter((r) => r.ok)
  const skipped = (products ?? []).length - rows.length
  return ok({
    rows: rows.sort((a, b) => b.marginPct - a.marginPct),
    skipped,
    note: 'Margin alone does not show which product earns the most total profit — that also needs sales quantities.',
  })
}

/**
 * What changing one product's price does to its margin and to break-even.
 * `fixed` is optional; without it the break-even comparison is omitted
 * rather than guessed.
 */
export function priceChangeImpact(product, newPrice, fixed) {
  const before = productMargin(product)
  if (!before.ok) return before
  if (!isNum(newPrice)) return fail(['newPrice'])
  if (newPrice <= 0) return fail([], 'non_positive_price')

  const after = productMargin({ ...product, price: newPrice })
  if (!after.ok) return after

  const result = {
    before: { price: before.price, marginPct: before.marginPct, contribution: before.contribution },
    after: { price: round(newPrice), marginPct: after.marginPct, contribution: after.contribution },
    marginDeltaPp: round(after.marginPct - before.marginPct),
    contributionDelta: round(after.contribution - before.contribution),
  }

  if (isNum(fixed)) {
    const bepBefore = breakEvenUnits(fixed, before.price, before.cost)
    const bepAfter = breakEvenUnits(fixed, newPrice, before.cost)
    if (bepBefore.ok && bepAfter.ok) {
      result.breakEvenUnitsBefore = bepBefore.value
      result.breakEvenUnitsAfter = bepAfter.value
      result.breakEvenUnitsDelta = bepAfter.value - bepBefore.value
    }
  }

  return ok(result)
}
