import { Rocket, Store } from 'lucide-react'

/**
 * The two business contexts InsightAid AI supports within one application
 * (FYP2.md §7–§9). Single source of truth for labels/icons — pages filter
 * their existing data by `id`, they never fork into separate pages.
 *
 * Labels per the 2026-11-09 product-direction update (knowledge_updated_nov2026.md
 * §14): the `startup` id's content (kedai runcit, BM-default, no-data/
 * AI-assisted) is now labelled "Malaysian Local Shop", and `ecommerce`'s
 * content (synthetic-dataset-driven demo) is now labelled "Business
 * Startup" — a straight relabel, the ids/storage/logic are unchanged.
 */
export const MODES = {
  startup: {
    id: 'startup',
    label: 'Malaysian Local Shop',
    shortLabel: 'Local Shop',
    icon: Rocket,
    description: 'Business overview, sales, sentiment, forecasting, crisis monitoring, and planning.',
  },
  ecommerce: {
    id: 'ecommerce',
    label: 'Business Startup',
    shortLabel: 'Business Startup',
    icon: Store,
    description: 'Shopee, TikTok, X and Threads focused analytics for selected Malaysian SME product categories.',
  },
}

export const DEFAULT_MODE = 'startup'
