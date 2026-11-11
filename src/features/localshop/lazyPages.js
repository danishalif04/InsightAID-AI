import { lazy } from 'react'

/** Route-level code splitting, kept separate from routes.jsx so Fast Refresh stays clean (same convention as src/routes/pages.js). */
export const Overview = lazy(() => import('./pages/Overview'))
export const ComingSoon = lazy(() => import('./pages/ComingSoon'))
