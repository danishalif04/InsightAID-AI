// Supabase Edge Function — fetches real recent posts matching a search
// query from X API v2 (FYP2.md §37-39/§59). Stateless: returns the posts
// to the caller, never writes to the database itself — the frontend
// adapter (src/adapters/xAdapter.js) inserts them via the same real
// ingestion pipeline (dataPipelineService.ingestRows('social', ...)) that
// CSV uploads use, under the signed-in user's own RLS-scoped session.
//
// Configure via (never as a VITE_* var — see FYP2.md §59):
//   supabase secrets set X_BEARER_TOKEN=...
//
// Honest limitation, stated up front: X's Free API tier only permits
// posting, not reading — calling this with a Free-tier bearer token will
// get a real 403 from X, which this function reports as AUTH_REQUIRED
// rather than crashing or pretending to succeed. Reading mentions for real
// requires X's Basic tier or higher.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_QUERY_LENGTH = 512
const MAX_RESULTS = 25

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  const bearerToken = Deno.env.get('X_BEARER_TOKEN')
  if (!bearerToken) return jsonResponse({ error: 'NOT_CONFIGURED', message: 'X_BEARER_TOKEN is not set.' }, 503)

  let body: { query?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'Request body must be JSON.' }, 400)
  }

  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query) return jsonResponse({ error: 'INVALID_REQUEST', message: 'query is required.' }, 400)
  if (query.length > MAX_QUERY_LENGTH) {
    return jsonResponse({ error: 'INVALID_REQUEST', message: 'query is too long.' }, 400)
  }

  const url = new URL('https://api.x.com/2/tweets/search/recent')
  url.searchParams.set('query', query)
  url.searchParams.set('max_results', String(MAX_RESULTS))
  url.searchParams.set('tweet.fields', 'created_at,public_metrics,lang')

  let xResponse: Response
  try {
    xResponse = await fetch(url, { headers: { Authorization: `Bearer ${bearerToken}` } })
  } catch (error) {
    return jsonResponse({ error: 'UPSTREAM_UNREACHABLE', message: String(error) }, 502)
  }

  if (xResponse.status === 401 || xResponse.status === 403) {
    const detail = await xResponse.text().catch(() => '')
    return jsonResponse(
      {
        error: 'AUTH_REQUIRED',
        message:
          'X rejected this request as unauthorized/forbidden — your API access tier likely does not permit reading (X\'s Free tier only allows posting; search requires Basic tier or higher).',
        detail,
      },
      403
    )
  }

  if (xResponse.status === 429) {
    const detail = await xResponse.text().catch(() => '')
    return jsonResponse({ error: 'RATE_LIMITED', message: 'X API rate limit exceeded.', detail }, 429)
  }

  if (!xResponse.ok) {
    const detail = await xResponse.text().catch(() => '')
    return jsonResponse({ error: 'UPSTREAM_ERROR', message: `X API returned ${xResponse.status}.`, detail }, 502)
  }

  const payload = await xResponse.json().catch(() => null)
  const posts = Array.isArray(payload?.data) ? payload.data : []

  // Only real fields X actually returned — never a fabricated engagement
  // number for a post whose metrics X didn't include.
  const mapped = posts.map((post: Record<string, unknown>) => ({
    id: post.id,
    text: post.text,
    createdAt: post.created_at ?? null,
    lang: post.lang ?? null,
    likeCount: (post.public_metrics as Record<string, unknown> | undefined)?.like_count ?? null,
    replyCount: (post.public_metrics as Record<string, unknown> | undefined)?.reply_count ?? null,
    retweetCount: (post.public_metrics as Record<string, unknown> | undefined)?.retweet_count ?? null,
    quoteCount: (post.public_metrics as Record<string, unknown> | undefined)?.quote_count ?? null,
  }))

  return jsonResponse({ posts: mapped, resultCount: posts.length })
})
