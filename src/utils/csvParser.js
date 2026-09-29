/**
 * Hand-written CSV parser — no library, consistent with this codebase's
 * existing avoidance of unnecessary dependencies. Handles quoted fields,
 * embedded commas/newlines, and escaped quotes ("").
 */

/** Splits CSV text into rows of raw string cells (before header mapping). */
export function parseCsvRows(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/** Parses CSV text into an array of { column: value } objects using the first row as headers. */
export function parseCsv(text) {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return { headers: [], records: [] }

  const headers = rows[0].map((header) => header.trim())
  const records = rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, (row[index] ?? '').trim()]))
  )

  return { headers, records }
}
