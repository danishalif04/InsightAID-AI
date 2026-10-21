/**
 * Pure aggregation of raw sales rows (raw_data.payload for
 * template_id='sales' — see src/services/salesService.js for the
 * read-only fetch) into daily revenue/units/cost/margin/discount and
 * per-product/per-category breakdowns. Does not touch the ingestion
 * pipeline (dataPipelineService.js) — a new read-only view over the same
 * uploaded data, nothing re-written.
 *
 * `revenue` is treated as already net of any discount (confirmed against
 * a real uploaded row: quantity_sold=10 * unit_price=24.9 = 249.0 =
 * revenue, with discount=0.0 on that row) — `discount` is reported
 * separately (for promoDays.js) but never subtracted a second time here.
 * `cost` is the line's TOTAL cost, not a per-unit cost (a real sampled
 * row has cost=89.27 against revenue=249.0 for quantity_sold=10, which
 * only produces a plausible ~64% gross margin if cost is a line total —
 * a per-unit reading would imply a -258% margin).
 */

function toNumber(value) {
  if (value == null || value === '') return null
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function toIsoDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

/** @returns {object|null} a normalized row, or null if it's missing a date or revenue (never guessed) */
export function normalizeSalesRow(raw) {
  const date = toIsoDate(raw?.date)
  const revenue = toNumber(raw?.revenue)
  if (!date || revenue == null) return null

  return {
    date,
    product: raw.product ?? null,
    category: raw.category ?? null,
    quantitySold: toNumber(raw.quantity_sold),
    unitPrice: toNumber(raw.unit_price),
    revenue,
    discount: toNumber(raw.discount),
    cost: toNumber(raw.cost),
  }
}

export function normalizeSalesRows(rawRows = []) {
  return rawRows.map(normalizeSalesRow).filter(Boolean)
}

/** One row per day the data actually has — sparse, never zero-filled here
 * (callers needing a continuous series for a chart x-axis do that
 * themselves, since whether "no sales that day" should read as a real 0
 * or a gap depends on the chart). */
export function computeDailySalesSeries(rows = []) {
  const byDate = new Map()

  for (const row of rows) {
    if (!byDate.has(row.date)) {
      byDate.set(row.date, {
        date: row.date,
        revenue: 0,
        units: 0,
        cost: 0,
        discountSum: 0,
        discountCount: 0,
      })
    }
    const bucket = byDate.get(row.date)
    bucket.revenue += row.revenue
    if (row.quantitySold != null) bucket.units += row.quantitySold
    if (row.cost != null) bucket.cost += row.cost
    if (row.discount != null) {
      bucket.discountSum += row.discount
      bucket.discountCount += 1
    }
  }

  return [...byDate.values()]
    .map((bucket) => ({
      date: bucket.date,
      revenue: Math.round(bucket.revenue * 100) / 100,
      units: bucket.units,
      cost: Math.round(bucket.cost * 100) / 100,
      grossMargin:
        bucket.revenue > 0
          ? Math.round(((bucket.revenue - bucket.cost) / bucket.revenue) * 1000) / 10
          : null,
      avgDiscount:
        bucket.discountCount > 0
          ? Math.round((bucket.discountSum / bucket.discountCount) * 100) / 100
          : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function groupBy(rows, field) {
  const groups = new Map()
  for (const row of rows) {
    const key = row[field]
    if (!key) continue
    if (!groups.has(key)) groups.set(key, { key, revenue: 0, units: 0, cost: 0 })
    const bucket = groups.get(key)
    bucket.revenue += row.revenue
    if (row.quantitySold != null) bucket.units += row.quantitySold
    if (row.cost != null) bucket.cost += row.cost
  }
  return [...groups.values()]
    .map((bucket) => ({
      [field]: bucket.key,
      revenue: Math.round(bucket.revenue * 100) / 100,
      units: bucket.units,
      cost: Math.round(bucket.cost * 100) / 100,
      grossMarginPercent:
        bucket.revenue > 0
          ? Math.round(((bucket.revenue - bucket.cost) / bucket.revenue) * 1000) / 10
          : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

export function computeProductBreakdown(rows = []) {
  return groupBy(rows, 'product')
}

export function computeCategoryBreakdown(rows = []) {
  return groupBy(rows, 'category')
}
