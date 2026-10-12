# InsightAid AI — Sentiment Model Training (Phase 6, FYP2.md §46-49)

Offline training pipeline for the project's sentiment classifier. Deliberately
kept out of the JS/Vite frontend and out of any Supabase Edge Function —
FYP2.md §46 is explicit that XLM-R must never train inside a Vercel/Edge
Function request.

## Status: scaffolding, no model trained yet

**No labelled training data ships with this repo, and nothing here has been
run against real data.** Every script and the notebook are real, runnable
code — the pure-logic modules (`src/weak_labels.py`, `src/clean.py`,
`src/split.py`, `src/metrics.py`) are unit-tested and those tests genuinely
pass (`pytest tests/`) — but no model has been trained, so
`results/metrics_template.json` has every metric field set to `null`. Do not
treat any number that appears anywhere in this folder or in
`docs/SENTIMENT_MODEL.md` as a real result unless it was produced by an
actual training run.

## What's here

```
ml/sentiment/
  requirements.txt        pip install -r requirements.txt (see file for a lighter
                           "tests only" subset vs. the full training subset)
  data/schema.md           expected input CSV columns
  src/
    weak_labels.py          rating -> weak sentiment label (mirrors the JS app's
                             rating_heuristic_v1 exactly)
    clean.py                 text preprocessing (mirrors the JS app's
                              textPreprocessing.js order exactly)
    split.py                 leakage-safe, author-grouped, stratified split
    translate.py             local (offline) translate-to-English path
    metrics.py                accuracy/precision/recall/F1/confusion matrix/
                              per-language, JSON + model_versions row builder
    train_xlmr.py             XLM-R fine-tuning (primary model, per §46)
    train_mbert.py            mBERT fine-tuning (comparison model)
    train_tfidf_baseline.py   TF-IDF + LogisticRegression (classical baseline)
    evaluate.py               runs a trained model through both eval paths
  tests/                     pytest suite for everything in src/ that doesn't
                              require torch/transformers to import
  notebooks/train_sentiment_xlmr.ipynb   Colab-ready end-to-end notebook
  results/                   where real metrics JSON files land (git-ignored
                              except the checked-in template + .gitkeep)
```

## Running the tests

The pure-logic modules need no GPU and no torch/transformers install:

```bash
cd ml/sentiment
pip install pandas numpy scikit-learn pytest
pytest tests/ -v
```

This has been run in this repo's dev environment: **36/36 passed.**

## Running actual training (requires real data — not included)

1. Export training rows from `processed_data` (or an equivalent source)
   matching `data/schema.md`. This export step does not exist yet anywhere
   in the app — building it is a prerequisite, not part of this phase.
2. Open `notebooks/train_sentiment_xlmr.ipynb` in Google Colab (or run the
   `src/*.py` scripts directly on a local GPU / any environment with the
   full `requirements.txt` installed).
3. Point the notebook at your exported CSV(s). It will: derive weak labels
   where only a rating exists, run the leakage-safe stratified split, clean
   text, train XLM-R + mBERT + the TF-IDF baseline, evaluate all three
   against both evaluation paths, write real metrics JSON files to
   `results/`, and print the SQL/row data needed to record each run in the
   `model_versions` table (see `supabase/migrations/0004_model_versions.sql`).
4. Nothing in this repo automatically writes to `model_versions` — that
   table only accepts writes from the Supabase service role (see the
   migration's RLS policy), matching the same "training happens offline, a
   human/script with elevated access uploads the result" pattern as every
   other Supabase migration in this project.

## Why mBERT, the TF-IDF baseline, and the two evaluation paths

FYP2.md §46 names only XLM-RoBERTa as the model to train. mBERT, the TF-IDF
baseline, and the original-language-vs-translate-first comparison are not in
that spec — they're this project's own methodology addition, requested to
give the XLM-R result something concrete to be compared against rather than
evaluated in isolation. `docs/SENTIMENT_MODEL.md` says this explicitly so it
is never mistaken for an FYP2.md requirement.

## Where inference will run (§49)

Not built in this phase — there's no trained model to host yet. See
`docs/SENTIMENT_MODEL.md`'s "Inference service design" section for the full
design (Hugging Face Inference Endpoints hosting the fine-tuned model,
behind a thin Supabase Edge Function proxy, since neither Vercel nor a Deno
Edge Function can run XLM-R).
