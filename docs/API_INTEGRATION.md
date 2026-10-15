# InsightAid AI — API / Data Source Integration

Format follows FYP2.md §83. Each source is a modular adapter in `src/adapters/` (FYP2.md §38, §66) — every source is checked independently via `getAllSourceStatuses()` in `src/adapters/registry.js`, and one source failing or being unreachable never affects the others (see `registry.test.js`). Status values are always one of FYP2.md §39's real vocabulary (`CONNECTED`/`NOT_CONFIGURED`/`AUTH_REQUIRED`/`RATE_LIMITED`/`ERROR`/`DISABLED`) — no source in this project has ever returned a fabricated `CONNECTED`.

**Current status as of this writing:** Sales Data and Shopee are backed by our own database and can be genuinely `CONNECTED`. Threads is a real, working integration (own-account posts and replies, confirmed against a live call). X is real code, unconfirmed against a real API call (Free-tier credentials). TikTok has no credentials and correctly reports `NOT_CONFIGURED`.

---

## Sales Data

| | |
|---|---|
| **Source** | Internal — `raw_data` / `processed_data` tables (Phase 4's pipeline) |
| **Purpose** | Sales transactions uploaded via the "Sales" CSV template |
| **Authentication** | None — this is our own Supabase database, scoped by Row Level Security to the signed-in user |
| **Environment Variables** | None required (uses the existing `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) |
| **Data Retrieved** | Whatever the user uploads: date, product, category, quantity_sold, unit_price, revenue, discount, cost |
| **Rate Limit / Access Constraints** | None beyond normal Supabase/Postgres limits |
| **Current Status** | `CONNECTED` once at least one sales row has been uploaded; `NOT_CONFIGURED` otherwise. Genuinely computed — not a mock. |
| **Fallback** | None needed; this source has no external dependency to fail |

**Adapter:** `src/adapters/salesDataAdapter.js`

---

## Shopee (Dataset Mode)

| | |
|---|---|
| **Source** | Approved dataset / CSV upload — **not a live API** |
| **Purpose** | Shopee product reviews and marketplace social content |
| **Authentication** | None — no public Shopee API exists for this use case. Per FYP2.md §37, this project does not bypass anti-bot mechanisms, implement unauthorized scraping, or assume access to a private/internal API |
| **Environment Variables** | None |
| **Data Retrieved** | Whatever the user uploads via the "Reviews" or "Social" CSV template with `platform = Shopee` |
| **Rate Limit / Access Constraints** | N/A (not a live connection) |
| **Current Status** | `CONNECTED` once Shopee-platform rows exist in `processed_data`; `NOT_CONFIGURED` otherwise |
| **Fallback** | This *is* the fallback — Shopee data only ever arrives via the approved-dataset path, by design, not as a fallback from a failed live connection |

**Adapter:** `src/adapters/shopeeAdapter.js`

**Weak sentiment labeling:** when a Shopee review row has a star rating, `src/utils/ratingSentimentHeuristic.js` derives a provisional sentiment (§37's own documented mapping). This is stamped `model_name: 'rating_heuristic_v1'` — never a real model name — and rating does not automatically equal sentiment.

---

## TikTok API

| | |
|---|---|
| **Source** | TikTok for Developers (Research API / Display API) |
| **Purpose** | Mentions, comments, and engagement for sentiment/crisis/social-intelligence analysis |
| **Authentication** | OAuth 2.0 client credentials — **not implemented or tested in this project** |
| **Environment Variables** | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` — Supabase Edge Function secrets only (`supabase secrets set ...`), **never** a `VITE_*` frontend variable, per FYP2.md §59 |
| **Data Retrieved** | Not yet implemented — would be mention/comment text, engagement counts, timestamps, once a real integration exists |
| **Rate Limit / Access Constraints** | Requires TikTok developer account approval; specific limits unknown until an app is registered |
| **Current Status** | `NOT_CONFIGURED` (no secrets set) or `AUTH_REQUIRED` (secrets set, but the OAuth exchange and data fetch are not built yet — see "Known limitation" below) |
| **Fallback** | Upload data manually via the "Social" CSV template, or use `seedFixtureSample()` for a demonstration dataset |

**Adapter:** `src/adapters/tiktokAdapter.js` (via the shared `src/adapters/socialSourceAdapter.js` factory)
**Status check:** `supabase/functions/source-status/index.ts`

---

## X API

| | |
|---|---|
| **Source** | X (Twitter) API v2 — `GET /2/tweets/search/recent` |
| **Purpose** | Real recent posts matching the signed-in user's business name/product category, ingested through the same pipeline as a CSV upload |
| **Authentication** | OAuth 2.0 App-Only (bearer token), real implementation |
| **Environment Variables** | `X_BEARER_TOKEN` — Supabase Edge Function secret only, never `VITE_*`. (`X_API_KEY`/`X_API_SECRET`, OAuth 1.0a consumer keys, are not used by this read-only integration.) |
| **Data Retrieved** | Post text, created-at date, like/reply/retweet/quote counts — only fields X actually returned, never a fabricated metric. Mapped to the `social` template (`src/adapters/xMapping.js`) and ingested via `dataPipelineService.ingestRows('social', ...)`, so it flows through the same preprocessing/feature-engineering/aggregation every CSV upload does. |
| **Rate Limit / Access Constraints** | **X's Free API tier only permits posting, not reading** — `search/recent` will return HTTP 403 under Free tier. Reading real mentions requires the Basic tier (paid) or higher. This is a real, confirmed constraint of the credential tier used during this phase, not a guess. |
| **Current Status** | `NOT_CONFIGURED` (no `X_BEARER_TOKEN` set) / `AUTH_REQUIRED` (configured but either no successful sync yet, or X rejected the request — e.g. insufficient tier, mapped from a real 401/403) / `RATE_LIMITED` (real 429) / `CONNECTED` (a real sync has inserted rows, or the most recent sync got a real 200 with zero matching posts) |
| **Fallback** | CSV upload (now accepts any real column-header format — see `docs/DATA_PIPELINE.md` §5a) or the fixture sample |

**Adapter:** `src/adapters/xAdapter.js` · **Edge Function:** `supabase/functions/sync-x-mentions/index.ts` · **Pure mapping:** `src/adapters/xMapping.js` (tested)

**Known limitation, stated plainly:** this integration was built and unit-tested against synthetic X API response shapes, but has not been confirmed against a real live call — the credentials available during this phase are on X's Free tier, which this project's own research (and X's documented tier limits) indicates cannot call the search endpoint at all. Clicking "Sync" with Free-tier credentials should surface `AUTH_REQUIRED` with a real 403 detail from X, which is the correct, honest outcome for that tier — not a bug. If/when the tier is upgraded to Basic or higher, no code changes are needed; the existing error-handling path already distinguishes a real success from a real 403/429.

---

## Threads API

| | |
|---|---|
| **Source** | Threads API (Meta) — `GET /v1.0/me`, `GET /v1.0/{user-id}/threads`, `GET /v1.0/{media-id}/replies` |
| **Purpose** | The authenticated Threads account's own posts and (where permitted) their replies, ingested through the same pipeline as a CSV upload |
| **Authentication** | OAuth 2.0 authorization-code flow, already completed once by the account owner outside this app (Meta's standard flow — see "Token lifecycle" below). The resulting long-lived user access token is what this integration calls the API with. |
| **Environment Variables** | `THREADS_APP_ID`, `THREADS_APP_SECRET`, `THREADS_ACCESS_TOKEN` — Supabase Edge Function secrets only, never `VITE_*`. (Earlier revisions of `source-status` checked `THREADS_CLIENT_ID`/`THREADS_CLIENT_SECRET` — renamed to match what's actually configured and what `sync-threads-mentions` actually uses.) |
| **Data Retrieved** | Post id/text/timestamp/permalink/media_type, and (when `threads_read_replies` is granted) each post's top-level replies — only fields Threads actually returned, never a fabricated metric. A post with no real `text` (e.g. a repost, `media_type: REPOST_FACADE`) is correctly excluded rather than synced as empty content. Mapped to the `social` template (`src/adapters/threadsMapping.js`) and ingested via `dataPipelineService.ingestRows('social', ...)`. |
| **Rate Limit / Access Constraints** | Meta's documented limit: 2,200 `/keyword_search` queries per rolling 24h (not used by this integration — see "Public monitoring" below). `/threads` and `/replies` calls are subject to Meta's general Graph API rate limits; a real 429 is mapped to `RATE_LIMITED`, never silently retried into a worse rate-limit state. |
| **Current Status** | `NOT_CONFIGURED` (secrets not set) / `AUTH_REQUIRED` (configured but no successful sync yet, or Threads rejected the request — e.g. expired token, mapped from a real 401/403/400-OAuthException) / `RATE_LIMITED` (real 429) / `CONNECTED` (a real sync has inserted rows, or returned a real 200 with zero matching posts) |
| **Fallback** | CSV upload (any real column-header format — see `docs/DATA_PIPELINE.md` §5a) or the fixture sample |

**Adapter:** `src/adapters/threadsAdapter.js` · **Edge Function:** `supabase/functions/sync-threads-mentions/index.ts` · **Pure mapping:** `src/adapters/threadsMapping.js` (tested)

**Verified against a real live call** (not assumed): `GET /me` returned a real username/id (HTTP 200); `GET /{user-id}/threads` returned this account's 6 real posts (HTTP 200) — all 6 are reposts (`media_type: REPOST_FACADE`) with no original text, so they were correctly excluded from ingestion rather than synced as empty rows; `GET /{media-id}/replies` returned HTTP 200 (empty — that post genuinely has no replies), confirming `threads_read_replies` is actually granted for this token, not just `threads_basic`. A deliberately invalid token was also tested directly against Threads (never against the real configured secret) to confirm the error-mapping code matches Threads' real error shape (`400`, `type: OAuthException`, `code: 190`).

**Duplicate prevention:** `threadsAdapter.js` reads up to the last 500 `api_sync`/`social` rows' `source_post_id` before each sync and skips any post already present — so repeated clicks on "Sync" never re-insert the same real post. (Scoped to the adapter, not a new migration/column — proportionate to this project's real data volumes per FYP2.md §85.)

### Public monitoring — a separate, NOT implemented capability

Per the explicit instruction not to assume own-account access extends to public monitoring: it doesn't, and this is documented here rather than built speculatively.

| Capability | Permission required | Status for this token |
|---|---|---|
| Own posts | `threads_basic` | **Confirmed working** |
| Own posts' replies | `threads_read_replies` | **Confirmed working** |
| Account mentions (others @-mentioning this account) | A separate, distinct scope from keyword search | **Not implemented, not tested** |
| Public keyword/brand search across all of Threads | `threads_keyword_search` (app-review-gated) | **Not implemented.** Per Meta's own docs: without this permission approved, `/keyword_search` only returns the *authenticated user's own* matching posts — not public posts from other accounts. A working token alone does not unlock this, same bottleneck shape as X's Free tier and the pending Shopee approval. |

If brand-mention monitoring across the public Threads feed (not just this one account's own posts) is required, the next step is requesting `threads_keyword_search` in Meta's App Review — not a code change.

### Token lifecycle (FYP2.md — token management)

- The configured token is a **long-lived user access token** (~60 days from issuance), not a short-lived one or an app token — confirmed via a real `/me` call returning a real identity (app tokens have no such identity on Threads' Graph API).
- **Refresh, not re-authorization, is the normal path**: `GET https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=<token>` extends it for another ~60 days — must be called *before* expiry, not after.
- Nothing in this codebase automatically refreshes the token yet (no scheduled job exists in this project for anything). **Manual action required**: before ~60 days from whenever `THREADS_ACCESS_TOKEN` was last set, call the refresh endpoint and `supabase secrets set THREADS_ACCESS_TOKEN=<new_token>` — otherwise the next sync will fail with `AUTH_REQUIRED` (correctly, not silently).
- This integration never overwrites the configured token itself — a sync that fails due to an expired/invalid token just reports `AUTH_REQUIRED` and leaves the secret alone, so a transient failure can't destructively replace a working credential with nothing.

---

## X API — unconfirmed limitation, unchanged

(See the X API section above — still real code, still unconfirmed against a live call due to Free-tier access. Nothing about the Threads work changes X's status.)

## TikTok API — still not implemented

This phase deliberately does **not** include live API-calling code for TikTok — no credentials exist to test against yet, and writing best-effort OAuth/fetch code with zero ability to run it risks shipping something that looks complete but is silently wrong.

What *is* real and working today for TikTok: the modular adapter architecture, honest status computation (the server-side secret-presence check via `source-status`), and failure isolation — so adding a real integration later is a matter of filling in `sync()` for that one adapter, following the exact pattern X and Threads both now use, not rebuilding the framework.
