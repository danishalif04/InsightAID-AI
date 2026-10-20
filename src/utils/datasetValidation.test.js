import { describe, expect, it } from 'vitest'
import { CUSTOM_TEMPLATE_ID, inferTemplateId, validateDataset } from './datasetValidation'

describe('inferTemplateId', () => {
  it('picks the template with the most matching column headers', () => {
    expect(inferTemplateId(['date', 'product', 'category', 'quantity_sold', 'unit_price', 'revenue', 'discount', 'cost'])).toBe('sales')
    expect(inferTemplateId(['date', 'product', 'review_text', 'rating', 'platform'])).toBe('reviews')
    expect(inferTemplateId(['date', 'expense_category', 'amount', 'description'])).toBe('expenses')
  })

  it('falls back to the custom template instead of a low-confidence guess when nothing matches', () => {
    expect(inferTemplateId(['foo', 'bar', 'baz'])).toBe(CUSTOM_TEMPLATE_ID)
  })

  it('recognizes real-world synonym headers, not just the exact canonical names', () => {
    expect(inferTemplateId(['Order Date', 'Product Name', 'Qty', 'Selling Price', 'Total Price'])).toBe('sales')
    expect(inferTemplateId(['Review Date', 'Item', 'Comment', 'Stars', 'Channel'])).toBe('reviews')
  })

  it('is case- and spacing-insensitive', () => {
    expect(inferTemplateId(['  ORDER_DATE ', 'product-name', 'QTY'])).toBe('sales')
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

  it('recognizes real-world synonym headers as satisfying required columns - the exact bug found via a live .xlsx upload, where this previously reported a false "missing required column" error on a file that ingestRows() processed successfully', () => {
    const records = [
      { 'Review Date': '2026-01-01', 'Product Name': 'Serum', Review: 'Great product, really love it', Stars: '5', Source: 'Shopee' },
      { 'Review Date': '2026-01-02', 'Product Name': 'Cleanser', Review: 'Not bad could be better', Stars: '3', Source: 'TikTok' },
    ]
    const report = validateDataset('reviews', records)
    expect(report.readyForProcessing).toBe(true)
    expect(report.missingColumns).toEqual([])
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

  it('never blocks a custom/unrecognized-format import — stores it, with an honest "not deeply analyzed" note', () => {
    const records = [{ foo: '1', bar: 'x' }, { foo: '2', bar: 'y' }]
    const report = validateDataset(CUSTOM_TEMPLATE_ID, records)
    expect(report.readyForProcessing).toBe(true)
    expect(report.missingColumns).toEqual([])
    expect(report.rowCount).toBe(2)
    expect(report.warnings[0]).toMatch(/didn't match a known template/i)
  })

  it('handles an empty custom import without throwing', () => {
    expect(() => validateDataset(CUSTOM_TEMPLATE_ID, [])).not.toThrow()
  })
})
