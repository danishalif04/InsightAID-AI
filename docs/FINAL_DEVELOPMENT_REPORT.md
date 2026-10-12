# InsightAid AI — Final Development Report (FYP2.md §88)

**Muhammad Danish Alif Bin Azrul (22006390) · Universiti Teknologi PETRONAS**

This report covers the full FYP2 implementation cycle: Phase 0 (audit)
through Phase 13 (this phase). It is written to the same standard as every
phase before it — nothing here is asserted without either a file/test to
point to or an explicit statement that it is unverified.

---

## A. Changes

Starting point: a React/Vite frontend with 9 UI-complete pages, all backed
by hardcoded mock data, plus a working Supabase Auth integration and a
broken env-handling bug that crashed the app when `.env` was absent.

What changed, in order:

1. **Architecture repair** — fixed the env-handling crash, broken imports,
   and routing issues found by the initial audit (`docs/INSIGHTAID_AUDIT.md`).
2. **Unified mode switch** — one app, two business contexts (Business
   Startup / E-Commerce), persisted, reusing existing pages.
3. **Onboarding + business profiling** — "I have data" vs. "I don't have
   data yet," Gemini extraction (server-side only) with a manual-form
   fallback, provenance-tagged fields, a completeness indicator.
4. **Scenario engine + data readiness** — deterministic conservative/
   expected/growth projections from user assumptions, break-even math, a
   1-5 data-readiness scale, downloadable CSV templates.
5. **Data ingestion pipeline** — CSV/JSON upload with a validation report,
   language-aware text preprocessing, rating-based weak sentiment labels,
   daily aggregation, all flowing through one real pipeline (no
   decorative/fake path).
6. **Modular source adapters** — Sales Data and Shopee (dataset mode) as
   real, database-backed sources; TikTok/X/Threads as honest
   `NOT_CONFIGURED` stubs (no live credentials exist) with total failure
   isolation between sources.
7. **Sentiment model training pipeline** (`ml/sentiment/`) — XLM-R (primary),
   mBERT and TF-IDF+LogisticRegression (comparison/baseline), two
   evaluation paths, offline (Colab-ready), fully scaffolded and tested but
   never run against real data (none exists yet).
8. **Forecasting pipeline** (`ml/forecasting/`) — moving-average and ARIMA
   baselines, Prophet (sales-only + sentiment-enhanced), XGBoost, a
   conditional LSTM gate, rolling-origin evaluation, offline, same
   never-run-on-real-data status.
9. **Crisis detection** — 7-signal rule engine, fully live (no offline
   training needed), computed from real ingested data.
10. **Recommendation engine** — two-layer (rule engine decides, Gemini only
    explains), business-context factors per FYP2.md §56.
11. **Real data everywhere** — replaced every remaining hardcoded
    production value across Dashboard/Sentiment/Social/Reports/Settings/
    Navbar/Sidebar with real Supabase data or an honest "Unavailable"
    state; trimmed a stale, superseded migration.
12. **Report generation** — 6 report types, PDF/CSV export, ACTUAL vs.
    SCENARIO data structurally separated, Gemini-narrated but
    numbers-locked.
13. **This phase** — a Model Performance page, a real Playwright E2E
    suite, honest performance measurement, Vercel deployment prep, and
    this report.

## B. Preserved Components

- The original visual identity/design system (Tailwind v4 tokens, the
  Figma-derived color palette, component library in `src/components/ui/`)
  — never redesigned, per FYP2.md §64's "do not redesign unnecessarily."
- Sidebar order and Lucide icons for every pre-existing nav item — new
  items (Model Performance) were appended, never inserted to reorder.
- Supabase Auth (sign up/sign in/sign out) — unchanged in mechanism since
  Phase 1's crash fix, only made resilient to a missing `.env`.
- The 9 original page shells and their route URLs — every page still
  exists at its original path; none were removed or merged.

## C. Final Architecture

```
React 19 + Vite 8 + Tailwind v4 (frontend, deployed to Vercel as a static SPA)
  |
  +-- Supabase Postgres (RLS-scoped per-user tables) + Supabase Auth
  |
  +-- Supabase Edge Functions (Deno) — the only server-side code that exists:
  |     extract-business-profile, source-status,
  |     explain-recommendations, explain-report
  |     (each calls Gemini for narrative/extraction only — see §E/§H)
  |
  +-- ml/sentiment/, ml/forecasting/ — offline, run outside the deployed
        app entirely (Colab/local), results uploaded manually
```

No custom backend server exists or is needed — every "backend" concern is
either Supabase (database/auth/RLS) or a Supabase Edge Function. Dead
leftover infrastructure from an earlier planned architecture (an
axios-based REST client pointed at a Flask API that was never built) was
found and removed this phase.

Pure computation lives in `src/utils/*.js` (over 20 modules, each unit
tested); Supabase access lives in `src/services/*.js`; pages compose the
two via a shared `useAsyncData`/`AsyncSection` Loading/Success/Empty/Error/
Unavailable pattern (Phase 10).

## D. Data Sources

| Source | Status | Data Type | Fallback |
|---|---|---|---|
| Sales Data (`raw_data`/`processed_data`) | `CONNECTED` once uploaded, else `NOT_CONFIGURED` | Real, user-uploaded | Upload via Dataset Management |
| Shopee (dataset mode) | Same as above | Real, user-uploaded (never scraped/live) | Upload via Dataset Management |
| TikTok API | `NOT_CONFIGURED` (no credentials exist) | N/A | CSV upload via the Social template |
| X API | `NOT_CONFIGURED` | N/A | CSV upload |
| Threads API | `NOT_CONFIGURED` | N/A | CSV upload |
| Gemini (extraction/narrative) | Real when `GEMINI_API_KEY` is set; `NOT_CONFIGURED` (503) otherwise | Narrative text / structured extraction only, never numbers | Manual form (extraction) / rule-only output (narrative) |

Full detail, including exact env var names and the §83-format writeup, is
in `docs/API_INTEGRATION.md`.

## E. ML

| | Sentiment (`ml/sentiment/`) | Forecasting (`ml/forecasting/`) |
|---|---|---|
| Model | XLM-RoBERTa (primary), mBERT, TF-IDF+LogReg | Moving average, ARIMA, Prophet (×2 variants), XGBoost, conditional LSTM |
| Dataset | None yet — no export path from `processed_data` to a training CSV exists in the app yet | Same — no export path exists yet |
| Training | Offline, Colab-ready notebook, never run on Vercel | Offline, Colab-ready notebook, never run on Vercel |
| Evaluation | Real code (accuracy/precision/recall/F1/confusion matrix/per-language), verified by 36 passing unit tests against synthetic data | Real code (MAE/RMSE/MAPE via rolling-origin backtesting), verified by 52 passing unit tests including live ARIMA/Prophet/XGBoost fits |
| Version | Never trained — `model_versions` table is empty | Never trained — `forecast_results` is empty per-user until a real run happens |

**No trained sentiment model exists.** Text sentiment in the live app
comes exclusively from `rating_heuristic_v1` (a documented rating→sentiment
mapping, applied only where a star rating exists) — never presented as a
real model result. Full detail: `docs/SENTIMENT_MODEL.md`,
`docs/FORECASTING_MODEL.md`.

## F. Forecasting — Baseline vs. Sentiment-Enhanced

Architecture is real and complete (`src/services/forecastResultsService.js`,
the Forecasting page's model-comparison table, `src/utils/modelPerformance.js`'s
`summarizeForecastComparison()` on the new Model Performance page). **No
results exist to report** — `forecast_results` is empty for every user
until someone runs `ml/forecasting/notebooks/train_forecasting.ipynb`
against a real sales export. The Model Performance page states this as
"Not yet evaluated," not a placeholder number.

## G. Crisis Detection — Methodology

Fully rule-based, computed live (no ML, no offline training — this is the
one analytical feature that runs entirely client/service-side against
already-ingested data). Seven non-overlapping signals: negative-ratio
level, negative-ratio velocity (7-day baseline drift), mention-volume
level, mention-volume velocity (single-day jump), rating deterioration,
and two z-score anomaly checks (sentiment, review volume) that catch
statistically unusual days a fixed threshold would miss. `risk_score`
sums per-signal severity points, capped at 100; `risk_level` is Normal/
Warning/Critical per FYP2.md §52's own 3-level scheme. Every threshold
lives in one file (`src/config/crisisThresholds.js`). Full detail,
including two real bugs found and fixed by the test suite, is in
`docs/CRISIS_AND_RECOMMENDATIONS.md`.

## H. Recommendation — Rules + Gemini Architecture

**Layer 1** (`src/utils/recommendationRules.js`, pure, zero Gemini/network
calls): 8 rules firing from real conditions — crisis signals (reusing the
exact same detection as §G), break-even math (reusing the Phase 3 scenario
engine), data readiness, growth-target shortfall. **Layer 2**
(`explain-recommendations` Edge Function): Gemini is asked for exactly two
string fields per recommendation (`rationale`, `context`); a strict
whitelist validator drops any other key, so there is no code path by which
Gemini can alter a priority or invent a number (FYP2.md §55). If Gemini is
unreachable, Layer 1's output renders unchanged — verified by the
recommendation service's fallback path, not just asserted.

## I. Business Planning

- **No-data workflow**: Onboarding offers "I have data" vs. "I don't have
  data yet" up front; the latter routes to a free-text business
  description, optional Gemini extraction (manual form always available as
  a fallback), then straight into scenario planning — no dead end.
- **Business profile**: `business_profiles`/`business_assumptions`
  (Phase 3), every field provenance-tagged `user_provided`/`ai_extracted`/
  `default_assumption` — reused later by the report generator's ACTUAL/
  SCENARIO split (§J) and the recommendation engine's business-context
  factors.
- **Assumptions**: editable at any time via `BusinessPlanningPanel`, with
  "Recalculate" re-running the scenario engine live, client-side.
- **Scenario engine** (`src/utils/scenarioEngine.js`): pure, deterministic,
  conservative/expected/growth cases plus break-even units/revenue — every
  formula shown, no case labeled "best."
- **Data readiness** (`src/utils/dataReadiness.js`): 1-5 scale from real
  counts (profile completeness, sales/reviews/social record counts,
  months of history) — reused by the recommendation engine, the report
  generator, and the Business Planning Report.
- **Transition to real analytics**: once real sales/review/social data
  exists, Dashboard/Sentiment/Social/Crisis/Forecast pages compute live
  from it automatically — there is no separate "graduation" step or manual
  mode flip; `dataAvailabilityPath === 'no_data'` simply stops being true
  once a profile is re-saved with real data present, and the app the
  begins rendering scenario-free.

## J. Reporting

Six types (FYP2.md §70): Business Health, E-Commerce Analytics, Sentiment,
Forecast, Crisis, Business Planning. Every report opens with an Executive
Summary and closes with a populated Assumptions and Limitations section;
every data point is one of ACTUAL or SCENARIO/ESTIMATED, never ambiguous
(enforced by data structure, not just a visual label). **Exports**: PDF
(real, `jspdf`+`jspdf-autotable`, one click, verified by generating real
PDF bytes in a test) first, then CSV (also satisfies §70's third priority,
"Excel-compatible data," since CSV opens directly in Excel). PowerPoint:
not implemented (§70 permits deferring it). Full detail:
`docs/REPORT_GENERATION.md`.

## K. Testing

```
Lint            npm run lint             → clean (0 errors) as of this phase
Build           npm run build             → succeeds as of this phase
Unit Tests      npm run test (Vitest)     → 177 passed, 20 files
                ml/sentiment: pytest      → 36 passed (separate Python suite)
                ml/forecasting: pytest    → 52 passed (separate Python suite)
Integration     covered indirectly — e.g. reportBuilders.test.js exercises
                the full ingestion->crisis->forecast->recommendation->report
                chain against a synthetic context; no dedicated integration
                harness beyond that exists
E2E (Playwright) 4 passed, 2 skipped (see below) — this phase
```

**E2E detail** (`e2e/`, FYP2.md §75): `api-failure-states.spec.js` (4
tests) runs with no credentials and **actually passes** against the live
dev server — wrong-password login, a network-level auth failure, signup's
real outcome, and the protected-route redirect, all confirmed to render a
real error state, never a blank screen or uncaught exception. The two
full user journeys (`journey-existing-data.spec.js`, `journey-no-data.spec.js`)
are written completely and correctly per FYP2.md §75's exact step
sequences, but **both `test.skip()` honestly** — `RequireAuth` has no test
bypass (adding one would be a real security hole), and this project's test
account is still stuck on Supabase's "email not confirmed" state,
re-confirmed this phase by a fresh signup attempt. See `e2e/README.md`.

## L. Deployment

```
Local        npm run dev (Vite dev server, HMR)
Production   npm run build && npm run preview (minified dist/, verified — median
             541ms page load / 20ms DOMContentLoaded / 40ms first contentful
             paint for the public /login shell, measured this phase; see §M
             for why this isn't the authenticated Dashboard's number)
Vercel       Static SPA deploy. vercel.json (new) configures SPA rewrites.
             Never deployed in this environment — no Vercel account access
             exists here. Full checklist: docs/DEPLOYMENT.md
Environment  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY only, on Vercel.
Variables    Service-role key and GEMINI_API_KEY are never Vercel variables —
             confirmed by grep, zero references in src/. Full table:
             docs/DEPLOYMENT.md
```

## M. Remaining Limitations

Stated plainly, grouped by cause, per §88's explicit instruction not to
hide incomplete functionality:

**API access** — TikTok/X/Threads have no real credentials anywhere;
correctly reported as `NOT_CONFIGURED`, never faked. Gemini has never been
called against a live API key in this development environment (no key
available to me) — every Gemini-calling Edge Function's validation/
fallback logic is real and tested, but the actual round-trip is unverified.

**Permissions** — I have no Supabase CLI or service-role access in this
environment. Every migration (0001-0007), every Edge Function, and the
rewritten `seed.sql` are written and ready but **none have been confirmed
deployed to the live project**. This has been true since Phase 3 and
remains true today.

**Datasets** — No real sales/review/social data has ever been uploaded to
the live project (the standing auth blocker below prevents reaching the
authenticated upload flow to check). Every "no data yet" honest state
throughout the app (Dashboard KPIs, Sentiment scores, Crisis "limited
data," both ML training pipelines) reflects this same underlying fact.

**Infrastructure** — The Supabase test account (`admin@insightaid.ai`) has
been stuck on "email not confirmed" since early in this project and
remains so as of this phase (re-verified via a fresh signup attempt, which
hit a real rate-limit error instead — itself now a passing E2E regression
test). This is the single blocker behind: no live authenticated
screenshot/walkthrough of any phase's work, both Playwright journeys
skipping, and the Dashboard's true (data-fetch-inclusive) response time
being unmeasured — the closest honest substitute measured this phase is
the public `/login` shell's load time, ~541ms median locally, which does
**not** include the several parallel Supabase queries an authenticated
Dashboard load actually performs. This is entirely within the user's
control to resolve (a Supabase dashboard setting or SMTP configuration
issue), not something further engineering effort here can fix.

**ML limitations** — No sentiment model has been trained (no data + no
export path from the app's tables to a training CSV yet). No forecasting
model has been trained for the same reason. The LSTM gate in
`ml/forecasting/` has never returned `True` against real data (needs 730+
daily observations, which nothing in this project has). Both pipelines are
real, tested infrastructure with zero real results — stated as such
everywhere they're surfaced (Model Performance page, both ML READMEs,
`docs/SENTIMENT_MODEL.md`, `docs/FORECASTING_MODEL.md`).

**Unavailable integrations / features, by design, not oversight** —
emotion-breakdown sentiment (no classifier beyond 3-class exists),
region/geo sentiment (no location capture), influencer/follower tracking
(deliberately anonymized author hashes), Settings' 2FA and API-key
regeneration, on-demand Supabase backups from the client, PDF/Excel/
PowerPoint export beyond what's built (PDF and CSV are real; PowerPoint
was explicitly deferred per §70), and per-report-type distinct narrative
generation (all 6 report types currently share one executive-summary
composer). Every one of these renders an explicit "Unavailable" state in
the UI rather than a blank space or a fabricated value.

**Bundle size** — Adding `jspdf`/`jspdf-autotable` for real PDF export
pulled in unused `html2canvas`/`dompurify` transitive dependencies, growing
the (route-isolated, lazy-loaded) Reports chunk to ~145 kB gzipped. A real,
measured tradeoff of choosing genuine one-click PDF download.
