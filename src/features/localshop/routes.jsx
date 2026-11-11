import LocalShopLayout from './LocalShopLayout'
import { ComingSoon, Overview } from './lazyPages'
import { LOCAL_SHOP_PATHS, LOCAL_SHOP_ROOT } from './paths'

/** Child segment of a Local Shop path, e.g. '/local-shop/products' -> 'products'. */
const segment = (path) => path.slice(LOCAL_SHOP_ROOT.length + 1)

/** Placeholder screens are replaced phase by phase; see LOCAL_SHOP_BUILD_PLAN.md. */
const PLANNED = [
  { path: LOCAL_SHOP_PATHS.business, title: 'My Business', phase: 'Phase 3' },
  { path: LOCAL_SHOP_PATHS.products, title: 'Products & Pricing', phase: 'Phase 3' },
  { path: LOCAL_SHOP_PATHS.financial, title: 'Financial Planning', phase: 'Phase 3' },
  { path: LOCAL_SHOP_PATHS.whatif, title: 'What-If Simulator', phase: 'Phase 4' },
  { path: LOCAL_SHOP_PATHS.capital, title: 'Startup Capital', phase: 'Phase 5' },
  { path: LOCAL_SHOP_PATHS.economic, title: 'Economic Intelligence', phase: 'Phase 6' },
  { path: LOCAL_SHOP_PATHS.assistant, title: 'AI Business Assistant', phase: 'Phase 7' },
  { path: LOCAL_SHOP_PATHS.actions, title: 'Action Centre', phase: 'Phase 8' },
]

/** Mounted inside the authenticated AppShell, so the path is relative to it. */
export const localShopRoute = {
  path: LOCAL_SHOP_ROOT.replace(/^\//, ''),
  element: <LocalShopLayout />,
  children: [
    { index: true, element: <Overview /> },
    ...PLANNED.map((screen) => ({
      path: segment(screen.path),
      element: <ComingSoon title={screen.title} phase={screen.phase} />,
    })),
  ],
}
