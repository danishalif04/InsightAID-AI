# Post-Submission Re-Test — RESULTS

Run date: **2026-11-19** · Protocol: [`PROTOCOL.md`](PROTOCOL.md), committed `c87a7a9` **before** the first run.
Submitted artefacts (`ml/sentiment/results/`, `ml/forecasting/results/protocol_summary_a8b3bb637d28.json`, `reports/CHART_AUDIT.md`) were **not modified**.

## Status of the five tasks

| Task | Status | Why |
|---|---|---|
| **1 — Chart contrast** | ✅ **Complete — target met** | See below |
| **2 — End-to-end page time** | ⛔ **Not run — blocked** | No credentials; backend unreachable from this environment |
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

# TASK 2 — End-to-end page time ⛔ NOT RUN

**Target:** < 3000 ms per analysis page. **Original value at submission:** not measured (Dissertation Table 4.9: *"2.70 ms computation; end-to-end not measured"*). **New value: still not measured.**

**Blocker, verified before the run:**
- `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` are unset. `e2e/helpers.js` deliberately `test.skip()`s without them rather than faking a session — so the test does not fail, it declines to run.
- A DNS query for the Supabase host **timed out** from this environment, so backend reachability could not be confirmed either way.

**Nothing was estimated, simulated or inferred in place of a measurement.** The pre-registered method in PROTOCOL.md (production build, one discarded warm-up, 5 measured runs, median **and** maximum per page, navigation-to-network-idle declared as a conservative proxy) stands ready to run unchanged.

**To unblock:** supply the two environment variables for a confirmed account, and an unpaused backend.

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

## Amendment record

One deviation from the pre-registered method occurred. It is recorded as a dated amendment at the foot of `PROTOCOL.md` and summarised here: the fix used **one value per role satisfying both themes**, rather than the pre-registered **theme-specific light/dark variants**. The target, the pass/fail rule and all four constraints are unchanged. Reason and consequences are in the amendment.
