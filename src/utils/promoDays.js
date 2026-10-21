/**
 * Flags days whose average discount is clearly above the series' own
 * normal level — derived entirely from real sales data (salesSeries.js's
 * computeDailySalesSeries output), never a guessed/fixed discount
 * threshold. Labelled "Promo day (detected)" wherever shown (rule 0.1 —
 * this is a heuristic, not a flag the business explicitly set).
 *
 * Threshold rule: a day qualifies when its avgDiscount is at least
 * `multiplier` (default 1.5x) the series' own mean avgDiscount across
 * every day that had ANY discount recorded, AND is at least
 * `minAbsoluteDiscount` above zero (so a series where every day is
 * discount-free, with mean ~0, doesn't flag everything as "above
 * normal" off a near-zero baseline — a day needs to cross this floor
 * too, not just beat a tiny average).
 */

const DEFAULT_MULTIPLIER = 1.5
const DEFAULT_MIN_ABSOLUTE_DISCOUNT = 1

/**
 * @param {Array<{date:string, avgDiscount:number|null}>} dailySalesSeries
 * @param {{multiplier?:number, minAbsoluteDiscount?:number}} [options]
 * @returns {Array<{date:string, avgDiscount:number, baselineAvgDiscount:number}>}
 */
export function detectPromoDays(dailySalesSeries = [], options = {}) {
  const multiplier = options.multiplier ?? DEFAULT_MULTIPLIER
  const minAbsoluteDiscount = options.minAbsoluteDiscount ?? DEFAULT_MIN_ABSOLUTE_DISCOUNT

  const discountedDays = dailySalesSeries.filter(
    (day) => typeof day.avgDiscount === 'number' && day.avgDiscount > 0
  )
  if (discountedDays.length === 0) return []

  const baselineAvgDiscount =
    discountedDays.reduce((sum, day) => sum + day.avgDiscount, 0) / discountedDays.length

  return discountedDays
    .filter(
      (day) =>
        day.avgDiscount >= minAbsoluteDiscount &&
        day.avgDiscount >= baselineAvgDiscount * multiplier
    )
    .map((day) => ({
      date: day.date,
      avgDiscount: day.avgDiscount,
      baselineAvgDiscount: Math.round(baselineAvgDiscount * 100) / 100,
    }))
}
