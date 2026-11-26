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
| 2 | Prep & Stock Planner | Done. Page `/prep-planner` (Intelligence menu). Logic `src/utils/prepPlanner.js` (15 Vitest tests), read path `src/services/prepPlannerService.js`. Runs on the account's own per-item sales and comments, or on the synthetic sample (labelled) | `a9186b1` |
| 3 | `metrics/spark2026.json` + Model & Evidence page | Done. Builder `src/utils/sparkMetrics.js`, script `node scripts/build-spark-metrics.mjs`, page `/model-evidence` (Intelligence menu). A Vitest test fails if the committed JSON drifts from the source result files. Verdicts are computed against the fixed targets | `799d70e` |
| 4 | Before vs After impact card (Dashboard) | Done. `src/components/common/ImpactCard.jsx`, logic `src/utils/impactSummary.js` (4 Vitest tests). Computed inside `getDashboardData` from rows the Dashboard already fetches, so no extra request. Assumptions in a collapsible list on the card. Shows only the account's own data; when that cannot support the replay it shows a link to the planner's sample instead of borrowing figures | `f1fed70` |
| 5 | Anonymous "Try demo" | **Code done, not yet verified end to end.** Button on Welcome (hero and final call to action) and Login. `src/services/demoService.js` signs in anonymously, then seeds through the real `ingestRows` pipeline; seed builder `src/utils/demoSeed.js` (6 Vitest tests); banner inside the app for anonymous users. Browser check on 25 Nov: Supabase returned 422 because anonymous sign-ins are switched off; the button showed the friendly message. **Owner action: enable Authentication > Sign In / Providers > Allow anonymous sign-ins**, then re-run the check | `6952674` |
| 6 | SPARK A1 poster | Done, two items pending. `node poster/build/build.mjs spark` → `poster/insightaid_spark2026_poster.pdf` and preview PNG. Same build as AIMIX (AIMIX output verified unchanged). Waste and response-time figures read from `metrics/spark2026.json`. Fact-check list in `poster/README.md`. **Pending:** SPARK video link (`poster/links.json` → `spark_video`, prints LINK PENDING until set); demo QR works only after anonymous sign-in is enabled | see git log |
| 7 | Optional: stored AI wording on Recommendations | **Done and measured.** Migration 0019 applied to the live database on 25 Nov with the owner's approval (`supabase db query --remote -f`, not `db push`, because the live project has no recorded migration history). Protocol re-run: **5 of 5 pages under 3000 ms on every run; target MET** (see below). Original notes: `src/utils/explanationCache.js` (5 Vitest tests) keys each explanation by SHA-256 of exactly what is sent to the AI (rule id, category, priority, title, evidence, business context, version tag). `recommendationService.fetchExplanations` reuses stored wording and calls the AI only for new or changed recommendations; 4 service tests. Migration `0019_recommendation_explanation_cache.sql` (one new table, RLS, additive). Without the table the app behaves exactly as before. **Owner action: approve applying 0019 to the live database**, then re-run the 5-run timing protocol | see git log |

### SPARK video (26 Nov 2026)

Rendered: `docs/spark/video/final/INSIGHTAID_AI_SPARK2026.mp4` (4:32, 1080p30, −14 LUFS; media git-ignored). Motion graphics only, no stock footage; original synthesised music; captions burned in and in `docs/spark/SPARK_VIDEO_CAPTIONS_EN.srt` (script wording). Details and pipeline in `docs/spark/STYLE_NOTES.md`, sources in `docs/spark/video_src/render/`. **Before publishing:** merge `spark-2026` to `main` (end-card QR opens the live demo). Uploaded 26 Nov: https://youtu.be/KYKYYMVlsx8 (in `poster/links.json` → `spark_video`, poster rebuilt).

### Submission pack (26 Nov 2026)

`docs/spark/submission/`: extended abstract in the organiser's template (`INSIGHTAID_AI_ISPARK2026_Extended_Abstract.docx` and `.pdf`, 1,499 words excluding references, Times New Roman 12 pt, 1.15 spacing, A4, 2.54 cm margins, 2 figures and 1 table; built by `src/build_abstract.cjs` from `metrics/spark2026.json`, which stops if a verdict changes) and `BRIEF_DESCRIPTION.txt` (132 words). Poster Project ID set to "-" on Danish's request until the ID is issued. UAT 4.07 left out of the abstract until n = 15 is confirmed.

### Item 7 notes

- Expected effect, to be measured, not assumed: a repeat visit with unchanged data skips the ~2.3 s AI call. The first visit after any data change still waits for the AI. The protocol discards its first (warm-up) run, which is the run that fills the cache; this must be stated next to the new result.
- The AI still only rewords; the rule engine decides. Bumping `EXPLANATION_CACHE_VERSION` invalidates all stored wording (e.g. after a prompt change).
- Applying 0019: the command reported "policy already exists" although the table had been missing a moment before. A read-only check afterwards showed the table exactly as the migration defines it (7 columns, RLS on, 1 policy, primary key and unique (user_id, cache_key), 0 rows), and the API returned 200. Read as the statement having run twice, not a partial apply.
- Migration check (25 Nov): every table and added column from 0001 to 0018 was confirmed live through the API; 0019 was the only missing piece.

### Item 7 result: protocol re-run after 0019

Same protocol as 25 Nov (production build, `e2e/journey-existing-data.spec.js`, usertest1, one discarded warm-up, five measured runs). Raw: `results/spark_2026-11-25_item7/timing_raw.txt`; table by `node results/spark_2026-11-25_item7/summarise_timing.mjs` (`summary.txt`).

| Page | Median before (25 Nov) | Median after | Max after | Verdict |
|---|---|---|---|---|
| Dashboard | 1227 ms | 1309 ms | 1550 ms | PASS |
| Sentiment Analysis | 1213 ms | 1218 ms | 1316 ms | PASS |
| Forecasting | 1313 ms | 1353 ms | 1465 ms | PASS |
| Crisis Detection | 1548 ms | 1618 ms | 1887 ms | PASS |
| AI Recommendations | 3429 ms | 1342 ms | 1460 ms | PASS |

**Overall: target < 3000 ms is MET (5 of 5 pages, every run).** Caveat, stated wherever this is shown: the discarded warm-up run is the one that stored the AI wording, and it took 4435 ms for Recommendations (in the raw file). A first visit after the data changes still waits for the AI. `metrics/spark2026.json`, the Model & Evidence page and the SPARK poster now read this result and carry the caveat.

### Item 6 update (25 Nov, evening): poster v2 on the official template

- Rebuilt on the organiser's ISPARK 2026 A1 template (structure, order, header, footer); details and fact-check list in `poster/README.md`.
- Second scripted stale incident (karipap, 21 Nov) added to the synthetic data so the planner's review flag is live; simulated waste figures recomputed: RM 951.75 vs RM 499.10 (47.6% less), units short 455 vs 648.
- Planner "Why" column now wraps instead of running off the card.
- **Blocker found:** anonymous sign-in is enabled, but every anonymous sign-in fails with `unexpected_failure` because `handle_new_user()` copies `new.email` (null for anonymous users) into `profiles.email` (NOT NULL). Fix written as migration `0020_anonymous_profile_email.sql` (`coalesce(new.email, '')`, function body only). **Not applied: the permission check requires the owner's explicit approval.**

### Item 6 notes

- The Welcome page still says "This project is open source" (Deploy your own copy section), which conflicts with the "All rights reserved" licence decision. Owner to decide the wording.
- The Planner and Model & Evidence pages were checked visually on 25 Nov (production build, usertest1): no errors, layout correct.

### Item 5 verified end to end (25 Nov, evening)

- Migration `0020_anonymous_profile_email.sql` applied with the owner's approval (`supabase db query --remote -f`); read-only check confirms `handle_new_user()` now uses `coalesce(new.email, '')`.
- Browser check on the production build: "Try the demo" reaches the Dashboard in 3452 ms with no console errors. The visitor sees the synthetic-data banner, store "Koperasi Siswa Maju (demo)", the Before vs After card with computed figures (RM 951.75 vs RM 499.10, 47.6% less; 193 more units short), product performance, and the sentiment trend (the 21 Nov karipap incident shows as a 100% negative day).
- Known gap: Platform Distribution and Daily Mention Volume stay empty for demo visitors, because they count social posts (`mention_volume`) and the demo seeds reviews only. Owner decision pending on seeding synthetic social posts.
- Two anonymous demo users were created by these checks (about 1,700 rows each); remove them with the other old anonymous users before the public demo.

### Item 5 notes

- Each visitor gets a private account (RLS on `auth.uid()`), profile "Koperasi Siswa Maju (demo)", pathway Malaysian Local Shop, 1,342 sales rows and 366 reviews. Dates move forward by whole weeks so the data ends in the week before the visit (weekdays kept). Seeding is skipped if the account already has sales.
- Anonymous accounts and their rows stay in the database after the visitor leaves. Before the public demo, consider (owner decision, all free tier): enabling CAPTCHA for anonymous sign-ins, keeping the default sign-in rate limit, and periodically deleting old anonymous users (`auth.users where is_anonymous`; their rows cascade).
- Local Shop pages that use the browser-stored shop (Overview, Products and Pricing, What-If) are not seeded; they still offer their own example shop.

### Item 4 notes

- The card needs per-item sales with `shelf_life_days` and `cost` in the sales payload. Existing accounts (Embun Botanica) have no shelf life, so they see the link, not numbers. **Item 5's koperasi seed must write `product`, `quantity_sold`, `unit_price`, `revenue`, `cost` (line total) and `shelf_life_days` into each sales payload** so the card and planner work for demo visitors.
- `processed_data` reads on the Dashboard now also select `product`, so reviews match items exactly instead of by text only.

### Item 3: sources and one discrepancy

Sources: O1 `ml/sentiment/results/model_versions_v20261020-171546.json`; O2 `ml/forecasting/results/protocol_summary_a8b3bb637d28.json`; O3 timing `results/spark_2026-11-25/summary.txt`; crisis `ml/crisis/results/ablation_raw.json`; waste replay recomputed from `src/data/koperasiSiswaMaju.json`.

Computed verdicts: O1 MET (XLM-R 84.12%); O2 MAPE PARTIAL (1 of 3: 21.41, 15.17, 13.28); O2 sentiment NOT MET; O3 response time PARTIAL (4 of 5 pages); UAT has no value shown because the raw responses are not in the repo.

**Discrepancy found (needs the owner's decision on wording):** README, `SUMMARY_FOR_SLIDES.md` and the viva blueprint say the sentiment-enhanced forecast was "worse in 6 of 8 Diebold-Mariano tests, none significant". The result file those p-values come from (`a8b3bb637d28`, p 0.137 to 0.781) gives **5 of 8** with higher MAPE (also 5 by MAE and MASE; 4 by RMSE or DM sign). The other run (`a1bf3708ed4a`) gives 6 of 8 by MAE but has one significant test (p = 0.014), so it does not match "none significant" either. The verdict is unchanged (no significant improvement, NOT MET). The app now shows the computed "5 of 8". The frozen dissertation documents were not edited.

- **Open**: Model & Evidence page not yet checked visually in a browser (same for the planner).

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
