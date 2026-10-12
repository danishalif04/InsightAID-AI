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

/** "tiktok" -> "Tiktok" — used to title-case a raw platform/category string
 * pulled from real data (platform is free text, not a fixed enum). */
export function capitalize(word) {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** "Admin User" -> "AU", "Cher" -> "C", "" / null -> "?" — never a hardcoded initials string. */
export function initialsFromName(fullName) {
  if (!fullName || !fullName.trim()) return '?'
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}
