import { supabase } from '@/config/supabaseClient'

/**
 * Reads real forecast_results rows (FYP2.md §50-51), written offline by
 * ml/forecasting/ — nothing in the frontend computes or recalculates a
 * forecast. Returns every row from the most recent run so the UI can show
 * the full model comparison, not just the winner, per "never hardcode
 * which model performs better. Display actual calculated results."
 */
export async function getLatestForecastRun() {
  const { data: latest, error: latestError } = await supabase
    .from('forecast_results')
    .select('run_id, generated_at')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestError) throw latestError
  if (!latest) return { runId: null, generatedAt: null, rows: [] }

  const { data: rows, error: rowsError } = await supabase
    .from('forecast_results')
    .select('*')
    .eq('run_id', latest.run_id)
    .order('model_type', { ascending: true })
  if (rowsError) throw rowsError

  return { runId: latest.run_id, generatedAt: latest.generated_at, rows: rows ?? [] }
}

export function getBestRow(rows) {
  return rows.find((row) => row.is_best) ?? null
}

/**
 * Triggers the `run-forecast` Edge Function — a real, instantly-computed
 * moving-average baseline against this user's own uploaded sales data (no
 * email, no offline notebook). See that function's header comment for why
 * it's baseline-tier rather than the full ARIMA/Prophet/XGBoost/LSTM
 * comparison (Python-only, can't run inside a Deno Edge Function).
 */
export async function runForecast() {
  const { data, error } = await supabase.functions.invoke('run-forecast', { method: 'POST' })
  if (error) {
    // supabase-js only gives a generic message for a non-2xx Edge Function
    // response by default — the real detail is in the response body.
    const body = await error.context?.json?.().catch(() => null)
    const err = new Error(body?.message ?? error.message ?? 'Could not run forecasting right now.')
    err.code = body?.error ?? null
    throw err
  }
  return data
}
