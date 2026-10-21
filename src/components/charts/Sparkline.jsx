import { Line, LineChart, ResponsiveContainer } from 'recharts'

/**
 * Minimal axis-less trend line for embedding inside a KpiCard, a table
 * cell, or an alert row. `points` is a plain array of numbers (or
 * `{value}` objects) — the caller has already decided the time window.
 */
export default function Sparkline({ points = [], color = '#64748b', height = 32, width = 96 }) {
  if (points.length < 2) return null

  const data = points.map((point, index) => ({
    index,
    value: typeof point === 'number' ? point : point.value,
  }))

  return (
    <div style={{ width, height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
