// Supabase Edge Function — compact DEMO of the "Agent Orchestrator"
// concept (knowledge_updated_nov2026.md §14.6-14.9), explicitly NOT the
// full architecture described there (Manager Agent + specialist agents +
// controlled tool registry + investigation logging + new DB tables — see
// docs/AUDIT_v3_agentic_direction.md's backlog item 5 for that real,
// larger scope, deliberately deferred). This function does exactly one
// thing: phrase an answer to a business question using ONLY the real
// facts the frontend already computed and sent — it never fetches its
// own data and never decides which "agent" handles the question (that's
// simple client-side keyword matching, src/utils/agentRouting.js).
//
// Provider-agnostic — see ../_shared/aiClient.ts. Shares the same
// AI_BASE_URL/AI_API_KEY/AI_MODEL secrets as every other AI-calling
// function in this project (currently Groq).
//
// Reliability rule, same as explain-recommendations/explain-report: the
// LLM must never be the source of truth for any number/fact. It only
// phrases what's already in `facts`, and is explicitly told to say so
// plainly when a question needs a fact it wasn't given, rather than guess.

import { AIMalformedResponseError, AIProviderNotConfiguredError, AIUpstreamError, callAIChat } from '../_shared/aiClient.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_QUESTION_LENGTH = 1000
const MAX_FACTS = 30
const MAX_FACT_LENGTH = 300
const MAX_ANSWER_LENGTH = 1500

interface Fact {
  label: string
  value: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isValidFact(value: unknown): value is Fact {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Fact).label === 'string' &&
    typeof (value as Fact).value === 'string'
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  let body: { question?: unknown; agentLabel?: unknown; facts?: unknown }
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

  const agentLabel = typeof body.agentLabel === 'string' && body.agentLabel.trim() ? body.agentLabel.trim() : 'Business Advisor Agent'

  const facts = Array.isArray(body.facts) ? body.facts.filter(isValidFact).slice(0, MAX_FACTS) : []
  const factsBlock = facts.length > 0
    ? facts.map((f) => `- ${f.label.slice(0, MAX_FACT_LENGTH)}: ${f.value.slice(0, MAX_FACT_LENGTH)}`).join('\n')
    : '(no facts available for this account yet)'

  const prompt = `You are the "${agentLabel}" inside InsightAid AI, a small-business decision-support demo. A user asked you a question. Answer it using ONLY the real facts listed below — never invent a number, percentage, trend, or fact that isn't in this list. If the facts don't actually cover what they're asking, say so plainly (e.g. "I don't have data on that yet") instead of guessing. Keep your answer to 2-4 sentences, plain language, no markdown.

Real facts available for this business right now:
${factsBlock}

User's question: ${question}`

  let text: string
  try {
    text = await callAIChat(prompt, { temperature: 0.3, jsonMode: false })
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) {
      return jsonResponse({ error: 'NOT_CONFIGURED', message: error.message }, 503)
    }
    if (error instanceof AIUpstreamError) {
      return jsonResponse({ error: 'UPSTREAM_ERROR', message: error.message, detail: error.detail }, 502)
    }
    if (error instanceof AIMalformedResponseError) {
      return jsonResponse({ error: 'UPSTREAM_MALFORMED', message: error.message }, 502)
    }
    return jsonResponse({ error: 'UPSTREAM_UNREACHABLE', message: String(error) }, 502)
  }

  const trimmed = text.trim()
  if (!trimmed) return jsonResponse({ error: 'UPSTREAM_MALFORMED', message: 'AI response was empty.' }, 502)

  return jsonResponse({ answer: trimmed.slice(0, MAX_ANSWER_LENGTH) })
})
