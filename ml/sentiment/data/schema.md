# Expected training data schema

This pipeline expects a CSV export of the `processed_data` table (see
`supabase/migrations/0003_data_pipeline.sql` and `docs/DATA_PIPELINE.md`) —
the JS pipeline already normalizes uploaded/seeded data into these columns,
so training data should come from the same place, not a separately invented
format.

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | string/int | yes | unique row id — used for leakage checks in `src/split.py` |
| `author_id_hash` | string | recommended | used to keep one author's rows in a single split; if absent, each row is treated as its own group |
| `raw_text` | string | yes | untouched original text — never used for training directly, kept for audit/reproducibility |
| `cleaned_text` | string | yes | output of `src/clean.py`'s `preprocess_text()` (or the JS `textPreprocessing.js`, which produces the same thing) — this is the training/inference text column |
| `language` | string | yes | one of `en`, `ms`, `zh`, `ms-en`, `unknown` — from `detect_language()` |
| `rating` | number (1-5) or empty | one of `rating`/`label` required | used by `src/weak_labels.py` to derive a weak training label when no manual label exists |
| `label` | string, one of `positive`/`neutral`/`negative` | one of `rating`/`label` required | a gold/manual label, when available — takes priority over the rating-derived weak label for the same row |

## Weak labels vs. manual labels

Most real-world rows will only have a `rating`, not a manual sentiment
label. `src/weak_labels.py`'s `classify_by_rating()` derives a **weak**
label from it, using the exact same bucketing as the JS app's
`rating_heuristic_v1` (4-5★→positive, 3★→neutral, 1-2★→negative). Weak
labels are noisy by construction — a 5-star rating with sarcastic text is
still labelled positive — so:

- Weak labels are only ever used to build the **training** split.
- A separate, optional manually-labelled CSV (same schema, but `label` is a
  human annotation, not rating-derived) can be passed to
  `src/split.py`'s `stratified_split(..., manual_df=...)`. Those rows are
  removed from the auto-split pool by `id` first (so they're never used as
  weak-labelled training data) and placed into the validation split, so
  validation metrics reflect real human judgment wherever any exists.
- No manually-labelled data ships with this repo. Until some exists,
  validation and test metrics are computed against rating-derived weak
  labels too — which the training run's output must state plainly (see
  `docs/SENTIMENT_MODEL.md`'s "current status" section), since weak-label
  validation accuracy is not the same claim as validated real-world accuracy.

## Where this data comes from today

Dataset Management → "ML Training Data Export" → "Sentiment Training CSV"
exports every real `processed_data` row in exactly this shape
(`src/services/mlExportService.js`'s `fetchSentimentTrainingRows()`). No
manually-labelled subset exists yet — every row relies on the rating-derived
weak label described above. This schema and the pipeline built against it
are otherwise still scaffolding — see `README.md` for what running the
notebook actually requires before it can produce a real number.
