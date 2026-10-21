/**
 * Recharts color tokens. Recharts renders SVG fills/strokes directly, so
 * plain hex values are used here, sourced from src/config/colorTokens.js
 * (the one semantic table — see that file's header comment for why two
 * mirrors exist instead of one).
 *
 * `CHART_COLORS`/`CHART_SEQUENCE` below are kept exactly as they were
 * named/shaped for backward compatibility with every page that already
 * imports them (Dashboard.jsx, SentimentAnalysis.jsx, etc. — none of
 * those pages are touched in this redesign phase). The only VALUE change
 * here is `negative`/`CHART_SEQUENCE`'s last entry: `#ef4444` -> `#dc2626`,
 * unifying the two different "danger red" hex values the audit found
 * (docs/audit/INSIGHTAID_SYSTEM_AUDIT.md §5.2) into the one now defined in
 * colorTokens.js's CRISIS_COLORS.critical (matches index.css's existing
 * --color-danger, so nothing else moves).
 *
 * New chart work should prefer importing SENTIMENT_COLORS/PLATFORM_COLORS/
 * CRISIS_COLORS/FORECAST_COLORS from colorTokens.js directly instead of
 * this file's flat CHART_COLORS map.
 */
import {
  CRISIS_COLORS,
  FORECAST_COLORS,
  PLATFORM_COLORS,
  SENTIMENT_COLORS,
} from '@/config/colorTokens'

export { SENTIMENT_COLORS, PLATFORM_COLORS, CRISIS_COLORS, FORECAST_COLORS }

export const CHART_COLORS = {
  positive: '#22c55e',
  neutral: '#a8a29e',
  negative: CRISIS_COLORS.critical,
  tiktok: '#22c55e',
  x: '#60a5fa',
  actual: '#1e2f29',
  forecast: '#3b82f6',
  grid: '#e6ece9',
  gridDark: '#26332e',
}

/** Ordered palette for multi-series charts (donut, grouped bars). */
export const CHART_SEQUENCE = ['#22c55e', '#60a5fa', '#a8a29e', '#d97706', CRISIS_COLORS.critical]
