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
  //
  // The first page also asks for the exact row count, so the remaining
  // pages are requested in parallel instead of one after another (five
  // sequential pages cost about 2.7 s on the Dashboard; SPARK_AUDIT.md P0-1).
  // Pages are concatenated in row_index order, so the result is identical.
  const page = (from, withCount = false) =>
    supabase
      .from('raw_data')
      .select('payload', withCount ? { count: 'exact' } : undefined)
      .eq('template_id', 'sales')
      .order('row_index', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

  const first = await page(0, true)
  if (first.error) throw first.error
  const firstRows = first.data ?? []
  const payloads = firstRows.map((row) => row.payload)
  if (firstRows.length < PAGE_SIZE) return payloads

  // If the count is unavailable, fall back to reading one page at a time.
  if (typeof first.count !== 'number') {
    for (let from = PAGE_SIZE; ; from += PAGE_SIZE) {
      const { data, error } = await page(from)
      if (error) throw error
      payloads.push(...(data ?? []).map((row) => row.payload))
      if (!data || data.length < PAGE_SIZE) break
    }
    return payloads
  }

  const starts = []
  for (let from = PAGE_SIZE; from < first.count; from += PAGE_SIZE) starts.push(from)
  const rest = await Promise.all(starts.map((from) => page(from)))
  for (const { data, error } of rest) {
    if (error) throw error
    payloads.push(...(data ?? []).map((row) => row.payload))
  }
  return payloads
}
