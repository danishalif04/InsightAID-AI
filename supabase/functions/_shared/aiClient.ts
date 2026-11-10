// Shared, provider-agnostic AI client for every Edge Function that needs
// an LLM call (explain-recommendations, explain-report,
// extract-business-profile). Previously each function hardcoded its own
// provider-specific fetch (first Gemini's `generateContent` shape, then
// explain-recommendations was switched to xAI's OpenAI-compatible chat
// completions shape) — the user explicitly asked to stop hardcoding ANY
// specific provider and instead make swapping providers a config-only
// change (base URL + API key + model), never a code change/redeploy.
//
// Works with ANY provider that implements the OpenAI chat completions API
// shape (POST {base}/chat/completions, `messages`, `choices[0].message.
// content`, Bearer auth) — which covers Groq (the user's current choice,
// https://api.groq.com/openai/v1), OpenAI itself, and xAI/Grok (https://
// api.x.ai/v1), among others. A provider that does NOT speak this shape
// (e.g. Gemini's own native API) is no longer directly supported here —
// Gemini is, however, reachable through Google's own OpenAI-compatibility
// endpoint (https://generativelanguage.googleapis.com/v1beta/openai/) if
// ever wanted again, by just changing AI_BASE_URL, no code change.
//
// Required secrets (set via `supabase secrets set NAME=value`, never as a
// VITE_* var):
//   AI_BASE_URL — e.g. https://api.groq.com/openai/v1 (no trailing /chat/completions)
//   AI_API_KEY  — the provider's own API key
//   AI_MODEL    — e.g. llama-3.3-70b-versatile (check the provider's own
//                 current model list; Groq's is https://console.groq.com/docs/models)

export class AIProviderNotConfiguredError extends Error {
  constructor() {
    super('AI_BASE_URL, AI_API_KEY, and AI_MODEL must all be set (supabase secrets set ...).')
    this.name = 'AIProviderNotConfiguredError'
  }
}

export class AIUpstreamError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(`AI provider returned ${status}.`)
    this.name = 'AIUpstreamError'
    this.status = status
    this.detail = detail
  }
}

export class AIMalformedResponseError extends Error {
  constructor(reason: string) {
    super(`AI provider response was malformed: ${reason}`)
    this.name = 'AIMalformedResponseError'
  }
}

function isConfigured(): boolean {
  return !!(Deno.env.get('AI_BASE_URL') && Deno.env.get('AI_API_KEY') && Deno.env.get('AI_MODEL'))
}

// A 429 (rate limited) or 503 (overloaded) has a real chance of succeeding
// within seconds — worth retrying automatically. 400/401/403/404 are
// deterministic; retrying cannot fix them.
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1200
const RETRYABLE_STATUSES = new Set([429, 503])

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let response: Response
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch(url, init)
    if (!RETRYABLE_STATUSES.has(response.status)) return response
    if (attempt < MAX_RETRIES) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
  }
  return response!
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Shared send — both callAIChat (single prompt) and callAIChatMessages
 * (full multi-turn history, used by chat-assistant) go through this so the
 * fetch/retry/error-mapping logic exists exactly once. */
async function sendChatCompletion(
  messages: ChatMessage[],
  { temperature = 0.3, jsonMode = true }: { temperature?: number; jsonMode?: boolean } = {}
): Promise<string> {
  if (!isConfigured()) throw new AIProviderNotConfiguredError()

  const baseUrl = Deno.env.get('AI_BASE_URL')!.replace(/\/+$/, '')
  const apiKey = Deno.env.get('AI_API_KEY')!
  const model = Deno.env.get('AI_MODEL')!

  let response: Response
  try {
    response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
  } catch (error) {
    // Network-level failure (DNS, connection refused, etc.) — the caller's
    // own UPSTREAM_UNREACHABLE case, left as a plain rethrow since it's
    // already a real Error with a useful message.
    throw error
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new AIUpstreamError(response.status, detail)
  }

  const payload = await response.json().catch(() => null)
  const text = payload?.choices?.[0]?.message?.content
  if (typeof text !== 'string') throw new AIMalformedResponseError('no choices[0].message.content in response')
  return text
}

/**
 * Sends one prompt, returns the raw text response. Throws
 * AIProviderNotConfiguredError / AIUpstreamError / AIMalformedResponseError
 * — callers decide what each means for their own NOT_CONFIGURED/
 * UPSTREAM_ERROR/UPSTREAM_MALFORMED response shape, same contract every
 * caller already had before this was extracted.
 */
export async function callAIChat(
  prompt: string,
  opts: { temperature?: number; jsonMode?: boolean } = {}
): Promise<string> {
  return sendChatCompletion([{ role: 'user', content: prompt }], opts)
}

/**
 * Same as callAIChat, but for a full multi-turn conversation (e.g. a
 * system prompt + running user/assistant history) instead of a single
 * one-off prompt — used by chat-assistant. Same error contract.
 */
export async function callAIChatMessages(
  messages: ChatMessage[],
  opts: { temperature?: number; jsonMode?: boolean } = {}
): Promise<string> {
  return sendChatCompletion(messages, opts)
}
