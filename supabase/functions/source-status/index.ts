// Supabase Edge Function — reports which social-source credentials are
// configured, WITHOUT ever returning the secret values themselves.
// This check has to run server-side even though it's "only" a presence
// check: the moment real secrets are configured, a client-side check would
// require bundling them into the browser to test for their own existence,
// which defeats the point of keeping them server-side at all.
//
// Configure via (never as a VITE_* var — see FYP2.md §59):
//   supabase secrets set TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=...
//   supabase secrets set X_API_KEY=... X_API_SECRET=...
//   supabase secrets set THREADS_CLIENT_ID=... THREADS_CLIENT_SECRET=...

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

const SOURCES: Record<string, string[]> = {
  tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
  x: ['X_API_KEY', 'X_API_SECRET'],
  threads: ['THREADS_CLIENT_ID', 'THREADS_CLIENT_SECRET'],
}

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const result: Record<string, { status: string }> = {}

  for (const [source, requiredVars] of Object.entries(SOURCES)) {
    const missing = requiredVars.filter((name) => !Deno.env.get(name))
    result[source] = { status: missing.length === 0 ? 'not_configured_but_present' : 'not_configured' }
    // Note: even with credentials present, this function does not attempt a
    // live API call — verifying an actual OAuth exchange against a real
    // TikTok/X/Threads endpoint is future work once real credentials exist
    // and can be tested against. Presence of credentials alone is reported
    // as "not_configured_but_present" rather than "connected" so the
    // frontend never silently upgrades to a fake CONNECTED state either.
  }

  return jsonResponse({ sources: result })
})
