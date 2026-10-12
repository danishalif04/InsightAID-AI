# Forecasting Model — Training, Evaluation, Storage, UI (FYP2.md §50-51)

## Status: pipeline is real and tested; real dataset prepared; no training run yet

`ml/forecasting/` is real, runnable code — the full test suite (52 tests)
actually exercises it, including live fits of ARIMA, Prophet (both
variants), and XGBoost against synthetic series. A real, public sales
dataset has now been prepared (see "Dataset" below), separate from the
app's own `processed_data`/`daily_aggregates` export (`ml/forecasting/data/schema.md`,
`src/services/mlExportService.js`) — the two are complementary: this public
dataset lets training/evaluation start now, and a user's own exported sales
data is what a trained model would eventually forecast. **No training run
has happened against either yet.** `ml/forecasting/results/forecast_results_template.json`
has every metric field `null` accordingly. The `forecast_results` table is
empty until a real run writes to it; the Forecasting page shows an honest
"no run yet" state rather than any placeholder numbers.

## Dataset (FYP2.md §84)

Prepared from 3 public e-commerce/retail sources (the manifest cites 5
candidate sources — Rossmann and M5 contributed 0 rows to this run; the
manifest doesn't record why, though the prep README notes both need a
one-time Kaggle competition-rules acceptance before they'll load, which is
the likely cause — not confirmed) by `ml/data_prep/sales_prep.py` (notebook:
`ml/notebooks/02_sales_data_preparation.ipynb`). Full detail in
`docs/datasets/sales/DATASET_REPORT.md` and `manifest.json`; summary:

- **`dataset_version`: `v20261012-2c339361a176`** — every forecast run
  trained/evaluated on this data must record this exact version.
- 35,890 daily rows across 32 series: Favorita (25,320 rows, 15 series —
  Ecuadorian grocery, store×category), Online Retail II (6,977 rows, 9 item
  series + 1 total-revenue series — UK/EU online retailer), Olist (3,593
  rows, 6 series — Brazilian e-commerce, incl. a `olist_total` series and
  category-level series with review-based sentiment features).
- Olist is the only source with paired review-sentiment features
  (`review_count`, `avg_review_score`, `neg_review_ratio`, etc., keyed to
  the review's *creation* date so they never leak future information) — this
  is what feeds the `sentiment_enhanced` Prophet variant's regressors during
  development, as a stand-in for this app's own `daily_aggregates`.
- Splits are **time-ordered, never shuffled**: each dataset's last 90 days
  are the test set; rolling-origin folds for validation are in
  `docs/datasets/sales/` → (full fold boundaries in the Drive-side
  `folds.json`, not copied into this repo — see note below).
- Days with no transactions are filled with `y=0, is_filled=1`; Online
  Retail II's closed Saturdays are flagged `is_open=0` (shop closed), kept
  distinct from a true zero-demand day.
- **None of these datasets are Malaysian** — this is a real, explicit
  limitation to state in the thesis, not something to gloss over.
- Licences: Olist is CC BY-NC-SA 4.0 (non-commercial — verify before any
  commercial claim), Online Retail II is CC BY 4.0, Favorita/Rossmann/M5 are
  under Kaggle competition rules. Cite every source used.
- As with the sentiment dataset, no rows were copied into this repo or
  committed — only the prep code, notebook, and these reports. The actual
  data lives in Google Drive.

### Not yet brought into the repo: `folds.json`

The rolling-origin fold boundaries (exact train/validation date ranges per
dataset, used so every model is evaluated on identical periods — FYP2.md
§51) currently exist only in the Drive-side export
(`insightaid_sales_data/folds.json`), not copied into `docs/datasets/sales/`
yet. It should be brought in alongside the actual training run that uses
it, so the recorded fold boundaries always match what a specific run
actually evaluated against.

## Models (FYP2.md §50, following the user's own model selection)

| Model | Role | Library |
|---|---|---|
| Simple moving average | Baseline | pure Python |
| ARIMA | Baseline | statsmodels, small-grid AIC order search |
| Prophet — `sales_only` | **Model A** (§50) | `prophet` |
| Prophet — `sentiment_enhanced` | **Model B** (§50): regressors = sentiment score (`avg_rating_sentiment`), negative ratio, comment volume | `prophet` |
| XGBoost | ML comparison | `xgboost`, lag + calendar features, recursive multi-step forecast |
| LSTM | Conditional — see below | `tensorflow`/Keras |

Sentiment regressors come from `daily_aggregates` via
`ml/forecasting/src/data_loader.build_daily_sentiment_regressors()`, which
collapses per-source/platform rows into one row per day (volumes summed,
ratios/scores averaged weighted by that day's comment volume).

## LSTM decision (the user asked to be told, not just given a default)

`ml/forecasting/src/lstm_model.should_train_lstm()` gates LSTM training on
**730 daily observations (~2 years)**. Reasoning, in short: an LSTM has far
more parameters than the other models here, there's only one time series
(a single business's daily sales — no panel of related series to borrow
signal from), and published forecasting benchmarks (e.g. M4) consistently
show classical/GBM methods matching or beating LSTM-style models on short,
single, non-massive daily series. Below the threshold, training one would
very likely overfit and produce something worse and less interpretable
than Prophet/XGBoost, for no benefit. The full reasoning is in that
module's docstring.

**Nothing in this project has 730 real days of sales history yet** — the
gate has never returned `True` against real data. It's fully implemented
and tested against synthetic observation counts
(`ml/forecasting/tests/test_lstm_gate.py`), and `evaluate.run_comparison()`
calls it automatically every run and reports which way it went, so the
decision is always made from the real dataset size at hand, not asserted
once and forgotten.

## Evaluation (FYP2.md §51)

**Time-aware rolling-origin, never a random split.**
`ml/forecasting/src/rolling_split.rolling_origin_splits()` produces
walk-forward folds — each fold's training window only ever contains
observations strictly before its test window, and the window grows over
successive folds rather than being redrawn. Every candidate model is
evaluated on the exact same folds (`evaluate.evaluate_candidate()`), so
MAE/RMSE/MAPE are directly comparable "on identical periods," per the
user's requirement — this also means the two Prophet variants are always
compared over the same window as each other and as every other model.

Metrics (`ml/forecasting/src/metrics.py`, real code, unit-tested against
known values): **MAE, RMSE, MAPE** per fold, averaged across folds (MAPE
skips individual points where the actual was 0, since the ratio is
undefined there — documented, not silently dropped). Target: **MAPE <
15%**, stated as a target here exactly as it's a target in FYP2.md §47's
equivalent framing for the sentiment model — not asserted as met, because
no real run has happened.

## Never hardcoded (FYP2.md §51's explicit requirement)

`ml/forecasting/src/metrics.select_best()` is the **only** function
allowed to decide which model "wins" — it picks the real lowest-MAPE row
(ties broken by RMSE), sets `is_best = true` on it, and nothing else in
this codebase (the pipeline, the migration, the frontend) assigns that
flag by any other means. The Forecasting page's model-comparison table
renders every row's real MAE/RMSE/MAPE, not just the winner, so "which
model actually performs better" is visibly a computed result, not a claim.

## Storage: `forecast_results` (new table)

`supabase/migrations/0005_forecast_results.sql`. Unlike `model_versions`
(0004, shared/global model metadata), **this is per-user data** — each
user forecasts their own sales history, so RLS follows the same
`auth.uid() = user_id` pattern as `raw_data`/`processed_data`/
`daily_aggregates`, not `model_versions`' shared read-only-to-everyone
pattern. One row per (user, run_id, model_type, variant); `forecast_points`
is a jsonb array of `{date, predicted, lower, upper}`; exactly one row per
(user, run_id) should have `is_best = true`.

## Frontend

`src/services/forecastResultsService.js` — `getLatestForecastRun()` reads
the signed-in user's most recent `run_id` and every row in it;
`getBestRow()` picks the `is_best` row. `src/pages/Forecasting.jsx` was
rewritten to use this instead of the old mock (`src/data/forecastData.js`,
deleted): a chart of the winning model's forecast points, MAE/RMSE/MAPE
cards with a real (not asserted) check against the 15% target, and a full
model-comparison table. With no run yet, the page states that plainly
instead of showing any number.

**Scope note on the old "Scenario Simulation" card**: the previous
Forecasting page had a card showing mock `best`/`expected`/`worst` revenue
figures, unrelated to (and confusingly named similarly to) the real
`conservative`/`expected`/`growth` scenarios `src/utils/scenarioEngine.js`
already computes from user assumptions (Phase 3 Part 2). It was mock data
duplicating a concept that already has a real implementation elsewhere
(the Onboarding/Business Planning flow), so it was removed rather than
wired to fake numbers here. Surfacing the real scenario engine's output on
this page, if wanted, is a separate, explicit piece of work — not folded
into this phase to avoid conflating assumption-driven scenario projections
with historical-data-driven ML forecasts.

## Where the code lives

See `ml/forecasting/README.md` for the full file layout, how to run the
(currently passing, 52/52) pytest suite, and what running an actual
forecast requires.
