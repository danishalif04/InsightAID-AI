# Post-Submission Re-Test — PROTOCOL

**Pre-registered on 2026-11-19, before any experiment was run.**
Committed before the first run. **This file is not edited after results are seen.** Any change after a run is recorded as a dated amendment at the bottom, with the reason, never by editing the text above.

## 0. Standing integrity rules

1. **Submitted artefacts are read-only.** Nothing in `ml/sentiment/results/`, `ml/forecasting/results/protocol_summary_a8b3bb637d28.json` or `reports/CHART_AUDIT.md` is modified or overwritten. Every new output is written to `results/post_submission_2026-11/`.
2. **No hyperparameter tuning on test folds.** No protocol, fold, horizon, metric or target is added, dropped or changed after results are seen.
3. **Every run is reported, including failures.** No cherry-picking of runs or seeds.
4. **A missed target is stated plainly** and is not softened.
5. The dissertation is **frozen**. Nothing here changes what the submitted document says; this is a post-submission re-test whose purpose is to establish what is true *now*.

## 1. Runnability assessment (made before pre-registration, recorded here)

| Task | Runnable in this environment? | Evidence |
|---|---|---|
| **1 — Chart contrast** | **YES** | Pure computation over `src/config/colorTokens.js` using the project's own `src/utils/contrastRatio.js` and `src/config/colorblindSimulation.js`. No network, no credentials. |
| **2 — End-to-end page time** | **NO — blocked** | `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` are unset, and `e2e/helpers.js` deliberately `test.skip()`s without them rather than faking a session. A DNS query for the Supabase host timed out from this environment, so backend reachability could not be confirmed either way. |
| **3 — Deploy trained sentiment model** | **NO — blocked** | No trained checkpoint exists in the repository. A search for `*.bin`, `*.safetensors`, `*.pt` and `*checkpoint*` under `ml/` returns nothing; `ml/sentiment/results/` holds only metrics JSON and Markdown. Training was performed on Google Colab (Dissertation Table 3.10) and the weights were never committed. |
| **4 — Code-mixed evaluation** | **NO — blocked** | Same missing checkpoint. Task 4 explicitly requires evaluating *the existing trained checkpoint with zero changes*; re-training a new model would answer a different question and is therefore **not** substituted. The SentiBahasaRojak licence has also not been verified yet. |
| **5 — Sentiment-as-regressor re-test** | Not started | Awaiting explicit confirmation, per instruction. Also depends on the same missing checkpoint. |

**Blocked tasks are not simulated, approximated or substituted.** They are pre-registered below so that they can be run unchanged once their prerequisite is supplied.

---

## TASK 1 — Chart contrast (RUNNING)

**Target.** Every chart colour reaches a contrast ratio **≥ 3:1** against its background, in **both** the light and the dark theme. (W3C WCAG 2.2 minimum for graphical objects and user-interface components, reference [14] in the dissertation.)

**Data — the 15 chart colours.** The complete semantic palette in `src/config/colorTokens.js`, which is 15 values and matches the "4 of 15" count reported in Dissertation Table 4.7:

- `BRAND_COLOR` (1)
- `SENTIMENT_COLORS` — positive, neutral, negative (3)
- `PLATFORM_COLORS` — shopee, tiktok, x, threads (4)
- `CRISIS_COLORS` — normal, warning, critical (3)
- `FORECAST_COLORS` — actual, forecast, baseline, scenario (4)

**Backgrounds.** Taken from `src/styles/index.css` / `src/config/designTokens.js`, the real surfaces a chart renders on:

- Light theme: canvas `#f6f8f7`, surface `#ffffff`
- Dark theme: surface `#0a100d`, elevated surface `#0f1713`

**Method.** `contrastRatio()` from `src/utils/contrastRatio.js` — the project's own implementation, unmodified. For each colour and each theme, the **governing ratio is the minimum across that theme's backgrounds** (worst case, not best case).

**Pass/fail rule (fixed before the run).**

- **PASS** for a colour requires `min(ratio vs light backgrounds) ≥ 3.0` **AND** `min(ratio vs dark backgrounds) ≥ 3.0`.
- **TASK 1 PASSES** only if all 15 colours pass in both themes.
- Ratios are reported to 2 decimal places and compared at that precision. A value of exactly 3.00 passes.

**Adjustment strategy (fixed before the run).** Where a colour fails, the fix is a **theme-specific variant** — a light-theme value and a dark-theme value for that same semantic role — rather than one value forced to satisfy both. This follows a pattern the codebase already uses (`--color-glow-brand` is `#16a34a` on light and `#22c55e` on dark). Constraints on any new value:

1. Hue preserved within **±12°** of the original, so the semantic identity (e.g. "Shopee amber") is not changed into a different colour.
2. The replacement must itself satisfy the ≥ 3:1 rule for the theme it is used in.
3. **Colour-vision constraint:** within each category (sentiment / platform / crisis / forecast), the minimum pairwise distance under **protanopia, deuteranopia and tritanopia** — measured with `minPairwiseDistanceUnderCvd()` from `src/config/colorblindSimulation.js` — must be **≥ 30 units** for the palette actually used in each theme. Justification for the floor, set before measuring: the project's own Phase 6 audit rejected a pair at 30.1 units as its weakest and widened it, so ≥ 30 is the weakest separation this project has ever been willing to ship.
4. `colorTokens.test.js`'s existing guarantee — no hex value reused across categories — must continue to hold.

**Verification gate.** After adjustment: ESLint zero errors/warnings, full Vitest suite passing, `npm run build` succeeding. All three must pass or Task 1 is reported as not complete.

**Known toolchain caveat, recorded in advance:** the pinned `vitest@5.0.2` fails to execute any test on this machine (`TypeError: Cannot read properties of undefined (reading 'config')`), unrelated to this work. The suite will be run with `vitest@5.1.1` and that substitution will be stated explicitly in RESULTS.md.

**Outputs.** `contrast_audit_before.json`, `contrast_audit_after.json`, and the full table in `RESULTS.md`. `reports/CHART_AUDIT.md` is **not** modified.

---

## TASK 2 — End-to-end page time (BLOCKED — pre-registered for later)

**Target.** Every analysis page loads in **< 3000 ms**, measured from navigation start to network idle.

**Pre-registered method, to be run unchanged once credentials and a reachable backend exist:**

- **Build:** production only — `npm run build`, then `npm run preview`; `E2E_BASE_URL` points at the preview server. The dev server is **not** used, because its timings are not representative.
- **Credentials:** `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` environment variables only; never written to a file.
- **Command:** `npx playwright test e2e/journey-existing-data.spec.js --reporter=list`
- **Warm-up policy, fixed in advance:** **one warm-up run, discarded**, to absorb cold-start of the backend and of the preview server. Then **5 measured runs**.
- **Machine and network:** recorded in RESULTS.md at run time — Intel Core i5-11400H @ 2.70 GHz, 16 GB RAM, Windows 11 Pro (Dissertation Table 3.10), plus the actual network type and the Supabase region, stated then.
- **Reported statistics:** **median and maximum per page** across the 5 measured runs, plus the raw console output verbatim.
- **Pass/fail rule:** the target is met only if the **maximum** across all pages and all 5 runs is < 3000 ms. Median alone is not sufficient.
- **Stated limitation, fixed in advance:** navigation-start-to-network-idle is a **conservative proxy** — it includes every Supabase round trip and full render, so it over-counts relative to "the user can see the answer". It is reported as such, not as a user-perceived latency.
- Single machine, single network: this is one environment's result, not a general performance claim.

**Prerequisite to unblock:** a confirmed, email-confirmed Supabase account with demo data, supplied via the two environment variables, and a reachable (unpaused) backend.

---

## TASK 3 — Deploy the trained sentiment model (BLOCKED — pre-registered for later)

**No numeric target.** This closes a known gap (Dissertation §5.3, Table 5.2): the dashboard currently labels sentiment with `rating_heuristic_v1`, while the trained classifiers are evaluated offline only.

**Pre-registered design:**

- Serve the **existing trained XLM-RoBERTa checkpoint** as a free-tier Python inference service. No re-training; no change to the weights.
- The dashboard must display the **model name and version** on every label the service produced.
- `rating_heuristic_v1` is retained **only as an explicitly labelled fallback**, shown as such when the service is unreachable — never silently substituted.
- Tests added for: service-up path, service-down fallback path, and the label-provenance string.
- **No document, slide or README may claim deployment until the path runs end to end** and the test for it passes.

**Prerequisite to unblock:** the trained checkpoint (Colab/Drive/Hugging Face link, or the weights file), plus confirmation of which free-tier host to target.

---

## TASK 4 — Code-mixed evaluation (BLOCKED — pre-registered for later)

**No target** (the dissertation reports code-mixed as *not evaluated*; this establishes a first value).

**Pre-registered method:**

- Evaluate the **existing trained XLM-R checkpoint, zero changes** — no fine-tuning, no threshold tuning, no re-training.
- Dataset: a public labelled code-mixed Malay–English(–Chinese) set, SentiBahasaRojak (Romadhona et al., COLING 2022, reference [4]) as first choice. **Its licence must be verified as permitting academic use before download**; if it does not, the task stops and says so rather than substituting a different corpus silently.
- **Label mapping, fixed before any run:** the source corpus's `positive` → `positive`, `neutral` → `neutral`, `negative` → `negative`. If the source uses a different scheme (e.g. binary, or a 5-point scale), the mapping is written into an amendment **before** the evaluation is executed, never after.
- **Metrics reported:** accuracy, macro-F1, per-class recall, and a **Wilson 95% confidence interval** on accuracy — the same metrics and interval method the dissertation uses for the main test set (Table 3.7).
- The result is reported whatever it is. A low score is a finding, not a failure to hide.

**Prerequisite to unblock:** the trained checkpoint, and a licence check on the corpus.

---

## TASK 5 — Sentiment-as-regressor re-test (NOT STARTED — awaiting explicit confirmation)

**Target (unchanged from submission).** MAPE < 15%, and the sentiment variant beats the sales-only variant.

**Pre-registered method, to be run only on confirmation:**

- Replace the **star-rating proxy** with sentiment from the **trained XLM-R model**.
- **Identical** to run `a8b3bb637d28` in every other respect: same 3 protocols (daily 7-day / 10 folds, daily 30-day, weekly 4-week), same folds, same methods (moving average, ARIMA grid-searched, Prophet ± sentiment, XGBoost), same seed (42), same Olist mature period (470 days from 2017-05-17).
- **Regressor construction, fixed before the run:** daily mean sentiment score per day, mapped to [-1, +1] (negative = −1, neutral = 0, positive = +1); days with no reviews are left as missing and handled exactly as the submitted run handled them; **lag = 0** (same-day), matching the submitted run's construction. Any other lag would be a different experiment and is not run under this protocol.
- Diebold–Mariano tests as before, significance at p < 0.05.
- **All eight comparisons are reported regardless of outcome**, alongside the submitted run's values.

**Prerequisite to unblock:** the trained checkpoint, and the user's explicit confirmation to proceed.

---

## Amendments

*(None. Any amendment must be dated, state the reason, and be added below — never by editing the text above.)*

### Amendment 1 — 2026-11-19, Task 1 adjustment strategy

**Changed:** the fix uses **one value per role that satisfies both themes**, instead of the pre-registered **theme-specific light/dark variants**.

**Unchanged:** the target (≥ 3:1), the pass/fail rule (worst case across each theme's backgrounds, both themes), and all four constraints (hue ±12°, per-theme contrast, CVD ≥ 30 within category, no cross-category hex reuse).

**Reason.** The two rules together require a relative luminance between roughly 0.11 and 0.28 — a real band, and every one of the six failing colours has a value inside it at its own hue. Where a single value satisfies both themes, the pre-registered "light value and dark value" collapse to the same value, so this is the degenerate case of the registered rule rather than a weaker one. It also avoids introducing a theme-aware resolver into `colorTokens.js`, which would have required changing every chart consumer and the legacy `CHART_COLORS` map — a behaviour change across 10 files, and a regression risk carried into a viva demo for no gain in contrast.

**Disclosed consequence.** A single value per role is more constrained than two, so the colours are pushed closer together: simulated colour-blind separation falls in 9 of 12 category×deficiency cells (all still above the floor; tightest is crisis/deuteranopia at 30.35, down from 32.10). Reported in RESULTS.md rather than omitted.

**Also recorded:** the protocol did not specify how to choose among feasible candidates. The rule applied, fixed before the final run and applied uniformly to all six colours, was **"closest to the original in sRGB"**. An earlier candidate set using a different objective (balance the two theme ratios) is reported in RESULTS.md as a rejected run, not discarded.

### Amendment 2 — 2026-11-19, Task 2 measurement harness

**Changed:** `e2e/journey-existing-data.spec.js` now asserts the per-page target with `expect.soft` instead of a hard `expect`, and the Dashboard step's content check became a real assertion.

**Unchanged:** the target (< 3000 ms), the pass/fail rule (**maximum** across every page and every measured run must be < 3000 ms), the metric (navigation start → network idle), the warm-up policy (one discarded) and the five measured runs.

**Reason.** The first run exposed a defect in the instrument, not in the system. A hard assertion aborts the test at the first slow page, so the other four pages are never measured — and a run that reports one page **cannot produce the per-page median and maximum this protocol requires**. Soft assertions still fail the test; they just let every page be measured first. This change makes the pre-registered output obtainable; it does not make the target easier to meet.

Separately, `expect(page.getByText('Executive Summary').first()).toBeTruthy()` was a no-op — a Playwright `Locator` is always truthy, so it asserted nothing and never waited. It is now `await expect(...).toBeVisible()`. The timing is captured before this assertion, so the measurement is unaffected.

**Not changed, deliberately:** `waitForLoadState('networkidle')` is discouraged in Playwright's own documentation, but it is the conservative proxy this protocol pre-registered and it stays. Replacing it after seeing a failing number would be changing the metric to fit the result.

**Status of the 4412 ms Dashboard reading.** It is a real measurement and is reported as such. It is **not** a verdict: it was run #1, which this protocol pre-designated as the warm-up to be discarded, it measured only one page, and it has not been confirmed to have run against the production preview build rather than the dev server (see RESULTS.md, Task 2).

**Amendment 2, addition (same day).** `playwright.config.js` now skips its managed `webServer` whenever `E2E_BASE_URL` is set. Previously the config's `webServer.url` was hard-coded to `http://localhost:5173` and its command to `npm run dev`, so a run that pointed `E2E_BASE_URL` at the production preview on 4173 would **still** boot a Vite dev server alongside the measurement — and a run that forgot to set `E2E_BASE_URL` would silently measure the **dev server** instead of the production build the protocol requires. Both outcomes invalidate a timing figure. The target, metric and pass/fail rule are unchanged.
