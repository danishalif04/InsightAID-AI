// Supabase Edge Function — report narrative generation (FYP2.md §69: "Gemini
// may help generate narrative explanations but must not independently
// invent numerical metrics"). Stateless: does not touch the database, does
// not decide what data appears in a report — that's already fixed by
// src/utils/reportBuilders.js before this function is ever called.
// Requires the GEMINI_API_KEY secret, set via
//   supabase secrets set GEMINI_API_KEY=...
// (never set as a VITE_* var — that would bundle it into the browser).
//
// Same reliability contract as explain-recommendations: this function only
// ever returns ONE string per section id (`narrative`), and
// validateExplained() below drops every other key — there is no code path
// by which a Gemini response can alter a report's actual/scenario data
// points. If unreachable/unconfigured, the caller
// (src/services/reportGenerationService.js) must render the report with
// its real data and no narrative prose, never a blank report.

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
const MAX_SECTIONS = 15
const MAX_NARRATIVE_LENGTH = 1500

interface DataPoint {
  label?: string
  value?: unknown
}

interface ReportSection {
  id: string
  title?: string
  actual?: DataPoint[]
  scenario?: DataPoint[]
  note?: string | null
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isValidSection(value: unknown): value is ReportSection {
  return !!value && typeof value === 'object' && typeof (value as ReportSection).id === 'string'
}

/** Drops unknown keys/ids and coerces to a plain string, capped in length.
 * Never throws — this is the enforcement point for §69/§55: Gemini cannot
 * inject a numeric field or a section id this function doesn't already know about. */
function validateExplained(raw: unknown, knownIds: Set<string>): { narratives: Record<string, string>; warnings: string[] } {
  const narratives: Record<string, string> = {}
  const warnings: string[] = []
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  for (const [id, value] of Object.entries(source)) {
    if (!knownIds.has(id)) {
      warnings.push(`Ignored narrative for unknown section id "${id}".`)
      continue
    }
    if (typeof value !== 'string' || !value.trim()) {
      warnings.push(`Ignored empty/non-string narrative for "${id}".`)
      continue
    }
    narratives[id] = value.slice(0, MAX_NARRATIVE_LENGTH)
  }

  return { narratives, warnings }
}

function formatDataPoints(points: DataPoint[] | undefined): string {
  if (!points || points.length === 0) return '(none)'
  return points.map((p) => `${p.label}: ${p.value}`).join(' | ')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return jsonResponse({ error: 'NOT_CONFIGURED', message: 'GEMINI_API_KEY is not set.' }, 503)

  let body: { reportTitle?: unknown; sections?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'Request body must be JSON.' }, 400)
  }

  const sections = Array.isArray(body.sections) ? body.sections.filter(isValidSection) : []
  if (sections.length === 0) return jsonResponse({ error: 'INVALID_REQUEST', message: 'sections must be a non-empty array.' }, 400)
  if (sections.length > MAX_SECTIONS) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: `At most ${MAX_SECTIONS} sections per request.` }, 400)
  }

  const reportTitle = typeof body.reportTitle === 'string' ? body.reportTitle : 'Report'
  const knownIds = new Set(sections.map((s) => s.id))

  const sectionsBlock = sections
    .map(
      (s) =>
        `- id: ${s.id}\n  title: ${s.title ?? ''}\n  ACTUAL DATA: ${formatDataPoints(s.actual)}\n  SCENARIO/ESTIMATED DATA: ${formatDataPoints(s.scenario)}\n  note: ${s.note ?? ''}`
    )
    .join('\n')

  const prompt = `You are writing a short narrative paragraph (2-4 sentences) for each section of a business report titled "${reportTitle}". Every number and fact below has ALREADY been computed by a real analytics system — you do not decide, calculate, or estimate any number. Use ONLY the facts given. Never state a number, percentage, or statistic that is not already present in the ACTUAL DATA or SCENARIO/ESTIMATED DATA below. When you reference SCENARIO/ESTIMATED DATA, make clear in your wording that it is a projection or estimate, not a historical fact — never blur the two together. If a section has no data, briefly say so rather than inventing content.

Return ONLY a JSON object shaped like { "<section id>": "narrative text" } for each id below — no other keys, no markdown.

Sections:
${sectionsBlock}`

  let geminiResponse: Response
  try {
    geminiResponse = await fetch(
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
    return jsonResponse({ error: 'UPSTREAM_ERROR', message: `Gemini returned ${geminiResponse.status}.`, detail }, 502)
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

  const { narratives, warnings } = validateExplained(parsed, knownIds)
  return jsonResponse({ narratives, warnings })
})
