/**
 * Before vs After impact (SPARK 2026 Dashboard card). Pure.
 *
 * "Before" = ordering what sold on the same weekday last week.
 * "After"  = ordering by the Prep & Stock Planner (src/utils/prepPlanner.js).
 * Both are replayed over the account's own recent sales with the same
 * safety buffer. Returns null when the account's data cannot support the
 * comparison, so the card never shows a figure from someone else's data.
 */
import { buildItemSeries, fromSalesPayloads, PLANNER_DEFAULTS, simulateWaste, wasteSaving } from './prepPlanner.js'

export const IMPACT_ASSUMPTIONS = [
  'Before means ordering what sold on the same day last week. After means ordering by the Prep & Stock Planner.',
  `Both use the same ${PLANNER_DEFAULTS.bufferPct}% safety buffer over the last ${PLANNER_DEFAULTS.replayDays} days of your sales.`,
  'Units sold are treated as demand, so sold out days under-count what customers wanted.',
  'Waste is valued at unit cost. Items without a shelf life or a cost are left out.',
  'This is a replay of past days, not a promise of future savings.',
]

/** Planner-shaped reviews from processed_data rows. */
export function reviewsFromProcessedRows(rows = []) {
  return rows
    .map((row) => {
      const stamp = row.published_at ?? row.collected_at
      return {
        date: stamp ? new Date(stamp).toISOString().slice(0, 10) : null,
        item: row.product ?? null,
        text: row.raw_text ?? row.cleaned_text ?? '',
        sentiment: row.sentiment ?? null,
        rating: row.rating == null ? null : Number(row.rating),
      }
    })
    .filter((r) => r.date)
}

/**
 * @param {{salesPayloads:object[], processedRows?:object[]}} args
 * @returns {null | {from:string,to:string,itemCount:number,excluded:string[],before:object,after:object,saving:object,stockoutChange:number}}
 */
export function computeImpact({ salesPayloads = [], processedRows = [] }) {
  const data = fromSalesPayloads(salesPayloads)
  if (data.salesRows.length === 0) return null
  const replay = simulateWaste({
    series: buildItemSeries(data.salesRows),
    items: data.items,
    reviews: reviewsFromProcessedRows(processedRows),
  })
  if (replay.items.length === 0) return null
  const { lastWeek, forecast } = replay.totals
  return {
    from: replay.from,
    to: replay.to,
    itemCount: replay.items.length,
    excluded: replay.excluded,
    before: { wasteRM: lastWeek.wasteRM, wasteUnits: lastWeek.wasteUnits, stockoutUnits: lastWeek.stockoutUnits },
    after: { wasteRM: forecast.wasteRM, wasteUnits: forecast.wasteUnits, stockoutUnits: forecast.stockoutUnits },
    saving: wasteSaving(replay.totals),
    stockoutChange: forecast.stockoutUnits - lastWeek.stockoutUnits,
  }
}
