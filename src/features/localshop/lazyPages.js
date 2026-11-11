import { lazy } from 'react'

/** Route-level code splitting, kept separate from routes.jsx so Fast Refresh stays clean (same convention as src/routes/pages.js). */
export const Overview = lazy(() => import('./pages/Overview'))
export const ComingSoon = lazy(() => import('./pages/ComingSoon'))
export const MyBusiness = lazy(() => import('./pages/MyBusiness'))
export const ProductsPricing = lazy(() => import('./pages/ProductsPricing'))
export const FinancialPlanning = lazy(() => import('./pages/FinancialPlanning'))
export const WhatIf = lazy(() => import('./pages/WhatIf'))
export const StartupCapital = lazy(() => import('./pages/StartupCapital'))
