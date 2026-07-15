/** Mock fixtures for the Business Forecasting page (Phase 7). */

const DAY_MS = 24 * 60 * 60 * 1000
const TODAY = new Date('2026-07-10T00:00:00+08:00')

function formatDate(date) {
  return date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })
}

/** Deterministic pseudo-random noise so the series is stable across renders. */
function noise(seed) {
  return Math.sin(seed * 12.9898) * 43758.5453 % 1
}

/**
 * Builds a historical (14 day) + forecast (horizonDays) revenue series with a
 * 90% confidence band that widens the further out the forecast projects.
 */
export function buildForecastSeries(horizonDays) {
  const points = []
  const baseRevenue = 62000

  for (let i = -13; i <= 0; i++) {
    const date = new Date(TODAY.getTime() + i * DAY_MS)
    const trend = baseRevenue + i * 380
    const wobble = Math.sin(i / 2.3) * 2200 + noise(i) * 900
    points.push({ date: formatDate(date), actual: Math.round(trend + wobble), forecast: null, low: null, band: null })
  }

  const joinValue = points[points.length - 1].actual
  points[points.length - 1].forecast = joinValue
  points[points.length - 1].low = joinValue
  points[points.length - 1].band = 0

  const step = horizonDays <= 7 ? 1 : horizonDays <= 30 ? 3 : 7
  for (let i = step; i <= horizonDays; i += step) {
    const date = new Date(TODAY.getTime() + i * DAY_MS)
    const growth = joinValue + i * 420
    const wobble = Math.sin(i / 4.1) * 2600 + noise(i * 1.7) * 1100
    const value = Math.round(growth + wobble)
    const spread = Math.round(value * (0.04 + (i / horizonDays) * 0.1))
    points.push({
      date: formatDate(date),
      actual: null,
      forecast: value,
      low: value - spread,
      band: spread * 2,
    })
  }

  return points
}

export const forecastMetrics = [
  {
    id: 'revenue',
    label: 'Sales Revenue',
    display: 'RM 75,900',
    delta: 12.4,
    accuracy: 91,
  },
  {
    id: 'demand',
    label: 'Customer Demand',
    display: '8,420 units',
    delta: 7.8,
    accuracy: 86,
  },
  {
    id: 'engagement',
    label: 'Customer Engagement',
    display: '64.2 score',
    delta: -3.1,
    accuracy: 82,
  },
]

export const scenarios = [
  {
    id: 'best',
    label: 'Best Case',
    revenue: 'RM 92,400',
    change: 22.8,
    description: 'Sustained TikTok virality and successful crisis resolution.',
  },
  {
    id: 'expected',
    label: 'Expected Case',
    revenue: 'RM 75,900',
    change: 12.4,
    description: 'Current trend continues with seasonal demand patterns.',
  },
  {
    id: 'worst',
    label: 'Worst Case',
    revenue: 'RM 58,100',
    change: -4.6,
    description: 'Prolonged delivery issues suppress repeat purchases.',
  },
]
