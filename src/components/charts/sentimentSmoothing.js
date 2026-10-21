/**
 * Pure smoothing math for SentimentTrend.jsx, split out so that component
 * file only exports the component (react-refresh's only-export-components
 * rule).
 */
const KEYS = ['positive', 'neutral', 'negative']

/** 7-day trailing average per key. A null point stays null (never
 * fabricated from neighbors) — only non-null values within the window
 * are averaged, and a point with zero non-null neighbors in its window
 * stays null too. */
export function smoothSeries(data, window = 7) {
  return data.map((point, index) => {
    const start = Math.max(0, index - window + 1)
    const windowSlice = data.slice(start, index + 1)
    const smoothed = { date: point.date }
    for (const key of KEYS) {
      const values = windowSlice.map((p) => p[key]).filter((v) => v != null)
      smoothed[key] =
        values.length > 0
          ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
          : null
    }
    return smoothed
  })
}
