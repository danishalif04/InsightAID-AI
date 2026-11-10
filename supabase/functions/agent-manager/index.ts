// Supabase Edge Function — Agent Orchestrator FOUNDATION slice
// (docs/AUDIT_v3_agentic_direction.md backlog item 5). This is a real,
// minimal Manager Agent: it decides whether ONE controlled tool
// (financial_summary) is relevant to the user's question, executes it at
// most once (a hard iteration limit, not just a convention), and persists
// every step to agent_investigations/agent_tasks/agent_tool_logs so the
// reasoning path is inspectable rather than a black box.
//
// Deliberately NOT the full architecture from
// knowledge_updated_nov2026.md §14.6-14.9 (no specialist agent roles, no
// multi-tool registry, no multi-step planning loop) — see that doc and
// supabase/functions/agent-orchestrator/index.ts (the separate, earlier,
// even-more-compact keyword-routing demo this function sits alongside,
// not replaces).
//
// Reliability rule, same as every other AI-calling function in this
// project: the LLM never supplies a number. financial_summary's figures
// come from the caller's own business_assumptions row via the exact same
// formulas as src/utils/scenarioEngine.js (mirrored here — Edge Functions
// can't import from src/, see run-forecast/index.ts for the same pattern).
// The LLM is used only for two bounded Layer-2 jobs: (1) deciding yes/no
// whether the one available tool is relevant to the question, and (2)
// phrasing the final answer using ONLY the tool's real computed output.
//
// No email, no manual SQL: runs as the calling user via their own JWT, so
// every row's user_id resolves to auth.uid() and RLS scopes it to them.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AIMalformedResponseError, AIProviderNotConfiguredError, AIUpstreamError, callAIChat } from '../_shared/aiClient.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_QUESTION_LENGTH = 1000
const MAX_ANSWER_LENGTH = 1500

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

// --- Mirrors src/utils/scenarioEngine.js's sumOperatingCosts/calculateBreakEven/calculateGrossMarginPercent exactly. ---
const OPERATING_COST_FIELDS = ['marketing_cost', 'platform_fees', 'shipping_cost', 'labour_cost', 'fixed_costs', 'other_expenses']

function computeFinancialSummary(assumptions: Record<string, unknown>) {
  const present = OPERATING_COST_FIELDS.filter((field) => isNumber(assumptions[field]))
  const operatingCosts = present.length > 0 ? present.reduce((sum, field) => sum + (assumptions[field] as number), 0) : null

  const hasPrice = isNumber(assumptions.selling_price)
  const hasCostPerUnit = isNumber(assumptions.cost_per_unit)
  const hasUnits = isNumber(assumptions.expected_monthly_units)

  let breakEvenUnits: number | null = null
  let breakEvenRevenue: number | null = null
  if (operatingCosts !== null && hasPrice && hasCostPerUnit) {
    const contributionMargin = (assumptions.selling_price as number) - (assumptions.cost_per_unit as number)
    if (contributionMargin > 0) {
      breakEvenUnits = Math.ceil(operatingCosts / contributionMargin)
      breakEvenRevenue = Math.round(breakEvenUnits * (assumptions.selling_price as number) * 100) / 100
    }
  }

  let grossMarginPercent: number | null = null
  if (hasUnits && hasPrice && hasCostPerUnit) {
    const revenue = (assumptions.expected_monthly_units as number) * (assumptions.selling_price as number)
    const variableCosts = (assumptions.expected_monthly_units as number) * (assumptions.cost_per_unit as number)
    if (revenue !== 0) grossMarginPercent = Math.round(((revenue - variableCosts) / revenue) * 1000) / 10
  }

  return {
    operatingCosts: operatingCosts !== null ? Math.round(operatingCosts * 100) / 100 : null,
    breakEvenUnits,
    breakEvenRevenue,
    grossMarginPercent,
    insufficientData: operatingCosts === null && breakEvenUnits === null && grossMarginPercent === null,
  }
}

function summaryToFacts(summary: ReturnType<typeof computeFinancialSummary>): string {
  if (summary.insufficientData) {
    return 'No business assumptions (price, cost per unit, operating costs) are saved for this account yet, so no figures could be computed.'
  }
  const lines: string[] = []
  if (summary.operatingCosts !== null) lines.push(`Monthly operating costs: RM${summary.operatingCosts}`)
  if (summary.breakEvenUnits !== null) lines.push(`Break-even units: ${summary.breakEvenUnits}`)
  if (summary.breakEvenRevenue !== null) lines.push(`Break-even revenue: RM${summary.breakEvenRevenue}`)
  if (summary.grossMarginPercent !== null) lines.push(`Gross margin: ${summary.grossMarginPercent}%`)
  return lines.length > 0 ? lines.join('; ') : 'Some assumptions are saved, but not enough to compute break-even or margin figures yet.'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return jsonResponse({ error: 'AUTH_REQUIRED', message: 'Sign in before asking the agent.' }, 401)

  let body: { question?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'Request body must be JSON.' }, 400)
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) return jsonResponse({ error: 'INVALID_REQUEST', message: 'question is required.' }, 400)
  if (question.length > MAX_QUESTION_LENGTH) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: `question must be at most ${MAX_QUESTION_LENGTH} characters.` }, 400)
  }

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anonKey) return jsonResponse({ error: 'NOT_CONFIGURED', message: 'Supabase credentials are unavailable.' }, 503)
  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })

  const { data: investigation, error: investigationError } = await supabase
    .from('agent_investigations')
    .insert({ question, status: 'running' })
    .select('id')
    .single()
  if (investigationError || !investigation) {
    return jsonResponse({ error: 'DATABASE_ERROR', message: investigationError?.message ?? 'Could not start an investigation.' }, 500)
  }
  const investigationId = investigation.id as string

  const tasks: { step_number: number; description: string; status: string }[] = []
  const logTask = async (stepNumber: number, description: string, status: 'completed' | 'skipped' | 'failed' = 'completed') => {
    tasks.push({ step_number: stepNumber, description, status })
    await supabase.from('agent_tasks').insert({ investigation_id: investigationId, step_number: stepNumber, description, status })
  }

  const fail = async (message: string) => {
    await supabase.from('agent_investigations').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', investigationId)
    return jsonResponse({ error: 'AGENT_FAILED', message, investigationId }, 502)
  }

  // Step 1 — Manager Agent decides whether the one available tool is
  // relevant. A real decision, not a hardcoded "always call it": the only
  // tool is financial_summary, so most questions should correctly route to
  // "not relevant" rather than being forced through it.
  let toolIsRelevant: boolean
  try {
    const decisionPrompt = `You are the Manager Agent inside a small-business decision-support tool. You have exactly ONE controlled tool available:\n\n- financial_summary: reads the user's saved price/cost/operating-cost assumptions and computes break-even units, break-even revenue, and gross margin percent. No other data or action is available to you.\n\nUser's question: "${question}"\n\nIs the financial_summary tool relevant to answering this question? Reply with ONLY the single word "yes" or "no" — no punctuation, no explanation.`
    const decisionText = await callAIChat(decisionPrompt, { temperature: 0, jsonMode: false })
    toolIsRelevant = decisionText.trim().toLowerCase().startsWith('yes')
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) return fail(error.message)
    if (error instanceof AIUpstreamError) return fail(error.message)
    if (error instanceof AIMalformedResponseError) return fail(error.message)
    return fail(String(error))
  }
  await logTask(1, `Decide whether the financial_summary tool is relevant to: "${question}"`, 'completed')

  // Step 2 — execute the tool at most once (the iteration limit for this
  // foundation slice, enforced structurally: there is no loop here at all).
  let factsLine = '(tool not called — deemed not relevant to this question)'
  if (!toolIsRelevant) {
    await logTask(2, 'Skip financial_summary tool call — not relevant to this question.', 'skipped')
  } else {
    const { data: assumptions, error: assumptionsError } = await supabase.from('business_assumptions').select('*').maybeSingle()
    if (assumptionsError) return fail(assumptionsError.message)

    const summary = computeFinancialSummary((assumptions ?? {}) as Record<string, unknown>)
    await supabase.from('agent_tool_logs').insert({
      investigation_id: investigationId,
      tool_name: 'financial_summary',
      input: {},
      output: summary,
    })
    await logTask(2, 'Execute financial_summary tool (read-only, no approval gate required).', 'completed')
    factsLine = summaryToFacts(summary)
  }

  // Step 3 — phrase the final answer. The LLM only rewords; every number
  // in `factsLine` came from computeFinancialSummary() above, never the LLM.
  let finalAnswer: string
  try {
    const answerPrompt = `Answer the user's question in 2-4 plain-language sentences, no markdown. Use ONLY the facts below — never invent a number. If the facts say a figure isn't available, say so plainly instead of guessing.\n\nFacts: ${factsLine}\n\nUser's question: ${question}`
    const text = await callAIChat(answerPrompt, { temperature: 0.3, jsonMode: false })
    finalAnswer = text.trim().slice(0, MAX_ANSWER_LENGTH)
    if (!finalAnswer) throw new AIMalformedResponseError('AI response was empty.')
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) return fail(error.message)
    if (error instanceof AIUpstreamError) return fail(error.message)
    if (error instanceof AIMalformedResponseError) return fail(error.message)
    return fail(String(error))
  }
  await logTask(3, 'Phrase final answer from the tool\'s real output (or lack of a relevant tool).', 'completed')

  await supabase
    .from('agent_investigations')
    .update({ status: 'completed', final_answer: finalAnswer, completed_at: new Date().toISOString() })
    .eq('id', investigationId)

  return jsonResponse({ investigationId, toolCalled: toolIsRelevant ? 'financial_summary' : null, tasks, finalAnswer })
})
