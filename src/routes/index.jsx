import { createBrowserRouter } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import RequireAuth from './RequireAuth'
import { PATHS } from './paths'
import * as Pages from './pages'

const child = (path) => path.replace(/^\//, '')

export const router = createBrowserRouter([
  { path: PATHS.login, element: <Pages.Login /> },
  { path: PATHS.signup, element: <Pages.Signup /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: PATHS.dashboard,
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Pages.Dashboard /> },
          { path: child(PATHS.sentiment), element: <Pages.SentimentAnalysis /> },
          { path: child(PATHS.forecasting), element: <Pages.Forecasting /> },
          { path: child(PATHS.crisis), element: <Pages.CrisisDetection /> },
          { path: child(PATHS.recommendations), element: <Pages.AiRecommendations /> },
          { path: child(PATHS.social), element: <Pages.SocialIntelligence /> },
          { path: child(PATHS.reports), element: <Pages.Reports /> },
          { path: child(PATHS.datasets), element: <Pages.DatasetManagement /> },
          { path: child(PATHS.settings), element: <Pages.SettingsPage /> },
          { path: child(PATHS.onboarding), element: <Pages.Onboarding /> },
          { path: child(PATHS.modelPerformance), element: <Pages.ModelPerformance /> },
          { path: '*', element: <Pages.NotFound /> },
        ],
      },
    ],
  },
])
