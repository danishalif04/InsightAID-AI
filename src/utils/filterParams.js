/**
 * Pure URL <-> filter-state translation for FilterProvider (src/contexts/).
 * Kept separate from the React context/provider so the actual
 * serialization logic (what Phase C's redesigned pages depend on for
 * deep-linkable views like /crisis-detection?from=...&to=...) has its own
 * tests independent of React Router.
 */

export const DATE_RANGE_PRESETS = ['7D', '30D', '90D', 'All', 'custom']
export const DEFAULT_FILTERS = { preset: 'All', from: null, to: null, platforms: [], products: [] }

function splitParam(value) {
  return value ? value.split(',').filter(Boolean) : []
}

/** Reads a URLSearchParams (or any object with .get()) into filter state.
 * Anything missing/invalid falls back to DEFAULT_FILTERS' value for that
 * field — never throws on a malformed query string. */
export function parseFiltersFromSearchParams(searchParams) {
  const from = searchParams.get('from') || null
  const to = searchParams.get('to') || null
  const rawPreset = searchParams.get('range')
  const preset = DATE_RANGE_PRESETS.includes(rawPreset)
    ? rawPreset
    : from || to
      ? 'custom'
      : DEFAULT_FILTERS.preset

  return {
    preset,
    from,
    to,
    platforms: splitParam(searchParams.get('platform')),
    products: splitParam(searchParams.get('product')),
  }
}

/** Inverse of parseFiltersFromSearchParams — omits any field that's at its
 * default, so the URL stays clean when nothing non-default is selected. */
export function filtersToSearchParams(filters) {
  const params = new URLSearchParams()
  if (filters.preset && filters.preset !== DEFAULT_FILTERS.preset)
    params.set('range', filters.preset)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.platforms?.length) params.set('platform', filters.platforms.join(','))
  if (filters.products?.length) params.set('product', filters.products.join(','))
  return params
}

const PRESET_DAYS = { '7D': 7, '30D': 30, '90D': 90 }

/** Resolves a preset into concrete {from, to} ISO (YYYY-MM-DD) dates,
 * inclusive of `today`. 'All' and an incomplete 'custom' both resolve to
 * {from: null, to: null} — the caller decides what "no bound" means for
 * its own query (e.g. omit the .gte()/.lte() entirely), never guessed
 * here. `today` is injectable so this is deterministic in tests. */
export function resolveDateRange(filters, today = new Date()) {
  if (filters.preset === 'custom') return { from: filters.from ?? null, to: filters.to ?? null }

  const days = PRESET_DAYS[filters.preset]
  if (!days) return { from: null, to: null }

  const to = today.toISOString().slice(0, 10)
  const fromDate = new Date(today)
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1))
  return { from: fromDate.toISOString().slice(0, 10), to }
}
