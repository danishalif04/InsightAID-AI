# Design Principles — Phase 6 (FYP II)

What this document is: for each framework the master prompt names, the principle in plain terms, and exactly where it is applied in this codebase — file:line evidence, same standard as this project's other audits. This is the theory/audit layer on top of the in-progress visual redesign (`docs/redesign/PLAN.md`); it does not redo that redesign, and it does not claim principles are applied on the 5 pages not yet rebuilt (Dashboard, Forecasting, Sentiment Analysis, Social Intelligence, AI Recommendations still use the pre-redesign design except for the specific surgical fixes this phase made — see `reports/CHART_AUDIT.md`).

---

## Tufte (2001, 2006)

**Data-ink ratio / chartjunk** — maximize the ink that shows data, minimize everything else. Checked every chart on every page for 3D effects, drop shadows, gradients, and decorative backgrounds: **none found**. Gridlines are already minimal by design — every Recharts `<CartesianGrid>` in this codebase uses `strokeDasharray="3 3"` with either `vertical={false}` or `horizontal={false}` (one axis of gridlines only, never a full grid), e.g. `src/pages/Dashboard.jsx:247`, `src/pages/CrisisDetection.jsx:414` (`GRID_DEFAULTS` in `src/components/charts/chartDefaults.js:17-20`).

**Lie factor ≈ 1 (zero-baseline bars)** — audited every bar chart. All start at zero: Dashboard's Daily Mention Volume (`src/pages/Dashboard.jsx:271-287`) and the newly-rebuilt Platform Distribution bar (same file, `:232-267` — see `reports/CHART_AUDIT.md` for why this replaced a 4-slice donut), Social Intelligence's per-platform volume bar (`src/pages/SocialIntelligence.jsx:153-174`). No truncated-axis violation found.

**Small multiples** — the Multi-Signal View on Crisis Detection (`SyncedStack`, `src/pages/CrisisDetection.jsx:502-546`) shows 5 real metrics (mention volume, negative sentiment %, average rating, comment volume, daily revenue) on a shared timeline with one synced crosshair — the small-multiples idea applied to time series instead of side-by-side panels.

**Sparklines** — `src/components/charts/Sparkline.jsx` exists and is used in KPI cards (`KpiCard.jsx`) for a word-sized trend next to a number, per Tufte's *Beautiful Evidence*.

---

## Shneiderman's Visual Information-Seeking Mantra (1996)

*Overview first → zoom and filter → details on demand.*

- **Overview**: the Dashboard (`/`) is the overview page by design — one KPI strip, one sentiment trend, one platform-distribution chart, one mention-volume chart, before any page-specific drill-down.
- **Zoom and filter**: `src/contexts/FilterProvider.jsx` (date range, platform, product — URL-synced) is the filter layer; Crisis Detection's Risk Timeline also has a Recharts `<Brush>` for literal zoom (`src/pages/CrisisDetection.jsx:471`).
- **Details on demand**: clicking a day on the Risk Timeline or Signal Matrix "time-travels" the whole page to that day (`setViewedDate`, `src/pages/CrisisDetection.jsx:412`, `:496`) — every other chart on the page re-explains that specific day instead of "now." The Evidence Wall and Root-Cause Sankey (`:565-620`) are the deepest "details" level, surfacing the actual real posts behind an aggregate number.

---

## Cleveland & McGill's graphical perception ranking (1984)

Position/length judgments are more accurate than angle/area judgments — so prefer bars/dots/lines over pie/donut charts, and never exceed 3 pie slices.

**Real violation found and fixed this phase**: Dashboard's "Platform Distribution" was a 4-slice donut chart (`innerRadius={70}, outerRadius={100}`, one slice per platform — Shopee/TikTok/X/Threads). This directly violates the ">3 slices" rule. Replaced with a horizontal bar chart ranked by mention volume (`src/pages/Dashboard.jsx:232-267`) — same data, same per-platform colors, now position-encoded instead of angle-encoded. See `reports/CHART_AUDIT.md` row 3 for the full before/after.

No other pie/donut chart exists anywhere in the codebase (confirmed by search — `grep -rn "PieChart" src` now returns zero matches after this fix).

---

## Stephen Few's dashboard design (2006)

**One-screen KPI fit**: Dashboard's KPI strip (sentiment/crisis-risk/revenue-forecast) and Crisis Detection's hero gauge are both designed to be read without scrolling.

**Bullet graphs for KPI vs. target**: Forecasting's model-leaderboard card already does exactly this — MAPE shown against the project's own 15% target, with a ✓/✗ icon *and* text *and* color together (`src/pages/Forecasting.jsx:252-272`: "target met"/"target not met" with `CheckCircle2`/`XCircle`). This is also the strongest existing example of "never color as the only cue" (below) — it was already built correctly before this phase, cited here as the worked pattern other KPI-vs-target displays should follow.

---

## Munzner's What–Why–How nested model (2014)

Three worked examples, each stating what data is shown, why (the user task it serves), and how (the visual encoding):

1. **Risk Timeline** (`src/pages/CrisisDetection.jsx:386-475`). *What*: daily risk score, 0–100, over the selected range, plus detected episode spans. *Why*: spot a developing problem and see exactly when it crossed into Warning/Critical. *How*: position (line height) for the score, color-filled bands (`renderCrisisBands`) for episodes, two dashed reference lines for the warning/critical thresholds — all position/color-redundant, nothing angle-encoded.
2. **Signal Matrix** (`:477-500`, `SignalMatrix` component). *What*: 7 signals × every day in range. *Why*: see which signal fired *first* within an episode, not just the blended score. *How*: a heatmap — color intensity = severity, position (row/column) = signal/day — a deliberate choice over 7 separate line charts, which would make "which signal moved first" much harder to scan.
3. **Root-Cause Breakdown** (`:565-620`, Sankey). *What*: platform → complaint aspect → product, for one episode's negative posts. *Why*: answer "where did this complaint actually come from and about what" in one view. *How*: flow width = post count (length-like, not angle), color = category identity.

---

## Gestalt / preattentive attributes (Ware, 2012)

*Color should draw the eye to what needs attention; grey/neutral tones should recede.*

`CRISIS_COLORS.normal` is deliberately slate-grey (`#64748b`), not a color that competes for attention — only `warning`/`critical` use a saturated hue (`src/config/colorTokens.js:58-66`). `FORECAST_COLORS.actual` (historical, context) is a desaturated dark pine tone, while `forecast`/`scenario` (the thing to look at) are saturated violet/pink — stated explicitly in that file's own comments as an intentional "neutral historical data, not a second brand accent" choice.

---

## Cognitive Load Theory (Sweller, 1988) & Nielsen's usability heuristics

Plain-language, consistent layout: every `ChartCard`-based chart (`src/components/charts/ChartCard.jsx`) renders the same structure — title, subtitle, a method badge, actions menu — regardless of what's inside, so a user learns the interaction pattern once. This phase adds one more consistent element: a **"How to read this chart" (?) popover**, now a first-class `readingGuide` prop on `ChartCard` (`:27-45` of this doc's companion file, see `ChartCard.jsx`'s updated prop list), wired into all 4 of Crisis Detection's rebuilt charts as the real worked example (`src/pages/CrisisDetection.jsx` — search `readingGuide=` for all 4). Reduces cognitive load by stating in one plain sentence what a first-time viewer needs to know before reading the chart, rather than requiring them to infer the encoding.

---

## Color-blind-safe palette (Okabe & Ito, 2008)

**Checked for real, not just asserted** — `src/config/colorblindSimulation.js` (new this phase) simulates protanopia, deuteranopia, and tritanopia using the standard simplified linear-RGB CVD approximation matrices widely reproduced by open-source color-blindness simulators (derived from Viénot, Brettel & Mollon's approach — the exact original citation is marked `[VERIFY]` in `docs/REFERENCES_TO_VERIFY.md`, since this implementation was written from the commonly-republished coefficients, not the original paper directly).

`SENTIMENT_COLORS` (`src/config/colorTokens.js:36-39`) already uses the real Okabe-Ito blue (`#0072b2`) and vermillion (`#d55e00`) reference values — confirmed safe by simulation: minimum pairwise distance 106.5–126.4 across all three CVD types, far above any plausible confusion threshold.

**Two real, measured weaknesses found and fixed this phase** (not assumed safe):
- `PLATFORM_COLORS.tiktok` vs `.x` (sky-blue vs indigo) measured only 30.1 apart under simulated protanopia — the weakest pair in any palette in this file. `.x` changed from indigo (`#6366f1`) to rose-700 (`#be123c`); the full palette's new worst case is 73.5.
- `CRISIS_COLORS.warning` vs `.critical` (amber vs red) measured only 27.5 apart under simulated tritanopia — the single worst pair found, and the most operationally important one to fix (confusing "warning" with "critical" is the worst place for a near-miss). `.warning` changed from amber-600 (`#d97706`) to yellow-600 (`#ca8a04`); the new worst case is 32.1.

Both fixes are enforced going forward by a real test (`src/config/colorTokens.test.js`: "stays distinguishable within each category under simulated color blindness," threshold 30, which the pre-fix values would have failed and the post-fix values pass).

**One hex value was deliberately NOT changed**: `src/theme/chartTheme.js`'s legacy `CHART_SEQUENCE` array contains a `#d97706` literal that numerically matched the old (now-replaced) crisis-warning color. Investigated and confirmed this is coincidental, not an intentional mirror — that file's own header comment states it's a frozen backward-compatibility palette for pages this redesign phase doesn't touch, with no code anywhere asserting it should equal `CRISIS_COLORS.warning`. Changing it was out of scope and risked affecting old-design pages unrelated to this fix.

---

## Never color as the only cue

Audited sentiment and crisis-level indicators specifically, per the master prompt's explicit instruction.

**Already correct everywhere checked**: every sentiment `Badge` renders the literal word ("positive"/"neutral"/"negative"), not just a colored dot (`src/pages/SentimentAnalysis.jsx:243`, `SENTIMENT_TONE` mapping to Badge `tone`, which Badge itself renders as color + text together). Crisis level badges work the same way (`LEVEL_META` → `{label, color, tone}` triples, `src/pages/CrisisDetection.jsx:68-70` — always a text label alongside the color). Forecasting's target-met indicator pairs a check/cross icon *and* text *and* color (`:252-272`, cited above). No instance found anywhere in the audited pages where color alone carries meaning with no text or icon alongside it.

---

## Honesty convention note (carried over from this project's existing design, not new to Phase 6)

This document itself follows the project's standing rule: every claim above is backed by a file:line citation that can be independently re-checked, and the two real palette weaknesses were measured, not assumed — consistent with `CLAUDE.md`'s "never hard-code, invent, round up, or massage a metric."
