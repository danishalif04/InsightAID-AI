// Supabase Edge Function — real Threads API integration (FYP2.md social
// sources). Retrieves the AUTHENTICATED Threads account's own posts, and
// — only where the token actually has permission — their top-level
// replies. Stateless: returns data to the caller, never writes to the
// database itself, exactly like sync-x-mentions. The frontend adapter
// (src/adapters/threadsAdapter.js) inserts rows via the same real
// ingestion pipeline (dataPipelineService.ingestRows) CSV uploads use.
//
// Configure via (never as a VITE_* var — see FYP2.md §59):
//   supabase secrets set THREADS_APP_ID=... THREADS_APP_SECRET=... THREADS_ACCESS_TOKEN=...
//
// Honest limitation, confirmed against a real call to this token before
// writing this function (not assumed): `threads_basic` (own profile/posts)
// is confirmed working. `threads_read_replies` (replies on those posts) is
// NOT confirmed — attempted per-post below, and this function degrades
// gracefully (stops trying, reports `repliesAvailable: false`) the moment
// Threads rejects it, rather than failing the whole sync or guessing.
// Public, cross-account brand-mention search (`threads_keyword_search`) and
// the separate account-mentions feature are NOT implemented here at all —
// see docs/API_INTEGRATION.md's "Threads — public monitoring limitation"
// section. This function only ever returns what the authenticated account
// itself can see.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GRAPH_BASE = 'https://graph.threads.net/v1.0'
const MAX_POSTS = 25

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

type ThreadsErrorBody = { error?: { message?: string; type?: string; code?: number } }

/** Maps a non-ok Threads Graph API response to this project's shared error
 * vocabulary — same shape sync-x-mentions uses, so the adapter can handle
 * both sources identically. Never includes the access token in the
 * returned detail. */
async function toErrorResponse(res: Response, context: string) {
  const detail = (await res.json().catch(() => null)) as ThreadsErrorBody | null
  const message = detail?.error?.message

  if (res.status === 401 || res.status === 403) {
    return jsonResponse(
      {
        error: 'AUTH_REQUIRED',
        message: `Threads rejected ${context} as unauthorized/forbidden — the access token may be expired, revoked, or missing a required permission. ${message ?? ''}`.trim(),
        detail: { type: detail?.error?.type, code: detail?.error?.code },
      },
      403
    )
  }
  if (res.status === 400 && detail?.error?.type === 'OAuthException') {
    // Threads returns 400 (not 401) for a malformed/expired token on some
    // endpoints — treat the same as AUTH_REQUIRED rather than a generic error.
    return jsonResponse(
      {
        error: 'AUTH_REQUIRED',
        message: `Threads could not validate the access token while fetching ${context} — it likely needs to be re-authorized (long-lived tokens expire after ~60 days). ${message ?? ''}`.trim(),
        detail: { type: detail?.error?.type, code: detail?.error?.code },
      },
      403
    )
  }
  if (res.status === 429) {
    return jsonResponse({ error: 'RATE_LIMITED', message: `Threads API rate limit exceeded while fetching ${context}.` }, 429)
  }
  return jsonResponse(
    { error: 'UPSTREAM_ERROR', message: `Threads API returned ${res.status} while fetching ${context}. ${message ?? ''}`.trim() },
    502
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  const accessToken = Deno.env.get('THREADS_ACCESS_TOKEN')
  if (!accessToken) return jsonResponse({ error: 'NOT_CONFIGURED', message: 'THREADS_ACCESS_TOKEN is not set.' }, 503)

  let body: { cursor?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // An empty body is fine — it just means "first page".
  }
  const cursor = typeof body.cursor === 'string' ? body.cursor : undefined

  // Step 1: confirm identity. Also gives us the threads-user-id the
  // /threads endpoint requires (there is no documented /me/threads shorthand).
  const profileUrl = new URL(`${GRAPH_BASE}/me`)
  profileUrl.searchParams.set('fields', 'id,username')
  profileUrl.searchParams.set('access_token', accessToken)

  let profileRes: Response
  try {
    profileRes = await fetch(profileUrl)
  } catch (error) {
    return jsonResponse({ error: 'UPSTREAM_UNREACHABLE', message: String(error) }, 502)
  }
  if (!profileRes.ok) return toErrorResponse(profileRes, 'the authenticated profile')

  const profile = (await profileRes.json()) as { id?: string; username?: string }
  if (!profile.id) return jsonResponse({ error: 'UPSTREAM_ERROR', message: 'Threads profile response had no id.' }, 502)

  // Step 2: this account's own posts (requires threads_basic — confirmed
  // working against this token before this function was written).
  const postsUrl = new URL(`${GRAPH_BASE}/${profile.id}/threads`)
  postsUrl.searchParams.set('fields', 'id,text,timestamp,permalink,media_type,is_quote_post,username')
  postsUrl.searchParams.set('limit', String(MAX_POSTS))
  if (cursor) postsUrl.searchParams.set('after', cursor)
  postsUrl.searchParams.set('access_token', accessToken)

  let postsRes: Response
  try {
    postsRes = await fetch(postsUrl)
  } catch (error) {
    return jsonResponse({ error: 'UPSTREAM_UNREACHABLE', message: String(error) }, 502)
  }
  if (!postsRes.ok) return toErrorResponse(postsRes, 'this account\'s posts')

  const postsPayload = (await postsRes.json()) as {
    data?: Array<Record<string, unknown>>
    paging?: { cursors?: { after?: string } }
  }
  const posts = Array.isArray(postsPayload.data) ? postsPayload.data : []
  const nextCursor = postsPayload.paging?.cursors?.after ?? null

  // Step 3: best-effort top-level replies per post (requires the SEPARATE
  // threads_read_replies permission — not confirmed for this token). Stop
  // trying for the rest of this run the moment Threads rejects it, instead
  // of repeating a failing call once per post.
  let repliesAvailable = true
  const postsWithReplies: Array<Record<string, unknown>> = []

  for (const post of posts) {
    let replies: Array<Record<string, unknown>> = []
    if (repliesAvailable && typeof post.id === 'string') {
      const repliesUrl = new URL(`${GRAPH_BASE}/${post.id}/replies`)
      repliesUrl.searchParams.set('fields', 'id,text,timestamp,username,permalink')
      repliesUrl.searchParams.set('access_token', accessToken)
      try {
        const repliesRes = await fetch(repliesUrl)
        if (repliesRes.ok) {
          const repliesPayload = (await repliesRes.json()) as { data?: Array<Record<string, unknown>> }
          replies = Array.isArray(repliesPayload.data) ? repliesPayload.data : []
        } else if (repliesRes.status === 400 || repliesRes.status === 401 || repliesRes.status === 403) {
          repliesAvailable = false
        }
        // Any other status (e.g. a transient 5xx) just leaves this one
        // post's replies empty — never fails the whole sync over one post.
      } catch {
        // Network error for this one post's replies — leave empty, keep going.
      }
    }
    postsWithReplies.push({ ...post, replies })
  }

  return jsonResponse({
    account: { id: profile.id, username: profile.username ?? null },
    posts: postsWithReplies,
    nextCursor,
    repliesAvailable,
  })
})
