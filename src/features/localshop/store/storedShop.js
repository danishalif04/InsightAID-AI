/** Where the Local Shop working shop is kept in the browser (see ShopProvider). */
export const SHOP_STORAGE_KEY = 'insightaid.localshop.shop'

/** The saved Local Shop shop, or null. Never throws (private mode, bad JSON). */
export function readStoredShop() {
  try {
    const raw = localStorage.getItem(SHOP_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
