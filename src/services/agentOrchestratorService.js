import { supabase } from '@/config/supabaseClient'
import { getDashboardData } from './dashboardService'

/**
 * Compact demo of the "Agent Orchestrator" concept — see
 * src/utils/agentRouting.js and supabase/functions/agent-orchestrator for
 * what this deliberately is and isn't. Reuses getDashboardData() (already
 * built, already used by Dashboard.jsx) as the single source of "facts"
 * rather than re-querying anything — no new Supabase reads here.
 *
 * @param {string} mode business-workspace mode, same as every other page
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export async function getAgentFacts(mode) {
  const data = await getDashboardData(mode)

  const positiveScore = data.sentimentScores?.find((score) => score.id === 'positive') ?? null
  const lastForecastPoint = data.bestForecastRow?.forecast_points?.slice(-1)[0] ?? null

  const facts = []
  if (positiveScore?.value != null) {
    facts.push({ label: 'Overall sentiment (positive share)', value: `${positiveScore.value}%` })
  }
  if (data.crisis) {
    facts.push({
      label: 'Current crisis risk level',
      value: `${data.crisis.riskLevel} (score ${data.crisis.riskScore}/100${data.crisis.dataSufficient ? '' : ', limited data'})`,
    })
  }
  if (lastForecastPoint?.predicted != null) {
    facts.push({ label: 'Latest revenue forecast', value: `RM ${lastForecastPoint.predicted}` })
  }
  if (data.bestForecastRow?.mape != null) {
    facts.push({ label: 'Forecast model MAPE', value: `${data.bestForecastRow.mape}%` })
  }
  for (const rec of data.recommendations ?? []) {
    facts.push({ label: `Open recommendation (${rec.priority} priority, ${rec.category})`, value: rec.title })
  }
  for (const product of data.topProducts?.slice(0, 2) ?? []) {
    facts.push({ label: `Top-performing product: ${product.product}`, value: `RM ${product.revenue} revenue` })
  }

  return facts
}

/**
 * Calls Layer 2 (agent-orchestrator). Never returns a raw error object —
 * same honesty rule as chatAssistantService.js/recommendationService.js.
 * @param {{question: string, agentLabel: string, facts: Array<{label: string, value: string}>}} payload
 * @returns {Promise<string>} the answer text
 */
export async function askAgent({ question, agentLabel, facts }) {
  const { data, error } = await supabase.functions.invoke('agent-orchestrator', {
    body: { question, agentLabel, facts },
  })

  if (error) throw new Error('Could not reach the agent right now. Please try again in a moment.')
  if (data?.error === 'NOT_CONFIGURED') throw new Error('The AI layer is not set up yet.')
  if (data?.error) throw new Error('The agent had trouble answering that. Please try again in a moment.')
  if (typeof data?.answer !== 'string' || !data.answer.trim()) {
    throw new Error('The agent did not return an answer. Please try again.')
  }

  return data.answer
}
