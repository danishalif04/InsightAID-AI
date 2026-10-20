import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { parseXlsx } from './excelParser'

/** Builds a real .xlsx workbook buffer from rows, the same way an actual
 * Excel export would — so this test exercises real XLSX parsing, not a
 * hand-rolled mock of what the library might return. */
function buildWorkbookBuffer(rows, { sheetNames = ['Sheet1'] } = {}) {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, sheetNames[0])
  for (const extra of sheetNames.slice(1)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ ignored: 'should not appear' }]), extra)
  }
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

describe('parseXlsx', () => {
  it('parses a real workbook into headers + records', () => {
    const buffer = buildWorkbookBuffer([
      { date: '2026-01-01', product: 'Serum', quantity_sold: 5 },
      { date: '2026-01-02', product: 'Cleanser', quantity_sold: 3 },
    ])

    const { headers, records } = parseXlsx(buffer)
    expect(headers).toEqual(['date', 'product', 'quantity_sold'])
    expect(records).toHaveLength(2)
    expect(records[0].product).toBe('Serum')
    expect(records[0].quantity_sold).toBe('5') // raw: false - matches a CSV upload's string cells
  })

  it('only reads the first sheet, ignoring the rest', () => {
    const buffer = buildWorkbookBuffer([{ a: 1 }], { sheetNames: ['Data', 'Notes'] })
    const { records } = parseXlsx(buffer)
    expect(records).toEqual([{ a: '1' }])
  })

  it('returns empty headers/records for an empty sheet, never throwing', () => {
    const buffer = buildWorkbookBuffer([])
    const { headers, records } = parseXlsx(buffer)
    expect(headers).toEqual([])
    expect(records).toEqual([])
  })
})
