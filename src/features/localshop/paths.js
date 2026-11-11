/** Route prefix for the Local Shop pathway. Kept separate so the Business Startup / SME routes are untouched. */
export const LOCAL_SHOP_ROOT = '/local-shop'

export const LOCAL_SHOP_PATHS = {
  overview: LOCAL_SHOP_ROOT,
  business: `${LOCAL_SHOP_ROOT}/business`,
  products: `${LOCAL_SHOP_ROOT}/products`,
  financial: `${LOCAL_SHOP_ROOT}/financial`,
  whatif: `${LOCAL_SHOP_ROOT}/what-if`,
  capital: `${LOCAL_SHOP_ROOT}/capital`,
  economic: `${LOCAL_SHOP_ROOT}/economic`,
  assistant: `${LOCAL_SHOP_ROOT}/assistant`,
  actions: `${LOCAL_SHOP_ROOT}/actions`,
}
