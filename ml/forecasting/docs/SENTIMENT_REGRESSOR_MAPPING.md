# Olist Sentiment-Regressor Mapping — FYP II Phase 4

`04_train_forecasting_models.ipynb`'s "Optional: real sentiment-enhanced comparison for Olist" cell deliberately stopped short of building this mapping, printing a warning instead: *"guessing a mapping here risks silently fabricating a 'sentiment' signal instead of using Olist's real one."* This document completes that step for real, by inspecting Olist's own data rather than guessing, and states the decision plainly so it can be cited and defended.

## What Prophet's sentiment-enhanced variant needs

`ml/forecasting/src/prophet_model.py`'s `SENTIMENT_REGRESSOR_COLUMNS = ["avg_rating_sentiment", "negative_ratio", "comment_volume"]` — three daily numbers, no NaNs.

## What Olist's data actually provides

Two real files (from the Olist Brazilian E-Commerce public dataset, already documented in `docs/datasets/sales/DATASET_REPORT.md`):

1. **`olist_review_text_for_sentiment.csv`** (39,944 rows) — raw review text: `review_id, order_id, date, review_score (1-5), product_category_name, review_comment_title, text, language`.
2. **`olist_daily.csv`** (already produced by `02_sales_data_preparation.ipynb`'s own prep step, per-series, per-day) — includes `review_count`, `avg_review_score`, `neg_review_ratio`, `pos_review_ratio`, `review_text_count` already joined onto each day's sales row for the `olist_total` series and each category sub-series.

## The mapping decision

Rather than re-deriving a second, independent daily aggregation from the raw review text (risking a subtly different, undocumented definition of "negative" than whatever `02_sales_data_preparation.ipynb` already used), this mapping **reuses the already-computed per-day columns in `olist_daily.csv` directly**:

| Prophet regressor | Olist column used | Formula | Why |
|---|---|---|---|
| `avg_rating_sentiment` | `avg_review_score` | `(avg_review_score - 3) / 2` → range [-1, 1] | Identical formula to the live app's own rating-to-sentiment heuristic (`src/utils/ratingSentimentHeuristic.js`: 1★→-1, 3★→0, 5★→1) — reused for consistency across the whole project rather than inventing a second sentiment-scoring convention for this one analysis. |
| `negative_ratio` | `neg_review_ratio` | used as-is | Already the exact share of that day's reviews scored negatively — no transform needed. |
| `comment_volume` | `review_count` | used as-is | Total review count that day — the volume analogue of the live app's `daily_aggregates.comment_volume`. (`review_text_count`, a subset counting only reviews with non-empty free text, was considered and rejected — `review_count` better matches what "comment_volume" means elsewhere in this project: overall feedback activity, not just the subset with written comments.) |

Days with zero reviews get `0` for all three regressors (not a guessed sentiment) — the same `fillna(0)` policy `prophet_model.py`'s `_to_prophet_frame` already documents and applies.

## Series used

Only **`olist_total`** (602 days, 2017-01-05 to 2018-08-29, 581 of those days have at least one real review) — the only series in the sales dataset with paired review data. Favorita and Online Retail II have none, which is why `prophet_sentiment_enhanced` is correctly skipped for every one of their series in the main training run (`ml/forecasting/src/evaluate.py`'s per-candidate error handling).

## Evaluation methodology

Same rolling-origin folds the main training run uses for every other model (`HORIZON=30`, `MAX_FOLDS=2`, `src/rolling_split.py`) — Prophet sales-only and sentiment-enhanced see the *identical* train/test boundaries, so the comparison is fair. The sentiment-enhanced variant's `future_regressors` during evaluation are the real held-out actuals for the test window (per `prophet_model.py`'s own documented design: evaluation asks "if the model had known the real sentiment signal, would it help," which is a different and prior question from "can future sentiment be predicted").

See `ml/forecasting/results/phase4_sentiment_regressor/results.json` for the real numbers and `ml/forecasting/scripts/run_sentiment_regressor_comparison.py` for the runnable script (reproducible — same methodology, re-runnable against the same files).
