// Supabase Edge Function — Layer 2 of the recommendation engine (FYP2.md
// §54-55): Gemini EXPLAINS structured facts already decided by Layer 1
// (src/utils/recommendationRules.js). Stateless: does not touch the
// database, does not decide which recommendations exist or their priority.
// Requires the GEMINI_API_KEY secret, set via
//   supabase secrets set GEMINI_API_KEY=...
// (never set as a VITE_* var — that would bundle it into the browser).
//
// Gemini reliability rule (§55): Gemini must NOT be the source of truth for
// sales, sentiment, forecast values, crisis scores, database facts, or
// calculated KPIs. This function only ever asks Gemini for two STRING
// fields per recommendation (`rationale`, `context`) and validateExplained()
// below drops every other key Gemini might return — there is no code path
// by which a Gemini response can change a recommendation's id, category,
// priority, or evidence. If this function is unreachable/unconfigured, the
// caller (src/services/recommendationService.js) must render Layer 1's
// rule-based recommendations unchanged — §55's "Rule-Based Recommendation
// must still work."

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// gemini-2.0-flash was retired by Google (confirmed via a real 404 from
// the live API: "This model ... is no longer available ... use
// models/gemini-3.8-flash"). Overridable via the GEMINI_MODEL secret so a
// future retirement doesn't need a code change/redeploy, just a new secret.
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash'
const MAX_RECOMMENDATIONS = 20
const MAX_FIELD_LENGTH = 2000

interface RecommendationFact {
  id: string
  category?: string
  priority?: string
  title?: string
  evidence?: string[]
}

interface ContextFactor {
  id: string
  label: string
  value: string
  insufficient: boolean
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Gemini's 503 ("high demand... try again later") is typically transient -
// a short retry has a real chance of succeeding within seconds, worth
// doing automatically rather than making every caller see it fail once.
// Only 503 is retried: 404/400/401/403 are deterministic and a retry
// cannot fix them.
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1200

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let response: Response
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch(url, init)
    if (response.status !== 503) return response
    if (attempt < MAX_RETRIES) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
  }
  return response!
}

function isValidRecommendation(value: unknown): value is RecommendationFact {
  return !!value && typeof value === 'object' && typeof (value as RecommendationFact).id === 'string'
}

function isValidFactor(value: unknown): value is ContextFactor {
  return !!value && typeof value === 'object' && typeof (value as ContextFactor).id === 'string'
}

/** Drops unknown keys and every non-recommendation id; coerces rationale/context
 * to strings only. Never throws. This is the enforcement point for §55 — Gemini
 * cannot inject a numeric field or a key this function doesn't already expect. */
function validateExplained(
  raw: unknown,
  knownIds: Set<string>
): { explanations: Record<string, { rationale: string; context: string }>; warnings: string[] } {
  const explanations: Record<string, { rationale: string; context: string }> = {}
  const warnings: string[] = []
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  for (const [id, entry] of Object.entries(source)) {
    if (!knownIds.has(id)) {
      warnings.push(`Ignored explanation for unknown recommendation id "${id}".`)
      continue
    }
    const record = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
    const rationale = typeof record.rationale === 'string' ? record.rationale.slice(0, MAX_FIELD_LENGTH) : ''
    const context = typeof record.context === 'string' ? record.context.slice(0, MAX_FIELD_LENGTH) : ''
    if (!rationale && !context) {
      warnings.push(`Ignored empty/malformed explanation for "${id}".`)
      continue
    }
    explanations[id] = { rationale, context }
  }

  return { explanations, warnings }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return jsonResponse({ error: 'NOT_CONFIGURED', message: 'GEMINI_API_KEY is not set.' }, 503)

  let body: { recommendations?: unknown; businessContext?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'Request body must be JSON.' }, 400)
  }

  const recommendations = Array.isArray(body.recommendations) ? body.recommendations.filter(isValidRecommendation) : []
  if (recommendations.length === 0) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'recommendations must be a non-empty array.' }, 400)
  }
  if (recommendations.length > MAX_RECOMMENDATIONS) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: `At most ${MAX_RECOMMENDATIONS} recommendations per request.` }, 400)
  }

  const businessContext = Array.isArray(body.businessContext) ? body.businessContext.filter(isValidFactor) : []
  const knownIds = new Set(recommendations.map((rec) => rec.id))

  const factsBlock = recommendations
    .map((rec) => `- id: ${rec.id}\n  title: ${rec.title ?? ''}\n  category: ${rec.category ?? ''}\n  priority: ${rec.priority ?? ''}\n  evidence: ${(rec.evidence ?? []).join(' | ')}`)
    .join('\n')

  const contextBlock = businessContext.map((factor) => `- ${factor.label}: ${factor.value}`).join('\n')

  const prompt = `You are writing plain-language explanations for business recommendations that have ALREADY been decided by a rule engine from real analytical data. You do not decide what the recommendations are, their priority, or any number — those are fixed facts, listed below. Your only job is to explain each one in 1-2 sentences of rationale and 1 sentence of business context, using ONLY the facts given. Never state a number, percentage, or statistic that is not already present in the evidence below. Never invent business information (industry norms, competitor behavior, etc.) that isn't given. If a business context factor says "Insufficient information to evaluate this factor," you may say that information is missing, but do not guess a replacement value.

Return ONLY a JSON object shaped like { "<recommendation id>": { "rationale": "...", "context": "..." } } for each id below — no other keys, no markdown.

Recommendations (id, title, category, priority, evidence — all pre-decided, do not alter):
${factsBlock}

Business context (may include factors marked as insufficient information):
${contextBlock || '(none provided)'}`

  let geminiResponse: Response
  try {
    geminiResponse = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
      }
    )
  } catch (error) {
    return jsonResponse({ error: 'UPSTREAM_UNREACHABLE', message: String(error) }, 502)
  }

  if (!geminiResponse.ok) {
    const detail = await geminiResponse.text().catch(() => '')
    return jsonResponse(
      { error: 'UPSTREAM_ERROR', message: `Gemini returned ${geminiResponse.status}.`, detail },
      502
    )
  }

  const payload = await geminiResponse.json().catch(() => null)
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') {
    return jsonResponse({ error: 'UPSTREAM_MALFORMED', message: 'Gemini response had no text content.' }, 502)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return jsonResponse({ error: 'UPSTREAM_MALFORMED', message: 'Gemini response was not valid JSON.' }, 502)
  }

  const { explanations, warnings } = validateExplained(parsed, knownIds)
  return jsonResponse({ explanations, warnings })
})
