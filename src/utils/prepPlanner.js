/**
 * Prep & Stock Planner (SPARK 2026). Pure logic, no Supabase.
 *
 * Turns per-item daily sales into tomorrow's prep / order quantities, and
 * replays the last few weeks to compare two ordering habits:
 *
 *   - "last week": order what sold on the same weekday last week, plus buffer
 *   - "forecast":  order the average of the same weekday over the previous
 *                  four weeks, plus buffer, cut back for items named in
 *                  recent negative reviews
 *
 * Every rule is stated in the returned `rule` text so the page can show it.
 *
 * Assumptions (shown on the page as well):
 *   - units sold are treated as demand. On sold-out days true demand was
 *     higher, so stockouts are under-counted for both habits equally.
 *   - stock is used oldest first; a batch is thrown away once it is
 *     `shelfLifeDays` days old. Items without a known shelf life are left
 *     out of the waste replay instead of being given a guessed one.
 *   - both habits start the replay with no stock on hand.
 */

const DAY_MS = 86_400_000

export const FRESHNESS_WORDS = [
  'basi', 'stale', 'not fresh', 'tak fresh', 'tidak segar', 'rosak', 'expired', 'smelled off', 'berbau',
  '不新鲜', '馊', '异味', '过期',
]

export const PLANNER_DEFAULTS = Object.freeze({
  bufferPct: 10,
  flagReductionPct: 20,
  lookbackDays: 7,
  historyWeeks: 4,
  replayDays: 28,
})

export function addDays(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)
}

function weekday(iso) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay()
}

/**
 * @param {{date:string,item:string,units:number}[]} rows
 * @returns {Map<string, Map<string, number>>} item -> (date -> units), units summed per day
 */
export function buildItemSeries(rows = []) {
  const series = new Map()
  for (const row of rows) {
    if (!row?.item || !row.date || !Number.isFinite(row.units)) continue
    if (!series.has(row.item)) series.set(row.item, new Map())
    const byDate = series.get(row.item)
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.units)
  }
  return series
}

/** Units on the same weekday in the `weeks` most recent weeks before `targetDate` that have data. */
function sameWeekdayHistory(byDate, targetDate, weeks) {
  const values = []
  for (let k = 1; k <= weeks; k += 1) {
    const d = addDays(targetDate, -7 * k)
    if (byDate.has(d)) values.push(byDate.get(d))
  }
  return values
}

/** Mean of the same weekday over the last `weeks` weeks, or null when none of those days have data. */
export function weekdayAverageForecast(byDate, targetDate, weeks = PLANNER_DEFAULTS.historyWeeks) {
  const values = sameWeekdayHistory(byDate, targetDate, weeks)
  if (values.length === 0) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

/** Units sold on the same weekday one week earlier, or null if that day has no data. */
export function lastWeekQuantity(byDate, targetDate) {
  const d = addDays(targetDate, -7)
  return byDate.has(d) ? byDate.get(d) : null
}

function reviewMentionsItem(review, item) {
  if (review.item) return review.item === item.item
  const text = (review.text ?? '').toLowerCase()
  return text.includes(item.item.toLowerCase()) || (item.itemZh ? text.includes(item.itemZh) : false)
}

function isNegative(review) {
  if (review.sentiment) return review.sentiment === 'negative'
  return Number.isFinite(review.rating) && review.rating <= 2
}

/**
 * Items named in negative reviews in the `lookbackDays` days BEFORE `asOf`
 * (the day itself is not included, so a replay never uses same-day reviews).
 * @returns {Map<string, {count:number, freshness:boolean, examples:string[]}>}
 */
export function flagItemsFromReviews(reviews = [], items = [], { asOf, lookbackDays = PLANNER_DEFAULTS.lookbackDays } = {}) {
  const from = addDays(asOf, -lookbackDays)
  const flags = new Map()
  for (const review of reviews) {
    if (!review?.date || review.date < from || review.date >= asOf || !isNegative(review)) continue
    for (const item of items) {
      if (!reviewMentionsItem(review, item)) continue
      const text = (review.text ?? '').toLowerCase()
      const flag = flags.get(item.item) ?? { count: 0, freshness: false, examples: [] }
      flag.count += 1
      flag.freshness ||= FRESHNESS_WORDS.some((w) => text.includes(w))
      if (flag.examples.length < 2 && review.text) flag.examples.push(review.text)
      flags.set(item.item, flag)
    }
  }
  return flags
}

/** First date after the last sales date whose weekday has history (skips days the shop never opens). */
export function nextPlanDate(series) {
  let last = null
  const openWeekdays = new Set()
  for (const byDate of series.values()) {
    for (const d of byDate.keys()) {
      if (!last || d > last) last = d
      openWeekdays.add(weekday(d))
    }
  }
  if (!last) return null
  let d = addDays(last, 1)
  for (let i = 0; i < 7 && !openWeekdays.has(weekday(d)); i += 1) d = addDays(d, 1)
  return d
}

function forecastTarget(forecast, bufferPct, flagged, flagReductionPct) {
  const reduction = flagged ? 1 - flagReductionPct / 100 : 1
  return Math.ceil(forecast * (1 + bufferPct / 100) * reduction)
}

/**
 * Tomorrow's plan, one row per item.
 * @param {{series:Map, items:object[], reviews:object[], planDate?:string, bufferPct?:number, flagReductionPct?:number}} args
 */
export function buildPrepPlan({ series, items, reviews = [], planDate, ...opts }) {
  const o = { ...PLANNER_DEFAULTS, ...opts }
  const date = planDate ?? nextPlanDate(series)
  if (!date) return { planDate: null, rows: [] }
  const flags = flagItemsFromReviews(reviews, items, { asOf: date, lookbackDays: o.lookbackDays })

  const rows = items.map((item) => {
    const byDate = series.get(item.item) ?? new Map()
    const forecast = weekdayAverageForecast(byDate, date, o.historyWeeks)
    const flag = flags.get(item.item) ?? null
    if (forecast == null) {
      return { item: item.item, section: item.section ?? null, forecast: null, quantity: null, flag, rule: 'Not enough history for this weekday.' }
    }
    const quantity = forecastTarget(forecast, o.bufferPct, Boolean(flag), o.flagReductionPct)
    const parts = [`Average of the same weekday over the last ${o.historyWeeks} weeks (${forecast.toFixed(1)}), plus ${o.bufferPct}% safety buffer`]
    if (flag) {
      parts.push(`minus ${o.flagReductionPct}% because ${flag.count} negative review${flag.count === 1 ? '' : 's'} in the last ${o.lookbackDays} days named this item${flag.freshness ? ' (freshness complaint)' : ''}`)
    }
    return { item: item.item, section: item.section ?? null, forecast, quantity, flag, rule: `${parts.join(', ')}.` }
  })
  return { planDate: date, rows }
}

/** One item, one ordering habit, oldest stock sold first. */
function replayItem({ byDate, days, shelfLifeDays, targetFor }) {
  let lots = [] // { made: iso, qty }
  let wasteUnits = 0
  let stockoutUnits = 0
  let orderedUnits = 0
  let soldUnits = 0

  const discardExpired = (onDate) => {
    lots = lots.filter((lot) => {
      if (daysBetween(lot.made, onDate) >= shelfLifeDays) {
        wasteUnits += lot.qty
        return false
      }
      return true
    })
  }

  for (const d of days) {
    discardExpired(d)
    const onHand = lots.reduce((s, l) => s + l.qty, 0)
    const target = targetFor(d)
    const order = Math.max(0, target - onHand)
    if (order > 0) lots.push({ made: d, qty: order })
    orderedUnits += order

    let demand = byDate.get(d) ?? 0
    const wanted = demand
    for (const lot of lots) {
      const take = Math.min(lot.qty, demand)
      lot.qty -= take
      demand -= take
    }
    lots = lots.filter((l) => l.qty > 0)
    soldUnits += wanted - demand
    stockoutUnits += demand
  }
  if (days.length) discardExpired(addDays(days[days.length - 1], 1))
  return { wasteUnits, stockoutUnits, orderedUnits, soldUnits }
}

/**
 * Replays the last `replayDays` days of data for both habits. Each day's
 * order uses only data from before that day.
 * @returns {{from:string|null,to:string|null, items:object[], excluded:string[], totals:{lastWeek:object, forecast:object}}}
 */
export function simulateWaste({ series, items, reviews = [], ...opts }) {
  const o = { ...PLANNER_DEFAULTS, ...opts }
  const empty = { wasteUnits: 0, wasteRM: 0, stockoutUnits: 0, orderedUnits: 0, soldUnits: 0 }
  const totals = { lastWeek: { ...empty }, forecast: { ...empty } }
  const excluded = []
  const out = []

  let last = null
  for (const byDate of series.values()) for (const d of byDate.keys()) if (!last || d > last) last = d
  if (!last) return { from: null, to: null, items: [], excluded: items.map((i) => i.item), totals }
  const from = addDays(last, -(o.replayDays - 1))

  for (const item of items) {
    const byDate = series.get(item.item)
    if (!byDate || !Number.isFinite(item.shelfLifeDays) || item.shelfLifeDays < 1 || !Number.isFinite(item.unitCost)) {
      excluded.push(item.item)
      continue
    }
    // Only days that have data and enough history for BOTH habits, so they are compared on the same days.
    const days = [...byDate.keys()]
      .filter((d) => d >= from && d <= last)
      .filter((d) => lastWeekQuantity(byDate, d) != null && weekdayAverageForecast(byDate, d, o.historyWeeks) != null)
      .sort()
    if (days.length === 0) {
      excluded.push(item.item)
      continue
    }

    const flagCache = new Map()
    const flagged = (d) => {
      if (!flagCache.has(d)) flagCache.set(d, flagItemsFromReviews(reviews, [item], { asOf: d, lookbackDays: o.lookbackDays }).has(item.item))
      return flagCache.get(d)
    }
    const lastWeek = replayItem({
      byDate, days, shelfLifeDays: item.shelfLifeDays,
      targetFor: (d) => Math.ceil(lastWeekQuantity(byDate, d) * (1 + o.bufferPct / 100)),
    })
    const forecast = replayItem({
      byDate, days, shelfLifeDays: item.shelfLifeDays,
      targetFor: (d) => forecastTarget(weekdayAverageForecast(byDate, d, o.historyWeeks), o.bufferPct, flagged(d), o.flagReductionPct),
    })
    for (const [key, r] of [['lastWeek', lastWeek], ['forecast', forecast]]) {
      r.wasteRM = r.wasteUnits * item.unitCost
      for (const k of Object.keys(empty)) totals[key][k] += r[k]
    }
    out.push({ item: item.item, days: days.length, lastWeek, forecast })
  }
  return { from, to: last, items: out, excluded, totals }
}

/** The bundled Koperasi Siswa Maju sample (src/data/koperasiSiswaMaju.json) as planner input. */
export function fromKoperasiBundle(bundle) {
  return {
    synthetic: bundle.synthetic === true,
    name: bundle.name,
    items: bundle.items,
    salesRows: bundle.sales.map(([date, item, units]) => ({ date, item, units })),
    reviews: bundle.reviews.map(([date, language, rating, sentiment, item, text]) => ({ date, language, rating, sentiment, item, text })),
  }
}

function num(v) {
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * An account's own uploaded sales (raw_data.payload, template 'sales') as
 * planner input. Uses only rows with a product and a quantity. Unit cost
 * comes from the line's total `cost` divided by its quantity (see
 * salesSeries.js for why `cost` is a line total). Shelf life is read from an
 * optional `shelf_life_days` column; without it the item is planned but left
 * out of the waste replay.
 */
export function fromSalesPayloads(payloads = []) {
  const salesRows = []
  const costs = new Map() // item -> { cost, units, shelf, price }
  for (const p of payloads) {
    const item = typeof p?.product === 'string' ? p.product.trim() : ''
    const units = num(p?.quantity_sold)
    const date = p?.date ? new Date(p.date) : null
    if (!item || units == null || !date || Number.isNaN(date.getTime())) continue
    salesRows.push({ date: date.toISOString().slice(0, 10), item, units })
    const c = costs.get(item) ?? { cost: 0, costUnits: 0, shelf: null, price: null }
    const lineCost = num(p.cost)
    if (lineCost != null && units > 0) {
      c.cost += lineCost
      c.costUnits += units
    }
    c.shelf ??= num(p.shelf_life_days)
    c.price ??= num(p.unit_price)
    costs.set(item, c)
  }
  const items = [...costs.entries()].map(([item, c]) => ({
    item,
    section: null,
    unitPrice: c.price,
    unitCost: c.costUnits > 0 ? c.cost / c.costUnits : null,
    shelfLifeDays: c.shelf,
  }))
  return { synthetic: false, name: null, items, salesRows }
}

/** Saving of the forecast habit against the last-week habit (positive = forecast wastes less). */
export function wasteSaving(totals) {
  const units = totals.lastWeek.wasteUnits - totals.forecast.wasteUnits
  const rm = totals.lastWeek.wasteRM - totals.forecast.wasteRM
  const pct = totals.lastWeek.wasteRM > 0 ? (rm / totals.lastWeek.wasteRM) * 100 : null
  return { units, rm, pct }
}
