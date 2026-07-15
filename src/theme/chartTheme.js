/**
 * Recharts color tokens matching the Figma frames.
 * Recharts renders SVG fills, so plain hex values are used here
 * (kept in sync with the CSS tokens in src/styles/index.css).
 */
export const CHART_COLORS = {
  positive: '#22c55e',
  neutral: '#a8a29e',
  negative: '#ef4444',
  tiktok: '#22c55e',
  x: '#60a5fa',
  actual: '#1e2f29',
  forecast: '#3b82f6',
  grid: '#e6ece9',
  gridDark: '#26332e',
}

/** Ordered palette for multi-series charts (donut, grouped bars). */
export const CHART_SEQUENCE = ['#22c55e', '#60a5fa', '#a8a29e', '#d97706', '#ef4444']
