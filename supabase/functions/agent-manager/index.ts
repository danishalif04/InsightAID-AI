// Supabase Edge Function — Agent Orchestrator FOUNDATION slice
// (docs/AUDIT_v3_agentic_direction.md backlog item 5). This is a real,
// minimal Manager Agent: it picks AT MOST ONE of a small controlled tool
// registry (financial_summary / startup_capital_summary /
// simulate_price_change — see src/utils/agentToolRegistry.js, mirrored
// here) relevant to the user's question, executes it at most once (a hard
// iteration limit, not just a convention), and persists every step to
// agent_investigations/agent_tasks/agent_tool_logs so the reasoning path
// is inspectable rather than a black box.
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
// The LLM is used only for two bounded Layer-2 jobs: (1) picking at most
// one controlled tool (or none) relevant to the question, and (2)
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

// --- Mirrors src/services/startupCapitalService.js's stored shape. ---
function computeStartupCapitalSummary(row: { startup_capital_items?: unknown; available_capital?: unknown }) {
  const items = row.startup_capital_items && typeof row.startup_capital_items === 'object' ? (row.startup_capital_items as Record<string, unknown>) : {}
  const total = Object.values(items).filter(isNumber).reduce((sum, value) => sum + value, 0)
  const availableCapital = isNumber(row.available_capital) ? row.available_capital : null
  const fundingGap = availableCapital !== null ? Math.round((availableCapital - total) * 100) / 100 : null
  return { totalCapitalNeeded: Math.round(total * 100) / 100, availableCapital, fundingGap }
}

function startupCapitalToFacts(summary: ReturnType<typeof computeStartupCapitalSummary>): string {
  if (summary.totalCapitalNeeded === 0) return 'No startup capital items are saved for this account yet.'
  const lines = [`Estimated total startup capital needed: RM${summary.totalCapitalNeeded}`]
  if (summary.availableCapital !== null) {
    lines.push(`Available capital: RM${summary.availableCapital}`)
    lines.push(
      summary.fundingGap! >= 0
        ? `Capital surplus: RM${summary.fundingGap}`
        : `Funding gap: RM${Math.abs(summary.fundingGap!)}`
    )
  }
  return lines.join('; ')
}

// --- Recalculates computeFinancialSummary() with one hypothetical selling price. ---
function simulatePriceChange(assumptions: Record<string, unknown>, newPrice: number) {
  return computeFinancialSummary({ ...assumptions, selling_price: newPrice })
}

function priceChangeToFacts(newPrice: number, summary: ReturnType<typeof computeFinancialSummary>): string {
  if (summary.insufficientData) return 'Not enough saved assumptions to simulate a price change.'
  return `At a hypothetical selling price of RM${newPrice}: ${summaryToFacts(summary)}`
}

const TOOL_NAMES = ['financial_summary', 'startup_capital_summary', 'simulate_price_change', 'none'] as const
type ToolName = (typeof TOOL_NAMES)[number]

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

  // Step 1 — Manager Agent picks AT MOST ONE of the three controlled tools
  // (or "none"). A real decision, not a hardcoded always-call: most
  // questions should correctly route to a specific tool or to "none"
  // rather than being forced through one. simulate_price_change also
  // needs a parameter (new_selling_price), extracted here in the same
  // call rather than guessed later.
  let chosenTool: ToolName = 'none'
  let newSellingPrice: number | null = null
  try {
    const decisionPrompt = `You are the Manager Agent inside a small-business decision-support tool. You have exactly these controlled tools available:\n\n- financial_summary: reads the user's saved price/cost/operating-cost assumptions and computes break-even units, break-even revenue, and gross margin percent. No input needed.\n- startup_capital_summary: reads the user's saved one-off startup capital plan and computes total capital needed and any funding gap. No input needed.\n- simulate_price_change: recalculates margin/break-even using a hypothetical selling price instead of the saved one. Needs one number: the hypothetical selling price the user is asking about.\n\nUser's question: "${question}"\n\nReply with ONLY a JSON object: {"tool": one of "financial_summary", "startup_capital_summary", "simulate_price_change", "none", "new_selling_price": a number or null (only meaningful for simulate_price_change)}. Use "none" if no tool is relevant — never guess a tool just to have one to call.`
    const decisionText = await callAIChat(decisionPrompt, { temperature: 0, jsonMode: true })
    const parsed = JSON.parse(decisionText) as { tool?: unknown; new_selling_price?: unknown }
    if (typeof parsed.tool === 'string' && TOOL_NAMES.includes(parsed.tool as ToolName)) chosenTool = parsed.tool as ToolName
    if (isNumber(parsed.new_selling_price)) newSellingPrice = parsed.new_selling_price
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) return fail(error.message)
    if (error instanceof AIUpstreamError) return fail(error.message)
    if (error instanceof AIMalformedResponseError) return fail(error.message)
    // A malformed/non-JSON decision response falls back to "none" rather
    // than failing the whole investigation — the final answer step still
    // produces an honest "no tool used" response.
  }
  if (chosenTool === 'simulate_price_change' && newSellingPrice === null) chosenTool = 'none'
  await logTask(1, `Decide which controlled tool (if any) is relevant to: "${question}"`, 'completed')

  // Step 2 — execute the chosen tool at most once (the iteration limit for
  // this foundation slice, enforced structurally: there is no loop here).
  let factsLine = '(no tool called — none of the available tools were relevant to this question)'
  if (chosenTool === 'none') {
    await logTask(2, 'Skip tool call — no controlled tool is relevant to this question.', 'skipped')
  } else if (chosenTool === 'financial_summary') {
    const { data: assumptions, error: assumptionsError } = await supabase.from('business_assumptions').select('*').maybeSingle()
    if (assumptionsError) return fail(assumptionsError.message)
    const summary = computeFinancialSummary((assumptions ?? {}) as Record<string, unknown>)
    await supabase.from('agent_tool_logs').insert({ investigation_id: investigationId, tool_name: chosenTool, input: {}, output: summary })
    await logTask(2, 'Execute financial_summary tool (read-only, no approval gate required).', 'completed')
    factsLine = summaryToFacts(summary)
  } else if (chosenTool === 'startup_capital_summary') {
    const { data: row, error: rowError } = await supabase
      .from('business_assumptions')
      .select('startup_capital_items, available_capital')
      .maybeSingle()
    if (rowError) return fail(rowError.message)
    const summary = computeStartupCapitalSummary(row ?? {})
    await supabase.from('agent_tool_logs').insert({ investigation_id: investigationId, tool_name: chosenTool, input: {}, output: summary })
    await logTask(2, 'Execute startup_capital_summary tool (read-only, no approval gate required).', 'completed')
    factsLine = startupCapitalToFacts(summary)
  } else if (chosenTool === 'simulate_price_change' && newSellingPrice !== null) {
    const { data: assumptions, error: assumptionsError } = await supabase.from('business_assumptions').select('*').maybeSingle()
    if (assumptionsError) return fail(assumptionsError.message)
    const summary = simulatePriceChange((assumptions ?? {}) as Record<string, unknown>, newSellingPrice)
    await supabase.from('agent_tool_logs').insert({
      investigation_id: investigationId,
      tool_name: chosenTool,
      input: { new_selling_price: newSellingPrice },
      output: summary,
    })
    await logTask(2, `Execute simulate_price_change tool with new_selling_price=RM${newSellingPrice} (read-only, no approval gate required).`, 'completed')
    factsLine = priceChangeToFacts(newSellingPrice, summary)
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

  return jsonResponse({ investigationId, toolCalled: chosenTool === 'none' ? null : chosenTool, tasks, finalAnswer })
})
