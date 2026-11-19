# Summary for Slides — Post-Submission Re-Test

Every row is sourced to [`RESULTS.md`](RESULTS.md). The dissertation is **frozen**; nothing here changes what the submitted document says.
Run date **2026-11-19** · protocol pre-registered `c87a7a9` · change committed `a5c9021`.

## Target | At submission | After re-test | Status

| Target | At submission | After re-test | Status | Source |
|---|---|---|---|---|
| **Chart contrast ≥ 3:1** | Chart green **2.28:1**; **4 of 15** below 3:1 (light theme only) | **15 of 15 pass in both themes.** Re-audit first found **6** failures, not 4 — the submitted audit checked light only | ✅ **NOW MET** | RESULTS.md §Task 1 |
| **End-to-end page time < 3 s** | Not measured ("2.70 ms computation; end-to-end not measured") | **Still not measured** — no credentials, backend unreachable | ⛔ **UNCHANGED — blocked** | RESULTS.md §Task 2 |
| **Trained sentiment model deployed** | Not deployed — dashboard uses `rating_heuristic_v1` | **Still not deployed.** Recovery attempted 2026-11-19 and failed: the checkpoint was written to Colab's ephemeral disk, not Drive, and was destroyed with the runtime | ⛔ **UNCHANGED — permanently blocked** | RESULTS.md §Task 3 |
| **Code-mixed accuracy** | Not evaluated | **Still not evaluated** — same lost checkpoint | ⛔ **UNCHANGED — permanently blocked** | RESULTS.md §Task 4 |
| **Sentiment variant beats sales-only** | Worse in 6 of 8 DM tests; none significant | **Not re-tested** — awaiting confirmation, and blocked by the same checkpoint | ⏸ **NOT STARTED** | RESULTS.md §Task 5 |

**One of five targets moved. Four did not, and the reason in every case is a missing prerequisite, not a failed attempt.**

---

## If a slide is updated, this is the honest wording

> **Chart contrast.** The dissertation reports chart green at 2.28:1 and four of fifteen colours below the W3C 3:1 minimum. Re-auditing after submission against **both** themes — the submitted audit measured the light theme only — found **six** failures, including a forecast line at **1.30:1** on the dark theme. All six were corrected; **all fifteen now pass in both themes**, verified with the project's own contrast function, with ESLint clean, 470 tests passing and the build succeeding.

**Three things that must accompany that claim on the slide or in the answer:**

1. **The dissertation's number is not withdrawn.** 2.28:1 is correct against pure white; 2.14:1 is the same colour against the canvas a chart actually sits on. Two methods, both stated.
2. **Colour-blind separation got slightly worse** — 9 of 12 category×deficiency cells fell, tightest at **30.35** (crisis/deuteranopia, floor 30). A real trade-off, disclosed, not a free win.
3. **A legacy palette beside the fixed one still fails.** `chartTheme.js`'s `CHART_COLORS`, imported by 10 files, has **6 of 7** values below 3:1 — including `positive` and `tiktok` both set to `#22c55e`, the cross-category collision the semantic palette exists to prevent. Out of the pre-registered scope, so reported rather than quietly fixed.

## What this does NOT license saying

- ❌ "Response time is now verified under 3 seconds" — it has **never** been measured end to end.
- ❌ "The trained model is deployed" — the checkpoint is not even in the repository.
- ❌ "Code-mixed text is now evaluated" — it is not.
- ❌ "Sentiment improves the forecast after re-testing" — that re-test has not been run.

## Scoreboard slide (Slide 20), if updated

Only one row changes. The rest stand exactly as submitted.

| Target | Result | Status |
|---|---|---|
| Sentiment accuracy ≥ 80% overall | 84.12% | MET |
| Sentiment accuracy ≥ 75% per language | EN 78.28 · BM 86.88 · ZH 94.37 · code-mixed not evaluated | MET (3 TESTED) |
| Forecast MAPE < 15% | 21.41 · 15.17 · 13.28 across three protocols | PARTIAL · 1 OF 3 |
| Sentiment variant beats sales-only | Worse in 6 of 8; none significant | NOT MET |
| UAT overall mean ≥ 4.0 | 4.07 | MET OVERALL |
| Response time < 3 s | 2.70 ms computation; end-to-end not measured | PARTIAL · NOT SHOWN END-TO-END |
| **Chart contrast ≥ 3:1** | **At submission 2.28:1, 4 of 15 failing. Corrected post-submission: 15 of 15 pass in both themes** | **NOT MET AT SUBMISSION · FIXED AFTER** |

Keeping the "at submission" value visible in that row is the point — it shows the examiner the finding *and* the fix, without implying the submitted document said something it did not.

## To unblock the other four

| Need | Unblocks |
|---|---|
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` + an unpaused backend | Task 2 |
| ~~The trained XLM-R checkpoint~~ — **confirmed lost 2026-11-19; cannot be unblocked without training a new model** | Tasks 3, 4, 5 |
| SentiBahasaRojak licence check | Task 4 |
| Your explicit confirmation | Task 5 |

---

## If asked at the viva: "why was code-mixed never evaluated?"

The honest answer, in full:

> It was out of scope at submission, and the dissertation says so. I attempted it
> after submission. The evaluation requires the trained XLM-R checkpoint, and that
> checkpoint no longer exists — the training run saved it to the Colab runtime's
> local disk rather than to Drive, so it was destroyed when the runtime was
> recycled. Only the config and tokenizer survived. I could train a replacement,
> but it would be a different model from the one my results tables describe, so
> evaluating it would not answer the question honestly. I recorded the loss, and
> the cause, in the post-submission results rather than working around it.

**None of the submitted sentiment metrics depend on the weights file.** The accuracy
figures are evidenced by `O1_SCORECARD.md` and `model_versions_v20261020-171546.json`,
both intact and unmodified.
