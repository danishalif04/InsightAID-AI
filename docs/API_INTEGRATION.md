# InsightAid AI — API / Data Source Integration

Format follows FYP2.md §83. Each source is a modular adapter in `src/adapters/` (FYP2.md §38, §66) — every source is checked independently via `getAllSourceStatuses()` in `src/adapters/registry.js`, and one source failing or being unreachable never affects the others (see `registry.test.js`). Status values are always one of FYP2.md §39's real vocabulary (`CONNECTED`/`NOT_CONFIGURED`/`AUTH_REQUIRED`/`RATE_LIMITED`/`ERROR`/`DISABLED`) — no source in this project has ever returned a fabricated `CONNECTED`.

**Current status as of this writing:** no external social platform credentials exist anywhere in this project (confirmed in `.env`, `.env.example`, and as Supabase secrets). Sales Data and Shopee are backed by our own database and can be genuinely `CONNECTED`; TikTok, X, and Threads correctly report `NOT_CONFIGURED` or `AUTH_REQUIRED` (see each entry below).

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
| **Source** | X (Twitter) API v2 |
| **Purpose** | Same as TikTok — mentions/engagement for analysis |
| **Authentication** | OAuth 2.0 — **not implemented or tested in this project** |
| **Environment Variables** | `X_API_KEY`, `X_API_SECRET` — Supabase Edge Function secrets only, never `VITE_*` |
| **Data Retrieved** | Not yet implemented |
| **Rate Limit / Access Constraints** | X API access tiers and rate limits vary; unconfirmed until an app is registered |
| **Current Status** | `NOT_CONFIGURED` or `AUTH_REQUIRED` (same meaning as TikTok, above) |
| **Fallback** | Same as TikTok — CSV upload or fixture sample |

**Adapter:** `src/adapters/xAdapter.js`

---

## Threads API

| | |
|---|---|
| **Source** | Threads API (Meta) |
| **Purpose** | Same as TikTok/X |
| **Authentication** | OAuth 2.0 — **not implemented or tested in this project** |
| **Environment Variables** | `THREADS_CLIENT_ID`, `THREADS_CLIENT_SECRET` — Supabase Edge Function secrets only, never `VITE_*` |
| **Data Retrieved** | Not yet implemented |
| **Rate Limit / Access Constraints** | Unconfirmed until an app is registered |
| **Current Status** | `NOT_CONFIGURED` or `AUTH_REQUIRED` |
| **Fallback** | Same as TikTok/X |

**Adapter:** `src/adapters/threadsAdapter.js`

---

## Known limitation — why TikTok/X/Threads stop at status-checking

This phase deliberately does **not** include live API-calling code for TikTok, X, or Threads. Two reasons:

1. **No credentials exist to test against.** Writing "best-effort" OAuth/fetch code with zero ability to run it against a real endpoint risks shipping something that looks complete but is silently wrong — the opposite of this project's "never claim a feature works without running it" rule.
2. **What's actually needed once credentials exist** is a real OAuth token exchange and API client for each platform — meaningfully more work than a status check, and worth doing as its own scoped phase once real developer access is obtained.

What *is* real and working today: the modular adapter architecture, honest status computation (including the server-side secret-presence check via `source-status`), and failure isolation — so adding a real integration later is a matter of filling in `sync()` for one adapter, not rebuilding the framework.
