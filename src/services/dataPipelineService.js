import { supabase } from '@/config/supabaseClient'
import { CUSTOM_TEMPLATE_ID, validateDataset } from '@/utils/datasetValidation'
import { matchColumnsForTemplate, remapRecordToCanonicalColumns } from '@/utils/csvTemplates'
import { preprocessText } from '@/utils/textPreprocessing'
import { aggregateDaily, computeReviewFeatures, computeTextFeatures } from '@/utils/featureEngineering'
import { RATING_HEURISTIC_MODEL_NAME, classifyByRating } from '@/utils/ratingSentimentHeuristic'

// Demo text for seedFixtureSample() below — real, human-written sample
// posts (not fetched, not fabricated data pretending to be live), used only
// to prove the ingestion pipeline works end-to-end. Previously lived in
// src/data/sentimentData.js / socialData.js alongside displayed mock
// numbers; moved inline once those pages went real (Phase 10) so this
// demo-seeding capability doesn't depend on files that no longer exist.
const FIXTURE_REVIEW_POSTS = [
  { platform: 'tiktok', text: 'Just tried the new InsightAid dashboard demo and honestly the crisis detection alerts are a game changer for my small business.' },
  { platform: 'x', text: 'Penghantaran lambat minggu ni, harap boleh diperbaiki secepat mungkin sebab pelanggan dah mula merungut.' },
  { platform: 'tiktok', text: '这个产品的包装设计很好看,但是价格对学生党来说有点贵。' },
  { platform: 'x', text: 'Customer support resolved my refund in under an hour. Genuinely impressed with the response time.' },
]

const FIXTURE_SOCIAL_POSTS = [
  { platform: 'tiktok', text: 'This dashboard literally caught our sentiment dip before I even noticed complaints coming in.', likes: 24800, shares: 3600 },
  { platform: 'x', text: 'Refund processed in under an hour after I flagged it. Customer service actually reads the feed apparently.', likes: 9100, shares: 1400 },
  { platform: 'tiktok', text: 'Unboxing the new packaging — still think the price is a bit steep for students but quality is solid.', likes: 15600, shares: 2100 },
  { platform: 'x', text: 'Delivery delay again this week. Third time this month, need a real fix not just an apology tweet.', likes: 4200, shares: 2800 },
]

/**
 * Ties the pure pipeline utilities to real Supabase writes. Pages never call
 * supabase directly — same convention as every other *Service.js file.
 */

const TEXT_BEARING_TEMPLATES = new Set(['reviews', 'social'])
const TEXT_COLUMN = { reviews: 'review_text', social: 'content' }
const ENGAGEMENT_COLUMNS = ['engagement', 'likes', 'comments', 'shares']

function sumEngagement(record) {
  const values = ENGAGEMENT_COLUMNS.map((column) => Number.parseFloat(record[column])).filter(Number.isFinite)
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null
}

export function toIsoDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Validates, preprocesses (for text-bearing templates), feature-engineers,
 * and stores one uploaded (or fixture-seeded) dataset.
 *
 * `records`' own headers/keys are stored byte-for-byte in raw_data.payload
 * no matter what they're named — "preserve raw" (FYP2.md §44) means never
 * rewriting what was uploaded, even to fix a header name. Recognizing that
 * a real-world header like "Order Date" means the same thing as the
 * canonical "date" column (FYP2.md §35 — any real file format should be
 * usable) happens on a SEPARATE normalized copy used only for
 * validation/feature-engineering, built via
 * src/utils/csvTemplates.js's matchColumnsForTemplate()/
 * remapRecordToCanonicalColumns().
 *
 * @param {string} templateId one of CSV_TEMPLATES' ids, or CUSTOM_TEMPLATE_ID
 * @param {Array<Record<string,string>>} records parsed rows (string cells)
 * @param {'csv_upload'|'json_upload'|'fixture_seed'} source
 * @param {string|null} filename
 */
export async function ingestRows(templateId, records, source, filename = null) {
  const validation = validateDataset(templateId, records)

  const rawRows = records.map((record, index) => ({
    source,
    template_id: templateId,
    original_filename: filename,
    row_index: index,
    payload: record,
    is_duplicate: validation.duplicateFlags[index] ?? false,
  }))

  const { data: insertedRaw, error: rawError } =
    rawRows.length > 0 ? await supabase.from('raw_data').insert(rawRows).select('id') : { data: [], error: null }
  if (rawError) throw rawError

  let processedCount = 0

  // Custom/unrecognized-format imports are preserved in raw_data for
  // review/export, but there's no canonical column mapping to safely guess
  // which field (if any) is review text, a rating, a date, etc. — so no
  // processed_data/feature-engineering step runs for them. This matches
  // CUSTOM_TEMPLATE_ID's own validation report, which says the same thing.
  if (templateId !== CUSTOM_TEMPLATE_ID && TEXT_BEARING_TEMPLATES.has(templateId)) {
    const textColumn = TEXT_COLUMN[templateId]
    const headers = records.length > 0 ? Object.keys(records[0]) : []
    const { mapping } = matchColumnsForTemplate(templateId, headers)

    const processedRows = records
      .map((originalRecord, index) => {
        const record = remapRecordToCanonicalColumns(originalRecord, mapping)
        const rawText = record[textColumn] ?? ''
        if (!rawText.trim()) return null

        const pre = preprocessText(rawText)
        const textFeatures = computeTextFeatures(pre)
        const rating = Number.parseFloat(record.rating)
        const reviewFeatures = templateId === 'reviews' ? computeReviewFeatures({ rating, product: record.product, category: record.category }) : {}
        // Only real ratings feed the heuristic — never invented for rows that don't have one.
        const ratingClass = templateId === 'reviews' ? classifyByRating(rating) : null

        return {
          raw_data_id: insertedRaw?.[index]?.id ?? null,
          source,
          platform: record.platform ?? null,
          collected_at: toIsoDate(record.date),
          raw_text: pre.rawText,
          cleaned_text: pre.cleanedText,
          language: pre.language,
          product: record.product ?? null,
          category: record.category ?? null,
          rating: Number.isFinite(rating) ? rating : null,
          engagement: sumEngagement(record),
          sentiment: ratingClass?.sentiment ?? null,
          sentiment_score: ratingClass?.score ?? null,
          sentiment_confidence: ratingClass?.confidence ?? null,
          model_name: ratingClass ? RATING_HEURISTIC_MODEL_NAME : null,
          predicted_at: ratingClass ? new Date().toISOString() : null,
          features: { ...textFeatures, ...reviewFeatures },
        }
      })
      .filter(Boolean)

    if (processedRows.length > 0) {
      const { error: processedError } = await supabase.from('processed_data').insert(processedRows)
      if (processedError) throw processedError
      processedCount = processedRows.length

      const aggregates = aggregateDaily(
        processedRows
          .filter((row) => row.collected_at)
          .map((row) => ({
            collectedAt: row.collected_at,
            source: row.source,
            platform: row.platform,
            engagement: row.engagement,
            sentiment: row.sentiment,
            sentimentScore: row.sentiment_score,
          }))
      )

      if (aggregates.length > 0) {
        const { error: aggregateError } = await supabase.from('daily_aggregates').upsert(
          aggregates.map((aggregate) => ({
            date: aggregate.date,
            source: aggregate.source,
            platform: aggregate.platform,
            mention_volume: aggregate.mentionVolume,
            comment_volume: aggregate.commentVolume,
            avg_rating_sentiment: aggregate.avgRatingSentiment,
            positive_ratio: aggregate.positiveRatio,
            negative_ratio: aggregate.negativeRatio,
          })),
          { onConflict: 'user_id,date,source,platform' }
        )
        if (aggregateError) throw aggregateError
      }
    }
  }

  return { validation, rawCount: rawRows.length, processedCount }
}

/**
 * Runs the existing mock post text (already in the codebase's UI fixtures)
 * through this same real pipeline — proves it's one pipeline, not a
 * decorative one plus a separate fake display path (FYP2.md §41).
 * No numbers are invented for this demo: reviews get no synthetic rating
 * (the original mock posts never had one), so their sentiment stays null,
 * same as it honestly would for any real review missing a rating.
 */
export async function seedFixtureSample() {
  const today = new Date().toISOString().slice(0, 10)

  const reviewRows = FIXTURE_REVIEW_POSTS.map((post) => ({
    date: today,
    product: 'Sample Product',
    review_text: post.text,
    rating: '',
    platform: post.platform === 'tiktok' ? 'TikTok' : 'X',
  }))

  const socialRows = FIXTURE_SOCIAL_POSTS.map((post) => ({
    date: today,
    platform: post.platform === 'tiktok' ? 'TikTok' : 'X',
    content: post.text,
    engagement: String(post.likes + post.shares),
    likes: String(post.likes),
    comments: '0',
    shares: String(post.shares),
  }))

  const [reviews, social] = await Promise.all([
    ingestRows('reviews', reviewRows, 'fixture_seed', 'sample_reviews.csv'),
    ingestRows('social', socialRows, 'fixture_seed', 'sample_social.csv'),
  ])

  return { reviews, social }
}
