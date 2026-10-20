import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { useMode } from '@/hooks/useMode'
import { useNotifications } from '@/hooks/useNotifications'
import { CHART_COLORS } from '@/theme/chartTheme'
import { formatCurrencyMYR } from '@/utils/formatters'
import { getBestRow, getLatestForecastRun } from '@/services/forecastResultsService'

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
  const [runId, setRunId] = useState(null)
  const [generatedAt, setGeneratedAt] = useState(null)
  const [rows, setRows] = useState([])

  const loadForecast = async () => {
    setLoading(true)
    try {
      const result = await getLatestForecastRun()
      setRunId(result.runId)
      setGeneratedAt(result.generatedAt)
      setRows(result.rows)
    } catch (error) {
      notify(`Could not load forecast results: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForecast()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const best = getBestRow(rows)
  const chartSeries = (best?.forecast_points ?? []).map((point) => ({
    date: point.date,
    predicted: point.predicted,
    low: point.lower,
    band: point.upper != null && point.lower != null ? point.upper - point.lower : null,
  }))

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
          <Button icon={RefreshCw} loading={loading} onClick={loadForecast}>
            Refresh
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading forecast results…</p>
        </Card>
      ) : !runId ? (
        <Card title="No forecasting run yet">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Forecasting trains offline — moving average, ARIMA, Prophet (sales-only and
            sentiment-enhanced), and XGBoost are evaluated on identical rolling-origin time periods, and the
            actual best-performing model is written to <code>forecast_results</code>. No run has produced any
            data yet.
          </p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            See <code>ml/forecasting/README.md</code> for how to run the training notebook once enough sales
            history has been uploaded via Dataset Management.
          </p>
        </Card>
      ) : (
        <>
          <Card
            title={`Model Forecast — ${best ? modelDisplayName(best) : 'unknown'}`}
            description="Shaded band = model's own uncertainty interval. This model was picked because it had the lowest MAPE among everything evaluated — see the comparison table below."
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartSeries} margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  width={36}
                />
                <Tooltip content={<ChartTooltip formatter={(value) => (value != null ? formatCurrencyMYR(value) : '—')} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="low" stackId="band" stroke="none" fill="transparent" legendType="none" name="" />
                <Area
                  dataKey="band"
                  stackId="band"
                  stroke="none"
                  fill={CHART_COLORS.forecast}
                  fillOpacity={0.12}
                  name="Uncertainty interval"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted"
                  stroke={CHART_COLORS.forecast}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

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
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">MAPE (target &lt; {MAPE_TARGET}%)</p>
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
                    <tr key={`${row.model_type}-${row.variant}`} className="border-b border-line/60 dark:border-line-dark/60">
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">{modelDisplayName(row)}</td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{formatCurrencyMYR(row.mae)}</td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{formatCurrencyMYR(row.rmse)}</td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{row.mape != null ? `${row.mape}%` : '—'}</td>
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
