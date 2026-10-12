# Real Data Everywhere — Phase 10 (FYP2.md §40, §61, §62, §65)

## What changed

Five pages (`Dashboard`, `SentimentAnalysis`, `SocialIntelligence`, `Reports`,
`SettingsPage`) plus `Navbar`/`Sidebar` were rendering fully hardcoded mock
data with no fetch, no error handling, and no empty state. All five mock
files (`src/data/{dashboardData,sentimentData,socialData,reportsData,settingsData}.js`)
are deleted. Every widget now reads real Supabase data, reuses an
already-built real service from an earlier phase, or — where no real
capability exists anywhere in this project — shows an honest "Unavailable"
state instead of a fabricated number (FYP2.md §65's own example: *"TikTok
data is currently unavailable"*).

## Architectural decision: trimmed `supabase/migrations/0001_init.sql`

That migration (never deployed) defined 20+ tables mirroring the *mock
data's* shape — unpopulated shells nothing in the app ever wrote to, plus a
second, conflicting `recommendations` table and duplicate concepts of
`forecast_series`/`crisis_status`/`api_connections` that Phases 5-9 already
solved with better-designed, already-populated tables. Since it was never
deployed, it was trimmed directly rather than superseded by a new
migration. **Kept** (genuinely needed, nothing else covers them):
`profiles`, `companies`, `user_preferences`, `api_keys`, `report_templates`,
`storage_usage`. **Removed** (13 tables): superseded by `processed_data`/
`daily_aggregates` (Phase 4) computed live via `src/utils/socialAnalytics.js`,
`crisis_events` (Phase 8), `forecast_results` (Phase 7), the real
`recommendations` shape (Phase 9), and `src/adapters/registry.js` (Phase 5).
Full reasoning is in the migration file's own header comment.

## Shared Loading/Success/Empty/Error/Unavailable pattern (§65)

New `src/hooks/useAsyncData.js` (the state machine) + `src/components/common/AsyncSection.jsx`
(the renderer) — applied across all 5 pages. A loader throwing
`DataUnavailableError` (from the hook module) renders as `unavailable`
rather than `error`; anywhere no real capability exists at all (emotion
analysis, region sentiment, influencer tracking, storage quota, API key
display, 2FA, on-demand backups), the page states that plainly with a
one-line reason, never a blank space or a silent no-op button.

## New pure, tested computation

`src/utils/socialAnalytics.js` — sentiment scores/trend, platform
comparison, mention-volume series, trending hashtags (a real gap fixed:
`featureEngineering.js`'s `computeTextFeatures` was capturing a hashtag
*count* but discarding the tag strings themselves — now both are kept),
language breakdown, top posts. `src/utils/executiveSummary.js` — the
Dashboard/Reports executive summary, composed deterministically from real
sentiment/crisis/forecast values (no Gemini call — plain sentence assembly
from numbers that already exist). `src/utils/csvExport.js` — real
client-side CSV download, replacing a "Exporting as PDF..." toast that did
nothing. All three ship with real unit tests.

## Before / After

| Widget / Value | Before (Phase ≤9) | After (Phase 10) |
|---|---|---|
| **Dashboard** — Executive Summary | Static string per mode (`dashboardData.js`) | Composed live from real sentiment %, crisis risk, forecast — `executiveSummary.js` |
| Dashboard — Overall Sentiment KPI | Hardcoded `74.2%`, `+6.3%` | `computeSentimentScores()` from real `daily_aggregates` |
| Dashboard — Crisis Risk KPI | Hardcoded `18%`, `-4.1%` | `crisisService.runCrisisDetection()` (Phase 8, reused) |
| Dashboard — Revenue Forecast KPI | Hardcoded `RM 67,500`, `+12.4%` | `forecastResultsService.getLatestForecastRun()`'s best row (Phase 7, reused) |
| Dashboard — Business Health / Market Opportunity KPIs | Hardcoded `82/100`, `61/100` | **Removed** — no real analytical definition exists anywhere for these two composite scores; not faked, just dropped |
| Dashboard — Sentiment Trend (14d), Platform Distribution, Daily Mention Volume | Static arrays | Derived live from `processed_data`/`daily_aggregates` |
| Dashboard — Trending Keywords | Static list | Real hashtags from `processed_data.features.hashtags` |
| Dashboard — Recent Alerts | 3 hardcoded alert objects | Real `crisis.triggeredSignals` with measurable evidence |
| Dashboard — Latest AI Recommendations | 3 hardcoded recs with fake impact % | `recommendationService.getRecommendations()` (Phase 9, reused) |
| **Sentiment Analysis** — 3 score cards, 7-day trend | Static (`58.4%`, `26.1%`, `15.5%`, etc.) | Real, from `daily_aggregates` |
| Sentiment Analysis — Emotion Analysis | 6 fake emotion percentages | **Unavailable** — no emotion classifier exists (only 3-class sentiment) |
| Sentiment Analysis — Region Breakdown | 7 fake Malaysian states with scores | **Unavailable** — no location field is ever captured during ingestion |
| Sentiment Analysis — Most Influential Posts | 7 hardcoded posts | Real `processed_data` rows, ranked by real engagement |
| Sentiment Analysis — Export button | Toast only, no file | Real CSV download |
| **Social Intelligence** — Platform Comparison table | Hardcoded TikTok/X rows incl. a fabricated "virality" score | Real mention volume/engagement/sentiment/language; virality column dropped (no formula for it exists anywhere) |
| Social Intelligence — 7-day mention volume, Trending Hashtags, Top Posts | Static | Real, same computation as Dashboard |
| Social Intelligence — Top Influencers | 5 hardcoded handles/follower counts | **Unavailable** — author identity is deliberately anonymized; no follower count is captured |
| **Reports** — Executive summary preview | One hardcoded paragraph with fake numbers | Same real composition as Dashboard's |
| Reports — Report templates' "Last Generated" | Hardcoded fixed dates | Real, updated in `report_templates` when the user clicks Generate |
| Reports — Export (PDF/Excel/PowerPoint) | Toast claiming export started; nothing happened | CSV: real download. PDF/Excel/PowerPoint: honestly marked Unavailable (no library/mechanism exists) instead of a fake toast |
| **Settings** — Profile (name/email/role/phone) | Hardcoded "Admin User" etc., fake save toast | Real `profiles` row, real save via `profileService.js` |
| Settings — Company | Hardcoded defaults, fake save toast | Real `companies` row |
| Settings — Notifications | Hardcoded toggle states, no persistence | Real `user_preferences.notifications`, persisted |
| Settings — Language | Local-only `useState`, never saved | Real `user_preferences.language` |
| Settings — Theme | (Already real — `useTheme()`) | Unchanged |
| Settings — API Keys | 3 fake masked keys, fake `Math.random()` "Regenerate" | **Unavailable** — TikTok/X/Threads/Gemini credentials are Edge Function secrets, never exposed to any frontend, by design since Phase 5/6/9 |
| Settings — Security: password | Fake "Password updated." toast, no real change | Real `supabase.auth.updateUser()` call |
| Settings — Security: 2FA | Fake toggle | **Unavailable** — no MFA enrollment flow is implemented |
| Settings — Model Config: "Sentiment Model: XLM-RoBERTa v2.1" dropdown | Implied a deployed, selectable model that doesn't exist | Replaced with the real status line: no trained model is deployed yet (`rating_heuristic_v1` only) |
| Settings — Model Config: Crisis Sensitivity / Confidence Threshold | Fake local state | Real saved preference (`user_preferences.model_config`) — explicitly labeled "not yet applied to live thresholds," since it genuinely isn't wired into `crisisDetection.js` yet |
| Settings — Database: Connection String | Fabricated connection string shown in the UI | **Removed entirely** — a per-user "connection string" doesn't exist in this RLS-based single-project architecture; showing one would have been both fake and a bad security pattern |
| Settings — Database: Backup Frequency | Fake local state | Real saved preference |
| Settings — Database: "Run Backup Now" | Fake `setTimeout` "Backup completed" | **Unavailable** — on-demand backup is a Supabase project-admin operation the client can't trigger |
| **Dataset Management** — Storage Usage (GB used/total) | Hardcoded `34.2 GB of 100 GB` | **Unavailable** — storage quota is Supabase project infrastructure, not queryable by this app's client credentials |
| Dataset Management — Language detection breakdown | Hardcoded 3-language split | Real, computed from every ingested row's `processed_data.language` |
| **Navbar / Sidebar** — user name/initials | Hardcoded "Admin User" / "AU" | Real `profiles.full_name`, real initials |
| Navbar — notification unread dot | Always rendered "on" | **Removed** — no notification-feed table/service exists yet; claiming unread items was itself a fake value |

## Known limitations (stated honestly)

- Nothing here has been run against real authenticated data — the standing
  Supabase auth blocker (unchanged since Stage A) still prevents live
  verification. Every widget's logic is verified via unit tests
  (`socialAnalytics.test.js`, `executiveSummary.test.js`, `csvExport.test.js`,
  `formatters.test.js`) and by confirming the build/lint/existing suite
  stay green, not by an authenticated screenshot.
- The trimmed `0001_init.sql`, plus every other pending migration
  (0002-0007), still requires manual deployment — same pattern as every
  phase since Phase 3.
- Report templates all currently render the same real executive-summary
  text as their "preview" — there is no distinct per-template report-body
  generator yet. Building one (optionally Gemini-narrated from the same
  real structured facts, mirroring the recommendation engine's Layer 1 +
  Layer 2 pattern) is a reasonable future phase, not done here.
- "Crisis Sensitivity" / "Confidence Threshold" in Settings save a real
  preference but are not yet wired into `crisisDetection.js`'s actual
  threshold evaluation — stated in the UI itself, not hidden.
- `report_templates` is repurposed from its original schema intent (a
  per-user custom template store) into a last-generated-timestamp tracker
  for a fixed, static list of report types (`src/config/reportTemplates.js`).
  A true user-defined-template feature is out of scope here.
