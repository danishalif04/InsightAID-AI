import { createMarketplaceAdapter } from './marketplaceAdapter'

/**
 * Separate from shopeeAdapter.js (dataset mode — uploaded CSV rows). This
 * is the real-API track: Shopee's Affiliate Open Platform (GraphQL,
 * product/catalog feed), not the Partner/Seller Platform already
 * confirmed closed to academic use. No credentials exist yet — see
 * docs/API_INTEGRATION.md.
 */
export const shopeeAffiliateAdapter = createMarketplaceAdapter({
  id: 'shopee_affiliate',
  name: 'Shopee Affiliate API',
  sourcePlatform: 'shopee',
  sourceKey: 'shopee_affiliate',
})
