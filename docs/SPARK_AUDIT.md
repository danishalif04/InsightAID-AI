# SPARK 2026 Phase 0 audit

Run on 25 Nov 2026, branch `spark-2026` (from `a5ad958`). Every number below comes from a command run on that date; the commands are listed so the audit can be repeated.

## Checks that passed

| Check | Result |
|---|---|
| `npx eslint . --max-warnings 0` | 0 errors, 0 warnings |
| `npx vitest run` | 63 files, 572 tests passed |
| `npm run build` | Succeeds (one chunk-size warning) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Secrets in tracked files (`git grep` for API key, JWT and token patterns) | None found. Only `.env.example` is tracked |
| Row Level Security | 28 `enable row level security` statements for 28 tables; no migrations since the 21 Nov security check |
| Python tests | crisis 20, forecasting 82, sentiment 70, scenarios 6: all passed |
| Click-through, 47 page loads (usertest1 Business pathway, 13 pages; usertest2 Local Shop pathway, 11 pages; desktop 1440 px and mobile 390 px) | No uncaught errors, no console errors, no error screens, no near-empty pages, no horizontal overflow on mobile |

## P0: fix before Phase 1

### P0-1. Five pages miss the fixed response-time target (< 3 s, objective O3)

Measured with the protocol's method (full navigation until network idle), local production build, live Supabase:

| Page | Desktop | Mobile |
|---|---|---|
| Dashboard | 4937 ms | 4636 ms |
| AI Recommendations | 6256 ms | 4183 ms |
| Forecasting | 3779 ms | 3453 ms |
| Crisis Detection | 3778 ms | 3804 ms |
| Financial Planning | 3673 ms | 3728 ms |

This agrees with the 19 Nov protocol result (`results/post_submission_2026-11/RESULTS.md`: target not met, Dashboard median 7079 ms). Causes found by recording every Supabase request:

1. **Sequential pagination of sales rows.** `raw_data` (sales) is read in 5 pages of 1000 rows, one after another, about 550 ms each: about 2.7 s on the Dashboard alone.
2. **No index on `processed_data`.** Only the primary key exists. The "first / last date" queries (`order=collected_at ... limit=1`) take 1.4 to 2.0 s each, and the two run one after the other.
3. **Duplicate fetches.** `user_preferences`, `business_profiles` and `business_assumptions` are each requested twice per page load; on Recommendations the whole data set is requested twice.

### P0-2. AI rewording is called twice on AI Recommendations

`explain-recommendations` is POSTed twice per page load (2.1 s and 3.8 s). This doubles the LLM cost and is the largest single part of that page's time.

### P0 fixes made (25 Nov)

| Change | Effect (same measurement, desktop, usertest1) |
|---|---|
| `shareInFlight` (`src/utils/shareInFlight.js`): calls made at the same moment share one request, nothing is cached. Applied to `getPreferences` and `getProfile` | Duplicate `user_preferences`, `business_profiles`, `business_assumptions` requests removed |
| `ModeProvider` exposes `modeReady`; AI Recommendations waits for it | `explain-recommendations` called once per load instead of twice (P0-2 fixed) |
| Sales pages after the first are requested in parallel, using the row count from the first page | Sales read no longer a 5-step waterfall |
| Earliest / latest comment queries run together | One round trip instead of two |
| Migration `0018_read_path_indexes.sql` (indexes on `raw_data` and `processed_data`) | **Written, not yet applied to the live database** (needs the owner's approval) |

| Page | Before | After code fixes | Target |
|---|---|---|---|
| Dashboard | 4937 ms | 4157 ms | not met |
| AI Recommendations | 6256 ms | 3788 ms | not met |
| Crisis Detection | 3778 ms | 3267 ms | not met |
| Forecasting | 3779 ms | 2823 ms | met on this run |
| Financial Planning | 3673 ms | 2856 ms | met on this run |

Single runs, not the 5-run protocol.

### Protocol re-run after the index was applied (25 Nov)

Index migration `0018` applied to the live database on 25 Nov with the owner's approval. Then the 19 Nov protocol was repeated unchanged (production build, `e2e/journey-existing-data.spec.js`, one discarded warm-up, five measured runs). Raw output: `results/spark_2026-11-25/timing_raw.txt`; table produced by `node results/spark_2026-11-25/summarise_timing.mjs` (`summary.txt`).

| Page | Median (19 Nov) | Median (25 Nov) | Max (25 Nov) | Verdict |
|---|---|---|---|---|
| Dashboard | 7079 ms | 1227 ms | 1334 ms | PASS |
| Sentiment Analysis | see 19 Nov RESULTS.md | 1213 ms | 1325 ms | PASS |
| Forecasting | see 19 Nov RESULTS.md | 1313 ms | 1331 ms | PASS |
| Crisis Detection | 4387 ms | 1548 ms | 1860 ms | PASS |
| AI Recommendations | see 19 Nov RESULTS.md | 3429 ms | 3739 ms | FAIL |

**Overall: target < 3000 ms is still NOT MET**, because of AI Recommendations (4 of 5 runs over 3000 ms). That page's time is now mostly the AI rewording call (about 2.3 s), which runs after the rule engine. Possible next step: reuse a stored explanation when the recommendations and their evidence have not changed, so only changed recommendations wait for the AI. The Dashboard's remaining cost is one 2.0 s request (first sales page plus exact count), which is a full table scan without the index. On Recommendations, the AI rewording call itself takes about 2.3 s.

## P1: fix during Phase 1 if time allows

| ID | Finding | Plan |
|---|---|---|
| P1-1 | Playwright: 28 of 33 tests fail when run with a demo account. Causes: the UI-mode tests set `localStorage`, but the app correctly lets the account's saved Supabase preference win; the Local Shop and no-data journeys expect a brand-new account with no shop; the signup test shows neither a confirmation nor an error within 10 s. These are test-account problems, not app crashes | Run the suite on a fresh anonymous session once anonymous sign-in exists (Phase 1 item 4); stub the preferences request in the UI-mode tests; re-check signup |
| P1-2 | Welcome page says sentiment runs "via a fine-tuned XLM-RoBERTa model". The live app uses a rating-based heuristic; XLM-RoBERTa (84.12%) was evaluated offline | Reword (over-claim) |
| P1-3 | Local Shop pages have no `<h1>` | Add a page heading for screen readers |
| P1-4 | Embun Botanica data ends 2026-10-21, so "last N days" views are past their data | Use the new cooperative dataset for SPARK demos |

## P2: note only

| ID | Finding |
|---|---|
| P2-1 | `ml/data_prep/tests/test_prep_offline.py` loads a raw Chinese review dataset at import time and fails collection when that file is absent on this machine. It should skip, not error |
| P2-2 | Two extraneous npm packages (`@napi-rs/wasm-runtime`, `@tybys/wasm-util`) |
| P2-3 | Build warns that one chunk is over the size limit |
| P2-4 | The agent-orchestrator planning call returns 400 and falls back to the deterministic plan (answers still work) |
| P2-5 | A local build run from a lowercase `c:\` path renders a blank page (two React copies); build from `C:\`. Vercel is not affected |
| P2-6 | Owner action: remove the Groq key line from the local `.env`, rotate the key and update the Supabase secret |

## Phase 1 plan (agreed 25 Nov: cut list for the remaining budget)

Build in this order, one commit per item on `spark-2026`:

1. Koperasi Siswa Maju synthetic dataset (fictional café + mini-mart, per-item daily sales, prices, costs, shelf life; BM/EN/中文 reviews) with a `DATA_CARD.md` entry, labelled synthetic
2. Prep & Stock Planner: forecast to prep/order quantities with an adjustable safety buffer; simulated waste (units, RM) for last-week ordering vs forecast ordering; items named in negative reviews ("basi", "stale") flagged and reduced
3. `metrics/spark2026.json` + Model & Evidence page, reusing the existing O1/O2 results; only the waste simulation is new
4. Before vs After impact card on the Dashboard, with its assumptions shown
5. Anonymous "Try demo" (Supabase anonymous sign-in) that seeds the koperasi for each visitor
6. SPARK A1 poster on the official template (`C:\Users\User\Downloads\ISPARK_2026_Poster_Template_A1_Editable.pptx`), delivered as PDF and JPG. Subtheme 5 (confirmed). No Project ID has been issued, so that field stays empty. Event line: 22 to 23 December 2026, UMK City Campus, Hybrid; AIMIX Silver Award in Recognition
7. Optional: reuse stored AI wording on AI Recommendations to bring it under 3 s

Cut: public F&B dataset backtest, SUS and feedback forms, Phase 3, BM/EN i18n, presentation mode, MyIPO pack, fixing the 28 e2e tests. At most one of Board Report PDF, WhatsApp share, pilot pricing tier. Danish records the video and the on-camera introduction.

## Phase 1 progress

| # | Item | Status | Commit |
|---|---|---|---|
| 1 | Koperasi Siswa Maju synthetic dataset | Done. Generator `ml/scenarios/koperasi_siswa_maju.py` (seed 2026), data in `ml/scenarios/koperasi_siswa_maju/data/`, app copy `src/data/koperasiSiswaMaju.json` (same rows). 6 pytest tests. `DATA_CARD.md` section 7 | `05b59f1` |
| 2 | Prep & Stock Planner | Done. Page `/prep-planner` (Intelligence menu). Logic `src/utils/prepPlanner.js` (15 Vitest tests), read path `src/services/prepPlannerService.js`. Runs on the account's own per-item sales and comments, or on the synthetic sample (labelled) | see git log |
| 3 to 7 | | Not started | |

### Item 2: how the planner works and what the replay shows

- **Plan**: expected sales = average of the same weekday over the last 4 weeks; quantity = expected x (1 + safety buffer), rounded up; items named in a negative review in the previous 7 days are cut by an adjustable percentage. Each row states its rule.
- **Waste replay**: last 28 days, two habits with the same buffer: "last week" (order what sold the same weekday a week earlier) vs "forecast" (the plan above). Stock used oldest first, discarded at shelf life, valued at unit cost. Each day uses only earlier data.
- **Result on the synthetic sample, 28 Oct to 24 Nov 2026** (computed by the module, not typed in): at a 10% buffer, waste RM 936.00 (last week habit) vs RM 495.95 (forecast), a simulated 47.0% reduction. **But the forecast is short more often: 648 units vs 458.** The page states this trade-off. At 0% buffer: RM 478.25 vs RM 217.65; at 20%: RM 1459.30 vs RM 859.40. These are simulations on synthetic data and must be labelled so.
- **Limits**: units sold are treated as demand (stockouts under-counted for both habits); items without a shelf life or cost are left out of the replay, not guessed. The forecast is a weekday average, not the Prophet model of objective O2.
- **Open**: the page has not been checked visually in a browser yet.

## Corrections to the brief's assumptions

- Model results already exist: XLM-RoBERTa 84.12% overall (EN 78.28%, BM 86.88%, ZH 94.37%) in `ml/sentiment/results/O1_SCORECARD.md`, and the forecasting protocol results in `ml/forecasting/results/`. No code-mixed accuracy exists because the evaluation set has no code-mixed labels.
- The app has 28 tables (not 27) and about 24 pages including the Local Shop pathway (not 9).
- There is no type-check step: `src/` is JavaScript by design.
