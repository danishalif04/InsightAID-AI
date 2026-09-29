import { describe, expect, it } from 'vitest'
import { calculateReadiness } from './dataReadiness'

describe('calculateReadiness', () => {
  it('returns Level 1 (No Data) when nothing is known', () => {
    const result = calculateReadiness({})
    expect(result.level).toBe(1)
    expect(result.levelLabel).toBe('No Data')
    expect(result.checklist.every((item) => !item.met)).toBe(true)
  })

  it('treats null counts as unavailable, not as a fabricated pass', () => {
    const result = calculateReadiness({ salesRecordsCount: null, reviewsCount: null })
    expect(result.checklist.find((item) => item.id === 'sales').met).toBe(false)
    expect(result.checklist.find((item) => item.id === 'reviews').met).toBe(false)
  })

  it('increases level as more categories are actually satisfied', () => {
    const result = calculateReadiness({
      values: { business_name: 'Test Co', selling_price: 10, expected_monthly_units: 100 },
      salesRecordsCount: 5,
    })
    expect(result.checklist.find((item) => item.id === 'sales').met).toBe(true)
    expect(result.level).toBeGreaterThan(1)
  })

  it('reaches Level 5 (Full Analytics) only when every category is met', () => {
    // A near-complete profile (>=50% of ~29 fields).
    const values = {
      business_name: 'Test',
      business_type: 'ecommerce',
      industry: 'skincare',
      business_stage: 'early',
      location: 'KL',
      business_model: 'D2C',
      product_category: 'skincare',
      product_type: 'serum',
      selling_price: 35,
      cost_per_unit: 15,
      expected_margin: 57,
      number_of_products: 3,
      target_customer: 'students',
      target_age_group: '18-25',
      target_location: 'KL',
      customer_segment: 'young adults',
      marketing_channels: ['TikTok', 'Shopee'],
    }
    const result = calculateReadiness({
      values,
      salesRecordsCount: 10,
      reviewsCount: 5,
      socialRecordsCount: 20,
      historicalMonthsCount: 4,
    })
    expect(result.level).toBe(5)
    expect(result.levelLabel).toBe('Full Analytics')
    expect(result.percent).toBe(100)
  })
})
