import { supabase } from '@/config/supabaseClient'
import { guardAnswer } from './guard'
import { mockPlan, templateAnswer } from './mockPlans'
import { runTool, shopDigest, TOOLS, validateToolCall } from './tools'

/**
 * One orchestrator, many tools — NOT several AI agents.
 *
 * The 7 steps below are real stages of this function, each timed, so the
 * Investigation Trace shows what actually happened rather than animating
 * fictional "agents" talking to each other.
 *
 * Division of labour, which is the whole point of the architecture:
 *   - the engine computes every number,
 *   - the LLM only chooses tools and phrases the result,
 *   - guard.js verifies the wording against the tool output,
 *   - the owner decides.
 */

export const STEPS = [
  'UNDERSTAND',
  'CHECK READINESS',
  'PLAN',
  'EXECUTE',
  'EVALUATE',
  'RECOMMEND',
  'PRESENT',
]

const MAX_TOOL_CALLS = 4

export const AI_MODE = import.meta.env.VITE_AI_MODE === 'live' ? 'live' : 'mock'

/** Malay detection by function words — enough to pick a reply language, and transparent. */
export function detectLanguage(question) {
  const malay = /\b(saya|ada|cukup|ke|untuk|buka|kedai|berapa|macam mana|apa|duit|kos|harga|jualan|bulan|perlu)\b/i
  return malay.test(question ?? '') ? 'ms' : 'en'
}

/** Asks the LLM which tools to run. Returns null on any failure — the caller falls back to the deterministic plan. */
async function planWithLlm(question, digest) {
  const catalogue = Object.entries(TOOLS)
    .map(([name, tool]) => `- ${name}: ${tool.description}`)
    .join('\n')

  const prompt = `You are a planning step inside a small-business tool. Choose which tools to run to answer the owner's question. You do NOT calculate anything yourself.

Tools:
${catalogue}

Business digest (counts and totals only): ${JSON.stringify(digest)}

Owner's question: "${question}"

Reply with ONLY a JSON object: {"tools":[{"name":"<tool>","args":{}}]}. Choose at most ${MAX_TOOL_CALLS}. Choose none (empty array) if no tool fits — never invent a tool name.`

  try {
    const { data, error } = await supabase.functions.invoke('agent-orchestrator', {
      body: { question: prompt, agentLabel: 'Local Shop Planner', facts: [] },
    })
    if (error || data?.error || typeof data?.answer !== 'string') return null

    const match = data.answer.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed?.tools)) return null

    const tools = parsed.tools
      .filter((call) => typeof call?.name === 'string' && TOOLS[call.name])
      .slice(0, MAX_TOOL_CALLS)
    return tools.length > 0 ? { id: 'llm', tools } : null
  } catch {
    return null
  }
}

/** Asks the LLM to phrase the verified results. Returns null on any failure. */
async function explainWithLlm(question, results, lang) {
  const facts = results.flatMap(({ name, result }) =>
    Object.entries(result ?? {})
      .filter(([, value]) => typeof value === 'number' || typeof value === 'string')
      .map(([key, value]) => ({ label: `${name}.${key}`, value: String(value) }))
  )

  const instruction =
    lang === 'ms'
      ? `Jawab dalam Bahasa Melayu ringkas (2-4 ayat). Guna HANYA angka dalam senarai fakta. Jangan jamin kejayaan. Jangan label perniagaan sihat atau tidak sihat. Soalan: "${question}"`
      : `Answer in plain English (2-4 sentences). Use ONLY the numbers in the facts list. Never guarantee an outcome. Never call the business healthy or unhealthy. Question: "${question}"`

  try {
    const { data, error } = await supabase.functions.invoke('agent-orchestrator', {
      body: { question: instruction, agentLabel: 'Local Shop Advisor', facts },
    })
    if (error || data?.error || typeof data?.answer !== 'string' || !data.answer.trim()) return null
    return data.answer.trim()
  } catch {
    return null
  }
}

/**
 * Runs an investigation.
 * @param {object} params
 * @param {string} params.question
 * @param {object} params.shop
 * @param {'mock'|'live'} [params.mode]
 * @param {(step: object) => void} [params.onStep] called as each step completes
 */
export async function runInvestigation({ question, shop, mode = AI_MODE, onStep }) {
  const trace = []
  const startedAt = performance.now()

  const record = (name, detail, status = 'done') => {
    const entry = { name, detail, status, at: Math.round(performance.now() - startedAt) }
    trace.push(entry)
    onStep?.(entry)
    return entry
  }

  // 1. UNDERSTAND
  const lang = detectLanguage(question)
  record('UNDERSTAND', `Language detected: ${lang === 'ms' ? 'Bahasa Melayu' : 'English'}`)

  // 2. CHECK READINESS
  const readinessResult = runTool('check_readiness', shop)
  record('CHECK READINESS', `${readinessResult.percent}% ready · ${readinessResult.ready?.length ?? 0} capabilities unlocked`)

  // 3. PLAN
  let plan = null
  let planSource = 'deterministic'
  if (mode === 'live') {
    plan = await planWithLlm(question, shopDigest(shop))
    if (plan) planSource = 'llm'
  }
  if (!plan) plan = mockPlan(question)
  record('PLAN', `${plan.tools.length} tool(s) selected (${planSource})`)

  // 4. EXECUTE — the engine computes, never the LLM.
  const results = []
  for (const call of plan.tools.slice(0, MAX_TOOL_CALLS)) {
    const check = validateToolCall(call.name, call.args)
    if (!check.valid) {
      record('EXECUTE', `${call.name} skipped: ${check.errors.join(' ')}`, 'skipped')
      continue
    }
    const result = runTool(call.name, shop, call.args)
    results.push({ name: call.name, args: call.args, result })
    record('EXECUTE', `${call.name} → ${result?.ok === false ? 'insufficient data' : 'ok'}`)
  }

  // 5. EVALUATE
  const missing = results.filter((entry) => entry.result?.ok === false)
  const assumptions = results.flatMap((entry) => entry.result?.assumptions ?? [])
  record(
    'EVALUATE',
    missing.length > 0
      ? `${missing.length} tool(s) lacked inputs · ${assumptions.length} assumption(s)`
      : `All results computed · ${assumptions.length} assumption(s)`
  )

  // 6. RECOMMEND
  let answer = null
  let answerSource = 'template'
  if (mode === 'live' && results.length > 0) {
    answer = await explainWithLlm(question, results, lang)
    if (answer) answerSource = 'ai'
  }
  if (!answer) answer = templateAnswer(plan.id, results, lang)

  // The guard runs on an AI answer; a template answer is built from the
  // tool output by construction, so there is nothing to verify against.
  const verdict = answerSource === 'ai' ? guardAnswer(answer, results.map((entry) => entry.result)) : null
  if (verdict && !verdict.verified) {
    // Rather than show an unverifiable figure, fall back to the template.
    answer = templateAnswer(plan.id, results, lang)
    answerSource = 'template_after_guard'
  }
  record(
    'RECOMMEND',
    answerSource === 'ai'
      ? 'AI explanation verified against tool results'
      : answerSource === 'template_after_guard'
        ? 'AI answer failed verification — replaced with the calculated summary'
        : 'Calculated summary (no AI explanation)'
  )

  // 7. PRESENT
  record('PRESENT', 'Awaiting owner decision')

  return {
    question,
    lang,
    mode,
    planSource,
    answerSource,
    answer,
    results,
    assumptions: [...new Set(assumptions)],
    missing,
    verdict,
    trace,
    totalMs: Math.round(performance.now() - startedAt),
  }
}
