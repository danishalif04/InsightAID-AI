import { supabase } from '@/config/supabaseClient'

/**
 * Read-only access to this user's uploaded sales data for the redesign's
 * new charts (Dashboard/Forecasting revenue, promo-day detection, health
 * score revenue momentum — see src/utils/salesSeries.js for the actual
 * math). Reads `raw_data` directly rather than adding anything to the
 * ingestion pipeline (dataPipelineService.js) — sales rows were never
 * written to processed_data/daily_aggregates in the first place (only
 * text-bearing templates are), so this is a new read path, not a change
 * to an existing one.
 */
export async function fetchRawSalesPayloads() {
  const { data, error } = await supabase
    .from('raw_data')
    .select('payload')
    .eq('template_id', 'sales')
    .order('row_index', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => row.payload)
}
