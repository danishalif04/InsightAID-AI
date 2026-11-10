import { useEffect, useId, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CheckCircle2, Play, RefreshCw, TrendingUp, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import ChartTooltip from '@/components/ui/ChartTooltip'
import ChartCard from '@/components/charts/ChartCard'
import { renderEventMarkers } from '@/components/charts/EventMarkers'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import PageHero from '@/components/ui/PageHero'
import StatTile from '@/components/ui/StatTile'
import EmptyState from '@/components/ui/EmptyState'
import GranularityToggle from '@/components/ui/GranularityToggle'
import { useMode } from '@/hooks/useMode'
import { useNotifications } from '@/hooks/useNotifications'
import { CHART_COLORS, FORECAST_COLORS } from '@/theme/chartTheme'
import { GLOW_DARK } from '@/config/designTokens'
import { formatCurrencyMYR } from '@/utils/formatters'
import { getBestRow, getLatestForecastRun, runForecast } from '@/services/forecastResultsService'
import { fetchRawSalesPayloads } from '@/services/salesService'
import {
  computeDailySalesSeries,
  mergeActualsWithForecast,
  normalizeSalesRows,
} from '@/utils/salesSeries'
import { aggregateToMonthly } from '@/utils/chartGranularity'

const MODEL_LABELS = {
  moving_average: 'Moving Average',
  arima: 'ARIMA',
  prophet: 'Prophet',
  xgboost: 'XGBoost',
  lstm: 'LSTM',
}

const VARIANT_LABELS = {
  sales_only: 'Sales Only',
  sentiment_enhanced: 'Sentiment-Enhanced',
}

const MAPE_TARGET = 15

function modelDisplayName(row) {
  const model = MODEL_LABELS[row.model_type] ?? row.model_type
  const variant = VARIANT_LABELS[row.variant] ?? row.variant
  return `${model} (${variant})`
}

export default function Forecasting() {
  const { modeConfig } = useMode()
  const { notify } = useNotifications()
  const gradientId = useId()
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runId, setRunId] = useState(null)
  const [generatedAt, setGeneratedAt] = useState(null)
  const [rows, setRows] = useState([])
  const [dailySales, setDailySales] = useState([])
  const [granularity, setGranularity] = useState('day')
  const isMonthly = granularity === 'month'

  const loadForecast = async () => {
    setLoading(true)
    try {
      const [result, rawSalesPayloads] = await Promise.all([
        getLatestForecastRun(),
        fetchRawSalesPayloads(),
      ])
      setRunId(result.runId)
      setGeneratedAt(result.generatedAt)
      setRows(result.rows)
      setDailySales(computeDailySalesSeries(normalizeSalesRows(rawSalesPayloads)))
    } catch (error) {
      notify(`Could not load forecast results: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRunForecast = async () => {
    setRunning(true)
    try {
      await runForecast()
      notify('Forecast generated from your uploaded sales data.')
      await loadForecast()
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    loadForecast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const best = getBestRow(rows)
  const mergedSeries = mergeActualsWithForecast(dailySales, best?.forecast_points ?? [], {
    historyDays: isMonthly ? 730 : 30,
  })
  // dailySales (and so mergedSeries) already covers the account's FULL
  // real history — no re-fetch needed for Month view, just a wider
  // historyDays slice above plus bucketing by calendar month here.
  const chartSeries = isMonthly
    ? aggregateToMonthly(mergedSeries, { sumKeys: ['actual', 'predicted'], avgKeys: ['low', 'band'] })
    : mergedSeries
  const todayMarker =
    !isMonthly && dailySales.length > 0
      ? [{ date: dailySales[dailySales.length - 1].date, label: 'Today' }]
      : []
  const isBaseline = best?.model_type === 'moving_average'

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={modeConfig.label}
        title="Smart Business Forecasting"
        highlight="Forecasting"
        description={
          runId
            ? `Latest run generated ${generatedAt ? new Date(generatedAt).toLocaleString() : '—'}.`
            : 'See where your revenue is headed next, computed straight from your own sales history.'
        }
        actions={
          <>
            <Button icon={RefreshCw} variant="glowSecondary" loading={loading} onClick={loadForecast}>
              Refresh
            </Button>
            <Button icon={Play} variant="glowBrand" loading={running} onClick={handleRunForecast}>
              Run Forecasting
            </Button>
          </>
        }
      />

      {loading ? (
        <p className="text-sm text-glow-text/60">Loading forecast results…</p>
      ) : !runId ? (
        <EmptyState
          icon={TrendingUp}
          message="No forecast yet — click Run Forecasting above for an instant estimate from your own sales history, no setup required."
          actionLabel="Run Forecasting"
          onAction={handleRunForecast}
        />
      ) : (
        <>
          <ChartCard
            title={`Model Forecast — ${best ? modelDisplayName(best) : 'unknown'}`}
            subtitle="Shaded band = model's own uncertainty interval. This model was picked because it had the lowest MAPE among everything evaluated — see the comparison table below."
            method={isBaseline ? 'baseline' : 'real'}
            methodNote={
              isBaseline
                ? 'Baseline model (moving average) — the wide uncertainty band is mathematically correct, not a display bug: it reflects a real MAPE above the 15% target. A tighter, day-by-day interval needs a model with real predictive variance (Prophet/ARIMA), not this flat-RMSE baseline applied evenly across the whole horizon.'
                : "This model's own confidence interval, as computed by the forecasting run."
            }
            height="lg"
            readingGuide="The solid line up to 'today' is your real recorded revenue. After that, the line is predicted, and the shaded band is how much the prediction could realistically be off by — a wider band means less certainty, not an error."
            ariaLabel={`Revenue forecast chart: ${dailySales.length} days of historical actuals followed by a ${best?.forecast_points?.length ?? 0}-day ${modelDisplayName(best ?? { model_type: 'unknown', variant: 'sales_only' })} forecast`}
            status={loading ? 'loading' : 'success'}
            data={chartSeries}
            emptyWhen={(rowsData) => rowsData.length === 0}
            emptyMessage="No sales or forecast data yet."
            csvRows={chartSeries}
            csvFilename="revenue-forecast.csv"
            surface="glow"
            headerActions={<GranularityToggle value={granularity} onChange={setGranularity} />}
          >
            {(seriesData) => (
              <ResponsiveContainer width="100%" height={CHART_HEIGHTS.lg}>
                <AreaChart data={seriesData} margin={{ left: 0 }}>
                  <defs>
                    <linearGradient id={`${gradientId}-actual`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GLOW_DARK.brandGreen} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={GLOW_DARK.brandGreen} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id={`${gradientId}-predicted`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={FORECAST_COLORS.forecast} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={FORECAST_COLORS.forecast} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey={isMonthly ? 'label' : 'date'}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    width={36}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value) => (value != null ? formatCurrencyMYR(value) : '—')}
                      />
                    }
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {renderEventMarkers(todayMarker, CHART_COLORS.neutral)}
                  <Area
                    dataKey="actual"
                    stroke="none"
                    fill={`url(#${gradientId}-actual)`}
                    legendType="none"
                    name=""
                    connectNulls={false}
                  />
                  <Area
                    dataKey="predicted"
                    stroke="none"
                    fill={`url(#${gradientId}-predicted)`}
                    legendType="none"
                    name=""
                    connectNulls={false}
                  />
                  <Area
                    dataKey="low"
                    stackId="band"
                    stroke="none"
                    fill="transparent"
                    legendType="none"
                    name=""
                  />
                  <Area
                    dataKey="band"
                    stackId="band"
                    stroke="none"
                    fill={CHART_COLORS.forecast}
                    fillOpacity={0.1}
                    name="Uncertainty interval"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual revenue"
                    stroke={CHART_COLORS.neutral}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted"
                    stroke={FORECAST_COLORS.forecast}
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {best && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile label="MAE" value={best.mae} prefix="RM " />
              <StatTile label="RMSE" value={best.rmse} prefix="RM " />
              <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-glow-text/50">
                  MAPE (target &lt; {MAPE_TARGET}%)
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <p className="text-3xl font-semibold tabular-nums text-glow-text">
                    {best.mape != null ? `${best.mape}%` : '—'}
                  </p>
                  {best.mape != null &&
                    (best.mape < MAPE_TARGET ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-glow-brand">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        target met
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                        <XCircle className="size-3.5" aria-hidden="true" />
                        target not met
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-glow-text">Model Comparison</h2>
              <p className="mt-0.5 text-xs text-glow-text/60">
                Every candidate evaluated on the same time periods — nothing here is hardcoded.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-glow-border text-xs uppercase tracking-wide text-glow-text/50">
                      <th className="py-2 pr-4 font-medium">Model</th>
                      <th className="py-2 pr-4 font-medium">MAE</th>
                      <th className="py-2 pr-4 font-medium">RMSE</th>
                      <th className="py-2 pr-4 font-medium">MAPE</th>
                      <th className="py-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${row.model_type}-${row.variant}`} className="border-b border-glow-border/60">
                        <td className="py-2 pr-4 text-glow-text/90">{modelDisplayName(row)}</td>
                        <td className="py-2 pr-4 text-glow-text/70">{formatCurrencyMYR(row.mae)}</td>
                        <td className="py-2 pr-4 text-glow-text/70">{formatCurrencyMYR(row.rmse)}</td>
                        <td className="py-2 pr-4 text-glow-text/70">{row.mape != null ? `${row.mape}%` : '—'}</td>
                        <td className="py-2">
                          {row.is_best ? (
                            <span className="rounded-full bg-glow-brand/15 px-2 py-0.5 text-xs font-medium text-glow-brand">
                              Best
                            </span>
                          ) : (
                            <span className="text-xs text-glow-text/40">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5">
              <h2 className="text-sm font-semibold text-glow-text">How this is decided</h2>
              <p className="mt-2 text-sm text-glow-text/60">
                Every model is tested the same way — trained on your past data, then checked against
                days it hasn&apos;t seen yet. The one that predicted closest to what actually happened
                wins. Never a fixed choice.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
