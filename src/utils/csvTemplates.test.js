import { describe, expect, it } from 'vitest'
import {
  CSV_TEMPLATES,
  buildCsvContent,
  downloadCsvTemplate,
  matchColumnsForTemplate,
  normalizeHeader,
  remapRecordToCanonicalColumns,
} from './csvTemplates'

describe('csvTemplates', () => {
  it('defines exactly the 5 templates and column sets from FYP2.md §34', () => {
    expect(CSV_TEMPLATES.map((t) => t.id).sort()).toEqual(['expenses', 'product', 'reviews', 'sales', 'social'])
    expect(CSV_TEMPLATES.find((t) => t.id === 'sales').columns).toEqual([
      'date',
      'product',
      'category',
      'quantity_sold',
      'unit_price',
      'revenue',
      'discount',
      'cost',
    ])
    expect(CSV_TEMPLATES.find((t) => t.id === 'expenses').columns).toEqual([
      'date',
      'expense_category',
      'amount',
      'description',
    ])
  })

  it('builds a header-only CSV row for a known template', () => {
    expect(buildCsvContent('product')).toBe('product,category,price,cost,stock\n')
  })

  it('throws for an unknown template id rather than silently returning nothing', () => {
    expect(() => buildCsvContent('unknown')).toThrow(/Unknown CSV template/)
  })

  it('downloadCsvTemplate no-ops outside a browser instead of crashing (e.g. in this test environment)', () => {
    expect(() => downloadCsvTemplate('sales')).not.toThrow()
  })
})

describe('normalizeHeader', () => {
  it('ignores case, surrounding whitespace, and punctuation/spacing variants', () => {
    expect(normalizeHeader('Order Date')).toBe('order date')
    expect(normalizeHeader('  order_date ')).toBe('order date')
    expect(normalizeHeader('Order-Date')).toBe('order date')
  })
})

describe('matchColumnsForTemplate', () => {
  it('matches exact canonical column names', () => {
    const { matchCount, mapping } = matchColumnsForTemplate('sales', ['date', 'product', 'revenue'])
    expect(matchCount).toBe(3)
    expect(mapping.get('date')).toBe('date')
  })

  it('matches known synonyms, case/spacing-insensitive', () => {
    const { matchCount, mapping } = matchColumnsForTemplate('sales', ['Order Date', 'Product Name', 'Total Price'])
    expect(matchCount).toBe(3)
    expect(mapping.get('Order Date')).toBe('date')
    expect(mapping.get('Product Name')).toBe('product')
    expect(mapping.get('Total Price')).toBe('revenue')
  })

  it('does not double-count two headers that are synonyms of the same column', () => {
    const { matchCount } = matchColumnsForTemplate('sales', ['Order Date', 'Transaction Date'])
    expect(matchCount).toBe(1) // both map to "date"
  })

  it('reports zero matches for headers with no relationship to the template', () => {
    const { matchCount, mapping } = matchColumnsForTemplate('sales', ['foo', 'bar'])
    expect(matchCount).toBe(0)
    expect(mapping.size).toBe(0)
  })
})

describe('remapRecordToCanonicalColumns', () => {
  it('renames matched headers to their canonical column, dropping unmatched ones', () => {
    const { mapping } = matchColumnsForTemplate('sales', ['Order Date', 'Product Name', 'Unrelated Column'])
    const remapped = remapRecordToCanonicalColumns(
      { 'Order Date': '2026-01-01', 'Product Name': 'Serum', 'Unrelated Column': 'ignore me' },
      mapping
    )
    expect(remapped).toEqual({ date: '2026-01-01', product: 'Serum' })
  })

  it('never mutates the original record', () => {
    const original = { 'Order Date': '2026-01-01' }
    const { mapping } = matchColumnsForTemplate('sales', ['Order Date'])
    remapRecordToCanonicalColumns(original, mapping)
    expect(original).toEqual({ 'Order Date': '2026-01-01' })
  })
})
