// Supabase Edge Function — the floating "Ask InsightAid AI" help chatbot
// (bottom-right button, src/components/common/ChatAssistant.jsx). Scope
// decided explicitly with the user: GENERAL APP HELP ONLY — how to use the
// app, what a feature/metric means. It must NEVER claim to see or answer
// questions about the signed-in user's own real business data (sentiment
// scores, sales, crisis status, etc.) — this function has no access to any
// of that (no database reads at all) and the system prompt below tells the
// model to say so and redirect instead of guessing.
//
// Provider-agnostic — see ../_shared/aiClient.ts. Shares the exact same
// AI_BASE_URL/AI_API_KEY/AI_MODEL secrets as explain-recommendations/
// explain-report/extract-business-profile (currently Groq).
//
// Stateless: the client sends the running conversation each time
// (`messages`), this function has no memory between requests and touches
// no database table.

import { AIMalformedResponseError, AIProviderNotConfiguredError, AIUpstreamError, callAIChatMessages } from '../_shared/aiClient.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 2000
const MAX_REPLY_LENGTH = 2000

// Facts pulled from CLAUDE.md (repo root) and src/pages/Welcome.jsx's FAQ —
// kept here as plain, verified statements, not invented capabilities.
const SYSTEM_PROMPT = `You are the in-app help assistant for InsightAid AI, a Final Year Project research system (not a commercial product) that helps Malaysian SMEs understand their business through four real features:
1. Multilingual sentiment analysis (English, Bahasa Melayu, Mandarin, including code-mixed text) using a trained XLM-RoBERTa model — 84.1% overall accuracy on a held-out test set.
2. Sales forecasting (Prophet-based).
3. Crisis detection — a RULE-BASED system comparing the business's current signals (negative-sentiment share, its rate of increase, volume spikes) against that SAME business's own historical baseline, not a universal threshold.
4. Rule-based, explainable recommendations — every recommendation shows the exact real evidence that triggered it. An optional AI layer only rewords an already-decided recommendation into plain language; it never decides what to recommend or supplies a number.

Your ONLY job is to help the person understand HOW TO USE THE APP and WHAT A FEATURE OR METRIC MEANS, in 2-4 concise sentences. You do not have access to this signed-in user's actual data (no sentiment scores, no sales numbers, no crisis status, nothing) — you cannot see it and must never pretend to. If someone asks something that depends on their own real data (e.g. "why is my sentiment down this week", "what's my forecast"), say plainly that you can't see their live data, and point them to the specific page that shows it (Dashboard, Sentiment Analysis, Forecasting, Crisis Detection, AI Recommendations, Reports, Dataset Management, Model Performance, or Settings). Never invent a number, a feature that doesn't exist, or a specific UI element you're not sure is real. If you don't know something, say so.`

interface IncomingMessage {
  role: string
  content: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isValidMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== 'object') return false
  const msg = value as IncomingMessage
  return (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string' && msg.content.trim().length > 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  let body: { messages?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'Request body must be JSON.' }, 400)
  }

  const incoming = Array.isArray(body.messages) ? body.messages.filter(isValidMessage) : []
  if (incoming.length === 0) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'messages must be a non-empty array of {role, content}.' }, 400)
  }
  if (incoming.length > MAX_MESSAGES) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: `At most ${MAX_MESSAGES} messages per request.` }, 400)
  }
  if (incoming.some((m) => m.content.length > MAX_MESSAGE_LENGTH)) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: `Each message must be at most ${MAX_MESSAGE_LENGTH} characters.` }, 400)
  }

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...incoming.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  let reply: string
  try {
    reply = await callAIChatMessages(messages, { temperature: 0.4, jsonMode: false })
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

  const trimmed = reply.trim()
  if (!trimmed) {
    return jsonResponse({ error: 'UPSTREAM_MALFORMED', message: 'AI response was empty.' }, 502)
  }

  return jsonResponse({ reply: trimmed.slice(0, MAX_REPLY_LENGTH) })
})
