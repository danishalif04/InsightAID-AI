const myr = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  maximumFractionDigits: 0,
})

const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** 67500 -> "RM 67,500" */
export function formatCurrencyMYR(value) {
  return myr.format(value)
}

/** 12340 -> "12.3K" */
export function formatCompact(value) {
  return compact.format(value)
}

/** 74.24 -> "74.2%" */
export function formatPercent(value, digits = 1) {
  return `${Number(value).toFixed(digits)}%`
}

/** 23 -> "+23%", -7.2 -> "-7.2%" (for delta chips) */
export function formatDelta(value, digits = 1) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(digits)}%`
}
