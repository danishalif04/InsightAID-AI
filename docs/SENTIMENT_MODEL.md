# Sentiment Model — Training, Evaluation, Versioning, Inference (FYP2.md §46-49)

## Status: real dataset prepared; no training run has happened yet

Everything in this document describes a real, runnable pipeline
(`ml/sentiment/`). A real, public training dataset has now been prepared
(see "Dataset" below) — but **no training run has happened yet**.
`ml/sentiment/results/metrics_template.json` has every metric field set to
`null`, and nothing in this repo has fabricated a number to fill it in. When
a real run does happen, its output replaces that template's role (a new,
timestamped JSON per model/eval-path pair) — this document does not get
hand-edited with guessed results.

## Dataset (FYP2.md §84)

Prepared from 5 public sources by `ml/data_prep/sentiment_prep.py`
(notebook: `ml/notebooks/01_sentiment_data_preparation.ipynb`). Full detail —
per-source row counts, label methods, processing steps, licences — is in
`docs/datasets/sentiment/DATASET_REPORT.md` and `manifest.json`; summary:

- **`dataset_version`: `v20261012-ba90cb55d8f7`** — every model trained on
  this data must record this exact version (the `model_versions` table has a
  `dataset_version` column for this).
- 107,171 rows total after cleaning/dedup/per-source caps, from an initial
  ~2.0M loaded rows. Split: 85,639 train / 10,763 validation / 10,769 test.
- Sources: `amazon_2023_all_beauty` (Hugging Face, Hou et al. 2024),
  `malay_combined` (Hugging Face/mesolitica, Malay — ChatGPT-labelled rows
  excluded by default), `online_shopping_10_cats` (GitHub, Chinese, binary
  only — no neutral examples from this source), `shopee_kaggle` (Kaggle),
  `shopee_my_kensvin` (Hugging Face, MIT — aspect-level human annotations
  collapsed to a majority-polarity review label).
- Language split: en 54,974 / ms 28,197 / zh 24,000.
- Labels are a mix of real human/publisher labels and rating-derived weak
  labels (`rating_weak`: 54,000 rows) — see the report's "Rows by label
  method" table for the full breakdown. This is **not** a Malaysian-specific
  corpus; `shopee_my_kensvin` is the only Malaysia-sourced slice (974 rows).
- **These splits are for model development only.** The project's own
  methodological note (in the dataset report) is explicit that the thesis
  headline result should also be reported against the hand-labelled gold
  test set (`gold_test_set/` — not yet built; see below), since this
  dataset's own train/val/test labels are not independently verified.
- None of this data has been copied into this repo or committed to Git —
  only the prep code, notebooks, and these reports. The actual rows live in
  Google Drive (`MyDrive/INSIGHTAID_AI/ml_data/`).

### Gold test set (not yet built)

`gold_test_set/ANNOTATION_GUIDELINES.md` (prepared alongside the dataset,
currently only in the Drive-side export, not copied into this repo) defines
how to hand-label 300-500 real Malaysian comments with two independent
annotators, for a validated — not weak-labelled — headline accuracy figure.
This has not been done yet.

## Scope note: what's in FYP2.md's spec vs. this project's own methodology

FYP2.md §46 names exactly one model: **XLM-RoBERTa**, classifying text
directly (no translation step) into positive/neutral/negative, with the
pipeline `Text → Language Detection → Preprocessing → Tokenizer → XLM-RoBERTa
→ Sentiment → Confidence`. §47 asks for "language-specific performance where
possible."

Three things below are **not** in that spec — they are this project's own
methodology addition, requested explicitly for this phase:

1. **mBERT** as a comparison model.
2. **TF-IDF + Logistic Regression** as a classical baseline.
3. **Two evaluation paths** — classify in the original language vs.
   translate to English first — evaluated across all three models.

This is called out explicitly so it's never mistaken for something FYP2.md
itself required.

## Weak-label methodology (FYP2.md §37, §47)

Most rows have a star rating but no manual sentiment annotation. The
project's one documented rating→sentiment methodology,
`rating_heuristic_v1`, already exists for the JS app
(`src/utils/ratingSentimentHeuristic.js`) and is ported exactly (not
reinvented) to `ml/sentiment/src/weak_labels.py`:

| Rating | Weak label | Confidence |
|---|---|---|
| 4-5 | positive | 0.6 |
| 3 | neutral | 0.5 |
| 1-2 (or anything else in range that isn't ≥4 or exactly 3) | negative | 0.6 |

`score` normalizes the rating to [-1, 1] (1★→-1, 3★→0, 5★→1). Ratings
missing or outside [1, 5] produce no label at all — never a guessed one.
This is a **noisy proxy**, not ground truth: a 5-star rating with sarcastic
text is still labelled positive. Every weak label is training-signal only;
see the manual-subset handling below for how validation/test try to reduce
reliance on it.

## Preprocessing parity (FYP2.md §44)

`ml/sentiment/src/clean.py` mirrors `src/utils/textPreprocessing.js`'s
documented order exactly: preserve raw text → detect language before any
cleaning → strip URLs → strip platform symbols (RT-prefixes, zero-width
characters) → cap runaway repeated letters at 3 → keep hashtags/mentions in
the text (extracted separately as features, not deleted) → represent
code-mixed Malay-English as the `ms-en` language tag rather than forcing a
single-language guess. Language detection is the same small function-word/
script heuristic on both sides of the pipeline (JS and Python) — documented
as a heuristic, never claimed as a validated language-ID model.

## Data split (FYP2.md §47 — avoid leakage, stratify)

`ml/sentiment/src/split.py`:

- Exact-duplicate `cleaned_text` rows are dropped before splitting.
- Splitting happens at the **author level** (`author_id_hash`), not the row
  level — every row from one author lands in exactly one split, so
  near-duplicate posts from the same person can't leak between train and
  test even after exact-dedup.
- Stratification target is (language, majority label) per author group.
- Default ratios: 70% train / 15% val / 15% test.
- A `check_leakage()` pass confirms no id or author appears in more than one
  split before training proceeds.

### Manually-validated subset (FYP2.md §47)

If a human-annotated CSV (same schema, gold `label` values) is supplied, its
rows are removed from the auto-split pool **by id first** — so they can
never end up used as noisy weak-labelled training data — and placed into
the validation split. No manually-labelled data exists in this repo yet;
until it does, validation/test metrics are computed against rating-derived
weak labels too, and any report of results must say so plainly rather than
implying validated real-world accuracy.

## Models (FYP2.md §46 + this project's comparison methodology)

| Model | Role | Checkpoint |
|---|---|---|
| XLM-RoBERTa | Primary (per §46) | `xlm-roberta-base` |
| mBERT | Comparison | `bert-base-multilingual-cased` |
| TF-IDF + Logistic Regression | Classical baseline | scikit-learn, no pretrained checkpoint |

## Evaluation (FYP2.md §47-48)

Each model is scored on the held-out test set under **both** evaluation
paths:

- **`original_language`** — classify `cleaned_text` as-is.
- **`translate_to_english`** — translate non-English text first (local,
  offline Helsinki-NLP `opus-mt-{ms,zh}-en` models via `ml/sentiment/src/translate.py`
  — no paid API, fully reproducible), then classify the translated text.
  English and code-mixed (`ms-en`) text passes through unchanged for this
  path, since there is no single well-defined translation direction for
  code-mixed text that doesn't discard information.

This produces up to 6 result rows per training run (3 models × 2 paths).
Metrics computed (`ml/sentiment/src/metrics.py`, real code, unit-tested):
accuracy, macro precision/recall/F1, confusion matrix, and a per-language
breakdown of all four. FYP2.md §47's stated targets (~≥80% overall, ~≥75%
per language) are **targets, not guaranteed results** — nothing in this
repo asserts they were met, because no run has happened.

## Model versioning (FYP2.md §48)

New table: `model_versions` (`supabase/migrations/0004_model_versions.sql`).
Confirmed via repo audit that no equivalent table existed in any prior
migration. Columns: §48's required fields (`model_name`, `model_version`,
`trained_at`, `dataset_version`, `training_samples`, `validation_samples`,
`test_samples`, `accuracy`, `precision`, `recall`, `f1`) plus `model_type`
(`xlmr`/`mbert`/`tfidf_lr`), `eval_path`, `per_language_metrics` (jsonb),
`confusion_matrix` (jsonb), and `notes`.

**RLS differs from every other table in this project on purpose**: this is
shared model metadata, not per-user data. `select` is open to any
`authenticated` user (e.g. for a future "current model version" display);
there is **no insert/update/delete policy** for `anon` or `authenticated` —
only the Supabase **service role** can write a row, matching the
established pattern that training happens offline and results are uploaded
by whoever ran the training, not by the frontend.

## Inference service design (FYP2.md §49) — design only, not built this phase

**The frontend must never run the model.** §49's architecture:

```
React (frontend)
  -> Supabase Edge Function (thin proxy: auth, RLS-equivalent checks, request shaping)
  -> ML inference host
  -> XLM-R (the fine-tuned model)
  -> Prediction (+ confidence)
```

**Where inference will run:** neither Vercel serverless functions nor a
Supabase Edge Function (Deno) can reliably load and run XLM-R — no
persistent large-model memory, no GPU, and cold-start latency that would
make every request train-adjacent in cost. The chosen host is **Hugging
Face Inference Endpoints**: the fine-tuned model is pushed to a private HF
model repo once training produces one worth serving, and a managed HF
Inference Endpoint (or the free Inference API, for smaller checkpoints)
hosts it. A future Supabase Edge Function (e.g. `sentiment-inference`)
becomes a thin proxy — same secrets-never-in-the-frontend pattern already
used by `extract-business-profile` and `source-status` — forwarding text to
the HF endpoint and returning the prediction/confidence to the app.

**Why this isn't built yet:** there is no trained model to host. Writing an
Edge Function that calls a Hugging Face endpoint for a model that doesn't
exist would be exactly the "claim a feature works without running it"
failure this project avoids. Building it is explicit future work, gated on
a real training run producing a model worth deploying.

## Where the code lives

See `ml/sentiment/README.md` for the full file layout, how to run the
(currently passing, 36/36) pytest suite for the pure-logic modules, and what
running actual training requires.
