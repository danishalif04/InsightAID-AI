# FYP II Phase 3 Status — Sentiment Module (O1)

## What this phase did NOT do

It did not retrain XLM-R, mBERT, or TF-IDF+LR. That training already happened for real, in a prior session, in Colab (`ml/notebooks/03_train_sentiment_models.ipynb`), against the real 107,171-row dataset documented in `docs/datasets/sentiment/DATASET_REPORT.md`. Redoing it would duplicate completed, verified work, and this environment has no GPU and no access to the dataset (it lives on Google Drive, not in this repo).

## What this phase recovered and built

1. **Parsed the training run's real saved output.** The only durable record of that run was the `INSERT INTO model_versions (...)` SQL the notebook printed (meant to be pasted into Supabase) — never actually structured as a file in this repo. `src/parse_training_run.py` turns that SQL back into `results/model_versions_v20261020-171546.json`. Tested against the real SQL as a fixture (`results/fixtures/notebook_insert_sql_v20261020-171546.sql`), not a synthetic example.

2. **Computed the O1 scorecard for real** (`src/o1_scorecard.py` → `results/O1_SCORECARD.md`):

   | Model | Eval path | Overall | en | ms | zh | O1 target met? |
   |---|---|---|---|---|---|---|
   | TF-IDF+LR | original_language | 74.34% | 71.96% | 82.98% | 69.71% | FAIL |
   | XLM-R | original_language | **84.12%** | **78.28%** | **86.88%** | **94.37%** | **PASS** |
   | mBERT | original_language | 82.48% | 76.81% | 84.54% | 93.17% | PASS |
   | (all 3) | translate_to_english | 64–72% | — | — | — | FAIL |

   **O1's acceptance target (≥80% overall AND ≥75% per language) is demonstrably MET**, by both XLM-R (the main model) and mBERT (the comparison model) — on the original-language evaluation path only. Translation-first fails the target for every model, confirming the already-known finding that translating before classifying hurts multilingual performance here.

3. **Computed a real 95% confidence interval** (`src/confidence_interval.py`) for XLM-R's accuracy: **83.42% – 84.80%**, entirely above the 80% threshold — the PASS is statistically robust, not a point estimate that happens to clear the bar by luck. This uses a Wilson score interval, not literal bootstrap resampling — see the methodological note below.

4. **Built, but could not run for real**, three further Phase 3 deliverables — each is a tested, working tool, genuinely blocked only by missing input data, not by missing code:
   - **McNemar's test** (`src/mcnemar_test.py`) — needs per-example paired predictions (did XLM-R get row *i* right, did TF-IDF+LR get row *i* right) for the identical test rows. Only the two models' separate AGGREGATE confusion matrices were ever saved; per-example predictions were never exported from Colab.
   - **The 50-most-confident-errors-per-language export** (`src/error_analysis.py`) — same blocker: needs per-example predictions with a confidence score.
   - **Cohen's kappa** (`src/compute_kappa.py`) — the annotation-sample export tool (Phase 2) produces a CSV with a blank `annotator_2_label` column; no human has filled it in yet. The computation runs the instant that file exists.

## Methodological note for the dissertation (write this in, don't bury it)

The master prompt asks for a "bootstrap 95% confidence interval." A literal bootstrap resamples individual test examples with replacement — it needs per-example predictions, which (per above) were never saved. What's reported instead is a **Wilson score interval** computed directly from the saved confusion matrix's correct/incorrect counts — a different, but statistically valid, method for a binomial proportion at this sample size (n=10,769). This is disclosed explicitly here and should be disclosed the same way in the paper: name it as a Wilson interval, not as "the bootstrap," if asked how it was computed.

## To unblock McNemar's test, the error analysis, and a true bootstrap next time

Re-run inference (not retraining — the checkpoints are already saved on Drive) for XLM-R and TF-IDF+LR on the same test split, and this time save a CSV with one row per test example: `{id, language, true_label, xlmr_pred, xlmr_confidence, tfidf_pred, tfidf_confidence}`. Every tool in this phase is already written to consume exactly that shape.

## Code-mixed language coverage — a real, disclosed gap

The real training/eval dataset only tags examples as `en`/`ms`/`zh` — no row is tagged as code-mixed ("ms-en"), so a code-mixed accuracy figure cannot be reported from this run, even though the live app's own language detector (`src/utils/textPreprocessing.js`) does detect code-mixed text at inference time. State this as a known limitation, not an oversight to hide.

## Quality gates

70/70 pytest passing in `ml/sentiment` (up from 41 before this phase). No `src/` JS touched this phase.
