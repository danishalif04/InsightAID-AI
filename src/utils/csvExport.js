/**
 * Real client-side CSV export — used instead of a toast that claims "export
 * started" with nothing behind it (FYP2.md §40).
 */

export function rowsToCsv(rows) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (value) => {
    const str = value == null ? '' : String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const lines = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))]
  return lines.join('\n')
}

/** Triggers a real browser download of `rows` as a CSV file. No-op DOM side
 * effect, not unit-tested — rowsToCsv() above carries the tested logic. */
export function downloadCsv(filename, rows) {
  const csv = rowsToCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
