import { supabase } from '@/config/supabaseClient'
import { validateDataset } from '@/utils/datasetValidation'
import { preprocessText } from '@/utils/textPreprocessing'
import { aggregateDaily, computeReviewFeatures, computeTextFeatures } from '@/utils/featureEngineering'
import { RATING_HEURISTIC_MODEL_NAME, classifyByRating } from '@/utils/ratingSentimentHeuristic'
import { influentialPosts } from '@/data/sentimentData'
import { topPosts } from '@/data/socialData'

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

function toIsoDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Validates, preprocesses (for text-bearing templates), feature-engineers,
 * and stores one uploaded (or fixture-seeded) dataset.
 * @param {string} templateId one of CSV_TEMPLATES' ids
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

  if (TEXT_BEARING_TEMPLATES.has(templateId)) {
    const textColumn = TEXT_COLUMN[templateId]

    const processedRows = records
      .map((record, index) => {
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

  const reviewRows = influentialPosts.slice(0, 4).map((post) => ({
    date: today,
    product: 'Sample Product',
    review_text: post.text,
    rating: '',
    platform: post.platform === 'tiktok' ? 'TikTok' : 'X',
  }))

  const socialRows = topPosts.map((post) => ({
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
