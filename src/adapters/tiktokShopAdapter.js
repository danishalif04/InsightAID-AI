import { createMarketplaceAdapter } from './marketplaceAdapter'

/**
 * TikTok Shop's commerce/catalog API — separate from tiktokAdapter.js
 * (TikTok's social/mentions API). No equivalent affiliate catalog-feed
 * API was found for TikTok Shop during research; its developer platform
 * appears seller/ISV-oriented, same gate as the Partner APIs already
 * confirmed closed. No credentials exist yet — see docs/API_INTEGRATION.md.
 */
export const tiktokShopAdapter = createMarketplaceAdapter({
  id: 'tiktok_shop',
  name: 'TikTok Shop API',
  sourcePlatform: 'tiktok_shop',
  sourceKey: 'tiktok_shop',
})
