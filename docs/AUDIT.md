# FYP II — Phase 0 Repository Audit

Read-only audit against the FYP II master prompt's Part A. Builds on three existing documents rather than re-deriving everything from zero — `docs/audit/INSIGHTAID_SYSTEM_AUDIT.md` (full prior chart/page inventory, written before the Crisis Detection redesign — one correction below), `docs/redesign/PLAN.md` (in-progress visual redesign plan), and `docs/audit/NUMBERS_VERIFIED.md` (live calculation-logic verification). Where this document repeats something those already established, it cites rather than re-proves it; where reality has moved on since they were written, it says so explicitly.

**Headline finding — read this first**: Part A4 of the master prompt states *"Not yet built: all analytical models, live data ingestion, evaluation."* **This is not accurate for the current state of this repository.** Substantial real analytical work already exists: live data ingestion, a real 7-signal crisis detector, a real rule-based recommendation engine, offline-trained sentiment classifiers with real measured accuracy, and a real rolling-origin-evaluated forecasting model comparison. The master prompt's own Phase 0 instruction to "audit before you change anything" is exactly right — doing so here prevents rebuilding things that already exist, and surfaces real gaps that genuinely do need Phases 1–9's work. Section 3 details every specific conflict.

---

## 1. Pages, routes, and charts

**10 authenticated pages** route through `DashboardLayout` (not "nine" — Part A1 undercounts by one; `Model Performance` was added after the original 9-page plan). Full per-page chart inventory (type, data source, question answered) already exists in `docs/audit/INSIGHTAID_SYSTEM_AUDIT.md` Part 4 — reuse it, with **one correction**: that document states *"Crisis Detection, AI Recommendations, Reports, Dataset Management, Model Performance, and Settings contain zero Recharts elements."* This is now stale for **Crisis Detection** specifically — it was rebuilt since that audit was written (commit `65dbec1`) and now contains a real chart kit: a risk gauge, a risk timeline, a signal-severity heatmap, a synced multi-metric stack, calendar heatmap, sparklines, and ranked bars (`src/pages/CrisisDetection.jsx` + `src/components/charts/{RiskGauge,SyncedStack,CalendarHeatmap,RankedBar,Sparkline,CrisisBands}.jsx`). The other five pages named in that sentence are still chart-free, as stated.

| Route | Page | Has charts? |
|---|---|---|
| `/` | Dashboard | Yes (area, donut, bar) |
| `/sentiment` | Sentiment Analysis | Yes (trend line/area) |
| `/forecasting` | Forecasting | Yes (composed chart) |
| `/crisis-detection` | Crisis Detection | **Yes — corrected above** |
| `/recommendations` | AI Recommendations | No |
| `/social-intelligence` | Social Intelligence | Yes |
| `/reports` | Reports | No |
| `/datasets` | Dataset Management | No |
| `/model-performance` | Model Performance | No |
| `/settings` | Settings | No |

Of the planned "premium chart kit" visual redesign (`docs/redesign/PLAN.md`), only **Crisis Detection (1 of 6 planned pages)** has actually been rebuilt with it. Dashboard, Forecasting, Sentiment Analysis, Social Intelligence, and AI Recommendations are unchanged from the pre-redesign design.

## 2. Supabase schema

**18 real tables** across 9 sequential migrations (`supabase/migrations/0001_init.sql` through `0009_marketplace_products.sql`) — not "~27" (Part C's estimate). `0008_custom_template_support.sql` widens a check constraint only; it defines no new table.

| # | Table | Migration | RLS |
|---|---|---|---|
| 1 | `profiles` | 0001 | `auth.uid() = id` |
| 2 | `companies` | 0001 | `auth.uid() = user_id` |
| 3 | `user_preferences` | 0001 | owner-only |
| 4 | `api_keys` | 0001 | owner-only |
| 5 | `report_templates` | 0001 | owner-only |
| 6 | `storage_usage` | 0001 | owner-only (defined, **never read anywhere in `src/`** — dead table) |
| 7 | `business_profiles` | 0002 | owner-only |
| 8 | `business_assumptions` | 0002 | owner-only |
| 9 | `raw_data` | 0003 | owner-only |
| 10 | `processed_data` | 0003 | owner-only |
| 11 | `daily_aggregates` | 0003 | owner-only |
| 12 | `model_versions` | 0004 | **shared/global** — any authenticated user can `select`; only service role can write |
| 13 | `forecast_results` | 0005 | owner-only |
| 14 | `crisis_events` | 0006 | owner-only |
| 15 | `recommendations` | 0007 | owner-only (**no `status` column exists** — relevant to Phase 5's status tracking) |
| 16 | `marketplace_products` | 0009 | owner-only |
| 17 | `marketplace_product_snapshots` | 0009 | owner-only |
| 18 | `marketplace_sync_log` | 0009 | owner-only |

**Real pipeline vs sample data, per table**: `raw_data`/`processed_data`/`daily_aggregates`/`business_profiles`/`business_assumptions`/`forecast_results`/`crisis_events` are fed by the real ingestion/analytics pipeline when a user uploads data or runs an analysis — not sample/mock rows (`src/data/` is empty except `.gitkeep`; no mock fixture files remain in the frontend). `model_versions` is only populated by manually-run SQL generated from an offline Colab notebook — as of this audit, that SQL has not been run, so it is genuinely empty. `marketplace_*` tables exist (migration ran) but have no adapter actually syncing into them yet — present ahead of being used.

**Live row-count verification attempted, not completed**: `supabase projects list` reports this project (`jtyjfblzxvmryjmvuzds`) as `ACTIVE_HEALTHY` as of this audit, but a direct connection attempt from this environment failed — `nslookup` resolved the hostname to an IPv6 address but then timed out, and a Node/Supabase-JS query got `ENOTFOUND`. This is most likely a transient DNS-propagation delay right after an unpause (the project had been paused for ~3 weeks; see `docs/audit/NUMBERS_VERIFIED.md` for the full prior-session account of that outage), not a code or permissions problem. **Re-run a live check once connectivity is confirmed** rather than treating this audit's schema section as validated against live row counts — the schema/RLS facts above come from reading the migration files directly, which doesn't require a live connection and is authoritative regardless.

## 3. Part A vs. reality — every conflict found

| Part A claim | Reality | Verdict |
|---|---|---|
| "Not yet built: all analytical models, live data ingestion, evaluation" | Live ingestion (CSV/JSON/Excel upload, column-synonym auto-matching), a real crisis detector, a real recommendation rule engine, offline-trained sentiment classifiers with measured results, and a real rolling-origin forecast comparison all already exist | **Major, flag prominently** |
| Crisis rule: "% negative > 60% in a window **plus** rate of increase... then a secondary Scikit-learn classifier to suppress false alarms" | The real implementation is a different, already-built 7-signal scheme (3 level checks at 30%/50% not 60%, 2 velocity checks, 2 z-score anomaly checks against the business's own 7-day baseline) — no secondary ML false-alarm classifier exists | **Real design mismatch** — Phase 5 needs a decision: keep the existing 7-signal scheme (already tested, already has real demo evidence) or replace it with Part A3's simpler single-threshold design, not both silently |
| O2: Prophet ± sentiment regressors, tested with Diebold-Mariano | Prophet sales-only and sentiment-enhanced variants both exist and run (`ml/forecasting/src/prophet_model.py`) and are evaluated head-to-head on identical rolling-origin folds — but **no Diebold-Mariano test exists anywhere in the codebase** (confirmed by search) | **Real, specific gap for Phase 4** |
| Forecasting dataset | Model comparison was run on **public benchmark retail data** (Favorita/Olist/Online Retail II) — not a Malaysian dataset, and not any specific business's real sales | Consistent with Part A's "not yet built: live data ingestion [feeding the models]" in spirit, but means **no forecasting result yet reflects real Malaysian/local-shop data** — real gap for Phase 2 |
| "Holiday" feature for forecasting | A `holiday` column exists in the sales data-prep code, but it is a **generic binary flag inherited from the public benchmark datasets' own holiday columns** (Rossmann's StateHoliday/SchoolHoliday, Favorita's holidays_events.csv) — not a Malaysian calendar (no Hari Raya/CNY/Deepavali/payday/11.11 dates anywhere) | **Real gap, not partially done** — ignore the surface `grep` hit on "holiday," it's not the same thing |
| React 19, Vite 8, React Router 7 | `package.json` confirms exactly these major versions (`react@^19.2.7`, `vite@^8.1.3`, `react-router-dom@^7.18.1`) | **Matches** — no version conflict |
| "~27 tables" | 18 real tables (Section 2) | **Overcounted by 9** |
| "Nine pages" | 10 routed pages | **Undercounted by 1** |
| Recommendation engine: "Optional LLM layer only for rewording, never for deciding" | Exactly matches the real implementation — Gemini (`explain-recommendations`) can only return two string fields (`rationale`, `context`); every other field it might return is discarded by validation code | **Matches** |
| Two business modes (Local Malaysian Shop / E-commerce Startup) | Does not exist. The app has an unrelated existing "mode" concept (Startup vs E-Commerce, `src/constants/modes.js`) that is a **pure client-side display filter** over the same data — not two different data adapters, onboarding flows, or default cards per Part A's Phase 1 design | **Not built; existing "mode" concept is a different thing with the same name — avoid confusing the two when building Phase 1** |

## 4. Gap list, mapped to Phases 1–10

**Phase 1 (business modes)**: not built. The existing Startup/E-Commerce mode toggle is unrelated (a display filter, not a data-adapter system) and should not be assumed to satisfy this phase.

**Phase 2 (data acquisition)**: no `DATA_CARD.md` exists. No Malaysian/multilingual sentiment corpus (Malaya/Mesolitica, Shopee/Lazada Malaysia, ChnSentiCorp) has been acquired — sentiment training used a different real dataset (see `ml/sentiment/README.md` for its actual provenance, not re-verified in this pass). Forecasting training used Favorita/Olist/Online Retail II, not a Malaysian dataset. No synthetic local-shop generator (`synthetic_shop.py`) exists — the demo account's synthetic data (Embun Botanica) was generated outside this repo via an external AI prompt, not a documented, parameterized generator script.

**Phase 3 (sentiment/O1)**: TF-IDF+LR, mBERT, XLM-R are trained and evaluated (`ml/sentiment/`) with real per-model, per-language accuracy/F1 and a translate-vs-original ablation already done (XLM-R real result: 84.1%/0.807 F1 original-language vs 71.9%/0.689 translated). **Not yet done**: Cohen's kappa against a second annotator (no ≥200-comment double-labelled set found), bootstrap 95% CIs, McNemar's test, a 50-most-confident-errors-per-language export. These are specific, real, checkable gaps — not a "redo the whole module" gap.

**Phase 4 (forecasting/O2)**: naive/ARIMA/Prophet(±sentiment)/XGBoost/LSTM all exist and are evaluated via real rolling-origin CV with MAE/RMSE/MAPE. **Not yet done**: sMAPE, MASE (MAPE-near-zero problem is real and currently unaddressed), the Diebold-Mariano test (confirmed absent), a 0–21-day sentiment-vs-sales lag cross-correlation analysis, and running the whole comparison on Malaysian/local-shop-shaped data rather than only the public benchmarks.

**Phase 5 (crisis + recommendations/O3)**: a 7-signal detector exists (different design than Part A3 specifies — see Section 3) with a real episode/history view and tested date-agnostic detection logic. **Not yet done**: the specific "% negative > 60% + velocity, then a secondary Scikit-learn false-alarm classifier" design (a real architectural decision needed: adapt the existing scheme vs. build Part A3's scheme alongside it); a crisis injector for evaluation with known injection start times; lead-time measurement; a before/after false-alarm-rate report; mapping recommendation types to Coombs' (2007) SCCT response categories; a "was this useful?" thumbs-up/down log (no such column/table exists).

**Phase 6 (visualization redesign)**: in progress, 1 of 6 planned pages done (Section 1). No `docs/DESIGN_PRINCIPLES.md` or `reports/CHART_AUDIT.md` exists yet — the redesign so far has been implementation-first, not principle-documented-first as this phase requires.

**Phase 7 (accessibility UI modes)**: not built. No `UIModeProvider`, no Low-Sensory mode, no Senior mode, no `docs/ACCESSIBILITY_MODES.md`, no axe-core integration in the Playwright suite (confirmed: `@axe-core/playwright` is not a dependency).

**Phase 8 (validation)**: no `reports/VALIDATION_REPORT.md`, no in-app Evaluation page, no `experiment_runs`/`scenario_results` tables, no load-testing setup (Locust/k6), no RLS isolation test found in the existing Playwright/Vitest suites.

**Phase 9 (valuation)**: no UAT instrument (SUS/TAM/DeLone-McLean), no task-based test logging, no expert-review form, no `/ml/evaluation/value_model.py`, no `reports/VALUATION_REPORT.md`.

**Phase 10 (demo readiness)**: no `npm run demo:reset`, no two named demo workspaces ("Kedai Kopi Pak Mat" / "NusaDrinks Online" specifically — a *different* synthetic demo account, Embun Botanica, already exists and is well-populated, but not under those names or as a reset script), no `docs/DEMO_SCRIPT.md`, no crisis-replay-as-a-reusable-control (Crisis Detection does have a day-by-day replay scrubber already, per the redesign — reusable groundwork for this), no `reports/screenshots/` automation across modes×languages (none of which exist yet to screenshot).

**Scenario configs (Part E, S1–S7)**: none exist. No `/ml/scenarios/` directory, no YAML configs, no `python -m ml.run_scenario` entry point.

**References (Part F)**: no `docs/REFERENCES_TO_VERIFY.md` exists yet.

---

**Total real, confirmed gaps for Phases 1–9**: every phase above has at least one concrete, specific, already-confirmed gap (not a guess) — none of Phases 1, 2, 7, 8, or 9 has any part built yet; Phases 3, 4, 5, 6 are partially built with specific, named remaining items.

**Stopping here per Phase 0's instruction. Awaiting go-ahead before Phase 1.**
