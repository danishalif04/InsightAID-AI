# InsightAid AI — Forecasting Model Training (Phase 7, FYP2.md §50-51)

Offline training/evaluation pipeline comparing a moving-average baseline,
ARIMA, Prophet (run twice — sales-only vs. sentiment-enhanced), XGBoost,
and (conditionally) LSTM, on identical time-aware rolling-origin folds —
never a random train/test split of time-series data (FYP2.md §51).

## Status: pipeline is real and tested; no run has happened on real data

Every module here is real, runnable code, and the pytest suite actually
exercises it — including live fits of ARIMA (statsmodels), Prophet (both
variants), and XGBoost against synthetic series, not just mocked calls.
**52/52 tests pass** in this repo's dev environment. What hasn't happened:
a run against a real business's actual sales history, because no export
path for that exists yet (see `data/schema.md`). `results/forecast_results_template.json`
has every metric field `null` accordingly — don't treat any number in this
folder as a real result unless `src/evaluate.py` actually produced it from
real predictions against real held-out data.

## What's here

```
ml/forecasting/
  requirements.txt          full list installs cleanly on Windows/Colab (confirmed
                             in this repo's dev environment, prophet included)
  data/schema.md             expected input tables/columns
  src/
    data_loader.py            processed_data + daily_aggregates -> one daily series
    rolling_split.py           time-aware rolling-origin CV folds (FYP2.md §51)
    baselines.py                simple moving average
    arima_model.py               ARIMA, small-grid AIC order selection
    prophet_model.py             Prophet, sales_only + sentiment_enhanced variants
    xgboost_model.py             XGBoost, lag/calendar features, recursive forecast
    lstm_model.py                  should_train_lstm() data-volume gate + the model itself
    metrics.py                    MAE/RMSE/MAPE, best-model selection, forecast_results row
    evaluate.py                    orchestrates all candidates on identical rolling folds
  tests/                       52 tests — pure logic AND live model fits
  notebooks/train_forecasting.ipynb   Colab-ready end-to-end notebook
  results/                     real run output lands here (git-ignored except the
                                checked-in template + .gitkeep)
```

## Running the tests

```bash
cd ml/forecasting
pip install -r requirements.txt   # prophet included — confirmed to install and
                                   # fit cleanly in this repo's environment
pytest tests/ -v
```

Confirmed: **52/52 passed**, ~18s, including real ARIMA/Prophet/XGBoost fits
on synthetic data (no tensorflow required unless you also want to exercise
`lstm_model.build_and_train_lstm` directly — the gate function itself is
tested without needing tensorflow at all).

## Running actual forecasting (requires a real sales export — not included)

1. Export `processed_data` (sales/revenue rows) and, optionally,
   `daily_aggregates` (sentiment signals) for one user, matching
   `data/schema.md`. No export path exists in the app yet.
2. Open `notebooks/train_forecasting.ipynb` (or call `src/evaluate.run_comparison()`
   directly) with the resulting daily series.
3. It runs every candidate model on the same rolling-origin folds, picks
   the real best one by MAPE (ties broken by RMSE — see
   `src/metrics.select_best`), and writes a `forecast_results_<run_id>.json`
   with one row per (model, variant) plus `is_best` on the winner.
4. Nothing in this repo writes to Supabase automatically. Uploading the
   run's rows to `forecast_results` (`supabase/migrations/0005_forecast_results.sql`)
   is a manual/scripted step using your own Supabase credentials for that
   user, same as every other data-writing step in this project's ML phases.

## LSTM: only if the data justifies it

Per your instruction — `src/lstm_model.py`'s `should_train_lstm()` gates on
730 daily observations (~2 years), with the reasoning documented in that
module's docstring. Nothing in this repo has that much real history yet,
so the gate has never returned `True` against real data — but it's fully
implemented and unit-tested (`tests/test_lstm_gate.py`) against synthetic
observation counts, and `evaluate.run_comparison()` calls it automatically
and reports which way it went (`ComparisonResult.lstm_decision`).

## Frontend wiring

`src/pages/Forecasting.jsx` and the new `src/services/forecastResultsService.js`
read from `forecast_results` (latest `run_id` for the signed-in user, all
rows in that run for the comparison table, the `is_best` row for the
headline chart) — see `docs/FORECASTING_MODEL.md` for the full design and
current status (no real run exists yet, so the page shows an honest empty
state, not mock numbers).
