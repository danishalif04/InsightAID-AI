// Supabase Edge Function — extracts a structured business profile from a
// free-text description via an LLM (FYP2.md §23-25). Stateless: does not
// touch the database.
//
// Provider-agnostic — see ../_shared/aiClient.ts. Requires the AI_BASE_URL/
// AI_API_KEY/AI_MODEL secrets (shared with explain-recommendations and
// explain-report — one config, one provider, for the whole app).
//
// Field list here must be kept in sync by hand with
// src/utils/businessProfileSchema.js's EXTRACTABLE_FIELD_IDS.

import { AIMalformedResponseError, AIProviderNotConfiguredError, AIUpstreamError, callAIChat } from '../_shared/aiClient.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_DESCRIPTION_LENGTH = 4000

// { fieldId: 'string' | 'number' | 'string[]' } — the shape the LLM is asked to return.
const EXTRACTABLE_FIELDS = {
  business_name: 'string',
  business_type: 'string',
  industry: 'string',
  business_stage: 'string',
  location: 'string',
  product_category: 'string',
  product_type: 'string',
  target_customer: 'string',
  target_age_group: 'string',
  marketing_channels: 'string[]',
  selling_price: 'number',
  expected_monthly_units: 'number',
  expected_monthly_revenue: 'number',
  marketing_cost: 'number',
  growth_target: 'string',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** Drops unknown keys and coerces each known field to its declared type. Never throws. */
function validateExtracted(raw: unknown): { profile: Record<string, unknown>; warnings: string[] } {
  const profile: Record<string, unknown> = {}
  const warnings: string[] = []
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  for (const [field, kind] of Object.entries(EXTRACTABLE_FIELDS)) {
    const value = source[field]
    if (value === null || value === undefined || value === '') continue

    if (kind === 'number') {
      const num = typeof value === 'number' ? value : Number.parseFloat(String(value))
      if (Number.isFinite(num)) profile[field] = num
      else warnings.push(`Ignored non-numeric value for ${field}.`)
    } else if (kind === 'string[]') {
      if (Array.isArray(value)) profile[field] = value.filter((item) => typeof item === 'string')
      else warnings.push(`Ignored non-array value for ${field}.`)
    } else {
      profile[field] = String(value).trim()
    }
  }

  return { profile, warnings }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  let body: { description?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'Request body must be JSON.' }, 400)
  }

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (!description) return jsonResponse({ error: 'INVALID_REQUEST', message: 'description is required.' }, 400)
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'description is too long.' }, 400)
  }

  const prompt = `Extract structured business information from the description below. Return ONLY a JSON object with these exact keys (omit any key you cannot confidently infer from the text — do not guess or invent values): ${Object.keys(EXTRACTABLE_FIELDS).join(', ')}. marketing_channels must be an array of strings. Numeric fields must be plain numbers with no currency symbols.\n\nDescription:\n${description}`

  let text: string
  try {
    text = await callAIChat(prompt, { temperature: 0.2 })
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

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return jsonResponse({ error: 'UPSTREAM_MALFORMED', message: 'AI response was not valid JSON.' }, 502)
  }

  const { profile, warnings } = validateExtracted(parsed)
  return jsonResponse({ profile, warnings })
})
