import { createMarketplaceAdapter } from './marketplaceAdapter'

/**
 * Lazada's Affiliate API (separate program from the Seller/Developer API,
 * whose approval is still pending — see docs/API_INTEGRATION.md). No
 * credentials exist yet.
 */
export const lazadaAffiliateAdapter = createMarketplaceAdapter({
  id: 'lazada_affiliate',
  name: 'Lazada Affiliate API',
  sourcePlatform: 'lazada',
  sourceKey: 'lazada_affiliate',
})
