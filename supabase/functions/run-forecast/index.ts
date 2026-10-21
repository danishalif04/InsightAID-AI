// Supabase Edge Function — on-demand, in-app forecast baseline.
//
// Why this exists: the full model comparison (moving average / ARIMA /
// Prophet / XGBoost / LSTM, see ml/forecasting/src/) only runs in Python
// (statsmodels/prophet/xgboost/tensorflow), which Deno Edge Functions
// cannot import. Rather than fake a richer result, this function runs the
// ONE model from that package that's honestly portable to TypeScript —
// the moving-average baseline (ml/forecasting/src/baselines.py) — using
// the exact same formula, the exact same rolling-origin evaluation
// methodology (ml/forecasting/src/rolling_split.py), and the exact same
// MAE/RMSE/MAPE formulas (ml/forecasting/src/metrics.py). It is a REAL,
// freshly-computed forecast from the caller's own uploaded sales data —
// just baseline-tier, not the full comparison. The offline notebook
// (ml/notebooks/04_train_forecasting_models.ipynb) remains the way to get
// the fuller ARIMA/Prophet/XGBoost/LSTM comparison.
//
// No email, no manual SQL: runs as the calling user via their own JWT
// (forwarded below), so `forecast_results.user_id` resolves to
// `auth.uid()` automatically and RLS scopes every read/write to them.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

// --- Mirrors src/utils/csvTemplates.js's 'sales' entry. Edge Functions are
// deployed standalone and can't import from src/, so this is a deliberate,
// minimal duplication — keep in sync if the sales template's columns or
// synonyms change. ---
const SALES_CANONICAL_COLUMNS = ['date', 'product', 'category', 'quantity_sold', 'unit_price', 'revenue', 'discount', 'cost']
const SALES_SYNONYMS: Record<string, string[]> = {
  date: ['order date', 'transaction date', 'sale date', 'txn date'],
  revenue: ['total', 'total price', 'total revenue', 'total amount', 'sales amount', 'amount'],
}

function normalizeHeader(header: string): string {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

function buildSalesLookup(): Map<string, string> {
  const lookup = new Map<string, string>()
  for (const column of SALES_CANONICAL_COLUMNS) lookup.set(normalizeHeader(column), column)
  for (const [column, synonyms] of Object.entries(SALES_SYNONYMS)) {
    for (const synonym of synonyms) lookup.set(normalizeHeader(synonym), column)
  }
  return lookup
}

function extractDateRevenue(payload: Record<string, unknown>, lookup: Map<string, string>): { date: string; revenue: number } | null {
  let dateHeader: string | null = null
  let revenueHeader: string | null = null
  for (const header of Object.keys(payload)) {
    const canonical = lookup.get(normalizeHeader(header))
    if (canonical === 'date' && dateHeader == null) dateHeader = header
    if (canonical === 'revenue' && revenueHeader == null) revenueHeader = header
  }
  if (!dateHeader || !revenueHeader) return null

  const parsedDate = new Date(String(payload[dateHeader]))
  const revenue = Number.parseFloat(String(payload[revenueHeader]))
  if (Number.isNaN(parsedDate.getTime()) || !Number.isFinite(revenue)) return null

  return { date: parsedDate.toISOString().slice(0, 10), revenue }
}

// --- Mirrors ml/forecasting/src/baselines.py exactly. ---
function movingAverageForecast(history: number[], horizon: number, window = 7): number[] {
  const effective = history.length >= window ? history.slice(-window) : history
  const average = effective.reduce((sum, v) => sum + v, 0) / effective.length
  return new Array(horizon).fill(average)
}

// --- Mirrors ml/forecasting/src/metrics.py's compute_forecast_metrics/average_metrics. ---
function computeMetrics(actual: number[], predicted: number[]) {
  const n = actual.length
  const errors = actual.map((a, i) => a - predicted[i])
  const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / n
  const rmse = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / n)
  const mapeTerms = actual.map((a, i) => (a !== 0 ? Math.abs((a - predicted[i]) / a) : null)).filter((v): v is number => v !== null)
  const mape = mapeTerms.length > 0 ? (mapeTerms.reduce((sum, v) => sum + v, 0) / mapeTerms.length) * 100 : null
  return { mae, rmse, mape, nMapePoints: mapeTerms.length }
}

// --- Mirrors ml/forecasting/src/rolling_split.py's rolling_origin_splits. ---
function rollingOriginSplits(nObservations: number, initialTrainSize: number, horizon: number, maxFolds: number) {
  const folds: Array<{ trainEnd: number; testEnd: number }> = []
  let trainEnd = initialTrainSize
  while (trainEnd + horizon <= nObservations && folds.length < maxFolds) {
    folds.push({ trainEnd, testEnd: trainEnd + horizon })
    trainEnd += horizon
  }
  return folds
}

const MIN_DAYS = 14

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return jsonResponse({ error: 'AUTH_REQUIRED', message: 'Sign in before running a forecast.' }, 401)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anonKey) return jsonResponse({ error: 'NOT_CONFIGURED', message: 'Supabase credentials are unavailable.' }, 503)

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })

  // PostgREST caps a single request at its configured max-rows (default
  // 1000) even without an explicit .limit() — silently truncating a large
  // account's history to an old subset. Page through with .range() so a
  // >1000-row sales upload doesn't quietly freeze the forecast at a stale
  // cutoff date.
  const PAGE_SIZE = 1000
  const rows: { payload: unknown }[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page, error: readError } = await supabase
      .from('raw_data')
      .select('payload')
      .eq('template_id', 'sales')
      .order('row_index', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (readError) return jsonResponse({ error: 'DATABASE_ERROR', message: readError.message }, 500)
    rows.push(...(page ?? []))
    if (!page || page.length < PAGE_SIZE) break
  }
  if (rows.length === 0) {
    return jsonResponse(
      { error: 'NO_SALES_DATA', message: 'No sales dataset found for your account yet — upload one via Dataset Management first.' },
      422
    )
  }

  const lookup = buildSalesLookup()
  const byDate = new Map<string, number>()
  for (const row of rows) {
    const parsed = extractDateRevenue(row.payload as Record<string, unknown>, lookup)
    if (!parsed) continue
    byDate.set(parsed.date, (byDate.get(parsed.date) ?? 0) + parsed.revenue)
  }
  if (byDate.size === 0) {
    return jsonResponse(
      { error: 'NO_SALES_DATA', message: "Your uploaded sales rows don't have a recognizable date/revenue column — check the file against the Sales template." },
      422
    )
  }

  // Zero-fill every day between min and max date (no transactions that day
  // is a real, legitimate 0 — not fabricated, not guessed).
  const sortedDates = [...byDate.keys()].sort()
  const start = new Date(sortedDates[0])
  const end = new Date(sortedDates[sortedDates.length - 1])
  const dailySeries: Array<{ date: string; revenue: number }> = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    dailySeries.push({ date: iso, revenue: byDate.get(iso) ?? 0 })
  }

  const nObservations = dailySeries.length
  if (nObservations < MIN_DAYS) {
    return jsonResponse(
      {
        error: 'INSUFFICIENT_DATA',
        message: `Only ${nObservations} day(s) of sales data span your upload — at least ${MIN_DAYS} are needed for a meaningful forecast evaluation.`,
      },
      422
    )
  }

  const horizon = 7
  const maxFolds = 2
  const initialTrainSize = Math.max(7, nObservations - horizon * (maxFolds + 1))
  const folds = rollingOriginSplits(nObservations, initialTrainSize, horizon, maxFolds)
  if (folds.length === 0) {
    return jsonResponse(
      { error: 'INSUFFICIENT_DATA', message: 'Not enough history relative to the 7-day evaluation horizon yet.' },
      422
    )
  }

  const revenueValues = dailySeries.map((d) => d.revenue)
  const foldMetrics = folds.map((fold) => {
    const train = revenueValues.slice(0, fold.trainEnd)
    const actual = revenueValues.slice(fold.trainEnd, fold.testEnd)
    const predicted = movingAverageForecast(train, horizon)
    return computeMetrics(actual, predicted)
  })

  const mae = foldMetrics.reduce((sum, m) => sum + m.mae, 0) / foldMetrics.length
  const rmse = foldMetrics.reduce((sum, m) => sum + m.rmse, 0) / foldMetrics.length
  const mapeValues = foldMetrics.map((m) => m.mape).filter((v): v is number => v !== null)
  const mape = mapeValues.length > 0 ? mapeValues.reduce((sum, v) => sum + v, 0) / mapeValues.length : null

  // Forward-looking forecast, trained on the FULL series (same pattern as
  // ml/forecasting/src/evaluate.py's final-forecast step).
  const futurePredictions = movingAverageForecast(revenueValues, horizon)
  const margin = 1.96 * rmse
  const lastDate = new Date(sortedDates[sortedDates.length - 1])
  const forecastPoints = futurePredictions.map((predicted, i) => {
    const date = new Date(lastDate)
    date.setUTCDate(date.getUTCDate() + i + 1)
    return {
      date: date.toISOString().slice(0, 10),
      predicted: Math.round(predicted * 100) / 100,
      lower: Math.round((predicted - margin) * 100) / 100,
      upper: Math.round((predicted + margin) * 100) / 100,
    }
  })

  const row = {
    run_id: `inapp-${Date.now()}`,
    model_type: 'moving_average',
    variant: 'sales_only',
    horizon_days: horizon,
    dataset_version: null,
    evaluation_period_start: dailySeries[initialTrainSize]?.date ?? sortedDates[0],
    evaluation_period_end: sortedDates[sortedDates.length - 1],
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    mape: mape !== null ? Math.round(mape * 100) / 100 : null,
    forecast_points: forecastPoints,
    is_best: true,
    notes:
      'Baseline moving-average forecast, computed instantly from your uploaded sales data. For the fuller ARIMA/Prophet/XGBoost/LSTM comparison, run ml/notebooks/04_train_forecasting_models.ipynb.',
  }

  const { error: insertError } = await supabase.from('forecast_results').insert(row)
  if (insertError) return jsonResponse({ error: 'DATABASE_ERROR', message: insertError.message }, 500)

  return jsonResponse({ runId: row.run_id, row })
})
