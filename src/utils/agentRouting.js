/**
 * Compact DEMO of the "Agent Orchestrator" routing concept from
 * knowledge_updated_nov2026.md §14.6-14.9 (Manager Agent + specialist
 * agents) — per docs/AUDIT_v3_agentic_direction.md's own recommendation,
 * this is explicitly NOT that architecture. It is simple keyword matching
 * on the question text, first match wins, so a supervisor demo can see
 * "a question gets routed to a specialist" without any of the real
 * capability registry / tool-calling / investigation-logging the full
 * version (backlog item 5 in that audit) would need. Honest by
 * construction: there is no hidden intelligence here to misrepresent.
 */

export const AGENTS = {
  financial: { id: 'financial', label: 'Financial Planning Agent' },
  monitoring: { id: 'monitoring', label: 'Business Monitoring Agent' },
  risk: { id: 'risk', label: 'Risk Monitoring Agent' },
  growth: { id: 'growth', label: 'Growth Strategy Agent' },
  general: { id: 'general', label: 'Business Advisor Agent' },
}

// Order matters — first matching group wins. Checked in this order so a
// question mentioning both, e.g. "will this sales dip cause a crisis",
// lands on risk (the more specific/urgent concern) rather than financial.
const KEYWORD_GROUPS = [
  { agent: AGENTS.risk, keywords: ['crisis', 'risk', 'alert', 'warning', 'danger', 'urgent'] },
  { agent: AGENTS.financial, keywords: ['sales', 'forecast', 'revenue', 'profit', 'income', 'money', 'price', 'cost'] },
  { agent: AGENTS.monitoring, keywords: ['sentiment', 'review', 'customer', 'feedback', 'complain', 'rating', 'social'] },
  { agent: AGENTS.growth, keywords: ['recommend', 'should i', 'advice', 'improve', 'grow', 'strategy', 'what should'] },
]

/** @param {string} question @returns {{id: string, label: string}} */
export function routeQuestion(question) {
  const text = (question ?? '').toLowerCase()
  for (const { agent, keywords } of KEYWORD_GROUPS) {
    if (keywords.some((keyword) => text.includes(keyword))) return agent
  }
  return AGENTS.general
}
