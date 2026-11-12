-- MASE and fold count on forecast_results.
--
-- Both were already computed by ml/forecasting (metrics.compute_forecast_metrics
-- and average_metrics) but ForecastResultRow had no field for them, so every
-- saved result reported them as null and Table 4.4 of the dissertation could
-- not show a scale-free error measure at all.
--
-- MASE matters here specifically: MAPE divides by the actual value, so on the
-- project's lower-volume product series a handful of near-zero days pushed mean
-- MAPE to 87-103% while the forecasts themselves were not that poor. MASE
-- divides by the seasonal-naive error on the training set instead, so it is
-- defined when actuals are zero and reads directly: > 1 means the model did
-- worse than repeating the previous season.
--
-- Additive and nullable: existing rows keep their values and every existing
-- read keeps working. No column is dropped, renamed or retyped.

alter table public.forecast_results
  add column if not exists mase numeric check (mase >= 0),
  add column if not exists n_folds integer check (n_folds > 0);

comment on column public.forecast_results.mase is
  'Mean Absolute Scaled Error: MAE divided by the seasonal-naive MAE on the training set. > 1 means worse than a seasonal naive repeat. Null when the training history was shorter than one season or the seasonal-naive error was zero.';

comment on column public.forecast_results.n_folds is
  'Number of rolling-origin folds the averaged metrics were computed over.';
