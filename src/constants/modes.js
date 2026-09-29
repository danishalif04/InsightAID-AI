import { Rocket, Store } from 'lucide-react'

/**
 * The two business contexts InsightAid AI supports within one application
 * (FYP2.md §7–§9). Single source of truth for labels/icons — pages filter
 * their existing data by `id`, they never fork into separate pages.
 */
export const MODES = {
  startup: {
    id: 'startup',
    label: 'Business Startup',
    shortLabel: 'Startup',
    icon: Rocket,
    description: 'Business overview, sales, sentiment, forecasting, crisis monitoring, and planning.',
  },
  ecommerce: {
    id: 'ecommerce',
    label: 'E-Commerce',
    shortLabel: 'E-Commerce',
    icon: Store,
    description: 'Shopee, TikTok, X and Threads focused analytics for selected Malaysian SME product categories.',
  },
}

export const DEFAULT_MODE = 'startup'
