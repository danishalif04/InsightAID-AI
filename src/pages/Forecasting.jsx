import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDown, ArrowUp, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { useNotifications } from '@/hooks/useNotifications'
import { CHART_COLORS } from '@/theme/chartTheme'
import { formatDelta } from '@/utils/formatters'
import { buildForecastSeries, forecastMetrics, scenarios } from '@/data/forecastData'

const HORIZONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

const SCENARIO_TONE = {
  best: 'text-accent-600 dark:text-accent-400',
  expected: 'text-info',
  worst: 'text-danger',
}

export default function Forecasting() {
  const { notify } = useNotifications()
  const [horizon, setHorizon] = useState(30)
  const [recalculating, setRecalculating] = useState(false)

  const series = useMemo(() => buildForecastSeries(horizon), [horizon])

  const handleRecalculate = () => {
    setRecalculating(true)
    setTimeout(() => {
      setRecalculating(false)
      notify(`Forecast recalculated for the next ${horizon} days.`)
    }, 700)
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {HORIZONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setHorizon(option.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  horizon === option.value
                    ? 'bg-accent-500 text-white'
                    : 'border border-line text-slate-600 hover:bg-canvas dark:border-line-dark dark:text-slate-300 dark:hover:bg-canvas-dark'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button icon={RefreshCw} loading={recalculating} onClick={handleRecalculate}>
            Recalculate
          </Button>
        </div>
      </Card>

      <Card
        title="Historical vs. Forecast Revenue"
        description="Solid = actual, dashed = forecast, shaded band = 90% confidence interval"
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={series} margin={{ left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              width={36}
            />
            <Tooltip content={<ChartTooltip formatter={(value) => (value != null ? `RM ${value.toLocaleString()}` : '—')} />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area dataKey="low" stackId="band" stroke="none" fill="transparent" legendType="none" name="" />
            <Area
              dataKey="band"
              stackId="band"
              stroke="none"
              fill={CHART_COLORS.forecast}
              fillOpacity={0.12}
              name="Confidence interval"
            />
            <Line type="monotone" dataKey="actual" name="Actual" stroke={CHART_COLORS.actual} strokeWidth={2} dot={false} connectNulls={false} />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke={CHART_COLORS.forecast}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {forecastMetrics.map((metric) => {
          const DeltaIcon = metric.delta >= 0 ? ArrowUp : ArrowDown
          return (
            <Card key={metric.id} bodyClassName="p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{metric.display}</p>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                    metric.delta >= 0 ? 'text-accent-600 dark:text-accent-400' : 'text-danger'
                  }`}
                >
                  <DeltaIcon className="size-3" aria-hidden="true" />
                  {formatDelta(metric.delta)}
                </span>
              </div>
              <ProgressBar value={metric.accuracy} label="Forecast accuracy" className="mt-4" />
            </Card>
          )
        })}
      </div>

      <Card title="Scenario Simulation" description="Projected revenue under best, expected, and worst-case conditions">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {scenarios.map((scenario) => {
            const TrendIcon = scenario.change >= 0 ? TrendingUp : TrendingDown
            return (
              <div key={scenario.id} className="rounded-lg border border-line p-4 dark:border-line-dark">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {scenario.label}
                </p>
                <p className={`mt-2 text-xl font-semibold ${SCENARIO_TONE[scenario.id]}`}>{scenario.revenue}</p>
                <span className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${SCENARIO_TONE[scenario.id]}`}>
                  <TrendIcon className="size-3" aria-hidden="true" />
                  {formatDelta(scenario.change)}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{scenario.description}</p>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
