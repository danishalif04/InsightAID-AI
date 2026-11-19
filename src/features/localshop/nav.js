import { LOCAL_SHOP_PATHS } from './paths'

/**
 * The Local Shop pathway's nine destinations (PDF §8), in display order.
 *
 * Single source of truth for three consumers:
 *   - LocalShopLayout's in-page bar, which renders `key` through the
 *     Local Shop i18n provider (EN / BM / ZH).
 *   - TopNav's "Local Shop" dropdown and MobileNavSheet's "Local Shop"
 *     section, which sit OUTSIDE LanguageProvider and so render the
 *     English `label` verbatim — the app chrome is English-only, while
 *     the pathway's own bar stays translated.
 *
 * `label` must stay identical to the `en` strings in i18n/strings.js, so
 * a page is called the same thing in the top bar and in the page itself.
 */
export const LOCAL_SHOP_NAV = [
  { key: 'nav.overview', label: 'Business Overview', to: LOCAL_SHOP_PATHS.overview, end: true },
  { key: 'nav.business', label: 'My Business', to: LOCAL_SHOP_PATHS.business },
  { key: 'nav.products', label: 'Products & Pricing', to: LOCAL_SHOP_PATHS.products },
  { key: 'nav.financial', label: 'Financial Planning', to: LOCAL_SHOP_PATHS.financial },
  { key: 'nav.whatif', label: 'What-If Simulator', to: LOCAL_SHOP_PATHS.whatif },
  { key: 'nav.capital', label: 'Startup Capital', to: LOCAL_SHOP_PATHS.capital },
  { key: 'nav.economic', label: 'Economic Intelligence', to: LOCAL_SHOP_PATHS.economic },
  { key: 'nav.assistant', label: 'AI Business Assistant', to: LOCAL_SHOP_PATHS.assistant },
  { key: 'nav.actions', label: 'Action Centre', to: LOCAL_SHOP_PATHS.actions },
]

/** The same list shaped for the app chrome's { label, path } nav items. */
export const LOCAL_SHOP_NAV_ITEMS = LOCAL_SHOP_NAV.map((item) => ({
  label: item.label,
  path: item.to,
  end: item.end ?? false,
}))
