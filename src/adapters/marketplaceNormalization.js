/**
 * Provider-agnostic normalization for marketplace product data (Shopee/
 * Lazada/TikTok Shop affiliate APIs — see docs/API_INTEGRATION.md's
 * Marketplace section). Each provider returns data shaped completely
 * differently, so this maps any raw provider record into one shared shape
 * via a per-provider field-path config (src/adapters/marketplaceFieldMaps.js),
 * rather than writing three separate ad-hoc parsers.
 *
 * This function itself is real and tested now. What it is NOT is a claim
 * that any provider's real field layout is known — none of the three
 * affiliate APIs has confirmed, authorized credentials as of this phase,
 * so there is no real documented response to map against without
 * guessing (see marketplaceFieldMaps.js's placeholders). Filling in one
 * FIELD_MAPS entry is the only change needed once real API docs/
 * credentials exist — this function and its tests do not change.
 */

function getPath(obj, path) {
  if (!path) return undefined
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), obj)
}

function toNumberOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** @returns the shared shape, or null if the raw record has no stable
 * external id — never creates a row without one, since that id is what
 * repeated syncs rely on to update the same product instead of
 * duplicating it. */
export function normalizeMarketplaceProduct(raw, { sourcePlatform, fieldMap }) {
  const externalId = getPath(raw, fieldMap.externalProductId)
  if (externalId == null) return null

  return {
    sourcePlatform,
    externalProductId: String(externalId),
    title: getPath(raw, fieldMap.title) ?? null,
    category: getPath(raw, fieldMap.category) ?? null,
    shopName: getPath(raw, fieldMap.shopName) ?? null,
    price: toNumberOrNull(getPath(raw, fieldMap.price)),
    currency: getPath(raw, fieldMap.currency) ?? null,
    discountPercent: toNumberOrNull(getPath(raw, fieldMap.discountPercent)),
    rating: toNumberOrNull(getPath(raw, fieldMap.rating)),
    ratingCount: toNumberOrNull(getPath(raw, fieldMap.ratingCount)),
    stock: toNumberOrNull(getPath(raw, fieldMap.stock)),
  }
}

/** Maps a whole raw response list, dropping any record with no usable id
 * rather than throwing — one malformed record should never fail an
 * entire sync. */
export function normalizeMarketplaceProducts(rawList, config) {
  if (!Array.isArray(rawList)) return []
  return rawList.map((raw) => normalizeMarketplaceProduct(raw, config)).filter(Boolean)
}
