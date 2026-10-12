import { supabase } from '@/config/supabaseClient'
import { matchColumnsForTemplate, remapRecordToCanonicalColumns } from '@/utils/csvTemplates'
import { toIsoDate } from './dataPipelineService'

/**
 * The one missing prerequisite noted in ml/sentiment/data/schema.md and
 * ml/forecasting/data/schema.md: a way to get real rows out of
 * processed_data/daily_aggregates/raw_data as CSV, in the exact shape those
 * offline training pipelines already expect. No training happens here —
 * this only reads and reshapes existing real rows.
 */

const PAGE_SIZE = 1000

async function fetchAllRows(table, columns, applyFilter = (query) => query) {
  const rows = []
  let from = 0
  // Supabase caps a single response — paginate so a large dataset is never
  // silently truncated in a training export.
  for (;;) {
    const { data, error } = await applyFilter(supabase.from(table).select(columns)).range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

/** Matches ml/sentiment/data/schema.md exactly. No `label` column — this
 * project has no manually-labelled sentiment data; weak_labels.py derives
 * the training label from `rating` instead. */
export async function fetchSentimentTrainingRows() {
  return fetchAllRows('processed_data', 'id, author_id_hash, raw_text, cleaned_text, language, rating')
}

/**
 * Matches "Input 1" in ml/forecasting/data/schema.md — but note that spec
 * was written assuming sales/revenue would live on processed_data. In the
 * actual ingestion pipeline (dataPipelineService.ingestRows), only the
 * 'reviews'/'social' templates are ever written to processed_data; 'sales'
 * rows are only ever stored in raw_data (as the original, unmapped CSV
 * payload). So this reads from raw_data instead, and reuses the same
 * column-matching/remapping used at upload time to turn each row's
 * original headers (whatever they were) into the canonical sales columns.
 */
export async function fetchForecastSalesRows() {
  const salesRaw = await fetchAllRows('raw_data', 'id, payload', (query) => query.eq('template_id', 'sales'))

  return salesRaw
    .map((row) => {
      const headers = Object.keys(row.payload ?? {})
      const { mapping } = matchColumnsForTemplate('sales', headers)
      const record = remapRecordToCanonicalColumns(row.payload, mapping)
      const sales = Number.parseFloat(record.quantity_sold)
      const revenue = Number.parseFloat(record.revenue)
      if (!Number.isFinite(sales) && !Number.isFinite(revenue)) return null
      return {
        id: row.id,
        date: toIsoDate(record.date),
        product: record.product ?? '',
        sales: Number.isFinite(sales) ? sales : '',
        revenue: Number.isFinite(revenue) ? revenue : '',
      }
    })
    .filter(Boolean)
}

/** Matches "Input 2" (optional) in ml/forecasting/data/schema.md. */
export async function fetchForecastSentimentRegressorRows() {
  return fetchAllRows(
    'daily_aggregates',
    'date, source, platform, mention_volume, comment_volume, avg_rating_sentiment, positive_ratio, negative_ratio'
  )
}
