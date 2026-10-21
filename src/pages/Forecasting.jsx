import { useEffect, useState } from 'react'
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
import { CheckCircle2, Play, RefreshCw, XCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ChartTooltip from '@/components/ui/ChartTooltip'
import ChartCard from '@/components/charts/ChartCard'
import { renderEventMarkers } from '@/components/charts/EventMarkers'
import { CHART_HEIGHTS } from '@/components/charts/chartDefaults'
import { useMode } from '@/hooks/useMode'
import { useNotifications } from '@/hooks/useNotifications'
import { CHART_COLORS, FORECAST_COLORS } from '@/theme/chartTheme'
import { formatCurrencyMYR } from '@/utils/formatters'
import { getBestRow, getLatestForecastRun, runForecast } from '@/services/forecastResultsService'
import { fetchRawSalesPayloads } from '@/services/salesService'
import {
  computeDailySalesSeries,
  mergeActualsWithForecast,
  normalizeSalesRows,
} from '@/utils/salesSeries'

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
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runId, setRunId] = useState(null)
  const [generatedAt, setGeneratedAt] = useState(null)
  const [rows, setRows] = useState([])
  const [dailySales, setDailySales] = useState([])

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
  const chartSeries = mergeActualsWithForecast(dailySales, best?.forecast_points ?? [])
  const todayMarker =
    dailySales.length > 0 ? [{ date: dailySales[dailySales.length - 1].date, label: 'Today' }] : []
  const isBaseline = best?.model_type === 'moving_average'

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-medium text-accent-600 dark:text-accent-400">
              {modeConfig.label}
            </span>
            {runId && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Run {runId} · generated {generatedAt ? new Date(generatedAt).toLocaleString() : '—'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button icon={RefreshCw} variant="secondary" loading={loading} onClick={loadForecast}>
              Refresh
            </Button>
            <Button icon={Play} loading={running} onClick={handleRunForecast}>
              Run Forecasting
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading forecast results…</p>
        </Card>
      ) : !runId ? (
        <Card title="No forecasting run yet">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Click <strong>Run Forecasting</strong> above for an instant baseline forecast (moving
            average) computed from your own uploaded sales data — no setup required.
          </p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            For the fuller model comparison — moving average, ARIMA, Prophet (sales-only and
            sentiment-enhanced), XGBoost, and LSTM, all evaluated on identical rolling-origin time
            periods — run <code>ml/notebooks/04_train_forecasting_models.ipynb</code> offline; see{' '}
            <code>ml/forecasting/README.md</code> for details. The best-performing model from either
            path is written to <code>forecast_results</code> and shown here automatically.
          </p>
        </Card>
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
            ariaLabel={`Revenue forecast chart: ${dailySales.length} days of historical actuals followed by a ${best?.forecast_points?.length ?? 0}-day ${modelDisplayName(best ?? { model_type: 'unknown', variant: 'sales_only' })} forecast`}
            status={loading ? 'loading' : 'success'}
            data={chartSeries}
            emptyWhen={(rowsData) => rowsData.length === 0}
            emptyMessage="No sales or forecast data yet."
            csvRows={chartSeries}
            csvFilename="revenue-forecast.csv"
          >
            {(seriesData) => (
              <ResponsiveContainer width="100%" height={CHART_HEIGHTS.lg}>
                <AreaChart data={seriesData} margin={{ left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
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
              <Card bodyClassName="p-5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">MAE</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrencyMYR(best.mae)}
                </p>
              </Card>
              <Card bodyClassName="p-5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">RMSE</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrencyMYR(best.rmse)}
                </p>
              </Card>
              <Card bodyClassName="p-5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  MAPE (target &lt; {MAPE_TARGET}%)
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {best.mape != null ? `${best.mape}%` : '—'}
                  </p>
                  {best.mape != null &&
                    (best.mape < MAPE_TARGET ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 dark:text-accent-400">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        target met
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                        <XCircle className="size-3.5" aria-hidden="true" />
                        target not met
                      </span>
                    ))}
                </div>
              </Card>
            </div>
          )}

          <Card
            title="Model Comparison"
            description="Every candidate evaluated on the same rolling-origin periods. The best model is never hardcoded — it's whichever row actually scored lowest MAPE."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-slate-500 dark:border-line-dark dark:text-slate-400">
                    <th className="py-2 pr-4 font-medium">Model</th>
                    <th className="py-2 pr-4 font-medium">MAE</th>
                    <th className="py-2 pr-4 font-medium">RMSE</th>
                    <th className="py-2 pr-4 font-medium">MAPE</th>
                    <th className="py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.model_type}-${row.variant}`}
                      className="border-b border-line/60 dark:border-line-dark/60"
                    >
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">
                        {modelDisplayName(row)}
                      </td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                        {formatCurrencyMYR(row.mae)}
                      </td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                        {formatCurrencyMYR(row.rmse)}
                      </td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                        {row.mape != null ? `${row.mape}%` : '—'}
                      </td>
                      <td className="py-2">
                        {row.is_best ? (
                          <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">
                            Best
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
