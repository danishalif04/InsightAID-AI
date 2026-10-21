/**
 * Shared sizing/axis/grid defaults so every chart in src/components/charts/
 * (and anything built on top of them in later redesign phases) looks like
 * one consistent system instead of each page inventing its own margins.
 */

/** Chart body heights in px — pick by role, not by eyeballing a number. */
export const CHART_HEIGHTS = {
  sm: 200,
  md: 280,
  lg: 360,
  hero: 420,
}

/** Spread onto Recharts' <CartesianGrid>. */
export const GRID_DEFAULTS = {
  strokeDasharray: '3 3',
  vertical: false,
}

/** Spread onto Recharts' <XAxis>/<YAxis>. */
export const AXIS_TICK_DEFAULTS = { fontSize: 12 }
export const AXIS_LINE_DEFAULTS = { axisLine: false, tickLine: false }

/** Spread onto the chart root (LineChart/AreaChart/BarChart/ComposedChart/etc). */
export const CHART_MARGIN_DEFAULTS = { top: 8, right: 8, bottom: 0, left: 0 }
