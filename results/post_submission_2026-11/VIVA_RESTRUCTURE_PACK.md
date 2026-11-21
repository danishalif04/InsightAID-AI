# INSIGHTAID AI — Viva Restructure Pack

**Everything that changed after the dissertation was submitted, in one place, ready to rebuild the viva slides from.**

> **Ground rule.** The dissertation is **frozen as submitted**. Nothing here edits it. Every figure below is labelled **"at submission"** or **"after submission"** so the slides can show both, and every one traces to a file or commit in Section 9. If a slide needs a number that is not in this pack, it does not exist yet — measure it, don't estimate it.

Prepared 2026-11-20 · Student: Muhammad Danish Alif Bin Azrul (22006390)

---

## 1. The headline, in one paragraph

After submission I pre-registered a re-test of my weakest results and ran it. **One target I failed at submission is now fixed** (chart contrast, 15 of 15 colours pass). **One target that was never measured is now measured — and missed** (end-to-end page time). **Three planned re-tests are permanently blocked**, because the trained XLM-RoBERTa checkpoint was lost when its Colab runtime was recycled. Separately, the system gained a working **AI shop generator** on the Malaysian Local Shop pathway, running live on **Groq** at sub-second latency, and the test suite grew from **470 to 565** passing tests.

---

## 2. The scoreboard — replace your existing scoreboard slide with this

Seven targets. Only **two rows changed**; the other five stand exactly as submitted.

| Target | At submission | After submission | Status to show |
|---|---|---|---|
| Sentiment accuracy ≥ 80% overall | **84.12%** | unchanged | ✅ **MET** |
| Sentiment accuracy ≥ 75% per language | EN **78.28** · BM **86.88** · ZH **94.37** · code-mixed not evaluated | unchanged | ✅ **MET (3 languages tested)** |
| Forecast MAPE < 15% | **21.41 · 15.17 · 13.28** across 3 protocols | unchanged | 🟡 **PARTIAL — 1 of 3** |
| Sentiment-enhanced forecast beats sales-only | Worse in **6 of 8** Diebold–Mariano tests, none significant | unchanged | ❌ **NOT MET** |
| UAT satisfaction ≥ 4.0 / 5 | **4.07** | unchanged | ✅ **MET** |
| **Chart contrast ≥ 3:1** | Chart green **2.28:1**; **4 of 15** colours failing | **15 of 15 pass in both themes** | 🔁 **NOT MET AT SUBMISSION · FIXED AFTER** |
| **Response time < 3 s** | **2.70 ms** computation; end-to-end **not measured** | **Measured: 4 of 5 pages miss.** Slowest median **7,079 ms** | 🔁 **NOT MEASURED AT SUBMISSION · MEASURED AFTER, NOT MET** |

**Count: 3 met · 1 partial · 1 not met · 1 fixed after submission · 1 measured after submission and missed.**

> Keep the "at submission" column visible on the slide. It shows the examiner the finding *and* the fix, without implying the submitted document said something it didn't.

---

## 3. The re-test, target by target

**Method, for one slide:** protocol written and committed **before** any run (`c87a7a9`); submitted result files untouched; every run reported, including failures; no hyperparameter tuning, no changing folds, horizons or targets after seeing results.

### 3.1 Chart contrast — ✅ fixed

| | |
|---|---|
| **Re-audit finding** | **6** colours failed, not the 4 reported. The submitted audit checked the **light theme only**; the dark theme added two more. |
| **Worst case found** | The forecast "actual" line at **1.30 : 1** on the dark theme — a near-black line on a near-black page |
| **Fix** | 6 colours replaced, each the **smallest visible change** that passes 3:1 in both themes |
| **Result** | **15 / 15 pass** in light and dark |
| **Honest trade-off** | Colour-blind separation dropped in 9 of 12 cells. All still clear the floor of 30; the tightest is crisis colours under deuteranopia at **30.35** |
| **Still outstanding** | A **legacy** colour map (`CHART_COLORS`, used by 10 files) has **6 of 7** values below 3:1. It was outside the pre-registered scope, so it was reported rather than changed |

### 3.2 End-to-end page time — ❌ measured, not met

Production build, one warm-up run discarded, **5 measured runs**, navigation start → network idle.

| Page | Median | Max | |
|---|---|---|---|
| Dashboard | **7,079 ms** | 7,633 ms | ❌ |
| Sentiment Analysis | **1,583 ms** | 1,667 ms | ✅ |
| Forecasting | **4,079 ms** | 4,550 ms | ❌ |
| Crisis Detection | **4,387 ms** | 4,779 ms | ❌ |
| Recommendations | **4,039 ms** | 5,105 ms | ❌ |

- **Only 1 of 5 pages meets 3 s.**
- **The useful diagnosis:** Sentiment loads in **1.6 s** on the same stack, build and database. So the slowness is in the other pages' own data loading, not the architecture. The Dashboard is the place to start.
- **Why the metric is pessimistic:** "network idle" waits for every trailing request, so a user sees a usable page *before* this figure. That qualifies the number; it doesn't rescue it.
- **Drift, reported not hidden:** runs 2–4 were about 2.5 s slower than runs 5–6. All five count. Even the two fastest leave the Dashboard above 4.4 s.

### 3.3 Trained model deployment, code-mixed accuracy, sentiment-as-regressor — ⛔ permanently blocked

All three needed the trained XLM-RoBERTa checkpoint. The recovery attempt on 2026-11-19 found **config and tokenizer files only — no model weights**. The training run had saved to Colab's temporary disk (`/content/`), not Google Drive, so the weights were destroyed with the runtime.

- **No submitted figure is affected.** 84.12% and the per-language results are evidenced by `O1_SCORECARD.md`, which is intact.
- **Not re-trained, deliberately.** A new model would differ from the one the dissertation reports, so testing it would answer a different question.
- **Frame it as a lesson, not a failure:** fixed seeds and pinned versions protected the *procedure*, but not the *artefact*. Checkpoints belong on persistent storage from the first epoch.

---

## 4. New in the system since submission — the demo material

### 4.1 AI shop generator (Malaysian Local Shop pathway) — **the strongest new thing to show**

An owner with no data types three things — **business sector, monthly revenue target, a description** — and gets a complete starting shop: about 12 products with costs and prices, expenses, and startup costs. Every Local Shop page then renders it, including the **What-If Simulator**.

| | |
|---|---|
| **Model** | `openai/gpt-oss-120b` on Groq (free tier) |
| **Design rule** | **The AI supplies inputs only. The app computes every figure.** Break-even, margins, daily targets and capital gap all come from the existing engine, never from the AI. |
| **Enforced in code** | The validator strips **18 kinds of computed figure** if the AI tries to supply them, and rejects the whole scenario rather than half-loading it |
| **Labelled** | A generated shop carries an **"AI-generated"** badge and can never pass as the owner's own records |
| **Tested** | 5 deliberately different businesses — kopitiam, home bakery, laundry, motorcycle workshop, frozen food — **all 5 generated and passed validation in 2.0–3.5 s** |

**This is your architecture claim made visible:** *the engine computes every number; the language model only fills inputs and phrases results.* Say it out loud while demoing.

### 4.2 Live AI on Groq, and a measured finding for gap G4 (affordability)

Same function, same question, provider swapped by **three configuration values with no code change**:

| Free-tier provider | Calls that worked | Median response |
|---|---|---|
| Google `gemini-3.8-flash` | **2 of 7** | **~80 s** |
| Groq `openai/gpt-oss-120b` | **7 of 7** | **0.71 s** |

> *Affordability is achievable, but it has engineering consequences.* One free provider couldn't support a live dashboard at all; another met it with room to spare. **State the limit if you use this:** 14 calls on one machine — evidence about this deployment, not a benchmark of either provider.

### 4.3 Smaller improvements worth one line each

- **Three dead panels replaced with real analysis:**
  - Emotion Analysis → **Classifier Confidence**
  - Region Breakdown → **Language Breakdown** (the per-language view objective O1 is graded on)
  - Top Influencers → **Reach by Sentiment**, a PDPA-safe metric that needs no personal data
- **Pathway-aware navigation:** the Local Shop menu appears only on the Local Shop pathway, with a test guarding it
- **New brand mark** on the login page, plus the tagline **"Decisions, backed by evidence."**
- **New demo account:** `usertest5` (Malaysian Local Shop)
- **Test suite: 470 → 565 passing tests**; ESLint clean; build succeeds

---

## 5. The 2-minute demo video

`insightaid-demo/out/insightaid_demo.mp4` — 2:00, 1920×1080, with female voiceover, music and captions.

| | |
|---|---|
| **Use it** | as the opening of the viva, or in place of a live demo if the network is unreliable |
| **Tone** | promotional: it shows what the product does and stays out of methodology |
| **Real figures in it** | 84.12% overall; EN / BM / ZH accuracy; the Crisis page at **30/100 Warning**; the **RM 3,971** forecast; the real **Free / RM 49 / Business** pricing |
| **Illustrative** | The "Segar Drinks" leaking-bottle story is fictional and carries a small on-screen label |

**Be ready for one question:** *"Is the model in the video the one running live?"*
**Answer:** the video shows what the system does; the trained model scored 84.12%; the live demo environment uses the rating-heuristic fallback because the checkpoint was lost. All true, nothing hidden.

---

## 6. Suggested slide changes

| Where | Change |
|---|---|
| **Opening** | Play the 2-minute video, or a 30-second cut of it |
| **Scoreboard** | Replace with the table in Section 2 |
| **NEW — "Post-submission re-test"** (after the scoreboard) | Method line + the three outcomes from Section 3: one fixed, one measured and missed, three blocked |
| **NEW — "Response time, measured"** | The 5-page table from 3.2, with the Sentiment-vs-Dashboard diagnosis |
| **Live demo section** | Add the AI shop generator (4.1). Generate one shop live, then open the What-If Simulator on it |
| **Affordability / G4** | Add the Gemini-vs-Groq table (4.2) |
| **Limitations / future work** | Lost checkpoint, legacy colour map, Dashboard speed, code-mixed evaluation |
| **Closing** | End on the tagline: **"INSIGHTAID AI: Decisions, backed by evidence."** |

**Ordering advice:** put the re-test right after the scoreboard. A weakness you found and reported yourself, presented early, makes every later claim easier to believe.

---

## 7. Viva questions to prepare for

| Likely question | Answer in one breath |
|---|---|
| *"Your system misses the 3-second target."* | "Yes, on four of five pages. I measured it after submission: production build, five runs. Sentiment loads in 1.6 s on the same stack, so the bottleneck is those pages' own queries, and I'd profile the Dashboard first." |
| *"Why wasn't code-mixed evaluated?"* | "Out of scope at submission, and the dissertation says so. I tried after submission, but the checkpoint had been saved to Colab's temporary disk and was lost. Re-training would test a different model, so I recorded the loss instead." |
| *"Sentiment didn't help the forecast. Doesn't that undermine the project?"* | "It falsifies one hypothesis, which the design allowed for — it was set up so that could happen. The forecasting, crisis and recommendation pipeline works without it, and I report the negative result rather than tune until it looks positive." |
| *"How do you stop the AI inventing numbers?"* | "The engine computes every figure. In the shop generator, the validator strips 18 kinds of computed field if the model supplies them. One gap I found myself: the general orchestrator relies on its prompt, with no output check yet." |
| *"Why did the contrast audit go from 4 failures to 6?"* | "The submitted audit checked the light theme only. Checking dark as well found two more. I fixed all six." |
| *"Is this affordable?"* | "It runs on free tiers, and the provider is three settings. But I measured that one free provider was unusable, at 80 seconds, so affordability needs the right provider." |

---

## 8. What NOT to claim on any slide

- ❌ "Response time is under 3 seconds"
- ❌ "The trained XLM-RoBERTa model is deployed / running live"
- ❌ "Code-mixed text is evaluated"
- ❌ "Sentiment improves the forecast"
- ❌ "All charts meet contrast" — the 15 main colours do; the legacy map does not
- ❌ Any Gemini-vs-Groq figure presented as a benchmark
- ❌ Any "Segar Drinks" figure presented as real customer data

---

## 9. Where every number comes from

| Figure | Source | Commit |
|---|---|---|
| Re-test protocol | `results/post_submission_2026-11/PROTOCOL.md` | `c87a7a9` |
| Contrast 15/15, the 6 failures, CVD 30.35 | `RESULTS.md` §Task 1; `contrast_audit_*.json` | `a5c9021` |
| Page times, median and max | `timing_2026-11-19_raw.txt`; `summarise_timing.mjs` | `2759506` |
| Checkpoint lost | `RESULTS.md` §Task 3 | `edf0c39` |
| Gemini vs Groq; the RM 600 guard gap | `RESULTS.md`, out-of-scope observation | `6df6977` |
| Shop generator and validator | `src/utils/shopScenarioSchema.js`; `supabase/functions/generate-shop-scenario/` | `192b7b8`, `e3d2c67`, `0a3616c` |
| 5 test businesses | `docs/demo/LOCAL_SHOP_GENERATOR_TEST_SCENARIOS.docx` | `c18b305` |
| Replacement panels | `src/utils/postBreakdowns.js` | `e7fb9c9` |
| 84.12%, per-language, MAPE, DM, UAT 4.07 | as submitted: `ml/sentiment/results/O1_SCORECARD.md`, `protocol_summary_a8b3bb637d28.json` | unchanged |
| Demo video | `insightaid-demo/` (`src/data/content.ts` holds every figure in it) | not yet committed |
