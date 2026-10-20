/**
 * Per-provider field-path configs for normalizeMarketplaceProduct().
 *
 * PLACEHOLDER — none of these three providers has confirmed, authorized
 * API access yet (see docs/API_INTEGRATION.md's Marketplace section:
 * Shopee/Lazada Affiliate APIs are a real lead, not yet signed up for;
 * TikTok Shop has no equivalent catalog-feed API found at all). Every
 * path below is a guess at a PLAUSIBLE shape based on how these fields
 * are commonly named — not a verified field from real API documentation.
 * Do not treat these as working until a real sample response has been
 * checked against them and the paths corrected to match.
 */
export const MARKETPLACE_FIELD_MAPS = {
  shopee: {
    externalProductId: 'item_id',
    title: 'name',
    category: 'category_name',
    shopName: 'shop_name',
    price: 'price',
    currency: 'currency',
    discountPercent: 'discount_percent',
    rating: 'item_rating.rating_star',
    ratingCount: 'item_rating.rating_count',
    stock: 'stock',
  },
  lazada: {
    externalProductId: 'item_id',
    title: 'title',
    category: 'category',
    shopName: 'seller_name',
    price: 'price',
    currency: 'currency',
    discountPercent: 'discount',
    rating: 'rating_score',
    ratingCount: 'review_count',
    stock: 'quantity',
  },
  tiktok_shop: {
    externalProductId: 'product_id',
    title: 'product_name',
    category: 'category_name',
    shopName: 'shop_name',
    price: 'price',
    currency: 'currency',
    discountPercent: 'discount_percent',
    rating: 'rating',
    ratingCount: 'review_count',
    stock: 'stock_quantity',
  },
}
