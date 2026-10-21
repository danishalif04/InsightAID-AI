import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { SENTIMENT_COLORS } from '@/config/colorTokens'
import { AXIS_LINE_DEFAULTS, AXIS_TICK_DEFAULTS, GRID_DEFAULTS } from './chartDefaults'
import { renderCrisisBands } from './CrisisBands'
import { smoothSeries } from './sentimentSmoothing'

/**
 * Shared sentiment-over-time chart for Dashboard + Sentiment Analysis —
 * one component instead of each page drawing its own variant
 * (docs/audit/INSIGHTAID_SYSTEM_AUDIT.md §5.2). `data` is exactly
 * computeSentimentTrend()'s output shape: [{date, positive, neutral,
 * negative}], percentages 0-100, null for a day with no ratio data.
 *
 * @param {Array<{date:string, positive:number|null, neutral:number|null, negative:number|null}>} data
 * @param {Array<{start:string, end:string, riskLevel?:string}>} [crisisEpisodes] shaded via CrisisBands, dates must match `data`'s date strings
 * @param {number} [height=280]
 */
export default function SentimentTrend({ data = [], crisisEpisodes = [], height = 280 }) {
  const [mode, setMode] = useState('lines')
  const [smoothed, setSmoothed] = useState(false)

  const series = useMemo(() => (smoothed ? smoothSeries(data) : data), [data, smoothed])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex rounded-lg border border-line p-0.5 dark:border-line-dark">
          <button
            type="button"
            onClick={() => setMode('lines')}
            className={`rounded-md px-2.5 py-1 font-medium ${mode === 'lines' ? 'bg-accent-500 text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Lines
          </button>
          <button
            type="button"
            onClick={() => setMode('share')}
            className={`rounded-md px-2.5 py-1 font-medium ${mode === 'share' ? 'bg-accent-500 text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Share %
          </button>
        </div>
        <label className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={smoothed}
            onChange={(event) => setSmoothed(event.target.checked)}
            className="accent-accent-500"
          />
          7-day smoothing
        </label>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        {mode === 'share' ? (
          <AreaChart data={series} margin={{ left: -20 }}>
            <CartesianGrid {...GRID_DEFAULTS} />
            <XAxis dataKey="date" tick={AXIS_TICK_DEFAULTS} {...AXIS_LINE_DEFAULTS} />
            <YAxis tick={AXIS_TICK_DEFAULTS} {...AXIS_LINE_DEFAULTS} unit="%" domain={[0, 100]} />
            <Tooltip
              content={<ChartTooltip formatter={(value) => (value != null ? `${value}%` : '—')} />}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            {renderCrisisBands(crisisEpisodes)}
            <Area
              type="monotone"
              dataKey="positive"
              name="Positive"
              stackId="share"
              stroke={SENTIMENT_COLORS.positive}
              fill={SENTIMENT_COLORS.positive}
              fillOpacity={0.75}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="neutral"
              name="Neutral"
              stackId="share"
              stroke={SENTIMENT_COLORS.neutral}
              fill={SENTIMENT_COLORS.neutral}
              fillOpacity={0.6}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="negative"
              name="Negative"
              stackId="share"
              stroke={SENTIMENT_COLORS.negative}
              fill={SENTIMENT_COLORS.negative}
              fillOpacity={0.75}
              connectNulls={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={series} margin={{ left: -20 }}>
            <CartesianGrid {...GRID_DEFAULTS} />
            <XAxis dataKey="date" tick={AXIS_TICK_DEFAULTS} {...AXIS_LINE_DEFAULTS} />
            <YAxis tick={AXIS_TICK_DEFAULTS} {...AXIS_LINE_DEFAULTS} unit="%" />
            <Tooltip
              content={<ChartTooltip formatter={(value) => (value != null ? `${value}%` : '—')} />}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            {renderCrisisBands(crisisEpisodes)}
            <Line
              type="monotone"
              dataKey="positive"
              name="Positive"
              stroke={SENTIMENT_COLORS.positive}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="neutral"
              name="Neutral"
              stroke={SENTIMENT_COLORS.neutral}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="negative"
              name="Negative"
              stroke={SENTIMENT_COLORS.negative}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
