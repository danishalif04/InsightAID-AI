# Deployment (FYP2.md §77-78)

## What actually gets deployed

This app is a **static single-page app** (Vite build output) plus **Supabase**
(Postgres + Auth + Edge Functions). There is no Vercel serverless/API code
anywhere in this repo — every piece of server-side logic (Gemini calls,
credential-presence checks) already runs as a **Supabase Edge Function**
(Deno), not a Vercel function. So Vercel's job here is exactly what §78
describes it should be: serve the frontend, nothing heavier.

```
Vercel  →  static build (dist/) + SPA routing
Supabase → Postgres (RLS-scoped tables) + Auth + Edge Functions
ml/sentiment, ml/forecasting → offline, run on your own machine/Colab, never on Vercel
```

## Pre-deployment checklist (§77 — "All must succeed")

```bash
npm install
npm run lint
npm run build
```

Run and confirmed passing as of this phase — see this phase's report for
the exact output. `npm run test` (Vitest, 177 tests) and `npm run test:e2e`
(Playwright — see below) should also be run; they are not literally listed
in §77 but are the same "must succeed before shipping" bar.

## Environment variables

**Frontend (Vercel project settings → Environment Variables):**

| Variable | Where it comes from | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project → Settings → API | Public by design — this is a URL, not a secret |
| `VITE_SUPABASE_ANON_KEY` | Supabase project → Settings → API | The **anon/public** key. Safe to expose to the browser — every table it can touch is behind Row Level Security. This is NOT the service-role key. |

Read in exactly one place in the whole codebase — `src/config/env.js`
(`import.meta.env.VITE_*`) — per the Phase 1 rule "no raw `import.meta.env`
outside config," confirmed still true by grep as of this phase.

**Never set on Vercel, ever:**

- `SUPABASE_SERVICE_ROLE_KEY` — grepped across `src/` and confirmed: **zero
  references anywhere in frontend code.** It has no reason to exist as a
  Vercel env var, because nothing Vercel serves ever needs it. It's only
  ever used by *you*, manually, when running SQL migrations or the
  `ml/sentiment`/`ml/forecasting` upload steps — never by deployed code.
- `GEMINI_API_KEY` — a **Supabase Edge Function secret** (`supabase secrets set GEMINI_API_KEY=...`),
  not a Vercel variable. Set once in the Supabase dashboard, consumed only
  by `extract-business-profile`/`explain-recommendations`/`explain-report`,
  never bundled into any frontend build.
- `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET`, `X_API_KEY`/`X_API_SECRET`,
  `THREADS_CLIENT_ID`/`THREADS_CLIENT_SECRET` — same: Supabase Edge Function
  secrets only (`source-status`), see `docs/API_INTEGRATION.md`.

## SPA routing

React Router (`createBrowserRouter`) needs every path to resolve to
`index.html` client-side. `vercel.json` (new this phase) configures that:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Without this, refreshing on e.g. `/dashboard` or `/crisis-detection`
directly would 404 on Vercel's static host instead of loading the app and
letting the router take over.

## Supabase — what has to happen outside of Vercel

None of this is automatic; every migration and Edge Function in this repo
still requires the same manual step it always has (no Supabase CLI/service-role
access exists in this development environment):

1. **Migrations**, in order, via Supabase Dashboard → SQL Editor:
   `0001_init.sql` (trimmed, Phase 10) → `0002_business_planning.sql` →
   `0003_data_pipeline.sql` → `0004_model_versions.sql` →
   `0005_forecast_results.sql` → `0006_crisis_events.sql` →
   `0007_recommendations.sql`. **None of these have been run against the
   live project as of this phase** — see this phase's Final Development
   Report for the honest current state.
2. **Edge Functions**, via `supabase functions deploy <name>`:
   `extract-business-profile`, `source-status`, `explain-recommendations`,
   `explain-report`.
3. **Secrets**, via `supabase secrets set`: `GEMINI_API_KEY` (shared by all
   three Gemini-calling functions), plus the TikTok/X/Threads pairs above
   if/when those integrations are actually implemented (currently
   `NOT_CONFIGURED` — see `docs/API_INTEGRATION.md`).
4. **`supabase/seed.sql`** (optional, demo data) — rewritten this phase to
   match the current trimmed schema; run it after signing up through
   `/signup` if you want a demo account with some starter Settings/Reports
   rows. It does not (and, honestly, cannot) seed real sentiment/crisis/
   forecast data — that only comes from actually running the pipeline
   against uploaded data.

## The Vercel ML limitation (§78) — stated explicitly

Nothing in `ml/sentiment/` or `ml/forecasting/` runs on Vercel, ever. Both
are offline training pipelines (Colab notebooks + local scripts) that
produce results a human uploads to `model_versions`/`forecast_results`
afterward. If/when a trained sentiment model exists, real-time inference
would need to run on a service that can actually hold model weights in
memory (documented design: Hugging Face Inference Endpoints, see
`docs/SENTIMENT_MODEL.md`'s "Inference service design" section) — Vercel's
role stays limited to the frontend and thin Edge-Function-proxied requests
to that service, never the model itself.

## Local vs. Production

| | Local dev | Local production preview | Vercel (production) |
|---|---|---|---|
| Command | `npm run dev` | `npm run build && npm run preview` | Vercel builds `npm run build` automatically on push |
| What's served | Unminified, HMR | Minified `dist/` via Vite's preview server | Minified `dist/`, Vercel's CDN/edge |
| Env vars | `.env` (gitignored) | `.env` | Vercel project settings |

## Known limitations (stated honestly)

- **This app has never actually been deployed to Vercel** — this phase
  prepares the configuration and documents the process; it does not
  perform the deployment (no Vercel account access exists in this
  environment).
- **No Supabase migration has been confirmed run against the live
  project** — every phase since Phase 3 has flagged this same standing
  fact.
- Because of the standing Supabase email-confirmation blocker (see
  `e2e/helpers.js` and this phase's Final Development Report), the
  authenticated app has never been verified end-to-end against a real
  deployed environment — only against a local dev/preview server, and only
  as far as the login wall allows.
