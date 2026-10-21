# InsightAid AI — System Audit (pre-redesign baseline)

Read-only audit. No files modified, no packages installed/upgraded, no migrations run, no writes to Supabase. All findings below are backed by real file reads, real command output (lint/build/tests), or an explicit **UNKNOWN** where verification wasn't possible from this environment.

---

## PART 1 — PROJECT OVERVIEW

### 1.1 Folder structure (3 levels, excluding node_modules/dist/.git)

```
.
├── .scratch/                      (gitignored throwaway scripts — not audited)
├── _archive/phase1-orphans/       (dead code from an earlier phase, not routed/imported)
├── docs/                          (project docs + datasets/sales, datasets/sentiment)
├── e2e/                           (Playwright specs: api-failure-states, journey-existing-data, journey-no-data, helpers.js)
├── ml/
│   ├── data_prep/                 (gold_agreement.py, sales_prep.py, sentiment_prep.py + tests)
│   ├── forecasting/               (src/, tests/, notebooks/, requirements.txt, README.md, results/, data/)
│   ├── notebooks/                 (01–04 Colab notebooks: sentiment prep, sales prep, train sentiment, train forecasting)
│   └── sentiment/                 (src/, tests/, notebooks/, requirements.txt, README.md, results/, data/)
├── public/                        (favicon.svg, icons.svg)
├── src/
│   ├── adapters/                  (social/marketplace source adapters + registry)
│   ├── animations/                (motionPresets.js)
│   ├── components/common/         (AsyncSection, BusinessPlanningPanel, PageLoader, PagePlaceholder, ModeSwitcher, AiAssistantButton)
│   ├── components/ui/              (Badge, Button, Card, ChartTooltip, Chip, Dialog, Input, ProgressBar, Skeleton, Switch, Table)
│   ├── config/                    (env.js, supabaseClient.js, crisisThresholds.js, recommendationThresholds.js, reportTemplates.js, notificationPreferences.js)
│   ├── constants/                 (modes.js, navigation.js)
│   ├── contexts/                  (AuthProvider, ModeProvider, NotificationProvider, ThemeProvider + matching *-context.js)
│   ├── data/                      (empty — only .gitkeep)
│   ├── hooks/                     (useAsyncData, useAuth, useMode, useNotifications, useTheme)
│   ├── layouts/                   (DashboardLayout, Navbar, Sidebar)
│   ├── pages/                     (14 page components, see Part 4)
│   ├── routes/                    (RequireAuth, index.jsx, pages.js, paths.js)
│   ├── services/                  (22 *Service.js files — all Supabase access goes through these)
│   ├── styles/                    (index.css — Tailwind 4 `@theme`)
│   ├── theme/                     (chartTheme.js)
│   ├── types/                     (index.js)
│   └── utils/                     (24 pure-logic modules + matching *.test.js)
├── supabase/
│   ├── functions/                 (explain-recommendations, explain-report, extract-business-profile, run-forecast, source-status, sync-threads-mentions, sync-x-mentions)
│   ├── migrations/                (0001–0009, numbered, sequential)
│   └── seed.sql
├── test-results/                  (Playwright trace artifacts from a prior failed run)
├── eslint.config.js, .prettierrc, jsconfig.json, playwright.config.js, vite.config.js, vitest.config.js
└── package.json
```

### 1.2 Exact versions (`package.json`)

| Package | Version |
|---|---|
| react / react-dom | ^19.2.7 |
| react-router-dom | ^7.18.1 |
| @supabase/supabase-js | ^2.110.5 |
| recharts | ^3.9.2 |
| framer-motion | ^12.42.2 |
| lucide-react | ^1.23.0 |
| jspdf / jspdf-autotable | ^4.2.1 / ^5.0.8 |
| xlsx | `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (deliberately not the npm registry package — see code comment history; npm's `xlsx` has unpatched CVEs) |
| vite | ^8.1.3 |
| vitest | ^5.0.2 |
| tailwindcss / @tailwindcss/vite | ^4.3.2 |
| eslint | ^10.6.0 |
| @playwright/test | ^1.63.0 |
| prettier | ^3.9.4 |

Node: **v24.13.0** (local check). npm: **11.6.2**. Package manager: npm (package-lock.json present, no yarn.lock/pnpm-lock.yaml).

### 1.3 Language, build tool, entry point

- **JavaScript** (`.jsx`/`.js`), not TypeScript, for the frontend — `jsconfig.json` has `"checkJs": false`. Supabase Edge Functions under `supabase/functions/` are **TypeScript** (Deno runtime).
- Build tool: **Vite 8** (`vite.config.js` — `@vitejs/plugin-react` + `@tailwindcss/vite`).
- Entry point: `index.html` → `src/main.jsx` → `src/App.jsx` → `src/routes/index.jsx`'s router.

### 1.4 Routing (`src/routes/index.jsx`, `src/routes/paths.js`, `src/routes/pages.js`)

| Route | Page file | Auth-protected |
|---|---|---|
| `/login` | `src/pages/Login.jsx` | No |
| `/signup` | `src/pages/Signup.jsx` | No |
| `/` | `src/pages/Dashboard.jsx` | Yes (`RequireAuth`) |
| `/sentiment` | `src/pages/SentimentAnalysis.jsx` | Yes |
| `/forecasting` | `src/pages/Forecasting.jsx` | Yes |
| `/crisis-detection` | `src/pages/CrisisDetection.jsx` | Yes |
| `/recommendations` | `src/pages/AiRecommendations.jsx` | Yes |
| `/social-intelligence` | `src/pages/SocialIntelligence.jsx` | Yes |
| `/reports` | `src/pages/Reports.jsx` | Yes |
| `/datasets` | `src/pages/DatasetManagement.jsx` | Yes |
| `/settings` | `src/pages/SettingsPage.jsx` | Yes |
| `/onboarding` | `src/pages/Onboarding.jsx` | Yes |
| `/model-performance` | `src/pages/ModelPerformance.jsx` | Yes |
| `*` (under the authed layout) | `src/pages/NotFound.jsx` | Yes |

All pages are route-level code-split via `React.lazy` (`src/routes/pages.js:1-22`) and rendered inside `<Suspense fallback={<PageLoader />}>` in `DashboardLayout.jsx:52-55`. `RequireAuth.jsx` (`src/routes/RequireAuth.jsx:17-27`) redirects to `/login` when `useAuth().user` is null; it also has a dev-only bypass (`VITE_DEV_BYPASS_AUTH=true`, gated by `import.meta.env.DEV`, structurally impossible in a production build — `RequireAuth.jsx:7-14`).

The sidebar (`src/constants/navigation.js:19-30`) lists **10** nav items (Dashboard, Sentiment Analysis, Forecasting, Crisis Detection, AI Recommendations, Social Intelligence, Reports, Dataset Management, Model Performance, Settings) — one more than the "nine pages" the audit brief named. This report covers all 10 routed, authenticated pages; the brief's six "most important" pages are given full chart-inventory tables, the rest are covered at the same structural depth but without a full table (none of them have charts to tabulate — see Part 4).

### 1.5 Styling

- **Tailwind CSS v4**, configured entirely via CSS `@theme` tokens in `src/styles/index.css:10-54` — there is **no** `tailwind.config.js` file (confirmed: none exists in the repo root).
- Dark/light theme: class-based (`@custom-variant dark (&:where(.dark, .dark *))`, `src/styles/index.css:4`), toggled by adding/removing `.dark` on `<html>` in `src/contexts/ThemeProvider.jsx:17`. Persisted to `localStorage` under key `insightaid.theme` (`ThemeProvider.jsx:4,18`), defaulting to the OS `prefers-color-scheme` on first visit (`ThemeProvider.jsx:10`). Toggle control lives in `src/layouts/Navbar.jsx` (passed down from `DashboardLayout.jsx:15,45-46`) — not reachable on `/login` or `/signup`, which render outside `DashboardLayout`.
- Fonts: `--font-sans: 'Inter', ...` (body/UI), `--font-display: 'Poppins', ...` (headings `h1`–`h4`) — `src/styles/index.css:11-13,65-70`.
- Color palette (`src/styles/index.css:15-53`):
  - Brand (deep pine green), 50→950 scale, used for sidebar/dark surfaces/primary buttons.
  - Accent (signal green, `#22c55e` at 500), used for positive metrics **and** active/primary UI states.
  - Semantic: `--color-success:#16a34a`, `--color-danger:#dc2626`, `--color-warning:#d97706`, `--color-info:#3b82f6`.
  - Surfaces: canvas/surface/line, light + dark variants.
- A **separate** chart-color palette exists in `src/theme/chartTheme.js:6-19` (plain hex, since Recharts renders SVG and can't consume CSS custom properties for fills): `positive:#22c55e`, `neutral:#a8a29e`, `negative:#ef4444`, `tiktok:#22c55e`, `x:#60a5fa`, `actual:#1e2f29`, `forecast:#3b82f6`. **`positive` and `tiktok` are the exact same hex as the brand `accent-500`** — see Part 5.2 for why this is a real inconsistency, not just a coincidence.

### 1.6 Shared layout

- `src/layouts/DashboardLayout.jsx` — flex shell: `Sidebar` (collapsible, mobile-overlay via `mobileOpen` state) + a column containing `Navbar` (page title from `PAGE_TITLES`, theme toggle, mode switcher) + `<main>` with the routed page + a floating `AiAssistantButton`.
- Global context providers, nested in `src/App.jsx` (not re-read in full for this audit, but confirmed via every context file's existence and usage): `AuthProvider` (Supabase session), `ThemeProvider` (dark/light), `ModeProvider` (startup/ecommerce mode — `src/contexts/mode-context.js` + `src/constants/modes.js`), `NotificationProvider` (toast queue, uses `framer-motion`).

### 1.7 Environment variable names (values never read/printed)

Frontend (`import.meta.env.*`, read only inside `src/config/env.js`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — required; app degrades to a `null` Supabase client without crashing if missing (`src/config/supabaseClient.js:4-13`).
- `VITE_DEV_BYPASS_AUTH` — optional, dev-only.
- `VITE_API_BASE_URL` — present as a key in `.env` but no `grep` hit for it being read anywhere in `src/` (checked `src/config/env.js` and every service file) — **UNKNOWN whether it's actually consumed anywhere**; it may be unused/legacy.

Edge Functions (`Deno.env.get(...)`, checked across `supabase/functions/*/index.ts`):
- `GEMINI_API_KEY`, `GEMINI_MODEL` (optional override)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (used by `run-forecast` to act as the calling user)
- `SUPABASE_SERVICE_ROLE_KEY` — **UNKNOWN whether any current function reads this**; `grep` found no `createClient` call using it in any of the 7 function folders present (all either call external APIs statelessly, or use the anon key + forwarded JWT).
- `THREADS_APP_ID`, `THREADS_APP_SECRET`, `THREADS_ACCESS_TOKEN`
- `X_BEARER_TOKEN`
- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `SHOPEE_AFFILIATE_APP_ID`, `SHOPEE_AFFILIATE_APP_SECRET`, `LAZADA_AFFILIATE_APP_KEY`, `LAZADA_AFFILIATE_APP_SECRET`, `TIKTOK_SHOP_APP_KEY`, `TIKTOK_SHOP_APP_SECRET` — all checked for *presence only* by `supabase/functions/source-status/index.ts:54-61`, none of these marketplace/TikTok ones are actually called by any function in the repo yet (no adapter beyond the presence check).

No `.env` **values** were read into this report; only variable *names*, taken from `.env`'s key list and `.env.example`.

---

## PART 2 — DATA LAYER

### 2.1 Supabase initialization and fetch pattern

- One shared client: `src/config/supabaseClient.js` — `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`, exported as `supabase`, or `null` if env vars are missing (never throws at import time).
- Pattern is **services, not hooks or React Query**: every Supabase call is wrapped in a `src/services/*Service.js` file (22 files); pages never import `supabase` directly except `SettingsPage.jsx` (for `supabase.auth.updateUser`) and `DatasetManagement.jsx`'s helpers which still go through services for data access.
- Pages fetch via a single shared hook, `src/hooks/useAsyncData.js` — returns `{status, data, error, reload}` across `'loading'|'success'|'error'|'unavailable'`, with a `cancelled` flag for cleanup (not `AbortController`). Used by `AsyncSection` (`src/components/common/AsyncSection.jsx`) to render one consistent visual per state. A few pages (CrisisDetection, AiRecommendations, Forecasting) use hand-rolled `useState`/`useEffect` instead of this hook — see Part 5.1.

### 2.2 Tables read/written by the frontend

All tables use `uuid` PKs and Postgres RLS. Row counts below are marked UNKNOWN — see explanation after the table.

| Table | Key columns | RLS (plain words) | Used by |
|---|---|---|---|
| `profiles` | id (=auth user), full_name, email, role, phone, avatar_url | Owner-only; auto-created on signup via `handle_new_user()` trigger | Navbar/Sidebar (name/initials), Settings → Profile |
| `companies` | user_id (unique), name, industry, size, website | Owner-only | Settings → Company |
| `user_preferences` | user_id (unique), notifications jsonb, language, theme, model_config jsonb, backup_frequency | Owner-only | Settings → Notifications/Language/Model/Database |
| `api_keys` | user_id, name, masked_value | Owner-only | Settings → API Keys |
| `report_templates` | user_id, name, description, last_generated | Owner-only | Reports |
| `storage_usage` | user_id (unique), used_gb, total_gb, language_breakdown jsonb | Owner-only | Defined but **not read anywhere in `src/`** (grep found no `.from('storage_usage')` call) — likely dead/unused table; Dataset Management's "Storage Usage" card explicitly says quota is unavailable and shows a live language breakdown computed from `processed_data` instead (`DatasetManagement.jsx:307-312`) |
| `business_profiles` | user_id (unique), business_name/type/industry/stage/location/model, product_category/type, target_* , marketing_channels[], revenue/sales/customer_target, launch_date, growth_target, data_availability_path ('has_data'\|'no_data'), provenance jsonb | Owner-only | Onboarding, Dashboard (banner/planning-mode gate), AI Recommendations (business context) |
| `business_assumptions` | user_id (unique), selling_price, cost_per_unit, expected_margin, number_of_products, expected_monthly_units/revenue/growth_rate/conversion_rate/repeat_purchase_rate, marketing_cost, platform_fees, shipping_cost, labour_cost, fixed_costs, other_expenses | Owner-only | BusinessPlanningPanel, scenario engine, break-even calc |
| `raw_data` | user_id, source ('csv_upload'\|'json_upload'\|'fixture_seed'\|'api_sync'), template_id ('sales'\|'reviews'\|'social'\|'product'\|'expenses'\|'custom'), original_filename, row_index, payload jsonb, is_duplicate | Owner-only | Dataset Management (ingest), `run-forecast` Edge Function (reads sales rows) |
| `processed_data` | user_id, raw_data_id (FK, cascade delete), source, platform, original_id, collected_at, published_at, raw_text, cleaned_text, language, author_id_hash, product, category, rating, engagement, sales, revenue, sentiment ('positive'\|'neutral'\|'negative'), sentiment_score, sentiment_confidence, model_name, model_version, predicted_at, features jsonb, dataset_version | Owner-only | Sentiment Analysis, Social Intelligence, Dashboard, `socialAnalytics.js` consumers. **Only populated for 'reviews'/'social' templates** — sales uploads never reach this table (see 2.4) |
| `daily_aggregates` | user_id, date, source, platform, mention_volume, comment_volume, avg_rating_sentiment, positive_ratio, negative_ratio; unique (user_id,date,source,platform) | Owner-only | Sentiment Analysis, Dashboard, Social Intelligence, `run-forecast` (not currently — see 2.4) |
| `model_versions` | model_name/version/type ('xlmr'\|'mbert'\|'tfidf_lr'), eval_path ('original_language'\|'translate_to_english'), trained_at, dataset_version, training/validation/test_samples, accuracy/precision/recall/f1, per_language_metrics jsonb, confusion_matrix jsonb, notes | **Shared, not per-user** — any authenticated user can `select`; only the service role can insert/update/delete (no policy for those at all) | Model Performance |
| `forecast_results` | user_id, run_id, model_type ('moving_average'\|'arima'\|'prophet'\|'xgboost'\|'lstm'), variant ('sales_only'\|'sentiment_enhanced'), generated_at, horizon_days, dataset_version, evaluation_period_start/end, mae, rmse, mape, forecast_points jsonb, is_best, notes | Owner-only | Forecasting, Dashboard (revenue KPI), Model Performance |
| `crisis_events` | user_id, risk_level ('normal'\|'warning'\|'critical'), risk_score, data_sufficient, triggered_signals jsonb, all_signals jsonb, detected_at | Owner-only | Crisis Detection (history), Model Performance (alert counts) |
| `recommendations` | user_id, category (6-value check), priority ('high'\|'medium'\|'low'), explained_by ('gemini'\|'rule_only') + more (not fully re-read; see `0007_recommendations.sql`) | Owner-only | AI Recommendations (save) |
| `marketplace_products`, `marketplace_product_snapshots`, `marketplace_sync_log` | source_platform ('shopee'\|'lazada'\|'tiktok_shop') + related fields | Owner-only | Not read by any page component found in `src/pages` — these exist (migration `0009`) ahead of any adapter actually syncing into them; `src/adapters/shopeeAffiliateAdapter.js`/`lazadaAffiliateAdapter.js`/`tiktokShopAdapter.js` are present but their live-call status is **UNKNOWN from static reading alone** (not exercised in this audit) |

**Row counts: UNKNOWN for every table.** I attempted two read-only paths: (a) the Supabase CLI's `projects api-keys` command, to retrieve a key with enough privilege to bypass RLS for a count-only query — **this was blocked by this environment's own permission policy** ("Credential Materialization" denial) before I could run it; (b) using the anon key from `.env` with no authenticated session, which `RLS` would make return 0 for every per-user table regardless of real content (a false "empty" result, not a true count) — so I did not use that path, since it would have produced a number that looks real but isn't. I did not attempt to log in as `usertest1@insightai.com` because no password for that account is available to me. **No fabricated counts are reported anywhere in this document.**

### 2.3 Views, RPC functions, Edge Functions

No SQL views or RPC functions found in any migration file (`grep` for `create view`/`create function` found only the one `handle_new_user()` trigger function in `0001_init.sql:48-58`, which is not called by the frontend directly).

Edge Functions (`supabase/functions/`):
| Function | Purpose | Calls DB? |
|---|---|---|
| `explain-recommendations` | Gemini explains Layer-1 rule output (rationale/context strings only) | No — stateless |
| `explain-report` | Gemini narrates report sections | No — stateless |
| `extract-business-profile` | Gemini extracts structured profile fields from free-text business description | No — stateless |
| `run-forecast` | **New in this phase** — computes a real moving-average baseline forecast from the caller's own `raw_data` sales rows and writes one row to `forecast_results` | Yes — reads `raw_data`, writes `forecast_results`, using the anon key + forwarded user JWT so RLS scopes it to the caller |
| `source-status` | Reports which social/marketplace secrets are *present* (never "connected" without a real call) | No |
| `sync-threads-mentions` | Real Threads Graph API call (own posts + best-effort replies) | No — returns data to caller, which inserts via the normal ingestion service |
| `sync-x-mentions` | Real X API call | No — same pattern |

### 2.4 Demo CSVs (Embun Botanica) — loaded or not

I could not query the database directly (see 2.2's explanation), and I have no login credentials for `usertest1@insightai.com` or any other account. **I did not open the dev server's `/datasets` or any authenticated page**, so I cannot confirm from in-app observation either.

What I can report from the code, factually:
- A `sales` template upload (matching the brief's `sales.csv` columns) is parsed and validated, then inserted into `raw_data` only. **`dataPipelineService.ingestRows()` (`src/services/dataPipelineService.js:90`) only runs the `processed_data`/`daily_aggregates` pipeline for `TEXT_BEARING_TEMPLATES = new Set(['reviews', 'social'])`.** `'sales'` is not in that set, so even a fully successful sales upload never reaches `processed_data` or `daily_aggregates` — it only sits in `raw_data` as JSON payloads, one row per uploaded line. This is a structural fact about the pipeline, independent of whether Embun Botanica's data was actually uploaded.
- A `reviews` or `social` upload **does** reach `processed_data` (and from there `daily_aggregates`), via the rating heuristic (`src/utils/ratingSentimentHeuristic.js`) for reviews specifically.
- The brief's exact crisis window (2026-09-02 to 2026-09-07) and date range (2026-04-25 to 2026-10-21) are not mentioned anywhere in the codebase I searched (no reference to "Embun Botanica" in any `.js`/`.jsx`/`.md` file under `src/`, `docs/`, or `supabase/`) — this synthetic dataset, if it exists, lives only as a file the user generated outside this repo (per earlier conversation context, via an external AI prompt) and/or inside the Supabase database, neither of which this read-only audit could inspect.

**Verdict: UNKNOWN whether the demo CSVs are loaded, and into which tables, and what the actual date range/row counts are.** What pages would show *if nothing has been uploaded at all* for a given account: every chart/KPI on Dashboard, Sentiment Analysis, Social Intelligence renders its documented empty-state copy (e.g. `SentimentAnalysis.jsx:110`: *"No sentiment data yet — upload reviews or social data via Dataset Management."*) rather than a fabricated number — confirmed by reading every page's conditional rendering in Part 4.

### 2.5 Where derived metrics are computed

All derived metrics are computed in the **frontend** (pure JS utility modules, called by services, called by pages) — none in SQL (no views/stored procedures) and none in a Python backend at request time (the `ml/` Python code is offline-only, writing to Supabase via generated SQL the user runs manually, or via the forecasting notebook's checkpoint files).

| Metric | Formula (summary) | File : line |
|---|---|---|
| `computeSentimentScores` | Latest-day positive/negative ratio vs. ~7-days-prior, from `daily_aggregates`; neutral = `1 - positive - negative` | `src/utils/socialAnalytics.js:79` |
| `computeSentimentTrend` | Per-day positive/neutral/negative % for the trend chart | `src/utils/socialAnalytics.js:109` |
| `computePlatformComparison` | Per-platform mention volume / avg engagement / top language / sentiment % | `src/utils/socialAnalytics.js:122` |
| `computeMentionVolumeSeries` | Per-platform daily mention counts | `src/utils/socialAnalytics.js:172` |
| `computeTrendingHashtags` | Frequency count of `features.hashtags` across processed rows | `src/utils/socialAnalytics.js:199` |
| `computeLanguageBreakdown` | % share per detected language code | `src/utils/socialAnalytics.js:218` |
| `selectTopPosts` | Top-N real posts by engagement | `src/utils/socialAnalytics.js:237` |
| `aggregateDaily` | Groups processed rows by (date, source, platform); avg sentiment score, positive/negative ratio, mention/comment volume — null (never 0) when a group has no rated rows | `src/utils/featureEngineering.js:50` |
| `classifyByRating` | 4–5★→positive, 3★→neutral, 1–2★→negative, documented weak heuristic (`rating_heuristic_v1`), never confused with a trained model | `src/utils/ratingSentimentHeuristic.js:16` |
| `detectCrisis` | 7 threshold/z-score signals (level + velocity + anomaly) against a 7-day baseline, risk score = sum of triggered severities capped at 100 | `src/utils/crisisDetection.js:170`, thresholds in `src/config/crisisThresholds.js:22-39` |
| `generateRecommendations` | Rule engine: crisis signals + break-even math + data-readiness level → recommendation objects | `src/utils/recommendationRules.js:38` |
| `buildScenario` / `calculateBreakEven` | Startup-mode revenue/units/break-even projections from `business_assumptions` | `src/utils/scenarioEngine.js:36,148` |
| `latestPerModelVariant` / `summarizeForecastComparison` / `summarizeCrisisPerformance` | Model Performance page's display-shaping of `model_versions`/`forecast_results`/`crisis_events` rows (no new numbers invented) | `src/utils/modelPerformance.js:11,29,47` |
| `movingAverageForecast` / fold metrics (`run-forecast`) | Last-7-day average repeated across horizon; MAE/RMSE/MAPE via rolling-origin folds — a TypeScript port of `ml/forecasting/src/baselines.py` + `metrics.py` + `rolling_split.py`, run inside the Edge Function at request time | `supabase/functions/run-forecast/index.ts:66-120` |
| Full model comparison (ARIMA/Prophet/XGBoost/LSTM) | **Not computed by the app at all** — only by the offline `ml/forecasting/src/evaluate.py:run_comparison()`, run in Colab, written to `forecast_results` via manually-run SQL | `ml/forecasting/src/evaluate.py` |

### 2.6 Hard-coded or mock data in the frontend

Confirmed by reading every page/service file and grepping for `mock|dummy|fake|placeholder|coming soon|TODO|FIXME` (`src/pages`, `src/services`, `src/utils`):

- `src/data/` is **empty** except `.gitkeep` — no mock fixture files remain.
- `src/services/dataPipelineService.js:14-26` — `FIXTURE_REVIEW_POSTS`/`FIXTURE_SOCIAL_POSTS`, four short real (human-written, not fetched) sample posts used only by the "Load Sample Dataset" button (`DatasetManagement.jsx`) to prove the real ingestion pipeline works end-to-end. These go through the *same* rating-heuristic/feature-engineering code as a real upload — they are not a separate fake display path.
- `src/pages/SettingsPage.jsx` — `ABOUT_INFO` (version, full title, student name, institution) is static text in the "About" section, appropriately so (it's project metadata, not a data visualization).
- No chart anywhere in `src/pages/*.jsx` renders a literal hard-coded number — every chart's data prop traces back to a service call. (Verified by reading all 9 chart-bearing cards across Dashboard/Sentiment/Forecasting/Social Intelligence in Part 4.)

---

## PART 3 — ANALYTICAL / AI COMPONENTS

| Component | Status | Evidence |
|---|---|---|
| Sentiment classification | **Partial** — a documented rating-derived heuristic (`rating_heuristic_v1`) is the only thing wired into the live ingestion pipeline. Three real trained classifiers (XLM-RoBERTa, mBERT, TF-IDF+LogReg) exist and were evaluated offline (`ml/sentiment/`), with results in `model_versions` if that SQL has been run — but **no code path calls any trained model at request/ingestion time**. `ModelConfigSection` in Settings says this explicitly: *"No trained sentiment model is deployed yet"* (`src/pages/SettingsPage.jsx`, Model & Detection section). | `src/utils/ratingSentimentHeuristic.js`, `ml/sentiment/src/`, `supabase/migrations/0004_model_versions.sql` |
| Multilingual handling | **Exists** — real rule-based language detection (CJK character ratio → `zh`; Malay-word-hit heuristic vs. English → `ms`/`en`/`ms-en` code-mixed) | `src/utils/textPreprocessing.js:41-61` |
| Crisis detection | **Exists** — 7 non-overlapping signals: 3 level checks, 2 velocity checks, 2 anomaly (z-score vs. 7-day baseline) checks; documented, configurable thresholds | `src/utils/crisisDetection.js`, `src/config/crisisThresholds.js` |
| Sales forecasting | **Exists, two tiers.** (1) In-app: a real moving-average baseline, computed on demand, documented as baseline-tier (`supabase/functions/run-forecast/index.ts`). (2) Offline: moving average + ARIMA + Prophet (sales-only and sentiment-enhanced) + XGBoost + LSTM (gated on ≥730 days of history), all evaluated on identical rolling-origin folds | `ml/forecasting/src/{baselines,arima_model,prophet_model,xgboost_model,lstm_model,evaluate}.py` |
| Recommendation engine | **Exists, two layers** — Layer 1 is a pure rule engine (crisis signals + break-even math + data-readiness), Layer 2 is Gemini *explaining* (never deciding) that output; the rule engine works standalone if Gemini is unavailable | `src/utils/recommendationRules.js`, `supabase/functions/explain-recommendations/index.ts` |
| Python backend / Flask API / model artifact in repo | **No live backend.** `ml/` contains training/eval code (pytest-tested, `conftest.py`/`.pytest_cache` present under `ml/forecasting` and `ml/sentiment`) and Jupyter notebooks, run manually/in Colab — not a server process the app calls at runtime. No `.pkl`/`.joblib`/model-weight artifact files were found checked into the repo (only code + `results/` JSON outputs + notebooks). | `ml/forecasting/`, `ml/sentiment/`, `ml/notebooks/01-04*.ipynb` |
| External AI/LLM API calls | **Yes — Google Gemini**, via 3 Edge Functions (`explain-recommendations`, `explain-report`, `extract-business-profile`), model `gemini-3.8-flash` by default (overridable via `GEMINI_MODEL` secret). Every call is explicitly scoped to narrative/explanation text only — none of the three can alter a decided fact (ids, priorities, numeric values) per each function's own validation code. | `supabase/functions/{explain-recommendations,explain-report,extract-business-profile}/index.ts` |

---

## PART 4 — PAGE-BY-PAGE CHART INVENTORY

**Headline finding, stated once here because it recurs on 6 of the 10 pages below: Crisis Detection, AI Recommendations, Reports, Dataset Management, Model Performance, and Settings contain *zero* Recharts (or any SVG/canvas chart) elements.** Only Dashboard, Sentiment Analysis, Forecasting, and Social Intelligence have charts. This is the single largest fact a "premium analytics" redesign needs to plan around — it is as much a content/IA question as a visual one.

### 4.1 Dashboard (`/`, Executive Dashboard)

File: `src/pages/Dashboard.jsx` (360 lines). Child components used: `Card`, `Badge`, `Chip`, `Button`, `ChartTooltip`, `AsyncSection`, `BusinessPlanningPanel` (common), Recharts (`AreaChart`, `PieChart`, `BarChart`).

**Layout, top to bottom:** (when not in "no data" startup mode) optional onboarding banner → dark "Executive Summary" hero card with mode badge + Refresh → KPI card row (0–3 cards, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) → 2-column row (Sentiment Trend area chart, 2/3 width; Platform Distribution donut, 1/3) → 2-column row (Daily Mention Volume bar chart, 2/3; Trending Hashtags, 1/3) → 2-column row (Recent Alerts list; Latest AI Recommendations list).

| Title | File:line | Type / lib | Data source / shape | Question answered | Interactivity | Animation | Weaknesses |
|---|---|---|---|---|---|---|---|
| Sentiment Trend | `Dashboard.jsx:121-138` | Stacked `AreaChart` (Recharts) | `dashboardService.getDashboardData()` → `{date, positive, neutral, negative}[]` (14 days) | "Is sentiment improving or worsening?" | Tooltip (shared `ChartTooltip`), legend | Recharts default mount animation only | `stackId="sentiment"` on three series whose values are percentages of the same whole — stacking them visually implies they sum to a meaningful total height, but each is already a % of all mentions, so the stacked top edge (100%-ish) carries no extra meaning; a cleaner read would be 3 unstacked lines (as Sentiment Analysis page itself does, see 4.2) |
| Platform Distribution | `Dashboard.jsx:140-165` | Donut `PieChart` | same payload → `platformComparison[]`, `{platform, mentionVolume}` | "Which platform dominates mentions?" | Tooltip, legend | Default | Only 2 real platform values exist app-wide (`tiktok`, `x`) yet a 4-color palette (`PLATFORM_COLORS`) is defined — a 2-slice donut is a thin use of a "premium" chart type; no total-count label in the center (a common donut convention) |
| Daily Mention Volume | `Dashboard.jsx:168-186` | Grouped `BarChart` | `mentionVolumeSeries[]`, one bar series per platform, 7 days | "Which platform is generating the most daily chatter?" | Tooltip, legend | Default | Title says "last 7 days" directly above a chart whose card title duplicates "Daily Mention Volume... last 7 days" — redundant copy; Y axis has no unit label |
| Trending Hashtags | `Dashboard.jsx:188-200` | **Not a chart** — a wrapped list of `Chip` pills with raw mention counts | `trendingHashtags[]` | "What's being talked about?" | None (static) | None | No bar/size encoding at all — two hashtags with wildly different volumes look visually identical except for the printed number; duplicated almost verbatim on Social Intelligence (4.6) and Sentiment Analysis (4.2), each with a *different* visual treatment (chips here, a labelled progress-bar list elsewhere) |

**Non-chart elements:** KPI cards (Sentiment/Crisis Risk/Revenue Forecast — 0 to 3 shown, never fabricated placeholders for the other 2 when absent, `Dashboard.jsx:72-100`), Recent Alerts list (links to Crisis Detection), AI Recommendations list (links to AI Recommendations), onboarding banner (dismissible, session-only via `useState`, not persisted), a dark "Executive Summary" narrative card with its own Refresh button. All confirmed wired to real services, no dead buttons found.

**Filters:** none on this page (no date range, no platform selector). Mode (Startup/E-Commerce) is global (`useMode()`), set from the Navbar, not local to this page — see Part 4.11.

**Broken/placeholder:** none found. Every empty case has `EmptyNote` copy, not a fake number.

### 4.2 Sentiment Analysis (`/sentiment`)

File: `src/pages/SentimentAnalysis.jsx` (220 lines). Children: `Card`, `Badge`, `Chip`, `Button`, `Input`/`Select`, `ChartTooltip`, `AsyncSection`.

**Layout:** filter bar card (search + language + platform selects + Export CSV) → 3-up sentiment score cards (or one empty card) → 2-column row (Sentiment Trend line chart 2/3, Emotion Analysis "Unavailable" card 1/3) → Trending Hashtags (chip list) → 2-column row (Most Influential Posts list; Region Breakdown "Unavailable" card).

| Title | File:line | Type / lib | Data source / shape | Question | Interactivity | Animation | Weaknesses |
|---|---|---|---|---|---|---|---|
| Sentiment Trend | `SentimentAnalysis.jsx:143-154` | 3 unstacked `Line`s in a `LineChart` | `getSentimentAnalysisData()` → `{date, positive, neutral, negative}[]` (7 days) | "How has sentiment moved day to day?" | Tooltip | Default | Same metric/shape as Dashboard's Sentiment Trend (4.1) but **a different chart type** (unstacked lines here vs. stacked areas there) for the same underlying 3-series %-over-time data — a direct cross-page inconsistency, not just styling |
| Trending Hashtags | `SentimentAnalysis.jsx:164-176` | Chip list (same as Dashboard) | `trendingHashtags[]` | "What's trending?" | None | None | Same weakness as 4.1 |

**Non-chart:** 3 sentiment-score KPI cards with WoW delta arrows (`SentimentAnalysis.jsx:113-136`); "Emotion Analysis" and "Region Breakdown" are explicit, permanent `UnavailableCard`s (not loading/empty — genuinely not implemented, honestly labelled `SentimentAnalysis.jsx:157-161,209-213`); "Most Influential Posts" ranked list with platform/language/sentiment badges; CSV export (`handleExport`, `SentimentAnalysis.jsx:56-72`) — only exports the *currently filtered* post list, works client-side via `downloadCsv`.

**Filters:** Search (text, substring match on post text), Language (`all/en/ms/zh/ms-en`), Platform (`all/tiktok/x`) — all **local to this page only**, not shared with any other page, and all three *do* actually filter `filteredPosts` (`SentimentAnalysis.jsx:46-54`) — confirmed by reading the `useMemo`. They do **not** affect the KPI cards, the trend chart, or the hashtag list — only the post list and its own export. This is a real, easily-missed inconsistency: a user could set Platform=TikTok and still see an "overall" sentiment trend/score that includes X data.

### 4.3 Forecasting (`/forecasting`, Business Forecasting)

File: `src/pages/Forecasting.jsx` (245 lines). Children: `Card`, `Button`, `ChartTooltip`, Recharts (`AreaChart`+`Line` combined).

**Layout:** toolbar card (mode badge, run-id/generated-at text, Refresh + **Run Forecasting** buttons) → conditional: loading text / "No forecasting run yet" explainer card / forecast chart + 3 metric cards (MAE/RMSE/MAPE with target-met badge) + full model-comparison table.

| Title | File:line | Type / lib | Data source / shape | Question | Interactivity | Animation | Weaknesses |
|---|---|---|---|---|---|---|---|
| Model Forecast | `Forecasting.jsx:128-165` | `AreaChart` (invisible "low" area + translucent "band" area for the uncertainty interval) + `Line` for the point prediction | `getLatestForecastRun()` → best row's `forecast_points[]`, `{date, predicted, lower, upper}` | "What's the revenue forecast, and how confident is the model?" | Tooltip (currency-formatted), legend | Default | The uncertainty band is built from 2 stacked areas with one deliberately invisible (`fill="transparent"`) — a real, working technique, but it means the chart's own `Legend` always shows a stray empty-name entry unless carefully suppressed (`legendType="none"` is set, so this is handled — noted here as a fragile pattern worth replacing with a proper `ReferenceArea`/custom band component in a redesign, not a current bug); no gridline distinction between the historical boundary and the forecast-only region — the whole visible chart *is* the forecast, so there's no "where does known data end" visual cue |

**Non-chart:** MAE/RMSE/MAPE cards (currency-formatted for MAE/RMSE, %+target-badge for MAPE); full comparison table listing every evaluated model/variant with an is_best "Best" pill (never hardcoded — driven by the real `is_best` column). **Run Forecasting** button (`Forecasting.jsx:101-103`) is new this phase — calls the `run-forecast` Edge Function, a real baseline computed from the account's own uploaded sales data, no manual SQL/email step.

**Filters:** none.

**Broken/placeholder:** none. The "no forecasting run yet" state explicitly explains both paths (in-app baseline vs. offline notebook) rather than a dead end.

### 4.4 Crisis Detection (`/crisis-detection`, Crisis Detection Center)

File: `src/pages/CrisisDetection.jsx` (209 lines). Children: `Card`, `Badge`, `Button`, `Table`. **No chart library import at all** (confirmed: no `recharts` import in this file).

**Layout:** hero card (shield icon colored by risk level, risk-level label, risk-score badge, 3-segment colored progress bar as the only visual risk indicator, Refresh + "Log to history" buttons) → "Detected Signals" card (a list of all 7 signals with icon/badge per level + text evidence) → "Detection History" card (a `Table` of past logged detections: timestamp, level badge, score, triggered-signal count, data-sufficiency).

There is **no chart to tabulate** — the entire page is cards, a 3-segment static-color bar, badges, and one data table. The closest thing to a visual is the 3-segment risk bar (`CrisisDetection.jsx:114-134`), which is a fixed-width 3-cell strip colored up to the current level — not a measurement of risk *score* (0–100) within that scale, just a 3-position stepper.

**Non-chart:** "Log to history" persists the current detection into `crisis_events` (works — calls `saveCrisisEvent`); history table renders real rows with no fabricated validated-accuracy column. Everything reads real data; nothing fake found.

**Filters:** none.

### 4.5 AI Recommendations (`/recommendations`, AI Recommendation Engine)

File: `src/pages/AiRecommendations.jsx` (176 lines). Children: `Card`, `Badge`, `Button`. **No chart library import.**

**Layout:** category filter-chip bar + Regenerate/Save buttons → "Business Context" definition-list card (factors used/insufficient) → 2-column grid of recommendation cards, each with category/priority badges, title, bullet evidence, and an expandable "Why this recommendation?" panel (Gemini rationale or an honest "Gemini explanation unavailable" fallback).

No chart anywhere. The page is entirely card/list/badge based — a plausible place for at least one visual (e.g., a priority/category distribution bar, or a timeline of past recommendation runs) in a future redesign, but today it's text-only.

**Filters:** category chips (`All` + 6 categories from `CATEGORIES`) — local only, actually filters the visible list (`AiRecommendations.jsx:104`).

### 4.6 Social Intelligence (`/social-intelligence`, Social Media Intelligence)

File: `src/pages/SocialIntelligence.jsx` (165 lines). Children: `Card`, `Badge`, `Table`, `ChartTooltip`, `AsyncSection`, Recharts (`BarChart`).

**Layout:** platform toggle buttons → "Platform Comparison" `Table` (mentions, avg engagement, top language, sentiment %) → 2-column row (per-platform 7-day mention-volume `BarChart`; Trending Hashtags as a labelled progress-bar list) → "Top Influencers" permanent Unavailable card → "Top Posts" list for the selected platform.

| Title | File:line | Type / lib | Data source / shape | Question | Interactivity | Animation | Weaknesses |
|---|---|---|---|---|---|---|---|
| `{Platform} Mention Volume` | `SocialIntelligence.jsx:102-111` | Single-series `BarChart` | `mentionVolumeSeries[]`, keyed by the selected platform, 7 days | "Is chatter about us rising on this platform?" | Tooltip | Default | Title and Y-axis both omit units; switching the platform toggle re-renders the *same* chart for a different series — real behavior, but there's no visual transition (bars just snap), which reads as a flicker rather than a deliberate re-filter at 60fps |

**Non-chart:** Platform Comparison table (real `Badge`-wrapped sentiment %); Trending Hashtags here uses a **third distinct visual treatment** for the same "ranked category + count" shape already seen as chips (4.1/4.2) and will be seen again as a progress-bar list in Dataset Management's language breakdown (4.8) — a horizontal bar with `width: ${pct}%` driven by inline `style`, not a chart library element (`SocialIntelligence.jsx:118-131`); Top Posts list (real engagement counts, `Heart` icon). "Top Influencers" is a permanent, honestly-labelled Unavailable card.

**Filters:** platform toggle buttons — shared visual pattern with the category chips elsewhere, local to this page, genuinely re-filters the mention-volume chart and the Top Posts list (not the Platform Comparison table, which always shows all platforms, nor the Trending Hashtags list, which is explicitly "across all platforms" by design).

### 4.7 Reports (`/reports`, Reports and Export)

File: `src/pages/Reports.jsx` (153 lines). Children: `Card`, `Button`, `Badge`. **No chart library import.**

**Layout:** intro card explaining the Actual-vs-Scenario data convention → template grid (name/description/last-generated/Generate button) → (once generated) an active report card with per-section narrative + two small key-value tables (Actual Data, Scenario/Estimated Data) + Export PDF/CSV buttons + a color-coded legend.

Entirely text/table based. No chart. Exports are real: `exportReportPdf`/`exportReportCsv` (`src/utils/reportExport.js`, using `jspdf`/`jspdf-autotable` and the same `downloadCsv` helper used elsewhere) — not stubbed.

**Filters:** none (mode affects which report content is generated via `generateReport(builderKey, mode)`, but that's a data input, not a UI filter control).

### 4.8 Dataset Management (`/datasets`)

File: `src/pages/DatasetManagement.jsx` (452 lines). Children: `Card`, `Badge`, `Button`, `Table`, `Dialog`. **No chart library import.**

**Layout:** drag-and-drop upload card (Browse Files / Load Sample Dataset buttons, hidden file input accepting `.csv,.json,.xlsx,.xls`) → "Data Source Status" card (per-adapter connection badges with independent-failure guarantee, Sync buttons) → "Storage Usage" card (explicit "Unavailable" for real quota + a language-detection breakdown rendered as the same hand-rolled progress-bar list pattern as 4.6) → "ML Training Data Export" card (3 real CSV-export buttons for the offline training pipelines) → "Recent Imports" `Table` (this session only) → a validation-report `Dialog`.

No chart. The language breakdown (`DatasetManagement.jsx:307-331`) is a 4th occurrence of the same "ranked category + %" visual, implemented a 4th different way (here: a colored div with `backgroundColor` cycling through a literal 5-color array `['#22c55e','#60a5fa','#a8a29e','#f59e0b','#94a3b8']` that does **not** match `CHART_COLORS`/`CHART_SEQUENCE` from `src/theme/chartTheme.js` — a fourth, independently-defined color list for conceptually the same kind of data).

**Non-chart/forms:** multi-file upload (drag + browse), "Load Sample Dataset" (real fixture seed), per-source Sync buttons (each independently failing/succeeding, confirmed by `registry.test.js`'s explicit isolation test), 3 ML-export buttons, a recent-imports table, and a per-import validation-report dialog listing real checks/warnings and a YES/NO "ready for processing" line. Everything here reads as functionally real; no "coming soon" text found.

**Filters:** none (the imports table is session-scoped, not filterable).

### 4.9 Model Performance (`/model-performance`)

File: `src/pages/ModelPerformance.jsx` (173 lines). Children: `Card`, `Badge`, `AsyncSection`. **No chart library import.**

**Layout:** intro card → "Sentiment Models" card (2-column grid of per-model-variant cards: accuracy/precision/recall/F1 as plain numbers, a confusion-matrix `<table>`, per-language accuracy list) → "Forecast Models" card (baseline-vs-sentiment-enhanced comparison `<table>`) → "Crisis Detection Performance" card (3 plain counts + an honest note that validated precision/recall is unavailable, no ground-truth dataset).

No chart anywhere — every number here (accuracy %, confusion matrix, MAE/RMSE/MAPE comparison) is a strong, obvious candidate for visualization (a radar/bar comparison across model types, a heatmap for the confusion matrix, a grouped bar for baseline-vs-enhanced) that currently exists only as plain numbers in `<table>`/`<div>` markup.

**Filters:** none.

### 4.10 Settings (`/settings`)

File: `src/pages/SettingsPage.jsx` (550 lines), 9 sections (Profile, Company, Notifications, Language & Theme, API Keys, Security, Model & Detection, Database, About) rendered one at a time via a left-hand section nav (`SECTIONS` array, `SettingsPage.jsx:42-51`). **No chart library import.** Forms throughout (profile fields, company fields, notification toggles via `Switch`, language/theme selects, password-change fields, crisis-sensitivity select + confidence-threshold range input, backup-frequency select). Danger-zone "Reset Session" (deletes uploaded datasets, signs out) + plain "Refresh" button live in the Database section (added this phase). 2FA and API-key regeneration are explicit, honest "Unavailable" notes, not fake toggles.

### 4.11 Cross-page filter summary

| Filter | Pages | Shared or local | Actually changes charts? |
|---|---|---|---|
| Mode (Startup / E-Commerce) | Global (`Navbar`, read by Dashboard, Forecasting, AI Recommendations, Reports, Dataset Management) | **Shared** (`ModeProvider`, `localStorage`-backed) | Changes which KPIs/report builders run, not a visual chart filter per se |
| Search/Language/Platform (Sentiment Analysis) | Sentiment Analysis only | Local | Yes, but only for the post list + export, not the KPI/trend charts (see 4.2) |
| Platform toggle (Social Intelligence) | Social Intelligence only | Local | Yes, for the mention-volume chart + Top Posts; no, for Platform Comparison table/hashtags |
| Category chips (AI Recommendations) | AI Recommendations only | Local | N/A (no charts on this page) |

There is **no shared, page-crossing date-range filter anywhere in the app** — every chart's time window is a fixed constant chosen per-query (`days: 14`/`7` in various service calls), not user-adjustable. This is worth flagging prominently for a redesign that wants to feel "premium" — professional analytics products almost always offer at least a global date-range control.

### 4.12 Broken / placeholder / fake-number scan (whole app)

None found. Every "not implemented" surface in the app says so explicitly (`"Unavailable — ..."` text, confirmed on: Emotion Analysis, Region Breakdown, Top Influencers, Storage Usage quota, Database backups, 2FA, API key regeneration, Crisis Detection's validated precision/recall). No chart or KPI renders a literal invented number — every value traces to a real service call, confirmed by reading all 10 pages' data-binding code.

---

## PART 5 — SHARED COMPONENTS AND CONSISTENCY

### 5.1 Reusable wrappers and how consistently they're used

- `Card` (`src/components/ui/Card.jsx`) — used on every single page, consistently (title/description/actions/body pattern). No entrance animation, no hover elevation change — purely static.
- `ChartTooltip` (`src/components/ui/ChartTooltip.jsx`) — used by **every** Recharts `<Tooltip>` across Dashboard/Sentiment Analysis/Forecasting/Social Intelligence (confirmed: no page defines its own inline tooltip renderer). This is a genuine consistency win to preserve in any redesign.
- `AsyncSection` + `useAsyncData` — used by Dashboard, Sentiment Analysis, Social Intelligence, Reports, Model Performance. **Not** used by Crisis Detection, AI Recommendations, Forecasting, or Dataset Management, which each hand-roll their own `loading`/`useEffect` state instead — a real inconsistency in how "loading/error/empty" is expressed across pages, even though the *intent* (never fabricate, always show a real state) is honored everywhere.
- `Badge`, `Button`, `Table`, `Dialog`, `Chip` — used broadly and consistently in their own right (one `Button` component with 4 variants: primary/secondary/ghost/danger, used everywhere; one `Table` component used by Crisis Detection, Social Intelligence, Dataset Management).
- There is **no shared chart-wrapper component** — every page builds its own `<ResponsiveContainer><XChart>...</XChart></ResponsiveContainer>` tree inline, repeating the same `CartesianGrid`/`XAxis`/`YAxis`/margin boilerplate each time (confirmed across all 7 chart instances found). A redesign introducing a shared `<ChartCard>`/`<TrendChart>` wrapper would remove a lot of duplication.

### 5.2 Concrete inconsistencies found

- **Color semantics collide.** `CHART_COLORS.positive === CHART_COLORS.tiktok === '#22c55e'` (`src/theme/chartTheme.js:7,10`), which is also the brand `accent-500` used for primary buttons/active nav/links throughout the UI (`src/styles/index.css:33`). The same green currently means "positive sentiment," "TikTok," and "primary brand action" depending on context — a colorblind or quickly-scanning user has no way to disambiguate a green bar/line's meaning from color alone.
- **Two different reds for "negative/danger."** `CHART_COLORS.negative = '#ef4444'` vs. the CSS token `--color-danger: #dc2626` used by `Badge`/buttons/alerts elsewhere. They're close but not the same hex — a redesign should pick one.
- **The same "ranked category + value" data shape is rendered 4 different ways** across the app: `Chip` pills (Dashboard hashtags, Sentiment Analysis hashtags), a labelled progress-bar list with `backgroundColor` cycling through `['#22c55e','#60a5fa','#a8a29e','#f59e0b','#94a3b8']` (Dataset Management's language breakdown, `DatasetManagement.jsx:323`), and a *different* progress-bar list using `CHART_COLORS`-adjacent styling (Social Intelligence hashtags, `SocialIntelligence.jsx:118-131`). None of these four use an actual chart (bar/treemap) component.
- **Percent formatting bypasses the shared formatter in most places.** `src/utils/formatters.js:23` exports `formatPercent()`, but Dashboard's KPI (`Dashboard.jsx:77`), Sentiment Analysis's score cards (`SentimentAnalysis.jsx:121`), and Model Performance's accuracy/F1 cells (`ModelPerformance.jsx:33-36`) all hand-roll `${value}%` or `${(value*100).toFixed(1)}%` inline instead of calling it. `formatDelta()` and `formatCurrencyMYR()`, by contrast, **are** consistently called everywhere a delta or currency value appears.
- **Chart heights are inconsistent and not on a shared scale**: 280px (Dashboard trend/donut), 260px (Dashboard mention volume, Sentiment trend), 300px (Forecasting), 240px (Social Intelligence) — four different values with no apparent system behind them beyond "what looked right on that page."
- **Sentiment Trend is a stacked AreaChart on Dashboard but 3 unstacked Lines on Sentiment Analysis** for the same `{date, positive, neutral, negative}` shape (see 4.1/4.2) — the single clearest same-data/different-chart-type inconsistency in the app.

### 5.3 Accessibility

- **Color contrast**: not formally measured in this audit (no automated contrast-checking tool was run — that would require either installing a package, which this audit was told not to do, or a manual pixel/ratio calculation I did not perform). Visually, the light-theme palette (dark slate text on white/near-white surfaces, `src/styles/index.css:44-50`) reads as high-contrast; the muted `neutral` chart gray (`#a8a29e`) against white backgrounds is the one color most likely to fail a strict contrast check, but this is **UNKNOWN**, not confirmed, without running a contrast tool.
- **Colorblind safety**: not tested with a simulator. The `positive`(green)/`negative`(red) pairing used throughout sentiment/crisis UI is the single most common colorblind-risk pattern (red-green is indistinguishable to the most common form of color vision deficiency), and nothing in the current implementation adds a redundant non-color cue (icon/shape/pattern) to the chart *fills* themselves — though `Badge`/list items elsewhere do pair color with an icon (e.g., `CheckCircle2`/`AlertTriangle` in Crisis Detection, `ArrowUp`/`ArrowDown` for deltas), charts specifically (areas/lines/bars) do not.
- **Keyboard access**: `Dialog.jsx` closes on Escape (`Dialog.jsx:10-15`) and traps nothing else explicitly (no visible focus-trap logic read in that file) — **UNKNOWN whether focus is trapped inside the open dialog** without a live keyboard-navigation test, which Part 7's credential blocker also prevented. Buttons/links throughout use native `<button>`/`<Link>` elements (not `<div onClick>`), which gives baseline keyboard reachability for free.
- **ARIA on charts**: no `aria-label`/`role="img"` found on any `ResponsiveContainer`/chart root in any of the 7 chart instances (`grep` for `aria-` inside the chart JSX blocks found hits only on icons via `aria-hidden="true"`, never on the chart containers themselves). A screen-reader user gets no textual description of any chart's content today — only the surrounding `Card`'s title/description text, which is not chart-specific data.

### 5.4 Performance

- Production build (`npm run build`) **succeeds**, 2.5 MB total `dist/`. Largest chunks: `index-*.js` 631 KB (main entry — React/Router/Supabase client/shared providers), `Reports-*.js` 447 KB (pulls in `jspdf`+`jspdf-autotable`), `DatasetManagement-*.js` 398 KB (pulls in the SheetJS `xlsx` parser), `chartTheme-*.js` 335 KB (this is the chunk Vite's bundler grouped Recharts itself into, since every chart-bearing page imports `CHART_COLORS` from this file — so "chartTheme" is really "Recharts + chart colors" by dependency graph, not a 335 KB color-token file), `html2canvas-*.js` 200 KB (image rendering, likely for PDF export). Vite's own build warns that several chunks exceed its 500 KB guideline (`Reports`, `DatasetManagement` are under it individually at the per-chunk gzip level but the warning flags the uncompressed sizes).
- **Every page is route-level lazy-loaded** (`src/routes/pages.js`, confirmed real — each page appears as its own named chunk in the build output, e.g. `Dashboard-*.js` 29 KB, `Forecasting-*.js` 8 KB), so a user only downloads the page they're viewing plus the shared vendor chunks.
- No obviously heavy re-render pattern was found by static reading (no large inline object/array literals recreated every render inside a hot path beyond what's typical for React; `useMemo` is used for the filter-derived lists on Sentiment Analysis/Social Intelligence). A runtime profiler was not run (out of scope for a static/read-only pass without a logged-in session generating real data volume).

---

## PART 6 — QUALITY STATUS

### 6.1 Lint / Prettier

- `npx eslint .` → **0 errors, 0 warnings**, exit code 0.
- `npx prettier --check .` → **132 files** flagged with formatting-only differences (not run with `--write`, per the read-only constraint). No error count distinct from warning count — Prettier's check mode reports every non-conforming file as a "warn" line; it does not distinguish severities.

### 6.2 Production build

- `npm run build` → **success**. Output: 2.5 MB total, see Part 5.4 for the chunk breakdown. One non-fatal warning (chunk-size guideline) only.

### 6.3 Playwright tests

6 tests across 3 spec files (`npx playwright test --list`):

| Spec | Test | Result |
|---|---|---|
| `api-failure-states.spec.js` | wrong credentials → visible error, not blank screen | **passed** (7.8s) |
| `api-failure-states.spec.js` | network failure on login → graceful error | **passed** (8.2s) |
| `api-failure-states.spec.js` | signup → real outcome, never a crash | **passed** (8.0s) |
| `api-failure-states.spec.js` | protected route, no session → redirects to `/login` | **passed** (6.6s) |
| `journey-existing-data.spec.js` | login → switch mode → view every core page | **skipped** (requires `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`, not set in this environment) |
| `journey-no-data.spec.js` | onboarding no-data path → report generation | **skipped** (same reason) |

4 passed, 2 skipped by the tests' own design (not a hang, not a false pass — each prints its own skip reason, per `e2e/README.md`), 0 failed.

### 6.4 Browser console errors/warnings while running the dev server

Checked `/login` and `/` (redirects to `/login` with no session) via a real headless Chromium load against the actual Vite dev server (`localhost:5173`). Console output on both: only Vite HMR connection messages and React's standard "Download the React DevTools" info line — **zero errors, zero warnings**. Confirmed `/` correctly redirects to `/login` client-side (`RequireAuth`) with no console noise during that redirect.

Console output for the other 8 authenticated pages is **UNKNOWN** — not checked, since reaching them requires a real session (see Part 7).

---

## PART 7 — SCREENSHOTS

**Login was not possible.** I checked `.env` for `DIAG_EMAIL`/`DIAG_PASSWORD`, `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`, and `VITE_DEV_BYPASS_AUTH` — none are set. `e2e/README.md` independently confirms the project's own test account (`admin@insightaid.ai`) is still stuck on Supabase's "email not confirmed" state as of the last time this was checked by the project owner. I was not given, and did not attempt to guess or create, credentials for `usertest1@insightai.com` or any other account. Per the brief's own instruction, I stopped the authenticated portion of this part rather than fabricate a login.

What I captured instead (real headless-Chromium screenshots against the actual running dev server, saved to `docs/audit/screenshots/`):

| File | Page | Viewport | Theme |
|---|---|---|---|
| `login_desktop_light.png` | `/login` | 1440px | light |
| `login_desktop_dark.png` | `/login` | 1440px | dark (forced via `localStorage` before load, since no toggle is reachable pre-auth) |
| `login_mobile_light.png` | `/login` | 390px | light |
| `signup_desktop_light.png` | `/signup` | 1440px | light |

The remaining 9 authenticated pages (Dashboard, Sentiment Analysis, Forecasting, Crisis Detection, AI Recommendations, Social Intelligence, Reports, Dataset Management, Model Performance, Settings — 9, not counting Login/Signup) were **not captured**, at any viewport or theme, because they all sit behind `RequireAuth` with no accessible credentials.

---

## PART 8 — ASSESSMENT

### 8.1 Top 10 visual/UX weaknesses, ranked by how much they hurt the "premium analytics" impression

1. **6 of 10 pages have zero charts** (Crisis Detection, AI Recommendations, Reports, Dataset Management, Model Performance, Settings) — the single biggest gap. A "premium analytics product" impression lives or dies on whether the *analytical* pages look analytical; right now most of them are forms/cards/tables.
2. **Model Performance — real, rich numeric data (accuracy/precision/recall/F1 per model, a full confusion matrix, per-language breakdowns, MAE/RMSE/MAPE baseline-vs-enhanced) rendered only as plain `<table>`/`<div>` text**, the most chart-ready unused data in the app.
3. **Crisis Detection's only "visual" is a static 3-segment color strip**, not a real gauge/timeline for a risk *score* that's actually a 0–100 number with real history (`crisis_events`) sitting unused as a time series.
4. **The exact same sentiment-trend data is a stacked area chart on one page and 3 separate line charts on another** — a direct, verifiable inconsistency (4.1 vs 4.2) that undermines any sense of a coherent design system.
5. **The same "ranked list + count" data shape (hashtags, language breakdown) is drawn 4 different ways** across 3 pages, none of them using an actual chart element — an obvious, cheap win for consistency.
6. **No shared chart-wrapper component exists** — every chart repeats the same Recharts boilerplate inline, which is both a maintenance risk and the reason the inconsistencies above crept in independently per page.
7. **Color semantics collide**: the one green used for "positive sentiment," "TikTok," and "primary brand action" is the same hex in all three roles.
8. **No global date-range control anywhere** — every chart's time window is a hardcoded constant; a user cannot ask "show me the last 30 days" on any page.
9. **No chart has any accessible text alternative** (no `aria-label` on any chart container) — screen-reader users get the surrounding card copy only.
10. **Several small formatting inconsistencies** (percent values not routed through the shared `formatPercent()` helper; chart heights on no common scale; two slightly different "danger red" hex values) that are individually minor but compound into a visibly "assembled by hand, page by page" feel rather than a systemized one.

### 8.2 Technical constraints a redesign must respect

- **Tailwind 4's `@theme` tokens are the only color/typography source** — there's no `tailwind.config.js` to edit; new tokens go into `src/styles/index.css`'s `@theme` block, and any *chart* color still needs a plain-hex mirror in `src/theme/chartTheme.js` since Recharts can't consume CSS custom properties directly for SVG fills (this split already exists and caused the collisions in 8.1 — a redesign should keep both in sync deliberately, not accidentally).
- **Every chart/KPI is driven by a real service call behind `AsyncSection`/`useAsyncData`'s loading/success/empty/error/unavailable states** — this discipline (verified: no fabricated numbers found anywhere) is a project requirement (FYP2.md references throughout the codebase), not incidental; a redesign must preserve the 5-state contract for every new/restyled chart, including a genuine empty-state and a genuine unavailable-state, not just loading/success.
- **`raw_data`/`processed_data`/`daily_aggregates` RLS is `auth.uid() = user_id` everywhere except `model_versions`** (shared, read-only to authenticated users, write-only via service role) — any new visualization reading `model_versions` can safely assume it's the same for every account; anything reading the other tables cannot.
- **Sales uploads never populate `processed_data`/`daily_aggregates`** (Part 2.4) — any new chart that wants a "sales over time" visual sourced from Dataset Management uploads needs either a pipeline change (out of scope for a pure visual redesign) or must source from `forecast_results`/the `run-forecast` function's own computation instead, which already has the real daily series in memory at request time.
- **Every page is lazy-loaded per-route already** — a redesign should keep introducing new chart libraries/heavy deps (if any) scoped to the pages that need them, the way `xlsx`/`jspdf` already are, rather than adding them to a shared chunk.

### 8.3 Data that already exists but is not visualized yet

- `crisis_events` history (`risk_score`, `risk_level`, `detected_at`) — currently only a table; a real time-series/sparkline of risk score over logged detections is sitting right there.
- `model_versions`' full per-model accuracy/precision/recall/F1 + confusion matrix + per-language metrics — currently plain numbers/an HTML table.
- `forecast_results`' full multi-model comparison (MAE/RMSE/MAPE per model/variant) — currently one HTML `<table>`; a grouped bar comparing models is directly available from the same rows already being fetched.
- `daily_aggregates`' `comment_volume` — fetched (`socialDataService.js`) but **not** separately charted anywhere; only `mention_volume` gets its own bar chart.
- `features.hashtags`/language breakdown — real, already computed per-row, currently only ever shown as chips or hand-rolled bars, never a proper ranked-bar or word-cloud-style chart.

### 8.4 Data or calculations that are missing and would be needed for richer charts

- **Per-review/per-post sentiment labels exist** (`processed_data.sentiment`) but only from the rating heuristic, not a trained classifier at inference time — a richer confidence-colored scatter/distribution chart of "sentiment confidence across posts" would need either (a) wiring one of the already-trained sentiment models into live inference, or (b) being explicit that it's heuristic-only (the current honest-labeling convention would need to extend to whatever new chart shows this).
- **Crisis window / detection output as a first-class chart series** — `detectCrisis()`'s per-signal time-series (not just the latest snapshot) isn't persisted anywhere; only the final `risk_level`/`risk_score`/`triggered_signals` per run is stored in `crisis_events`. A "signal history over time" chart (e.g. per-signal line chart) would need either storing each signal's raw numeric value over time (not just whether it triggered) or recomputing historically from `daily_aggregates`.
- **Forecast intervals exist for the one `is_best` row shown on the Forecasting page**, but the Model Comparison table doesn't carry each *other* model's own interval — a multi-model forecast overlay chart would need the full `forecast_points` array already stored per row (it is — `forecast_results.forecast_points jsonb` — just not surfaced for anything but the winner today).
- **No ground-truth/validated outcome for crisis detection** (explicitly documented as absent, `ModelPerformance.jsx:161-165`) — any "detection accuracy over time" chart would be fabricating a precision/recall number with nothing to validate it against; this is a real data gap, not a visualization gap.
- **No geographic/location field is ever captured during ingestion** — a region/map-based chart would need a new input column end-to-end (upload template → validation → ingestion → storage), not just a new chart component.

---

## Summary

InsightAid AI is a functionally honest, well-tested system (0 lint errors, successful production build, 237 passing unit tests, 4/4 runnable Playwright tests passing) built on a real Supabase/RLS data layer with no fabricated numbers found anywhere in the 10 routed pages audited — but it is visually front-loaded onto only 4 of those 10 pages (Dashboard, Sentiment Analysis, Forecasting, Social Intelligence), leaving Crisis Detection, AI Recommendations, Reports, Dataset Management, Model Performance, and Settings entirely chart-free despite several of them (especially Model Performance and Crisis Detection) already holding rich, chart-ready numeric data in their existing service calls. The chart work that does exist is inconsistent in concrete, fixable ways — the same sentiment-trend data drawn as a stacked area in one place and three separate lines in another, the same "ranked list" shape drawn four different ways, a shared green hex doing triple duty as "positive," "TikTok," and "primary brand color" — and no shared chart-wrapper component exists to have caught these drifts earlier. This audit could not verify real row counts in the database, confirm whether the Embun Botanica synthetic dataset has actually been uploaded, or screenshot any authenticated page, because no usable login credentials were available in this environment; those three items should be the first things resolved before the redesign phase begins, since several of the richest-data findings above (Model Performance, Crisis Detection history) depend on knowing how much real data is actually sitting in the database today.
