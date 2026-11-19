# Numbers & Logic Verification Report

**Date**: 2026-11-08
**Scope requested**: independently re-derive every number on every page of the live app against real Supabase data, confirm cross-page consistency, and explain each number in plain English for a supervisor presentation.

## 0. Critical blocker found — read this first

**The Supabase backend for this project is currently INACTIVE (paused).** This was confirmed two independent ways:

1. A direct DNS query to `jtyjfblzxvmryjmvuzds.supabase.co` via Cloudflare's public resolver (1.1.1.1) returned `NXDOMAIN` (the hostname doesn't resolve at all right now).
2. The Supabase CLI's own project list API (`supabase projects list`) reports this exact project — `"name":"Project FYP InsightAID AI"`, `"ref":"jtyjfblzxvmryjmvuzds"` — with `"status":"INACTIVE"`.

This is almost certainly Supabase's free-tier auto-pause after a period of inactivity (the project had been dormant for roughly three weeks since the last development session). **It is not a bug in the app's code, and not a network restriction in this sandbox** — a real browser attempting to log in got the exact same "Failed to fetch" that a direct database query did, confirming the outage is real and would affect a live demo right now, from any machine, not just this verification environment.

**Action needed before any live demo or further live verification**: open the Supabase dashboard for this project and restore/unpause it. This is normal, reversible, and does not lose any data — paused projects on the free tier keep their data; they just stop responding to requests until resumed.

**Consequence for this report**: the originally-requested task — independently re-derive every live number from a direct database query and compare it to what the UI shows — **could not be performed**, because there is no live data to query right now. Rather than fabricate "verified" results, this report instead verifies what *can* be verified without a live connection: the correctness and internal consistency of the actual calculation logic, using the exact real values this account showed in the last session where the backend was reachable (2026-10-22), re-run through the real, unmodified source code with Node, locally, no network required.

---

## 1. What WAS independently verified (code-level, offline, against known-real prior values)

All four checks below ran the actual, unmodified project source files (not a reimplementation) with inputs matching the real values last observed live on `usertest1`'s account. Full test suite (360/360), lint (0 errors), and build all still pass with no changes needed.

### 1.1 Crisis risk score arithmetic

**Claim being checked**: Crisis Detection showed "Warning, 30/100" from two triggered signals (`negative_ratio_level` = critical, `rating_deterioration` = warning).

**Independent recomputation**: `src/config/crisisThresholds.js`'s `SEVERITY_POINTS = { warning: 10, critical: 20 }`. Manual sum: `20 (critical) + 10 (warning) = 30`. `RISK_LEVEL_THRESHOLDS = { warning: 25, critical: 60 }` — 30 falls in `[25, 60)` → **Warning**.

**Result: MATCHES exactly.** ✅

**Plain-English explanation for your supervisor**: "The risk score isn't a mysterious AI number — it's literally addition. Every one of the 7 signals that goes off adds either 10 points (if it's at the 'warning' severity) or 20 points (if it's at 'critical'), and we just add them up. Two signals went off this time, one at each severity, so 20+10=30. Anything under 25 is Normal, 25 to 59 is Warning, 60 and up is Critical."

### 1.2 Scenario engine growth-shortfall math

**Claim being checked**: AI Recommendations showed "Growth-case revenue (RM88,391.79) is 12% below your revenue target (RM100,000)."

**Independent recomputation**, using the real stored assumptions (selling price RM39.87, cost per unit RM15.37, 1,928 expected monthly units, 15% growth rate), run through the real `buildScenario()`/`calculateBreakEven()` functions in `src/utils/scenarioEngine.js`:
- Growth-case units: `round(1928 × 1.15) = 2217`
- Growth-case revenue: `2217 × RM39.87 = RM88,391.79`
- Shortfall: `(100000 − 88391.79) / 100000 = 11.6%` → UI rounds this to the nearest whole percent for display → **12%**

**Result: MATCHES exactly**, including the exact cents (RM88,391.79). ✅

Also checked the break-even side of the same assumptions: break-even is 972 units/RM38,753.64 — since the real expected monthly units (1,928) comfortably exceeds that, the "pricing gap" warning correctly does **not** fire. This is a real, verified example of the rule engine correctly staying silent when nothing is actually wrong, not just correctly firing when something is.

**Plain-English explanation**: "We took the real numbers already on file — how much each item sells for, what it costs to make, how many units we expect to sell a month, and the stated growth rate — and did the exact same multiplication a human would do with a calculator: units next period, times price, equals revenue. Then compared that to the stated goal. The 12% gap is just how far off that projection is from the goal, rounded to a whole number."

### 1.3 Recommendation rule outputs

**Claim being checked**: with the account's exact real crisis state and business assumptions, AI Recommendations showed exactly two recommendations — "Review triggered risk signals before they escalate" and "Reassess growth channels" — and nothing else.

**Independent recomputation**: ran the real `generateRecommendations()` function (`src/utils/recommendationRules.js`) with those exact inputs.

**Result: MATCHES exactly, after fixing a mistake in my own test setup** (not an app bug) — my first attempt forgot that `revenue_target` lives on a different database table (`business_profiles`) than the other assumptions (`business_assumptions`), and the real app always merges both into one object before the rule engine sees it (`businessProfileService.js`'s `getProfile()`). Once my test mirrored that same merge, the output matched the live app exactly: `warning_risk_review` and `growth_below_target`, no others. This is worth knowing for your own debugging: the two tables are two different physical places in the database, but the app always treats them as one logical "business profile."

### 1.4 Forecast uncertainty-band formula

**Claim being checked**: the Forecasting page's shaded uncertainty band is wide (roughly ±RM1,789 around a ~RM2,151 prediction).

**Independent recomputation**: `margin = 1.96 × RMSE`. With the real stored RMSE of 912.75: `1.96 × 912.75 = 1,788.99` → band `[362.01, 3,939.99]`.

**Result: MATCHES.** ✅ This is the standard statistics formula for a 95% confidence interval around a prediction (1.96 is the standard value for 95% confidence under a normal-distribution assumption) — not an arbitrary number, not a bug. It's wide because the underlying model (a simple moving-average baseline) has real, measured error (MAPE ~21%, above the project's own 15% target) — a wide band is the model being *honest* about its own uncertainty, not a display glitch.

**Plain-English explanation**: "That shaded area isn't decoration — it's the model telling you how wrong it's historically been. We take its real measured error (RMSE) and multiply by 1.96, a standard statistics constant for 'the range we're 95% confident the true answer falls within.' A wider band means a less certain model; this one uses the simplest baseline (moving average), so its band is honestly wide rather than artificially narrowed to look more impressive than it is."

---

## 2. Cross-page consistency — verified at the code level (structurally guaranteed, not just numerically coincidental)

**Does Dashboard's Revenue Forecast match Forecasting page's own number?**

Checked by reading the source, not just comparing two displayed numbers: both `src/services/dashboardService.js` and `src/pages/Forecasting.jsx` import and call the exact same function, `getLatestForecastRun()`, from the exact same file, `src/services/forecastResultsService.js`. There is only one query for "the latest forecast run" in the entire codebase — both pages are reading the identical result, not two independently-computed numbers that happen to agree. **This is a stronger guarantee than a numeric spot-check: they cannot disagree, by construction**, unless one page applies a different rounding rule after receiving the same data (worth a quick visual check once the backend is back up, but not a logic risk).

---

## 3. What could NOT be verified this session, and why (be upfront about this if asked)

Everything that requires a live database read was **not verifiable** this session due to the outage in §0:
- The exact current sentiment percentages, platform post counts, hashtag-by-day breakdown, dataset row counts, and today's actual crisis signal values — all of these need a live query, and none was possible.
- Whether the numbers currently rendering in the UI (if the frontend has any client-side cache) still match a fresh database read.

**This is not the same as "unverified" in the sense of "untrustworthy."** Every one of these values is computed by small, independently unit-tested pure functions (360 automated tests passing, covering `socialAnalytics.js`, `crisisDetection.js`, `recommendationRules.js`, `scenarioEngine.js`, etc.) run against whatever real rows exist. The *logic* has been verified repeatedly, live, in prior sessions (see `docs/redesign/PLAN.md`'s Step 0 verification and the conversation history) and again today at the code level (§1). What's missing today specifically is a **fresh live data snapshot**, because there's currently no backend to read one from.

---

## 4. Presentation risk items (technically correct, but worth being ready to explain simply)

1. **"Mentions" vs "post count" on Social Intelligence** — a per-platform "mention volume" number is actually a *sum of engagement* (likes+comments+shares-ish), not a count of posts. The UI now also shows a separate, correctly-labeled post count alongside it (fixed earlier this project), but if your supervisor asks "so is that number of posts or something else?", the honest answer is "it's total engagement, labeled as such, and there's a separate post-count column right next to it."
2. **The uncertainty band looking "too wide" at a glance** — per §1.4, this is correct and honest, but it looks alarming on first glance. Lead with "this band is the model telling you how uncertain it is, not a bug" if you show this chart.
3. **Two different "forecast" stories** — the in-app "Run Forecasting" button (a quick, real, moving-average-only baseline) and the offline Colab notebook (the fuller ARIMA/Prophet/XGBoost/LSTM comparison, run against public benchmark datasets, not this account's own data) are two different things. If asked "which model is this," know which one you're looking at.
4. **`revenue_target` living on a different table than the other business assumptions** — purely an internal detail (§1.3), invisible in the UI, but if your supervisor asks a detailed data-modeling question, know that the "business profile" a user sees as one form is actually two database tables merged transparently.

---

## 5. Quality gates (re-run after this verification)

- `npx vitest run`: **360/360 passing**
- `npx eslint src`: **0 errors, 0 warnings**
- `npm run build`: **succeeds**
- No code changes were made as part of this verification (all four checks confirmed existing logic was already correct; the one "failure" found was in my own throwaway test script, not the app, and was corrected before concluding) — `git status` shows only the pre-existing, already-known uncommitted work from earlier in this project (the sentiment day-picker and the warning-level recommendation rule), nothing new left behind.

---

## 6. Bottom line

The calculation logic behind every number checked today is **real, correctly implemented, and internally consistent** — every formula traced back to source code, re-derived by hand, and matched exactly. The one and only thing standing between this app and a fully live, freshly-re-verified demo is the paused Supabase project (§0) — a two-minute fix in the Supabase dashboard, not a code problem. Do that first, then re-run a live check if you want fresh screenshots; the underlying logic does not need further work based on everything checked here.
