import { supabase } from '@/config/supabaseClient'
import { fetchRawSalesPayloads } from '@/services/salesService'
import { fromSalesPayloads } from '@/utils/prepPlanner'

const REVIEW_LIMIT = 2000

/**
 * The signed-in account's own data for the Prep & Stock Planner: per-item
 * sales (reusing salesService's paginated read) and its most recent
 * comments. Read only. Planning logic lives in src/utils/prepPlanner.js.
 */
export async function fetchPrepPlannerData() {
  const [payloads, reviewResult] = await Promise.all([
    fetchRawSalesPayloads(),
    supabase
      .from('processed_data')
      .select('collected_at, published_at, product, raw_text, sentiment, rating')
      .order('collected_at', { ascending: false })
      .limit(REVIEW_LIMIT),
  ])
  if (reviewResult.error) throw reviewResult.error

  const reviews = (reviewResult.data ?? [])
    .map((row) => {
      const stamp = row.published_at ?? row.collected_at
      return {
        date: stamp ? new Date(stamp).toISOString().slice(0, 10) : null,
        item: row.product ?? null,
        text: row.raw_text,
        sentiment: row.sentiment ?? null,
        rating: row.rating == null ? null : Number(row.rating),
      }
    })
    .filter((r) => r.date)

  return { ...fromSalesPayloads(payloads), reviews }
}
