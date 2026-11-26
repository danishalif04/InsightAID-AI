import { supabase } from '@/config/supabaseClient'
import { getProfile } from './businessProfileService'
import { runCrisisDetection } from './crisisService'
import { calculateReadiness } from '@/utils/dataReadiness'
import { buildBusinessContextFactors, generateRecommendations } from '@/utils/recommendationRules'
import { explanationCacheKey, explanationInput, splitCached } from '@/utils/explanationCache'

/**
 * Assembles real context (business profile, crisis signals, data
 * readiness) and runs the Layer-1 rule engine (FYP2.md §54), then — best
 * effort only — asks the explain-recommendations Edge Function (Layer 2,
 * backed by whichever OpenAI-compatible provider is configured via the
 * AI_BASE_URL/AI_API_KEY/AI_MODEL secrets — see
 * supabase/functions/_shared/aiClient.ts; swapping providers is a secrets
 * change only, never a code change) to phrase each one. If the AI layer is
 * unavailable/unconfigured, the rule-based recommendations are returned
 * unchanged (§55): the caller never blocks on it and never shows a blank
 * page because it's down.
 */

async function countRows(templateId) {
  const { count, error } = await supabase
    .from('raw_data')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId)
  if (error) throw error
  return count ?? 0
}

async function countHistoricalMonths() {
  // Earliest and latest rows are independent reads; run them together.
  const dateRow = (ascending) =>
    supabase.from('processed_data').select('published_at, collected_at').order('collected_at', { ascending }).limit(1)
  const [{ data, error }, { data: latest, error: latestError }] = await Promise.all([dateRow(true), dateRow(false)])
  if (error) throw error
  if (!data?.length) return 0
  if (latestError) throw latestError

  const earliest = new Date(data[0].published_at ?? data[0].collected_at)
  const mostRecent = new Date(latest[0].published_at ?? latest[0].collected_at)
  const months = (mostRecent.getFullYear() - earliest.getFullYear()) * 12 + (mostRecent.getMonth() - earliest.getMonth())
  return Math.max(0, months)
}

/** Exported for reuse by reportContextService.js (Phase 11) — the same
 * profile/crisis/data-readiness assembly backs both the recommendation
 * engine and report generation, computed once rather than twice. */
export async function buildContext(mode) {
  const [profile, crisis, salesCount, reviewsCount, socialCount, historicalMonths] = await Promise.all([
    getProfile(),
    runCrisisDetection().catch(() => null), // crisis data missing shouldn't block recommendations
    countRows('sales'),
    countRows('reviews'),
    countRows('social'),
    countHistoricalMonths().catch(() => null),
  ])

  const dataReadiness = calculateReadiness({
    values: profile.values,
    salesRecordsCount: salesCount,
    reviewsCount,
    socialRecordsCount: socialCount,
    historicalMonthsCount: historicalMonths,
  })

  return { mode, profile, crisis, dataReadiness }
}

/** Stored AI wording for these keys. Any failure (including the table not
 * existing yet) reads as an empty cache, so the AI is simply asked. */
async function readExplanationCache(keys) {
  try {
    const { data, error } = await supabase
      .from('recommendation_explanations')
      .select('cache_key, rationale, context')
      .in('cache_key', keys)
    return error ? [] : (data ?? [])
  } catch {
    return []
  }
}

/** Calls Layer 2. Never throws — returns {} on any failure so the caller
 * can fall back to rule-only recommendations, per FYP2.md §55.
 *
 * SPARK item 7: wording already produced for the exact same inputs
 * (src/utils/explanationCache.js) is reused, so only new or changed
 * recommendations wait for the AI. New wording is stored without blocking. */
export async function fetchExplanations(recommendations, businessContext) {
  if (recommendations.length === 0) return { explanations: {}, unavailable: false }

  const keys = await Promise.all(recommendations.map((rec) => explanationCacheKey(rec, businessContext)))
  const { cached, missing } = splitCached(recommendations, keys, await readExplanationCache(keys))
  if (missing.length === 0) return { explanations: cached, unavailable: false }

  const { data, error } = await supabase.functions.invoke('explain-recommendations', {
    body: { recommendations: missing.map(explanationInput), businessContext },
  })

  if (error || data?.error) return { explanations: cached, unavailable: Object.keys(cached).length === 0 }
  const fresh = data?.explanations ?? {}

  const keyById = new Map(recommendations.map((rec, i) => [rec.id, keys[i]]))
  const rows = Object.entries(fresh)
    .filter(([id, e]) => keyById.has(id) && e?.rationale && e?.context)
    .map(([id, e]) => ({ cache_key: keyById.get(id), rule_id: id, rationale: e.rationale, context: e.context }))
  if (rows.length > 0) {
    Promise.resolve(supabase.from('recommendation_explanations').upsert(rows, { onConflict: 'user_id,cache_key' })).catch(() => {})
  }

  return { explanations: { ...cached, ...fresh }, unavailable: false }
}

/**
 * Runs Layer 1 + Layer 2 against an ALREADY-BUILT context — for callers
 * (dashboardService, reportContextService) that need both a raw context
 * and AI-explained recommendations, so buildContext()'s ~9 queries
 * (profile, crisis detection, 3 record counts, historical-months lookup)
 * run once, not twice. This is what getRecommendations() below also uses.
 * @returns {Promise<{recommendations: Array, businessContext: Array, explainerAvailable: boolean}>}
 */
export async function getRecommendationsFromContext(context) {
  const recommendations = generateRecommendations(context)
  const businessContext = buildBusinessContextFactors(context)

  const { explanations, unavailable } = await fetchExplanations(recommendations, businessContext)

  const enriched = recommendations.map((rec) => ({
    ...rec,
    rationale: explanations[rec.id]?.rationale ?? null,
    context: explanations[rec.id]?.context ?? null,
    explainedBy: explanations[rec.id] ? 'ai' : 'rule_only',
  }))

  return { recommendations: enriched, businessContext, explainerAvailable: !unavailable }
}

/** @returns {Promise<{recommendations: Array, businessContext: Array, explainerAvailable: boolean}>} */
export async function getRecommendations(mode = 'startup') {
  const context = await buildContext(mode)
  return getRecommendationsFromContext(context)
}

/** Persists the current recommendation set (src/pages/AiRecommendations.jsx
 * calls this explicitly — never auto-saved on every page view). */
export async function saveRecommendations(recommendations, runId) {
  if (recommendations.length === 0) return
  const rows = recommendations.map((rec) => ({
    run_id: runId,
    rule_id: rec.id,
    category: rec.category,
    priority: rec.priority,
    title: rec.title,
    evidence: rec.evidence,
    rationale: rec.rationale,
    context: rec.context,
    explained_by: rec.explainedBy,
  }))
  const { error } = await supabase.from('recommendations').insert(rows)
  if (error) throw error
}

/**
 * FYP II Phase 5's "Was this useful?" feedback — logged by `rule_id`
 * (e.g. 'crisis_critical_response'), not a `recommendations.id` row,
 * since the recommendation being rated may be shown live and never
 * explicitly Saved. Requires migration 0011_recommendation_feedback.sql.
 */
export async function submitRecommendationFeedback(ruleId, useful) {
  const { error } = await supabase.from('recommendation_feedback').insert({ rule_id: ruleId, useful })
  if (error) throw error
}

/**
 * AI Business Action Centre (knowledge_updated_nov2026.md item 6) — lists
 * previously-Saved recommendations (same `recommendations` table
 * saveRecommendations() writes to) with their status. Only rows the owner
 * explicitly saved appear here, same as AiRecommendations.jsx's own
 * "Saved" concept — a recommendation shown live and never saved has
 * nothing to track yet.
 */
export async function listActionCentreItems() {
  const { data, error } = await supabase.from('recommendations').select('*').order('generated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * The only state transition this app ever makes automatically-adjacent:
 * the OWNER explicitly accepts or dismisses here. Accepting never
 * triggers any automated change (no price edit, no supplier contact) —
 * it only records the owner's decision for their own tracking.
 */
export async function updateActionCentreStatus(id, status) {
  const { error } = await supabase.from('recommendations').update({ status }).eq('id', id)
  if (error) throw error
}
