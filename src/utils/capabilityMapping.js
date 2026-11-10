/**
 * Intelligent Data Readiness Engine (knowledge_updated_nov2026.md item 7)
 * — maps what's actually on file to which analytical capability that
 * unlocks. Deliberately reuses dataReadiness.js's existing checklist
 * rather than recomputing readiness a second way; this is only a
 * friendlier relabelling of the same real signals into the capability
 * names the spec's example table uses. Never marks a capability
 * available unless its underlying checklist item is actually met.
 */

export const CAPABILITY_RULES = [
  { checklistId: 'business_plan', capability: 'Product & cost margin, break-even planning' },
  { checklistId: 'sales', capability: 'Sales trend analysis' },
  { checklistId: 'reviews', capability: 'Sentiment analysis' },
  { checklistId: 'social', capability: 'Social intelligence' },
  { checklistId: 'historical', capability: 'Forecasting (subject to validation)' },
]

/** @param {{checklist: Array<{id:string, met:boolean}>}} readiness (calculateReadiness()'s return value)
 * @returns {Array<{capability: string, available: boolean}>} */
export function calculateCapabilities(readiness) {
  const metIds = new Set((readiness?.checklist ?? []).filter((item) => item.met).map((item) => item.id))
  return CAPABILITY_RULES.map((rule) => ({ capability: rule.capability, available: metIds.has(rule.checklistId) }))
}
