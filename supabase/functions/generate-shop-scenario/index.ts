// Supabase Edge Function — builds a Local Shop scenario from the owner's
// three onboarding answers (business sector, monthly revenue target, free-text
// description) so every Local Shop page has something to render.
//
// Provider-agnostic — see ../_shared/aiClient.ts. Shares the same
// AI_BASE_URL/AI_API_KEY/AI_MODEL secrets as every other AI-calling function;
// swapping provider is a config change, never a code change or redeploy.
//
// WHAT THIS FUNCTION MAY AND MAY NOT PRODUCE
// ------------------------------------------
// The model returns INPUTS ONLY: product names, units, unit costs, selling
// prices, monthly expense rows, one-off startup costs, available capital.
//
// It must NOT return a margin, a break-even, a daily target, a runway or a
// forecast. Those are computed by src/features/localshop/engine/* from the
// inputs above, exactly as they are for the hand-written Kedai Makmur
// fixture. A figure invented by a language model and displayed as a computed
// one would break the project's central architectural claim, so the client
// validator (src/utils/shopScenarioSchema.js, FORBIDDEN_COMPUTED_KEYS)
// strips any such key even if the model ignores this instruction. The
// prompt below asks; the validator enforces. Never rely on the asking.
//
// It must also NOT invent sales history or customer reviews. The Local Shop
// pathway exists precisely because the owner keeps no daily records, and
// fabricating them would be inventing research data.

import { AIMalformedResponseError, AIProviderNotConfiguredError, AIUpstreamError, callAIChat } from '../_shared/aiClient.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_SECTOR_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_REVENUE_TARGET = 10_000_000
const TARGET_PRODUCT_COUNT = 12

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/**
 * Some providers wrap JSON in prose or a ```json fence even in JSON mode.
 * Recovering the object is cheap and deterministic; failing the whole
 * generation over a code fence is not. Returns null when nothing parses —
 * the caller reports that honestly rather than guessing at a repair.
 */
function parseJsonLoosely(text: string): unknown {
  const direct = text.trim()
  try {
    return JSON.parse(direct)
  } catch {
    // fall through
  }
  const fenced = direct.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(fenced)
  } catch {
    // fall through
  }
  const first = direct.indexOf('{')
  const last = direct.lastIndexOf('}')
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(direct.slice(first, last + 1))
    } catch {
      return null
    }
  }
  return null
}

function buildPrompt(sector: string, revenueTarget: number | null, description: string): string {
  const targetLine = revenueTarget === null
    ? 'The owner did not state a monthly revenue target.'
    : `The owner's monthly revenue target is RM ${revenueTarget}.`

  return `You are helping set up a realistic demonstration scenario for a small Malaysian business inside a decision-support tool.

The owner described their business like this:
"""
${description}
"""

Business sector: ${sector || '(not stated)'}
${targetLine}

Build a plausible shop profile for this business, using realistic Malaysian prices in Ringgit (MYR).

Return ONLY a JSON object with exactly these keys:
{
  "name": "a plausible shop name in Malay or English",
  "category": "short category, e.g. Grocery shop, Kopitiam, Bakery",
  "location": "a Malaysian state or city",
  "model": "short sales model, e.g. Walk-in retail, cash and e-wallet",
  "language": "ms" or "en",
  "products": [
    { "name": "product name", "unit": "bottle|pack|cup|kg|piece|...", "cost": number, "price": number }
  ],
  "expenses": [
    { "category": "Rental|Employee salaries|Utilities|Internet|Transportation|Marketing|...",
      "amount": number, "kind": "fixed" or "variable", "controllable": true or false }
  ],
  "startupItems": {
    "rental_deposit": number, "renovation": number, "equipment": number,
    "initial_stock": number, "licences": number, "utilities_deposit": number,
    "marketing": number, "emergency_reserve": number
  },
  "availableCapital": number
}

HARD RULES — a response breaking any of these is unusable:
1. Give about ${TARGET_PRODUCT_COUNT} products (minimum 3, maximum 60), appropriate to the sector described above.
2. For EVERY product, "price" must be strictly greater than "cost". Both are per single unit, in MYR, as plain numbers — no currency symbols, no strings, no ranges.
3. Include at least one expense with "kind": "fixed" (for example rent).
4. Do NOT include any calculated figure. No margin, no marginPct, no breakEven, no breakEvenRevenue, no contribution, no dailyTarget, no runway, no capitalGap, no forecast, no totals. The application computes all of those itself from the numbers you give.
5. Do NOT invent sales history, daily records, customer reviews, ratings or feedback. Do not include those keys at all.
6. Do NOT include any real person's name, phone number, address or any other personal detail.
7. Numbers only, no commas inside numbers. Output the JSON object and nothing else.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  let body: { sector?: unknown; revenueTarget?: unknown; description?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'Request body must be JSON.' }, 400)
  }

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (!description) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'description is required.' }, 400)
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: `description must be at most ${MAX_DESCRIPTION_LENGTH} characters.` }, 400)
  }

  const sector = typeof body.sector === 'string' ? body.sector.trim().slice(0, MAX_SECTOR_LENGTH) : ''

  let revenueTarget: number | null = null
  if (body.revenueTarget !== undefined && body.revenueTarget !== null && body.revenueTarget !== '') {
    const parsed = typeof body.revenueTarget === 'number' ? body.revenueTarget : Number(body.revenueTarget)
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_REVENUE_TARGET) {
      return jsonResponse({ error: 'INVALID_REQUEST', message: 'revenueTarget must be a positive number.' }, 400)
    }
    revenueTarget = parsed
  }

  let text: string
  try {
    // Low temperature: this is a structured extraction task, not a creative
    // one, and a scenario that parses matters more than a varied one.
    text = await callAIChat(buildPrompt(sector, revenueTarget, description), { temperature: 0.2, jsonMode: true })
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

  const scenario = parseJsonLoosely(text)
  if (scenario === null || typeof scenario !== 'object' || Array.isArray(scenario)) {
    return jsonResponse({ error: 'UPSTREAM_MALFORMED', message: 'AI response was not a JSON object.' }, 502)
  }

  // Returned unvalidated ON PURPOSE. The single source of truth for what a
  // scenario may contain is src/utils/shopScenarioSchema.js, which the
  // client applies and which has its own test suite. Duplicating those rules
  // here in Deno would create two validators that could drift apart, and the
  // client one is the only one that can never be bypassed.
  return jsonResponse({ scenario })
})
