/**
 * Shared Day/Month aggregation for per-day trend/series charts (Dashboard,
 * Forecasting, Sentiment Analysis, Social Intelligence, Crisis Detection).
 * Pure function — callers already fetch a wider date window before calling
 * this when the user picks "Month" (a month view is meaningless over only
 * 7-14 days of data); this only buckets whatever rows it's given.
 */

/** 'YYYY-MM-DD' (or any ISO-prefixed string) -> 'YYYY-MM'. */
function monthKeyOf(dateValue) {
  return String(dateValue).slice(0, 7)
}

/** 'YYYY-MM' -> 'Nov 2025', via a real Date (UTC, so no timezone-shift
 * flips a month boundary date into the wrong month label). */
function monthLabelOf(monthKey) {
  const date = new Date(`${monthKey}-01T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return monthKey
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Buckets `rows` by calendar month of `row[dateKey]`. Fields in `sumKeys`
 * are summed across the month (volumes, units — additive quantities);
 * fields in `avgKeys` are averaged (percentages, scores — rounded to 1
 * decimal place, this project's existing convention). Only emits a month
 * that has at least one real row — never fabricates an empty month to
 * fill a gap. Output is sorted chronologically, one row per month:
 * `{ [dateKey]: 'YYYY-MM', label: 'Nov 2025', ...summed, ...averaged }`.
 *
 * @param {Array<Record<string, *>>} rows
 * @param {{dateKey?: string, sumKeys?: string[], avgKeys?: string[]}} options
 */
export function aggregateToMonthly(rows = [], { dateKey = 'date', sumKeys = [], avgKeys = [] } = {}) {
  const buckets = new Map()

  for (const row of rows) {
    const raw = row[dateKey]
    if (!raw) continue
    const monthKey = monthKeyOf(raw)
    if (!buckets.has(monthKey)) {
      const sums = {}
      for (const key of sumKeys) sums[key] = 0
      const avgAccum = {}
      for (const key of avgKeys) avgAccum[key] = { sum: 0, count: 0 }
      buckets.set(monthKey, { sums, avgAccum })
    }
    const bucket = buckets.get(monthKey)
    for (const key of sumKeys) {
      const value = row[key]
      if (typeof value === 'number' && Number.isFinite(value)) bucket.sums[key] += value
    }
    for (const key of avgKeys) {
      const value = row[key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        bucket.avgAccum[key].sum += value
        bucket.avgAccum[key].count += 1
      }
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, bucket]) => {
      const averaged = {}
      for (const key of avgKeys) {
        const { sum, count } = bucket.avgAccum[key]
        averaged[key] = count > 0 ? Math.round((sum / count) * 10) / 10 : null
      }
      return {
        [dateKey]: monthKey,
        label: monthLabelOf(monthKey),
        ...bucket.sums,
        ...averaged,
      }
    })
}
