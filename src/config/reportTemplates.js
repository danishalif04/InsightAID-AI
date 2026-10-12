/**
 * The six report types FYP2.md §70 names — static app config (like
 * exportFormats), not user data. `builderKey` maps to
 * src/utils/reportBuilders.js's REPORT_BUILDERS. When generated,
 * last_generated per type is tracked per-user in the real
 * `report_templates` table (supabase/migrations/0001_init.sql) via
 * src/services/reportsService.js.
 */
export const REPORT_TEMPLATE_DEFINITIONS = [
  {
    name: 'Business Health Report',
    builderKey: 'business_health',
    description: 'Business profile, data availability, current performance, key findings, and recommendations.',
  },
  {
    name: 'E-Commerce Analytics Report',
    builderKey: 'ecommerce',
    description: 'Platform performance, customer sentiment, and sales/demand forecast for online-storefront businesses.',
  },
  {
    name: 'Sentiment Report',
    builderKey: 'sentiment',
    description: 'Sentiment scores, trending topics, and required data improvements.',
  },
  {
    name: 'Forecast Report',
    builderKey: 'forecast',
    description: 'Best-performing forecast model, backtested accuracy, and future projections.',
  },
  {
    name: 'Crisis Report',
    builderKey: 'crisis',
    description: 'All crisis-detection signals with measurable evidence, and crisis-relevant recommendations.',
  },
  {
    name: 'Business Planning Report',
    builderKey: 'business_planning',
    description: 'Business profile, data availability, and conservative/expected/growth scenario projections.',
  },
]
