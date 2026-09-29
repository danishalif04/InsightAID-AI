import { describe, expect, it } from 'vitest'
import { inferTemplateId, validateDataset } from './datasetValidation'

describe('inferTemplateId', () => {
  it('picks the template with the most matching column headers', () => {
    expect(inferTemplateId(['date', 'product', 'category', 'quantity_sold', 'unit_price', 'revenue', 'discount', 'cost'])).toBe('sales')
    expect(inferTemplateId(['date', 'product', 'review_text', 'rating', 'platform'])).toBe('reviews')
    expect(inferTemplateId(['date', 'expense_category', 'amount', 'description'])).toBe('expenses')
  })

  it('returns null instead of a low-confidence guess when nothing matches', () => {
    expect(inferTemplateId(['foo', 'bar', 'baz'])).toBeNull()
  })
})

describe('validateDataset', () => {
  it('reports a clean sales dataset as ready for processing', () => {
    const records = [
      { date: '2026-01-01', product: 'Serum', category: 'Skincare', quantity_sold: '10', unit_price: '35', revenue: '350', discount: '0', cost: '15' },
      { date: '2026-01-02', product: 'Cleanser', category: 'Skincare', quantity_sold: '5', unit_price: '20', revenue: '100', discount: '0', cost: '8' },
    ]
    const report = validateDataset('sales', records)
    expect(report.readyForProcessing).toBe(true)
    expect(report.missingColumns).toEqual([])
    expect(report.warnings).toEqual([])
    expect(report.rowCount).toBe(2)
  })

  it('flags missing required columns without throwing', () => {
    const report = validateDataset('sales', [{ date: '2026-01-01', product: 'Serum' }])
    expect(report.readyForProcessing).toBe(false)
    expect(report.missingColumns.length).toBeGreaterThan(0)
  })

  it('counts missing values per column', () => {
    const records = [
      { date: '2026-01-01', product: '', category: 'Skincare', quantity_sold: '10', unit_price: '35', revenue: '350', discount: '0', cost: '15' },
      { date: '2026-01-02', product: 'Cleanser', category: 'Skincare', quantity_sold: '5', unit_price: '20', revenue: '100', discount: '0', cost: '8' },
    ]
    const report = validateDataset('sales', records)
    expect(report.missingValueCounts.product).toBe(1)
  })

  it('flags duplicate rows without removing them', () => {
    const row = { date: '2026-01-01', product: 'Serum', category: 'Skincare', quantity_sold: '10', unit_price: '35', revenue: '350', discount: '0', cost: '15' }
    const records = [row, { ...row }]
    const report = validateDataset('sales', records)
    expect(report.duplicateCount).toBe(1)
    expect(report.duplicateFlags).toEqual([false, true])
    expect(report.rowCount).toBe(2) // nothing removed
  })

  it('flags invalid dates and invalid/negative numbers', () => {
    const records = [
      {
        date: 'not-a-date',
        product: 'Serum',
        category: 'Skincare',
        quantity_sold: 'ten',
        unit_price: '-5',
        revenue: '350',
        discount: '0',
        cost: '15',
      },
    ]
    const report = validateDataset('sales', records)
    expect(report.invalidDateCount).toBe(1)
    expect(report.invalidNumericCount).toBe(1) // quantity_sold: 'ten'
    expect(report.negativeCount).toBe(1) // unit_price: -5
  })

  it('validates the reviews template against its own column set', () => {
    const records = [{ date: '2026-01-01', product: 'Serum', review_text: 'Great!', rating: '5', platform: 'Shopee' }]
    const report = validateDataset('reviews', records)
    expect(report.readyForProcessing).toBe(true)
  })

  it('reports (not judges) distinct category values found', () => {
    const records = [
      { date: '1', product: 'A', category: 'Skincare', quantity_sold: '1', unit_price: '1', revenue: '1', discount: '0', cost: '1' },
      { date: '2', product: 'B', category: 'skincare', quantity_sold: '1', unit_price: '1', revenue: '1', discount: '0', cost: '1' },
    ]
    const report = validateDataset('sales', records)
    expect(report.categoriesFound.sort()).toEqual(['Skincare', 'skincare'])
  })

  it('handles an unknown template id without throwing', () => {
    const report = validateDataset('unknown', [])
    expect(report.readyForProcessing).toBe(false)
    expect(report.warnings[0]).toMatch(/Unknown template/)
  })
})
