# Summary for Slides — Post-Submission Re-Test

Every row is sourced to [`RESULTS.md`](RESULTS.md). The dissertation is **frozen**; nothing here changes what the submitted document says.
Run date **2026-11-19** · protocol pre-registered `c87a7a9` · change committed `a5c9021`.

## Target | At submission | After re-test | Status

| Target | At submission | After re-test | Status | Source |
|---|---|---|---|---|
| **Chart contrast ≥ 3:1** | Chart green **2.28:1**; **4 of 15** below 3:1 (light theme only) | **15 of 15 pass in both themes.** Re-audit first found **6** failures, not 4 — the submitted audit checked light only | ✅ **NOW MET** | RESULTS.md §Task 1 |
| **End-to-end page time < 3 s** | Not measured ("2.70 ms computation; end-to-end not measured") | **Now measured, and missed.** 5 runs, production build. Medians: Dashboard **7079**, Crisis **4387**, Recommendations **4039**, Forecasting **4079**, Sentiment **1583** ms. Worst single observation **7633 ms** | ❌ **MEASURED — NOT MET** | RESULTS.md §Task 2 |
| **Trained sentiment model deployed** | Not deployed — dashboard uses `rating_heuristic_v1` | **Still not deployed.** Recovery attempted 2026-11-19 and failed: the checkpoint was written to Colab's ephemeral disk, not Drive, and was destroyed with the runtime | ⛔ **UNCHANGED — permanently blocked** | RESULTS.md §Task 3 |
| **Code-mixed accuracy** | Not evaluated | **Still not evaluated** — same lost checkpoint | ⛔ **UNCHANGED — permanently blocked** | RESULTS.md §Task 4 |
| **Sentiment variant beats sales-only** | Worse in 6 of 8 DM tests; none significant | **Not re-tested** — awaiting confirmation, and blocked by the same checkpoint | ⏸ **NOT STARTED** | RESULTS.md §Task 5 |

**Two of five targets moved: one was fixed, one was measured for the first time and failed.** Of the remaining three, all are blocked by the loss of the trained checkpoint, which was confirmed unrecoverable on 2026-11-19.

---

## If a slide is updated, this is the honest wording

> **Chart contrast.** The dissertation reports chart green at 2.28:1 and four of fifteen colours below the W3C 3:1 minimum. Re-auditing after submission against **both** themes — the submitted audit measured the light theme only — found **six** failures, including a forecast line at **1.30:1** on the dark theme. All six were corrected; **all fifteen now pass in both themes**, verified with the project's own contrast function, with ESLint clean, 470 tests passing and the build succeeding.

**Three things that must accompany that claim on the slide or in the answer:**

1. **The dissertation's number is not withdrawn.** 2.28:1 is correct against pure white; 2.14:1 is the same colour against the canvas a chart actually sits on. Two methods, both stated.
2. **Colour-blind separation got slightly worse** — 9 of 12 category×deficiency cells fell, tightest at **30.35** (crisis/deuteranopia, floor 30). A real trade-off, disclosed, not a free win.
3. **A legacy palette beside the fixed one still fails.** `chartTheme.js`'s `CHART_COLORS`, imported by 10 files, has **6 of 7** values below 3:1 — including `positive` and `tiktok` both set to `#22c55e`, the cross-category collision the semantic palette exists to prevent. Out of the pre-registered scope, so reported rather than quietly fixed.

## What this does NOT license saying

- ❌ "Response time is now verified under 3 seconds" — it has now been measured, and **it is not under 3 seconds**. Four of five pages miss, the slowest by more than double.
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
| **Response time < 3 s** | **At submission 2.70 ms computation, end-to-end not measured. Measured post-submission: 4 of 5 pages miss; slowest median 7079 ms** | **NOT MET · MEASURED AFTER SUBMISSION** |
| **Chart contrast ≥ 3:1** | **At submission 2.28:1, 4 of 15 failing. Corrected post-submission: 15 of 15 pass in both themes** | **NOT MET AT SUBMISSION · FIXED AFTER** |

Keeping the "at submission" value visible in that row is the point — it shows the examiner the finding *and* the fix, without implying the submitted document said something it did not.

## To unblock the other four

| Need | Unblocks |
|---|---|
| ~~`E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` + an unpaused backend~~ — **supplied; Task 2 is complete** | Task 2 |
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

---

## If asked at the viva: "your system is slower than 3 seconds — doesn't that fail Objective 3?"

The answer to give, in full, without hedging:

> Yes, on this measurement it fails. The dissertation reports a 2.70 ms
> computation time and states explicitly that end-to-end was not measured. After
> submission I measured it: production build, one discarded warm-up, five runs,
> median and maximum per page. Four of the five pages exceed 3 seconds. The
> Dashboard has a median of 7.1 seconds. I am reporting that as not met.
>
> Three things qualify the number without excusing it. The metric is
> navigation-to-network-idle, which I pre-registered as a deliberately
> conservative proxy — it waits for every trailing request, so a user sees a
> usable page earlier than this figure suggests. The measurement is on a
> development laptop over home broadband to a free-tier Supabase instance, which
> is not controlled infrastructure. And the runs drifted within the session, from
> about 7.1 down to 4.5 seconds, which I report rather than average away — but
> even the fastest runs miss the target.
>
> What I would do next is profile the Dashboard specifically. It is the slowest
> page by a wide margin while Sentiment, on the same stack and the same backend,
> comes in at 1.6 seconds — so the bottleneck is that page's own query pattern,
> not the architecture.

**Why this is a strong answer rather than a weak one:** you found the gap yourself,
pre-registered the method before running, reported the number that hurt, and can
name the next diagnostic step. The alternative — leaving "not measured" on the
slide — invites exactly the same question with no answer attached.

---

## Optional slide — affordability has an engineering cost (gap G4)

Not a pre-registered target. Use it only if you want to show G4 evidenced rather than asserted.

> The same deployed function, the same question, two free-tier providers,
> changed by three configuration values with no code change and no redeploy:

| Free-tier provider | Success | Median latency |
|---|---|---|
| `gemini-3.8-flash` | **2 / 7 (29%)** | **~80 s** |
| `openai/gpt-oss-120b` (Groq) | **7 / 7 (100%)** | **0.71 s** |

> One free-tier provider could not support an interactive dashboard at all — 80 seconds
> against a 3-second target, and in one case the Supabase function exhausted its own
> free-tier compute while waiting. Another met it comfortably. Affordability is
> achievable, but it is not free of engineering consequence, and the provider-agnostic
> client is what made the substitution a configuration change.

**Say this limit out loud if you use the slide:** 14 calls, two days, one machine, one
network. It is evidence about this deployment, **not** a benchmark of either provider.
Free-tier capacity is best-effort and varies by hour and region.
