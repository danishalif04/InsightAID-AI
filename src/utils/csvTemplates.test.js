import { describe, expect, it } from 'vitest'
import { CSV_TEMPLATES, buildCsvContent, downloadCsvTemplate } from './csvTemplates'

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
