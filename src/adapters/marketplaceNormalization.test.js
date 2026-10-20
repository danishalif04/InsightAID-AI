import { describe, expect, it } from 'vitest'
import { normalizeMarketplaceProduct, normalizeMarketplaceProducts } from './marketplaceNormalization'
import { MARKETPLACE_FIELD_MAPS } from './marketplaceFieldMaps'

const FLAT_MAP = {
  externalProductId: 'id',
  title: 'name',
  price: 'price',
  rating: 'rating',
  stock: 'stock',
}

describe('normalizeMarketplaceProduct', () => {
  it('maps a flat raw record into the shared shape', () => {
    const result = normalizeMarketplaceProduct(
      { id: '123', name: 'Serum', price: '29.90', rating: '4.5', stock: '10' },
      { sourcePlatform: 'shopee', fieldMap: FLAT_MAP }
    )
    expect(result).toEqual({
      sourcePlatform: 'shopee',
      externalProductId: '123',
      title: 'Serum',
      category: null,
      shopName: null,
      price: 29.9,
      currency: null,
      discountPercent: null,
      rating: 4.5,
      ratingCount: null,
      stock: 10,
    })
  })

  it('resolves nested field paths via dot notation', () => {
    const result = normalizeMarketplaceProduct(
      { item_id: '1', item_rating: { rating_star: '4.8', rating_count: '200' } },
      { sourcePlatform: 'shopee', fieldMap: MARKETPLACE_FIELD_MAPS.shopee }
    )
    expect(result.rating).toBe(4.8)
    expect(result.ratingCount).toBe(200)
  })

  it('returns null when the raw record has no usable external id - never fabricates one', () => {
    const result = normalizeMarketplaceProduct({ name: 'No id here' }, { sourcePlatform: 'shopee', fieldMap: FLAT_MAP })
    expect(result).toBeNull()
  })

  it('coerces numeric-looking strings but never fabricates a number from invalid data', () => {
    const result = normalizeMarketplaceProduct(
      { id: '1', price: 'not-a-number', stock: '' },
      { sourcePlatform: 'shopee', fieldMap: FLAT_MAP }
    )
    expect(result.price).toBeNull()
    expect(result.stock).toBeNull()
  })
})

describe('normalizeMarketplaceProducts', () => {
  it('maps a list and drops records with no usable id, rather than throwing', () => {
    const results = normalizeMarketplaceProducts(
      [{ id: '1', name: 'A' }, { name: 'No id' }, { id: '2', name: 'B' }],
      { sourcePlatform: 'lazada', fieldMap: FLAT_MAP }
    )
    expect(results.map((r) => r.externalProductId)).toEqual(['1', '2'])
  })

  it('handles non-array input without throwing', () => {
    expect(normalizeMarketplaceProducts(null, { sourcePlatform: 'shopee', fieldMap: FLAT_MAP })).toEqual([])
    expect(normalizeMarketplaceProducts(undefined, { sourcePlatform: 'shopee', fieldMap: FLAT_MAP })).toEqual([])
  })
})

describe('MARKETPLACE_FIELD_MAPS', () => {
  it('every provider placeholder at least defines externalProductId', () => {
    for (const [platform, fieldMap] of Object.entries(MARKETPLACE_FIELD_MAPS)) {
      expect(fieldMap.externalProductId, `${platform} is missing externalProductId`).toBeTruthy()
    }
  })
})
