import { lazy } from 'react'

/** Route-level code splitting, kept separate from routes.jsx so Fast Refresh stays clean (same convention as src/routes/pages.js). */
export const Overview = lazy(() => import('./pages/Overview'))
export const MyBusiness = lazy(() => import('./pages/MyBusiness'))
export const ProductsPricing = lazy(() => import('./pages/ProductsPricing'))
export const FinancialPlanning = lazy(() => import('./pages/FinancialPlanning'))
export const WhatIf = lazy(() => import('./pages/WhatIf'))
export const StartupCapital = lazy(() => import('./pages/StartupCapital'))
export const EconomicIntelligence = lazy(() => import('./pages/EconomicIntelligence'))
export const Assistant = lazy(() => import('./pages/Assistant'))
export const ActionCentre = lazy(() => import('./pages/ActionCentre'))
