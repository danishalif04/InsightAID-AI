/**
 * Rating-derived weak sentiment label (FYP2.md §37): "4-5 stars -> potential
 * Positive, 3 -> potential Neutral, 1-2 -> potential Negative. Rating does
 * not automatically equal sentiment." This is a documented heuristic, not a
 * trained model — always stored with model_name 'rating_heuristic_v1' so it
 * is never confused with real ML inference once one exists.
 */

export const RATING_HEURISTIC_MODEL_NAME = 'rating_heuristic_v1'

/**
 * @returns {{ sentiment: 'positive'|'neutral'|'negative', score: number, confidence: number } | null}
 * `score` is the rating normalized to [-1, 1] (1★→-1, 3★→0, 5★→1) so it can
 * be averaged meaningfully across rows. null when rating is missing/out of range.
 */
export function classifyByRating(rating) {
  const value = typeof rating === 'number' ? rating : Number.parseFloat(rating)
  if (!Number.isFinite(value) || value < 1 || value > 5) return null

  const score = Math.round(((value - 3) / 2) * 100) / 100
  if (value >= 4) return { sentiment: 'positive', score, confidence: 0.6 }
  if (value === 3) return { sentiment: 'neutral', score, confidence: 0.5 }
  return { sentiment: 'negative', score, confidence: 0.6 }
}
