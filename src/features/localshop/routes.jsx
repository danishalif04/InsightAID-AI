import LocalShopLayout from './LocalShopLayout'
import {
  ActionCentre,
  Assistant,
  EconomicIntelligence,
  FinancialPlanning,
  MyBusiness,
  Overview,
  ProductsPricing,
  StartupCapital,
  WhatIf,
} from './lazyPages'
import { LOCAL_SHOP_PATHS, LOCAL_SHOP_ROOT } from './paths'

/** Child segment of a Local Shop path, e.g. '/local-shop/products' -> 'products'. */
const segment = (path) => path.slice(LOCAL_SHOP_ROOT.length + 1)

/** Mounted inside the authenticated AppShell, so the path is relative to it. */
export const localShopRoute = {
  path: LOCAL_SHOP_ROOT.replace(/^\//, ''),
  element: <LocalShopLayout />,
  children: [
    { index: true, element: <Overview /> },
    { path: segment(LOCAL_SHOP_PATHS.business), element: <MyBusiness /> },
    { path: segment(LOCAL_SHOP_PATHS.products), element: <ProductsPricing /> },
    { path: segment(LOCAL_SHOP_PATHS.financial), element: <FinancialPlanning /> },
    { path: segment(LOCAL_SHOP_PATHS.whatif), element: <WhatIf /> },
    { path: segment(LOCAL_SHOP_PATHS.capital), element: <StartupCapital /> },
    { path: segment(LOCAL_SHOP_PATHS.economic), element: <EconomicIntelligence /> },
    { path: segment(LOCAL_SHOP_PATHS.assistant), element: <Assistant /> },
    { path: segment(LOCAL_SHOP_PATHS.actions), element: <ActionCentre /> },
  ],
}
