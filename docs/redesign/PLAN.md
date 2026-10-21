# INSIGHTAID AI — Premium Redesign Plan

Step 0 verification output + Phase A/B/C plan for the six target pages. Written against the live `usertest1@insig...` (masked) account, E-Commerce mode, with the Embun Botanica synthetic dataset. Nothing in this document has been built yet — this is the plan, stopped here for approval per the brief.

---

## STEP 0 — VERIFICATION RESULTS

### 0.1 Login + mode check

Signed in successfully with `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` (usertest1 account) via Playwright against the dev server. Both modes render without crashing:

- **E-Commerce mode**: full render confirmed, real data throughout (see screenshots).
- **Startup mode**: toggled via `insightaid.mode` localStorage key (`src/contexts/ModeProvider.jsx:5`) + reload — confirmed no crash, page renders (mode is a pure client-side display filter, not a separate account/dataset — same data underneath, see `src/constants/modes.js`, `src/contexts/ModeProvider.jsx`).

### 0.2 Data inventory (via live, authenticated Supabase queries — not raw admin SQL)

| Table | Total rows (this account) | Date range | Notes |
|---|---|---|---|
| `raw_data` | 1,000 | n/a (upload timestamps, not data dates) | 406 `social/csv_upload`, 373 `reviews/csv_upload`, 221 `sales/csv_upload` |
| `processed_data` | 779 | 2026-04-25 to 2026-10-21 | By platform: x 198, shopee 226, threads 90, tiktok 265 |
| `daily_aggregates` | 441 | 2026-04-25 to 2026-10-21 | shopee 122 rows, threads 66, x 115, tiktok 138 |

**Embun Botanica data is present and matches the expected window exactly** (2026-04-25 → 2026-10-21). **No evidence of mixing with fixture-seed data** — `dataPipelineService.js`'s `seedFixtureSample()` inserts exactly 8 fixed demo posts dated "today"; the actual spread (779 rows across 180 days, 5 languages, 4 platforms) is structurally inconsistent with that fixture set, and a direct platform/template breakdown (below) fully explains all observed numbers from the synthetic upload alone.

**Languages present** (`processed_data.language`): en 448, ms 152, zh 58, ms-en 24, unknown 97.

**`processed_data.features` sample** (real row, tiktok):
```json
{"hasUrl":false,"hashtags":["glowwithembun","skincareroutine"],"language":"unknown","textLength":69,"tokenCount":5,"hashtagCount":2,"mentionCount":0}
```
`hashtags` IS captured correctly per post. **`likes`/`comments`/`shares` are NOT stored separately** — `dataPipelineService.js:35-39`'s `sumEngagement()` collapses `engagement`/`likes`/`comments`/`shares` into one combined `engagement` number at ingestion time; the individual components are discarded. This is a real limit on Phase C §4.5(f)'s "engagement anatomy" chart — see Phase C notes below.

**`raw_data` sales rows**: confirmed present, canonical columns intact. Sample payload:
```json
{"cost":"89.27","date":"2026-10-05","product":"Rice Water Foaming Wash","revenue":"249.0","category":"Cleanser","discount":"0.0","unit_price":"24.9","quantity_sold":"10"}
```

### 0.3 The "22,289 TikTok mentions" discrepancy — ROOT CAUSE CONFIRMED

Not a data-mixing issue. **"Mentions" in the UI is not a count of posts — it's the SUM of each post's `engagement` number**, mislabeled.

- `src/utils/socialAnalytics.js:133-135` (`computePlatformComparison`): `mentionVolume = platformAggregates.reduce((sum, row) => sum + (row.mention_volume ?? 0), 0)`
- `src/utils/featureEngineering.js:64-65` (`aggregateDaily`): `mentionVolume = engagementValues.reduce((sum, value) => sum + value, 0)` — i.e. `daily_aggregates.mention_volume` is itself already a **sum of engagement**, not a post count.
- TikTok has only 265 real posts in `processed_data`, each with `engagement` in the hundreds (e.g. 446, 455, 473 in sampled rows) — summed across 180 days, this legitimately reaches ~22,289. The number is arithmetically correct; the **label is wrong**. This must be fixed in Phase C (rename to "Engagement volume" or add a real post-count metric alongside it — `platformRows.length` is already computed in `computePlatformComparison` and silently discarded).

### 0.4 Root cause of the 5 reported bugs

**1. Executive Dashboard "stuck on Loading..."** — **Does not reproduce as a hang.** Direct diagnostic (Playwright, 8s wait, network+console logging) shows the page fully resolves with correct real data (`Sentiment 67% positive`, `Crisis risk Normal (0/100)`, `Revenue Forecast RM 2,151`, full charts) within ~2-5 seconds of navigation — no pending/hung network requests after that. **However**, the "before" screenshot (captured after a fixed 1.5s wait, the same wait a real user's first glance would see) shows exactly the reported "Loading…" state — confirming the real issue is **load time, not a deadlock**. Root cause: `getDashboardData()` (`src/services/dashboardService.js:39-44`) bundles `fetchProcessedRows()` + `fetchDailyAggregates()` + `buildContext(mode)` (itself 6 parallel Supabase calls: `getProfile`, `runCrisisDetection`, 3x `countRows`, `countHistoricalMonths` — `src/services/recommendationService.js:51-58`) + `getLatestForecastRun()` in one `Promise.all`. It's a lot of real round-trips for one page, genuinely taking several seconds, with only a bare "Loading…" text as feedback — reads as "stuck" to an impatient user. **Fix direction (not implemented)**: real skeleton loading state (Phase B's `ChartCard`/`AsyncSection` restyle already covers this) rather than plain text; consider whether `buildContext`'s `countRows` x3 can be one query (`select template_id, count(*) ... group by template_id` via an RPC) instead of 3 round-trips — flagged as a possible RPC addition, not required.
   - Secondary, benign finding: duplicate/aborted `raw_data` count requests observed (React 18 `StrictMode` double-invoking effects in dev — `src/main.jsx:7`). Does not affect production builds or correctness; not a redesign concern.

**2. AI Recommendations "stuck on Running the rule engine...", Business Context empty** — **Same root cause as #1: load time, not a hang.** 10s diagnostic confirms full resolution: Business Context renders all 11 real factors (`Sales data on file.`, `Crisis risk level: normal...`, `Data readiness 5/5 (Full Analytics)`, etc. — `src/utils/recommendationRules.js:139-186`), and real rule-based recommendations render. **One real, separate issue found**: the Gemini `explain-recommendations` Edge Function returned an actual `502` during this test (console-confirmed). The app **degrades correctly and honestly** — shows "Gemini explanations are unavailable right now — recommendations below are still real, rule-based results" rather than hanging or fabricating a rationale. This is the system working as designed (FYP2.md §55), not a bug, though the 502 itself (likely the same Gemini overload class already mitigated elsewhere with retry logic) is worth monitoring.

**3. Forecasting chart** — three claims, two confirmed, one not reproduced:
   - *"Line ends 2026-10-24 while axis runs to 2026-10-28"* — **NOT REPRODUCED.** Direct inspection of the rendered SVG (`recharts-line-curve` path `d` attribute) shows the line's path data spans the full chart width (x=36 to x=1110) across all 7 data points through 2026-10-28, matching the x-axis exactly. The stored `forecast_results` row likewise has 7 complete points, dates 2026-10-22 through 2026-10-28, none null. Likely explanation: the flat, thin "Predicted" line visually blends against the matching-hue uncertainty band in a casual glance at the screenshot — a real **visual contrast problem** (line vs. band color), not a data or rendering-logic bug. Phase C should pick a higher-contrast predicted-line color against its own band fill.
   - *"Uncertainty band fills the whole 0-4k range"* — **CONFIRMED.** The stored row has `rmse=912.75`; `run-forecast`'s margin = `1.96 × rmse` = ±1789 around a predicted value of 2151 (`supabase/functions/run-forecast/index.ts`, margin calculation). Against a y-axis auto-scaled to the data's own max (~3940), the band genuinely occupies ~88% of vertical space. **This is mathematically correct, not a bug to silently change** (per the brief's instruction) — it honestly reflects how wide a 95% interval really is for a weak 28.4%-MAPE baseline on a noisy series. A correct, narrower interval would require a model with genuine day-by-day predictive variance (e.g. Prophet's native confidence intervals, which widen appropriately further into the horizon) rather than one flat historical RMSE applied uniformly to all 7 days regardless of distance — this baseline's interval is also **flat across the whole horizon** (every day has the identical ±1789 margin), which is itself a known limitation of the moving-average baseline, not fixable without changing which model produces the number. Phase C should visually de-emphasize the band (lower opacity, thinner) and label it clearly as "Baseline — wide by construction," rather than changing the math.
   - *"No historical actuals shown"* — **CONFIRMED.** `src/pages/Forecasting.jsx:76-81`: `chartSeries` is built solely from `best.forecast_points` — no historical revenue series is fetched or merged in at all. Real fix: merge in `salesSeries.js`'s daily revenue output (Phase B) before the forecast-start boundary.

**4. Social Intelligence (Shopee 0 mentions / 68.7% sentiment; Threads "—"; default tab empty)** — **All three CONFIRMED, root-caused precisely:**
   - **Shopee**: Shopee posts come from the `reviews` CSV template (`platform: 'shopee'`), which has **no `engagement`/`likes`/`comments`/`shares` columns at all** (`src/utils/csvTemplates.js`'s `reviews` template: `[date, product, review_text, rating, platform]`). `sumEngagement()` (`src/services/dataPipelineService.js:37-40`) therefore always returns `null` for Shopee rows → `mention_volume` is always 0 for Shopee in `daily_aggregates`. Meanwhile Shopee rows DO have `rating` → the rating heuristic (`classifyByRating`, `src/services/dataPipelineService.js:106`) DOES populate `sentiment_score` → 68.7% sentiment is real and correctly computed from a completely different data path than "mentions." The two numbers are both individually correct; the page just juxtaposes two metrics with disjoint data sources without explaining that, reading as contradictory.
   - **Threads**: Threads **only ever appears in the `social` CSV template** (confirmed via direct query: `reviews/threads` = 0 rows, `social/threads` = 90 rows), and the `social` template has no `rating` column — so `classifyByRating()` is never called for Threads (`templateId === 'reviews' ? classifyByRating(rating) : null`, `dataPipelineService.js:106`) → `sentiment_score` is `null` for every Threads row, permanently, by the current upload design → the UI correctly shows "—" rather than fabricating a number. Shopee/TikTok/X all have *some* rows from the `reviews` template (with ratings) mixed in under the same platform label, which is why they show a sentiment figure and Threads structurally cannot.
   - **Default tab empty**: `src/pages/SocialIntelligence.jsx:32-33`: `effectivePlatform = selectedPlatform ?? platforms[0] ?? null` — the default tab is simply whichever platform happens to be first in `computePlatformComparison`'s output order (itself just `Set` insertion order from however Supabase returned the rows), with no deliberate "pick the platform with the most/best data" logic. It currently resolves to Shopee, which (per the above) has 0 mention-volume and an empty "Top Posts" list, so the very first thing a visitor sees is the emptiest tab.

**5. Floating AI assistant button overlaps content** — **CONFIRMED, directly visible in multiple screenshots** (e.g. overlapping the Forecasting page's Model Comparison table, and Social Intelligence's Trending Hashtags list, obscuring the hashtag count/bar near the bottom-right). Root cause: `src/components/common/AiAssistantButton.jsx:9-13` — `className="fixed bottom-6 right-6 z-30 ..."`, a bare fixed-position button with no content-awareness, no responsive repositioning, and no collision avoidance, rendered globally in `DashboardLayout` on every page regardless of what sits underneath it.

### 0.5 Screenshots

Saved to `docs/redesign/before/`, 1440px width, light + dark theme, all six target pages (`executive-dashboard`, `sentiment-analysis`, `forecasting`, `crisis-detection`, `ai-recommendations`, `social-intelligence`, each `_desktop_light.png` / `_desktop_dark.png`).

---

## PHASE A — BUG FIXES (not yet implemented — plan only)

| # | Fix | Test needed |
|---|---|---|
| 1 | Replace bare "Loading…" text with a real skeleton (ChartCard's built-in `AsyncSection` loading state, Phase B) on Dashboard + AI Recommendations. No logic change — purely perceptual, since both pages already resolve correctly, just slowly. | n/a (visual only) |
| 2 | Same as #1 — the "stuck" Business Context is the same underlying load-time issue. | n/a |
| 3a | Forecasting: increase color contrast between the "Predicted" line and the uncertainty band fill (e.g. darker/more saturated line stroke, band at lower opacity). | Visual only |
| 3b | Forecasting: merge historical actual revenue (from new `salesSeries.js`, Phase B) into the chart before the forecast boundary; add a vertical "today" reference line. | `salesSeries.test.js` |
| 3c | Forecasting: do NOT change the interval math. Add an explanatory tooltip/badge: "Baseline model — wide uncertainty reflects a 28%+ MAPE; a tighter, day-by-day interval needs a model with real predictive variance (Prophet/ARIMA), not this flat-RMSE baseline." | n/a |
| 4a | Social Intelligence: rename "Mentions" to reflect what it actually is, OR add a second, real post-count column (`platformRows.length`, already computed and discarded in `computePlatformComparison`, `src/utils/socialAnalytics.js:130`) alongside the existing summed-engagement figure, clearly labeled. | `socialAnalytics.test.js` |
| 4b | Social Intelligence: default tab selection — pick the platform with the most real posts (`processedRows.length`) instead of arbitrary `Set` order. | New test in `socialAnalytics.test.js` or page-level test |
| 4c | Social Intelligence / Sentiment Analysis: when sentiment is "—", show *why* (e.g. "No rated reviews captured for this platform yet" rather than a bare dash) — ties into the honesty convention (rule 0.1). | n/a |
| 5 | AI assistant button: reposition/resize responsively, or add a safe-area margin so it never sits over the last visible row of a table/list (e.g. `scroll-margin`/`padding-bottom` reserve on scrollable containers, or move it to not overlap fixed-height content — exact mechanism TBD at implementation time). | Visual only |

---

## PHASE B — SHARED FOUNDATION (plan only)

### Color system
One semantic source table (new `src/config/colorTokens.js` or extending `src/theme/chartTheme.js`) feeding both the Tailwind `@theme` CSS tokens (`src/styles/index.css`) and the plain-hex `chartTheme.js` mirror. Categories: brand/UI (green, buttons/nav only), sentiment (3-way, colorblind-safe, distinct from brand), platform (4 distinct hues: shopee/tiktok/x/threads), crisis level (normal/warning/critical, ONE danger red — audit found both `#ef4444` and `#dc2626` in use, unify to one), forecast/actual/baseline/scenario (distinct from all of the above).

### `src/components/charts/` kit
`ChartCard` (title/subtitle/method badge/info tooltip/export menu/built-in `AsyncSection`), height scale (sm/md/lg/hero), shared axis/grid defaults, restyled `ChartTooltip`, `SentimentTrend`, `RankedBar`, `CrisisBands`, `EventMarkers`, `Sparkline`, `KpiCard`, `CalendarHeatmap`, `RiskGauge`, `SyncedStack`.

### `FilterProvider` (new `src/contexts/`)
Date range (7D/30D/90D/All/custom, default All) + platform + product multi-select, URL-synced. All six pages' services take a range parameter instead of hard-coded `days: 14`/`days: 7` constants (`socialDataService.js`'s `fetchDailyAggregates({ days = 30 })` etc.).

### New pure analytics utils (each with Vitest tests, each reading real tables only)

| Util | Reads | Reuses | Notes |
|---|---|---|---|
| `salesSeries.js` | `raw_data` where `template_id='sales'` | — | Aggregates in JS: daily revenue/units/cost/margin/discount, per product & category. New read-only service fn needed in a `*Service.js` file (no ingestion changes). |
| `crisisHistory.js` | `daily_aggregates` + `processed_data.rating` | `detectCrisis()` (`src/utils/crisisDetection.js:170`) unchanged, called once per day with a growing truncated series | `detectCrisis` already evaluates "latest point vs. baseline" — calling it N times (once per day, series truncated up to that day) produces the full historical series without duplicating its logic, exactly as instructed. Episode grouping (consecutive warning/critical days) is new logic on top. |
| `promoDays.js` | `salesSeries.js` output | — | Days with discount clearly above normal average. |
| `aspects.js` | `processed_data.cleaned_text` | — | Static multilingual keyword lexicon (EN/MS/ZH/Manglish), labelled "Keyword lexicon (heuristic)" per rule 0.1. |
| `hashtagGraph.js` | `processed_data.features.hashtags` | — | **Confirmed available** (0.2) — real per-post hashtag arrays exist. Co-occurrence graph is buildable. |
| `healthScore.js` | sentiment score, crisis risk (inverted), revenue momentum (`salesSeries`), engagement trend | — | Config-object weights; says which input is missing rather than guessing, per rule 0.1. |

**Flagged limitation for Phase C**: `aspects.js` output cannot be joined with per-post **engagement breakdown** beyond the single combined `engagement` number (0.2) — likes/comments/shares are not individually stored. Any chart needing that split (spec §4.5(f)) must either (a) fall back to `daily_aggregates.comment_volume`/`mention_volume` as the spec itself allows, clearly labeled, or (b) require an ingestion-pipeline change (storing the 3 columns separately in `processed_data` or `features`) — **this would be a schema-adjacent change to the ingestion pipeline itself, which rule 0.1/§0.3 says to flag and ask about, not build silently.** Recommend (a) for this redesign pass.

---

## PHASE C — PER-PAGE PLAN (plan only, components/data sources)

### Crisis Detection
- `RiskGauge` ← `crisisService.runCrisisDetection()` (unchanged) for "now"; `crisisHistory.js` (new) feeds the Risk Timeline, Signal Matrix, Episode timeline, Replay.
- `SyncedStack` ← `daily_aggregates` (mention/negative ratio/rating/comment_volume — comment_volume confirmed present, never currently charted) + `salesSeries.js` (new) for the revenue line. Lag-in-days is a new small computation over `crisisHistory.js`'s episode + `salesSeries.js`.
- Sankey (platform→aspect→product) ← `aspects.js` (new) applied to `processed_data` rows within the selected episode's date range, joined to `product` (already a column on `processed_data` for reviews rows; null for social rows — Sankey should note product is only available where a review captured it).
- Evidence wall ← `processed_data.cleaned_text`/`raw_text`/`language`/`platform` for negative-sentiment rows inside the episode window.
- No precision/recall — confirmed no ground-truth label exists anywhere in the schema; keep as an honest note per the existing pattern (rule 0.1).

### Executive Dashboard
- `healthScore.js` (new) for the hero gauge's 4 sub-scores, each already backed by an existing real service (`computeSentimentScores`, `crisisService`, new `salesSeries.js`, existing engagement trend logic in `socialAnalytics.js`).
- Business Pulse `ComposedChart` ← `salesSeries.js` (new, revenue) + `computeSentimentTrend` (existing) + `crisisHistory.js` (bands) + `promoDays.js` (markers).
- Revenue `CalendarHeatmap` ← `salesSeries.js`, top product per day from the same (already groups by product).
- Product `Treemap` ← `salesSeries.js`'s per-product/category revenue + margin.
- Platform mix chart replacing the 2-slice donut ← `computePlatformComparison` (existing, already returns all platforms — the donut was just never updated to use more than 2).
- `RankedBar` for hashtags ← `computeTrendingHashtags` (existing, unchanged data source).

### Forecasting
- ComposedChart merge ← `salesSeries.js` (historical) + existing `forecast_results.forecast_points` (forecast). Model-overlay toggles iterate `rows` (existing `getLatestForecastRun()` already returns every model row per run, UI just never showed more than the single best one).
- Model leaderboard ← existing `rows` (MAE/RMSE/MAPE columns already present).
- Weekly/monthly pattern ← `salesSeries.js`, grouped by weekday — pure descriptive stats, no new table.
- Product forecast grid ← `salesSeries.js` per-product history; **forecast only where a `forecast_results` row exists for that specific product** — currently `run-forecast` only forecasts the whole-account revenue total, not per-product. Per-product forecasting would need `run-forecast` (or a client-side equivalent) extended to loop per product — **flagging this as new logic to confirm before building**, not a schema change, but a real scope addition beyond what exists today.
- Scenario explorer ← `src/utils/scenarioEngine.js`'s `buildScenario`/`calculateBreakEven` (existing, unchanged signatures confirmed: `buildScenario(assumptions, caseType)`, `calculateBreakEven(assumptions)`).
- Actual-vs-predicted scatter / residuals: **fold-level backtest predictions are NOT stored** — `forecast_results.forecast_points` only holds the final forward-looking forecast, not each rolling-origin fold's predictions during evaluation (confirmed: `ml/forecasting/src/evaluate.py` computes fold metrics in-memory and only persists the averaged metrics + final forecast, never the per-fold predictions themselves; same for the in-app `run-forecast` Edge Function). **This needs a schema change** (a new table or a `fold_predictions jsonb` column) **to show honestly — flagged, not built.** Show "Unavailable — fold-level predictions aren't persisted; would need [new column/table]" per the brief's own instruction.

### Sentiment Analysis
- Global filters apply everywhere (current bug: only the post list is filtered, confirmed in `src/pages/SentimentAnalysis.jsx` — KPIs/trend/hashtags all read the full unfiltered dataset).
- `SentimentTrend` (shared component) ← existing `computeSentimentTrend`.
- Platform × day heatmap ← `daily_aggregates`, new aggregation (no new table).
- Language × sentiment sunburst ← `processed_data.language` + `.sentiment` (both existing, confirmed 5 real language values present).
- Aspect sentiment ← `aspects.js` (new) joined with `processed_data.sentiment`.
- Rating distribution per product ← `processed_data.rating` + `.product` (existing columns, reviews rows only).
- Keyword opportunity bubble ← `aspects.js` (new) mention count/avg sentiment/trend-vs-previous-period (new comparison logic over two date ranges from the Filter Provider).

### Social Intelligence
- Default tab + "Mentions" relabeling: Phase A fixes.
- Share of voice ← `daily_aggregates` per platform over time (existing).
- Hashtag network (d3-force) ← `hashtagGraph.js` (new, confirmed `features.hashtags` is real per-post data).
- Trending bump chart ← `computeTrendingHashtags` extended with a weekly grouping (existing function, new time-bucketing).
- Engagement anatomy: **cannot show real likes/comments/shares split** (0.2 finding) — will use `daily_aggregates.comment_volume`/`mention_volume` instead, clearly labeled, per the brief's own fallback instruction.
- Platform × weekday engagement heatmap ← `daily_aggregates`, no hour field exists anywhere (confirmed) — will not build any "best time to post" feature, per the brief's explicit instruction not to fake this.

### AI Recommendations
- Phase A fixes the perceived "stuck" state (real load-time issue, not logic).
- Summary strip ← `generateRecommendations()` output (existing), counts by priority/category (new simple aggregation, no new data source).
- Priority × category matrix ← same existing data, reshaped; explicitly NOT an impact/effort chart (confirmed `recommendationRules.js` never computes impact or effort — would be fabricated).
- Rule trace ← `src/utils/recommendationRules.js`'s existing `evidence` arrays + rule `id`, rendered readably (no new computation, just better display of what's already returned).
- Status board: **confirmed `recommendations` table (`supabase/migrations/0007_recommendations.sql`) has no `status` column** — flagged as a proposed schema change, NOT built this pass, per the brief's explicit instruction.

---

## Summary of schema-change flags (nothing built, all deferred to your decision)

1. Forecasting actual-vs-predicted scatter needs fold-level backtest predictions persisted (new column/table) — currently only final forecasts are stored.
2. Per-product forecasting (Forecasting §4.3(d)'s product grid) needs `run-forecast` extended to loop per product, or a new table shape — current forecasting is whole-account only.
3. AI Recommendations status board needs a `status` column on `recommendations` (migration 0007) — table currently has none.
4. Engagement anatomy (Social Intelligence §4.5(f)) cannot show a real likes/comments/shares split per post — only a combined `engagement` number is stored post-ingestion. Not proposing an ingestion-pipeline change without your sign-off; will use the documented `daily_aggregates` fallback instead.

Stopping here per the brief. Awaiting approval before Phase A.
