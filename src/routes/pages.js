import { lazy } from 'react'

/**
 * Route-level code splitting from day one. Every page loads as its own
 * chunk and renders inside the layout's <Suspense> boundary.
 * (Kept separate from the router config so Fast Refresh stays clean.)
 */
export const Login = lazy(() => import('@/pages/Login'))
export const Signup = lazy(() => import('@/pages/Signup'))
export const Dashboard = lazy(() => import('@/pages/Dashboard'))
export const SentimentAnalysis = lazy(() => import('@/pages/SentimentAnalysis'))
export const Forecasting = lazy(() => import('@/pages/Forecasting'))
export const CrisisDetection = lazy(() => import('@/pages/CrisisDetection'))
export const AiRecommendations = lazy(() => import('@/pages/AiRecommendations'))
export const SocialIntelligence = lazy(() => import('@/pages/SocialIntelligence'))
export const Reports = lazy(() => import('@/pages/Reports'))
export const DatasetManagement = lazy(() => import('@/pages/DatasetManagement'))
export const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
export const NotFound = lazy(() => import('@/pages/NotFound'))
