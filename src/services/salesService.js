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
const PAGE_SIZE = 1000

export async function fetchRawSalesPayloads() {
  // PostgREST caps a single request at its configured max-rows (default
  // 1000) even without an explicit .limit() — the exact same bug once
  // found live in supabase/functions/run-forecast/index.ts, where it
  // silently truncated a 4,087-row sales upload to its first 1,000 rows
  // (by row_index), freezing the "historical actuals" portion of any
  // chart built from this at a stale ~17-month-old cutoff. Paginated with
  // .range() the same way, so this read path can't regress to the same bug.
  const payloads = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('raw_data')
      .select('payload')
      .eq('template_id', 'sales')
      .order('row_index', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    payloads.push(...(data ?? []).map((row) => row.payload))
    if (!data || data.length < PAGE_SIZE) break
  }
  return payloads
}
