# Post-Submission Re-Test — RESULTS

Run date: **2026-11-19** · Protocol: [`PROTOCOL.md`](PROTOCOL.md), committed `c87a7a9` **before** the first run.
Submitted artefacts (`ml/sentiment/results/`, `ml/forecasting/results/protocol_summary_a8b3bb637d28.json`, `reports/CHART_AUDIT.md`) were **not modified**.

## Status of the five tasks

| Task | Status | Why |
|---|---|---|
| **1 — Chart contrast** | ✅ **Complete — target met** | See below |
| **2 — End-to-end page time** | ✅ **Run — target NOT met** | Measured; 4 of 5 pages over 3000 ms, slowest median 7079 ms |
| **3 — Deploy trained sentiment model** | ⛔ **Not run — blocked** | No trained checkpoint exists in the repository |
| **4 — Code-mixed evaluation** | ⛔ **Not run — blocked** | Same missing checkpoint; corpus licence unverified |
| **5 — Sentiment-as-regressor re-test** | ⏸ **Not started** | Awaiting explicit confirmation, and blocked by the same checkpoint |

---

# TASK 1 — Chart contrast ✅ TARGET MET

**Target:** every chart colour ≥ 3:1 against its background, in both themes.
**Result:** **15 / 15 pass.** Before the change, **6 of 15 failed** — not the 4 the dissertation reports.

### Why the failure count differs from the dissertation

The dissertation (Table 4.7) reports **4 of 15** below 3:1. This re-test finds **6**. Two reasons, both methodological, neither a correction of an arithmetic error:

1. **The submitted audit measured the light theme only.** Checking the dark theme as well exposes `platform.x` (2.90:1) and `forecast.actual` (**1.30:1** — the worst value in the palette, a near-black line on a near-black surface).
2. **This re-test takes the worst case of each theme's two real chart surfaces**, not a single surface. Light = min(vs canvas `#f6f8f7`, vs surface `#ffffff`); dark = min(vs surface `#0a100d`, vs elevated `#0f1713`). That is why brand green reads **2.14:1** here where the dissertation reports 2.28:1 — 2.28 is the value against pure white, 2.14 is against the canvas the chart actually sits on.

**Both statements are true of their own method.** The dissertation's figure is not withdrawn; this is a stricter re-measurement.

### Before → after, all 15 colours

Ratios are the minimum against that theme's backgrounds, 2 d.p. **Bold = was failing.**

| Colour | Before | Light | Dark | | After | Light | Dark | Verdict |
|---|---|---|---|---|---|---|---|---|
| **brand** | **`#22c55e`** | **2.14** | 8.00 | → | `#22a45f` | 3.01 | 5.68 | ✅ |
| sentiment.positive | `#0072b2` | 4.86 | 3.51 | — | unchanged | 4.86 | 3.51 | ✅ |
| sentiment.neutral | `#78716c` | 4.50 | 3.80 | — | unchanged | 4.50 | 3.80 | ✅ |
| sentiment.negative | `#d55e00` | 3.63 | 4.71 | — | unchanged | 3.63 | 4.71 | ✅ |
| **platform.shopee** | **`#f59e0b`** | **2.01** | 8.49 | → | `#db7509` | 3.00 | 5.69 | ✅ |
| **platform.tiktok** | **`#0ea5e9`** | **2.60** | 6.58 | → | `#0e96e9` | 3.00 | 5.69 | ✅ |
| **platform.x** | **`#be123c`** | 5.89 | **2.90** | → | `#c3103b` | 5.69 | 3.00 | ✅ |
| platform.threads | `#a855f7` | 3.71 | 4.61 | — | unchanged | 3.71 | 4.61 | ✅ |
| crisis.normal | `#64748b` | 4.46 | 3.83 | — | unchanged | 4.46 | 3.83 | ✅ |
| **crisis.warning** | **`#ca8a04`** | **2.75** | 6.20 | → | `#cf7b0f` | 3.03 | 5.64 | ✅ |
| crisis.critical | `#dc2626` | 4.53 | 3.77 | — | unchanged | 4.53 | 3.77 | ✅ |
| **forecast.actual** | **`#1e2f29`** | 13.18 | **1.30** | → | `#217044` | 5.68 | 3.01 | ✅ |
| forecast.forecast | `#7c3aed` | 5.34 | 3.20 | — | unchanged | 5.34 | 3.20 | ✅ |
| forecast.baseline | `#0d9488` | 3.51 | 4.87 | — | unchanged | 3.51 | 4.87 | ✅ |
| forecast.scenario | `#db2777` | 4.31 | 3.96 | — | unchanged | 4.31 | 3.96 | ✅ |

**9 unchanged · 6 replaced · 15/15 pass · 15 unique hex values (no cross-category reuse).**

### How each replacement was chosen

Among all candidates with hue within ±12°, ≥ 3:1 in **both** themes, and ≥ 30 units of colour-blind separation from the rest of the category, the one **closest to the original in sRGB** was taken — the smallest visible change that satisfies every constraint.

| Colour | Hue shift | sRGB distance moved | Still reads as |
|---|---|---|---|
| platform.x | 0° | **5.5** | the same crimson |
| platform.tiktok | +4° | 15.0 | the same sky blue |
| crisis.warning | −7° | 19.3 | amber |
| brand | +6° | 33.0 | the same green |
| platform.shopee | −7° | 48.6 | amber/orange |
| forecast.actual | −12° | 70.5 | a mid green (it had to leave near-black to be visible on a dark surface) |

### Colour-blind separation — before vs after

Minimum pairwise distance within each category under simulated CVD. Floor pre-registered at **30**; `colorTokens.test.js` independently enforces **> 30**.

| Category | Protanopia | Deuteranopia | Tritanopia |
|---|---|---|---|
| sentiment | 106.53 → 106.53 | 112.87 → 112.87 | 126.41 → 126.41 |
| platform | 73.55 → **82.46** | 107.76 → 70.97 | 79.07 → 38.53 |
| crisis | 47.58 → 42.37 | 32.10 → **30.35** | 40.03 → 37.83 |
| forecast | 63.77 → 60.59 | 75.82 → 58.50 | 103.11 → 77.56 |

**Stated plainly:** separation got *worse* in 9 of 12 cells. Forcing six colours into the narrow luminance band where a single value clears 3:1 on both a near-white and a near-black surface necessarily crowds them together. Every value still clears the floor — **crisis under deuteranopia is the tightest at 30.35** — but this is a real trade-off, not a free win, and the margin there is thin.

**An earlier candidate set was rejected for exactly this reason.** Optimising each colour to balance its two theme ratios produced a palette that passed all 15 contrast checks but dropped crisis protanopia to **9.28** — warning and critical becoming near-identical to a red-blind viewer, in the one place where confusing them matters most. That run is reported here rather than discarded.

### Verification gate

| Check | Result |
|---|---|
| ESLint | ✅ zero errors, zero warnings |
| Full test suite | ✅ **470 passed in 57 files** |
| `npm run build` | ✅ succeeds (pre-existing chunk-size warning only) |

⚠️ **Toolchain substitution, disclosed:** the suite was run with `vitest@5.1.1`, not the pinned `vitest@5.0.2`, which fails to execute *any* test on this machine with `TypeError: Cannot read properties of undefined (reading 'config')`. This was recorded in PROTOCOL.md §Task 1 **before** the run. It is a toolchain defect unrelated to this work.

### Out-of-scope finding — reported, not fixed

`src/theme/chartTheme.js` holds a **legacy** `CHART_COLORS` / `CHART_SEQUENCE` map, still imported by 10 files (Dashboard, DatasetManagement and seven Local Shop pages). Those values are *also* drawn on charts, and were **not** part of this task's pre-registered scope of 15. Measured for completeness:

| Legacy value | Light | Dark | |
|---|---|---|---|
| `positive` / `tiktok` `#22c55e` | 2.14 | 8.00 | FAIL |
| `neutral` `#a8a29e` | 2.36 | 7.23 | FAIL |
| `x` `#60a5fa` | 2.38 | 7.17 | FAIL |
| `actual` `#1e2f29` | 13.18 | 1.30 | FAIL |
| `sequence[3]` `#d97706` | 2.99 | 5.72 | FAIL |
| `forecast` `#3b82f6` | 3.45 | 4.96 | pass |

**6 of 7 fail.** They were not changed, because expanding scope after seeing results is exactly what the protocol forbids. **The honest headline is therefore: the 15 semantic chart colours now all pass; the legacy map they sit beside does not.** Fixing it needs its own pre-registered task — it is a behaviour change across 10 files, including a value (`positive` = `tiktok` = `#22c55e`) that is the cross-category collision the semantic palette exists to prevent.

### Reproduce

```bash
git checkout a5c9021
node results/post_submission_2026-11/audit_contrast.mjs      # prints the 15-row table
npx eslint . && npx vitest@5.1.1 run && npm run build
```

**Commit:** `a5c9021` — *fix(charts): bring all 15 chart colours to 3:1 in both themes*
**Raw artefacts:** `contrast_audit_before.json`, `contrast_audit_after.json`

---

# TASK 2 — End-to-end page time ⛔ TARGET NOT MET

**Target:** < 3000 ms per analysis page.
**Original value at submission:** not measured (Dissertation Table 4.9: *"2.70 ms computation; end-to-end not measured"*).
**New value: measured. 4 of the 5 pages miss the target. The slowest page has a median of 7079 ms — more than twice the target.**

Run date **2026-11-19**. Production build (`npm run build` + `npm run preview`), measured against `http://localhost:4173`, confirmed by the `Measured against:` line the harness prints on every run. One warm-up run, discarded as pre-registered, then **5 measured runs**. No run was excluded for its result.

### Result — median and maximum per page

| Page | n | Min | **Median** | **Max** | Verdict |
|---|---|---|---|---|---|
| Dashboard | 5 | 4496 | **7079** | **7633** | ❌ FAIL |
| Sentiment Analysis | 5 | 1534 | **1583** | **1667** | ✅ PASS |
| Forecasting | 5 | 3510 | **4079** | **4550** | ❌ FAIL |
| Crisis Detection | 5 | 3916 | **4387** | **4779** | ❌ FAIL |
| Recommendations | 5 | 3712 | **4039** | **5105** | ❌ FAIL |

All values in milliseconds.
**Slowest page by median: Dashboard, 7079 ms. Worst single observation: 7633 ms. Only 1 of 5 pages meets the target on every run.**

**Stated plainly: the response-time target is NOT met.** The dissertation's Table 4.9 entry reports a 2.70 ms *computation* time and states that end-to-end was not measured. That remains accurate. This re-test supplies the missing end-to-end measurement, and it misses the target on four of five pages. Nothing here reduces the gap; it quantifies it.

### Within-session drift, reported rather than averaged away

The five runs were not homogeneous. Dashboard measured 7079, 7633 and 7124 ms on runs 2–4, then 4687 and 4496 ms on runs 5–6 — a drop of roughly 2.5 s partway through the session, visible on the other pages too. The cause was not isolated (plausibly Supabase connection warming, local caching or machine load; none was verified). **All five runs are reported and all five are included in the median and maximum.** Reporting only the faster pair would have halved the headline number and would have been cherry-picking, which the protocol forbids.

Even taking only the two fastest runs, the Dashboard remains above 4400 ms. **The target is missed under every subset of this data**, so the drift changes the magnitude of the miss, not the verdict.

### Measurement definition and its limits

Timing is **navigation start → `networkidle`**, as pre-registered. This is a **conservative proxy**, deliberately chosen, and it is stated here because it materially affects interpretation:

- It waits for the network to go quiet for 500 ms, so it includes every Supabase query, every lazy-loaded route chunk, and any trailing request — **including requests that do not block what the user sees**.
- A user may perceive the page as usable **before** this moment. Time-to-first-contentful-paint or time-to-interactive would both be lower.
- It therefore **overstates** perceived responsiveness relative to a paint-based metric, and **understates** nothing. It is the pessimistic reading.

**This does not rescue the result.** A page whose network traffic is still settling at 7 s is doing substantial work after navigation, and the honest claim is the one above: the target is not met on this metric. Re-measuring with a more favourable metric *after* seeing these numbers would be exactly the post-hoc change of method the protocol forbids, and was not done.

### Harness corrections made before the measured runs

The suite could not produce a per-page result until three stale selectors were fixed. All three were corrected and committed **before** any measured run, and none of them touches a timing, a target, the page set or the pass/fail rule:

| Commit | Fix |
|---|---|
| `14ca047` | The journey clicked `role=tab, name=/E-Commerce/i`. No such tab exists — `ModeSwitcher.jsx` renders a read-only badge (`role="status"`), and the labels are now "Malaysian Local Shop" and "Business Startup". The click consumed the full 30 s test timeout and aborted the run, so only the Dashboard was ever measured. Also raised the per-test timeout to 120 s. |
| `0cbef22` | `"Crisis Detection Center"` → the page renders **Early-Warning Crisis Detection**; `"AI Recommendation Engine"` → the page renders **AI Recommendations**. |

An earlier, now-superseded set of five runs (`timing_run_1..5.txt`) measured the **Dashboard only**, and against the dev server, for these reasons. Those files are retained in this folder; they are **not** the result and are not used in the table above.

### A parser defect found and fixed before the numbers were trusted

The first version of `summarise_timing.mjs` built its regex inside a JavaScript template literal, where `\s` collapses to a bare `s`. It parsed **zero** samples from every page — and then reported **"OVERALL: target < 3000 ms is MET"**, because an empty sample yields `max = -Infinity`, which compares as less than 3000.

This is recorded deliberately. It is precisely the failure mode CLAUDE.md's honesty rule exists to catch: a script that silently reports a pass it never computed. The script now **throws** if any page has zero samples rather than returning a verdict, and the table above was regenerated after the fix.

### Reproduce

```bash
node results/post_submission_2026-11/summarise_timing.mjs
```

Re-measuring from scratch:
```powershell
npm run build; npm run preview            # terminal A
$env:E2E_TEST_EMAIL='<confirmed account>' # terminal B
$env:E2E_TEST_PASSWORD='<password>'
$env:E2E_BASE_URL='http://localhost:4173'
npx playwright test e2e/journey-existing-data.spec.js --reporter=list
```
One warm-up, discard it; five measured runs.

**Raw console output:** [`timing_2026-11-19_raw.txt`](timing_2026-11-19_raw.txt) — verbatim, all five runs.
**Commits:** harness `14ca047`, `0cbef22`.

**Machine:** the author's development laptop, Windows 11 Pro 10.0.26200, local preview server on `localhost`, Supabase accessed over the author's home broadband. **The network path to Supabase is not controlled and not characterised**, and it is a plausible contributor to both the absolute numbers and the drift. A measurement on controlled infrastructure would be a different experiment, and is not claimed here.

---

# TASK 3 — Deploy the trained sentiment model ⛔ NOT RUN

**Blocker:** **there is no trained checkpoint, and on 2026-11-19 it was confirmed lost.** A search for `*.bin`, `*.safetensors`, `*.pt` and `*checkpoint*` under `ml/` returns nothing; `ml/sentiment/results/` contains only metrics JSON and Markdown. Training ran on Google Colab (Dissertation Table 3.10) and the weights were never committed.

### Recovery attempt — 2026-11-19, failed

The Drive folder named by `03_train_sentiment_models.ipynb`
(`MyDrive/INSIGHTAID_AI/ml_data/sentiment_checkpoints/xlmr_model`) was retrieved and
unpacked. It contains `config.json`, `tokenizer.json`, `tokenizer_config.json`,
`training_args.bin` and three `checkpoint-*` folders holding `scheduler.pt`,
`scaler.pt` and `rng_state.pth` — **but no `model.safetensors`, `pytorch_model.bin`
or `optimizer.pt` in any folder.** No file anywhere under `ml/` exceeds 50 MB; the
XLM-R weights would be roughly 1.1 GB.

**Cause.** `checkpoint-8031/trainer_state.json` records
`best_model_checkpoint = /content/xlmr_model/checkpoint-5354` — Colab's **ephemeral
local disk**, not `/content/drive/`. Only the small files were ever copied to Drive.
The weights were destroyed when the Colab runtime was recycled.

**Consequence.** Tasks 3, 4 and 5 are **permanently blocked** for the submitted
checkpoint. They cannot be unblocked by locating a file, only by training a new
model — which would answer a different question, since it would not be the model the
dissertation's metrics describe.

**What this does NOT affect.** The submitted sentiment metrics are unchanged and
remain evidenced by `ml/sentiment/results/O1_SCORECARD.md` and
`model_versions_v20261020-171546.json`. No reported accuracy figure is retracted.

**Reproducibility lesson, recorded deliberately:** the training run wrote checkpoints
to the runtime's local disk and copied only selectively to persistent storage. Fixing
seeds and pinning versions (Working Rule 5) did not protect the artefact itself.
`train_xlmr.py` retains `seed=42`, 3 epochs, lr 2e-5, so the *procedure* is
reproducible; the *model* is not recoverable.

Deployment cannot be begun, let alone claimed. Per the protocol, **no document or slide may state that the model is deployed** — and none does.

**To unblock:** the checkpoint (Drive / Hugging Face link or the weights file), plus which free-tier host to target.

---

# TASK 4 — Code-mixed evaluation ⛔ NOT RUN

**Original value at submission:** not evaluated (Dissertation Table 4.9, Table 4.3: *"Code-mixed — Not evaluated"*). **New value: still not evaluated.**

**Blocker:** the same missing checkpoint — **confirmed lost on 2026-11-19**, see the recovery attempt recorded under Task 3. Task 4 requires evaluating *the existing trained checkpoint with zero changes*. Training a fresh model would answer a **different question** — it would measure a new model, not the one the dissertation reports — so it was **not** substituted. The SentiBahasaRojak licence has also not been verified.

**To unblock:** the checkpoint, and a licence check on the corpus. The label mapping must be pre-registered as an amendment before that run, not after.

---

# TASK 5 — Sentiment-as-regressor re-test ⏸ NOT STARTED

Awaiting explicit confirmation, as instructed — and blocked by the same missing checkpoint, since the whole point is to replace the star-rating proxy with trained-model sentiment.

---

---

# OUT-OF-SCOPE OBSERVATION — free-tier LLM provider latency and reliability

**Not part of the pre-registered protocol.** No target in PROTOCOL.md covers this, and it was measured on 2026-11-19/20 while configuring the AI provider, not as a planned experiment. It is recorded here because it bears directly on **gap G4 (affordability)**, which CLAUDE.md states as a research claim, and because discarding a measurement because it was unplanned would be its own form of selection.

**Method.** The same deployed Edge Function (`agent-orchestrator`), the same question, the same two grounding facts, called over HTTPS from the author's machine. Success = HTTP 200 with a non-empty answer. Latency = full round trip including the Supabase function's own overhead. Provider changed by configuration only — `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` — with **no code change and no redeploy**.

| Provider / model | Calls | Succeeded | Median latency |
|---|---|---|---|
| `gemini-3.8-flash` (Google free tier) | 7 | **2 (29%)** | **~80 s** |
| `openai/gpt-oss-120b` (Groq free tier) | 7 | **7 (100%)** | **0.71 s** |

Gemini failures were three 503 "high demand" (after the client's own two automatic retries), one client timeout at 150 s, and one **`WORKER_RESOURCE_LIMIT` from the Supabase Edge Function itself** — the function exhausted its free-tier compute while waiting on the provider. Groq's successful calls ranged 0.49–1.74 s.

**What this supports.** Affordability is not free of engineering consequence. On one free-tier provider the system was unusable for an interactive dashboard — 80 s against an application target of 3 s, with a 71% failure rate — while a different free-tier provider met it comfortably. The provider-agnostic client (`supabase/functions/_shared/aiClient.ts`) is what made that substitution a three-value configuration change.

**What this does NOT support.** This is 14 calls on two days from one machine on one network. It is **not** a benchmark of either provider, it does not characterise either service's steady-state behaviour, and it must not be presented as one. Free-tier capacity is explicitly best-effort and varies by hour, region and account.

**Second observation, recorded for completeness.** In one `agent-orchestrator` response the model returned *"about RM 600 short of the goal"* from facts that stated only RM 8,400 and RM 9,000. The arithmetic is correct, but RM 600 was **not** in the supplied facts, and the function's prompt instructs the model never to produce a number that is not. The Local Shop path has `guardAnswer()` (`src/features/localshop/ai/guard.js`) checking wording against tool output; `agent-orchestrator` has **no equivalent guard** and relies on the prompt alone. No wrong figure was observed. The point is that nothing would have caught one.


## Amendment record

One deviation from the pre-registered method occurred. It is recorded as a dated amendment at the foot of `PROTOCOL.md` and summarised here: the fix used **one value per role satisfying both themes**, rather than the pre-registered **theme-specific light/dark variants**. The target, the pass/fail rule and all four constraints are unchanged. Reason and consequences are in the amendment.
