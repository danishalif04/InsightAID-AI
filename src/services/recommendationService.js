import { supabase } from '@/config/supabaseClient'
import { getProfile } from './businessProfileService'
import { runCrisisDetection } from './crisisService'
import { calculateReadiness } from '@/utils/dataReadiness'
import { buildBusinessContextFactors, generateRecommendations } from '@/utils/recommendationRules'

/**
 * Assembles real context (business profile, crisis signals, data
 * readiness) and runs the Layer-1 rule engine (FYP2.md §54), then — best
 * effort only — asks the explain-recommendations Edge Function (Layer 2)
 * to phrase each one. If Gemini is unavailable/unconfigured, the rule-based
 * recommendations are returned unchanged (§55): the caller never blocks on
 * Gemini and never shows a blank page because it's down.
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
  const { data, error } = await supabase
    .from('processed_data')
    .select('published_at, collected_at')
    .order('collected_at', { ascending: true })
    .limit(1)
  if (error) throw error
  if (!data?.length) return 0

  const { data: latest, error: latestError } = await supabase
    .from('processed_data')
    .select('published_at, collected_at')
    .order('collected_at', { ascending: false })
    .limit(1)
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

/** Calls Layer 2. Never throws — returns {} on any failure so the caller
 * can fall back to rule-only recommendations, per FYP2.md §55. */
async function fetchExplanations(recommendations, businessContext) {
  if (recommendations.length === 0) return { explanations: {}, unavailable: false }

  const { data, error } = await supabase.functions.invoke('explain-recommendations', {
    body: {
      recommendations: recommendations.map(({ id, category, priority, title, evidence }) => ({ id, category, priority, title, evidence })),
      businessContext,
    },
  })

  if (error || data?.error) return { explanations: {}, unavailable: true }
  return { explanations: data?.explanations ?? {}, unavailable: false }
}

/**
 * Runs Layer 1 + Layer 2 against an ALREADY-BUILT context — for callers
 * (dashboardService, reportContextService) that need both a raw context
 * and Gemini-explained recommendations, so buildContext()'s ~9 queries
 * (profile, crisis detection, 3 record counts, historical-months lookup)
 * run once, not twice. This is what getRecommendations() below also uses.
 * @returns {Promise<{recommendations: Array, businessContext: Array, geminiAvailable: boolean}>}
 */
export async function getRecommendationsFromContext(context) {
  const recommendations = generateRecommendations(context)
  const businessContext = buildBusinessContextFactors(context)

  const { explanations, unavailable } = await fetchExplanations(recommendations, businessContext)

  const enriched = recommendations.map((rec) => ({
    ...rec,
    rationale: explanations[rec.id]?.rationale ?? null,
    context: explanations[rec.id]?.context ?? null,
    explainedBy: explanations[rec.id] ? 'gemini' : 'rule_only',
  }))

  return { recommendations: enriched, businessContext, geminiAvailable: !unavailable }
}

/** @returns {Promise<{recommendations: Array, businessContext: Array, geminiAvailable: boolean}>} */
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
