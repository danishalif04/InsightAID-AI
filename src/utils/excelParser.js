import * as XLSX from 'xlsx'

/**
 * Parses an uploaded Excel workbook (.xlsx/.xls) into the same
 * { headers, records } shape parseCsv()/JSON parsing already produce, so
 * dataPipelineService and the flexible column-matching it already does
 * (src/utils/csvTemplates.js) never need to know which format a file
 * actually came from.
 *
 * Reads only the FIRST sheet — every template in this app is a single
 * flat table, and silently guessing which of several sheets in a
 * multi-sheet workbook was meant would be worse than just picking one
 * predictably. `raw: false` converts Excel's native dates/numbers to the
 * same displayed-string form a CSV export of the same data would have
 * produced, so downstream validation sees one consistent shape regardless
 * of upload format.
 */
export function parseXlsx(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const records = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
  const headers = records.length > 0 ? Object.keys(records[0]) : []
  return { headers, records }
}
