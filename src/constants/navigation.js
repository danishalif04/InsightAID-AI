import {
  LayoutGrid,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Globe,
  FileText,
  Database,
  Gauge,
  Settings,
} from 'lucide-react'
import { PATHS } from '@/routes/paths'

/**
 * Primary navigation, in the exact order shown in the Figma sidebar.
 * Consumed by the sidebar (Phase 2) and the topbar page-title lookup.
 */
export const NAV_ITEMS = [
  { label: 'Dashboard', path: PATHS.dashboard, icon: LayoutGrid },
  { label: 'Sentiment Analysis', path: PATHS.sentiment, icon: MessageSquare },
  { label: 'Forecasting', path: PATHS.forecasting, icon: TrendingUp },
  { label: 'Crisis Detection', path: PATHS.crisis, icon: AlertTriangle },
  { label: 'AI Recommendations', path: PATHS.recommendations, icon: Lightbulb },
  { label: 'Social Intelligence', path: PATHS.social, icon: Globe },
  { label: 'Reports', path: PATHS.reports, icon: FileText },
  { label: 'Dataset Management', path: PATHS.datasets, icon: Database },
  { label: 'Model Performance', path: PATHS.modelPerformance, icon: Gauge },
  { label: 'Settings', path: PATHS.settings, icon: Settings },
]

/** Page titles as shown in the Figma topbar (differ slightly from nav labels). */
export const PAGE_TITLES = {
  [PATHS.dashboard]: 'Executive Dashboard',
  [PATHS.sentiment]: 'Sentiment Analysis',
  [PATHS.forecasting]: 'Business Forecasting',
  [PATHS.crisis]: 'Crisis Detection Center',
  [PATHS.recommendations]: 'AI Recommendation Engine',
  [PATHS.social]: 'Social Media Intelligence',
  [PATHS.reports]: 'Reports and Export',
  [PATHS.datasets]: 'Dataset Management',
  [PATHS.settings]: 'Settings',
  [PATHS.onboarding]: 'Business Planning',
  [PATHS.modelPerformance]: 'Model Performance',
}
