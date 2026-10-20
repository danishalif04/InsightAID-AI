"""
Orchestrates the rolling-origin comparison (FYP2.md §51) across every
candidate model/variant on the SAME folds, then builds the final
forward-looking forecast for whichever one actually wins — never a
hardcoded choice (metrics.select_best is the only function that decides
that, and it decides from real numbers).

Candidates or a run:
  - moving_average   (sales_only)   - baseline
  - arima            (sales_only)   - baseline
  - prophet          (sales_only)   - Model A, §50
  - prophet          (sentiment_enhanced) - Model B, §50
  - xgboost          (sales_only)   - ML comparison
  - lstm             (sales_only)   - only if lstm_model.should_train_lstm() passes
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

import pandas as pd

from src.arima_model import arima_forecast
from src.baselines import moving_average_forecast
from src.lstm_model import build_and_train_lstm, lstm_forecast, should_train_lstm
from src.metrics import (
    ForecastMetrics,
    average_metrics,
    build_forecast_result_row,
    compute_forecast_metrics,
    select_best,
    write_forecast_results_json,
)
from src.prophet_model import SENTIMENT_REGRESSOR_COLUMNS, fit_prophet, prophet_forecast
from src.rolling_split import rolling_origin_splits
from src.xgboost_model import train_xgboost, xgboost_forecast

ForecastFn = Callable[[pd.DataFrame, pd.DataFrame, int], list]


def evaluate_candidate(
    daily_df: pd.DataFrame,
    forecast_fn: ForecastFn,
    initial_train_size: int,
    horizon: int,
    step: Optional[int] = None,
    max_folds: Optional[int] = None,
) -> ForecastMetrics:
    """Runs `forecast_fn` across every rolling-origin fold and averages the
    per-fold metrics — this is what makes every model's number comparable:
    they all see the same train/test boundaries."""
    folds = rolling_origin_splits(len(daily_df), initial_train_size, horizon, step=step, max_folds=max_folds)

    fold_metrics: list[ForecastMetrics] = []
    for fold in folds:
        train_df = daily_df.iloc[list(fold.train_index)]
        test_df = daily_df.iloc[list(fold.test_index)]
        predictions = forecast_fn(train_df, test_df, horizon)
        fold_metrics.append(compute_forecast_metrics(test_df["revenue"].tolist(), predictions))

    return average_metrics(fold_metrics)


def _moving_average_fn(train_df: pd.DataFrame, _test_df: pd.DataFrame, horizon: int) -> list[float]:
    return moving_average_forecast(train_df["revenue"].tolist(), horizon)


def _arima_fn(train_df: pd.DataFrame, _test_df: pd.DataFrame, horizon: int) -> list[float]:
    predictions, _order = arima_forecast(train_df["revenue"].tolist(), horizon)
    return predictions


def _prophet_fn(variant: str) -> ForecastFn:
    def _predict(train_df: pd.DataFrame, test_df: pd.DataFrame, horizon: int) -> list[float]:
        fitted = fit_prophet(train_df, variant=variant)
        future_regressors = test_df[["date", *SENTIMENT_REGRESSOR_COLUMNS]] if variant == "sentiment_enhanced" else None
        result = prophet_forecast(fitted, train_df, horizon, future_regressors=future_regressors)
        return result["predicted"].tolist()

    return _predict


def _xgboost_fn(train_df: pd.DataFrame, _test_df: pd.DataFrame, horizon: int) -> list[float]:
    trained = train_xgboost(train_df)
    return xgboost_forecast(trained, train_df, horizon)


def _lstm_fn(train_df: pd.DataFrame, _test_df: pd.DataFrame, horizon: int) -> list[float]:
    model, normalization = build_and_train_lstm(train_df["revenue"].tolist())
    return lstm_forecast(model, normalization, train_df["revenue"].tolist(), horizon)


CANDIDATES: dict[str, tuple[str, str, ForecastFn]] = {
    "moving_average": ("moving_average", "sales_only", _moving_average_fn),
    "arima": ("arima", "sales_only", _arima_fn),
    "prophet_sales_only": ("prophet", "sales_only", _prophet_fn("sales_only")),
    "prophet_sentiment_enhanced": ("prophet", "sentiment_enhanced", _prophet_fn("sentiment_enhanced")),
    "xgboost": ("xgboost", "sales_only", _xgboost_fn),
}


@dataclass
class ComparisonResult:
    rows: list
    lstm_decision: tuple[bool, str]


def run_comparison(
    daily_df: pd.DataFrame,
    horizon: int,
    initial_train_size: Optional[int] = None,
    dataset_version: Optional[str] = None,
    run_id: Optional[str] = None,
    step: Optional[int] = None,
    max_folds: Optional[int] = None,
) -> ComparisonResult:
    if initial_train_size is None:
        initial_train_size = max(30, len(daily_df) // 2)
    run_id = run_id or uuid.uuid4().hex[:12]

    candidates = dict(CANDIDATES)
    lstm_ok, lstm_reason = should_train_lstm(len(daily_df))
    if lstm_ok:
        candidates["lstm"] = ("lstm", "sales_only", _lstm_fn)

    rows = []
    for _key, (model_type, variant, fn) in candidates.items():
        try:
            metrics = evaluate_candidate(daily_df, fn, initial_train_size, horizon, step=step, max_folds=max_folds)
        except (KeyError, ValueError) as exc:
            # Most commonly: prophet_sentiment_enhanced on a daily_df with no
            # sentiment regressor columns at all (e.g. a series with no
            # paired social/review data - most of this package's real public
            # series are sales-only, nothing to enhance with). One candidate
            # genuinely not being runnable against this data must not crash
            # every other candidate's real result - skip it, not fabricate
            # a placeholder row for a model that never actually ran.
            print(f"[run_comparison] skipping {model_type}/{variant}: {exc}")
            continue
        eval_start = str(pd.to_datetime(daily_df["date"]).iloc[initial_train_size].date())
        eval_end = str(pd.to_datetime(daily_df["date"]).iloc[-1].date())

        # Forward-looking points for the UI chart, trained on the full series.
        full_train = daily_df
        future_index = pd.date_range(
            pd.to_datetime(daily_df["date"]).max() + pd.Timedelta(days=1), periods=horizon
        )
        forecast_points = [
            {"date": str(d.date()), "predicted": None, "lower": None, "upper": None} for d in future_index
        ]
        try:
            if model_type == "prophet":
                fitted = fit_prophet(full_train, variant=variant)
                future_regressors = None
                if variant == "sentiment_enhanced":
                    last_row = full_train[["date", *SENTIMENT_REGRESSOR_COLUMNS]].tail(1)
                    future_regressors = pd.concat([last_row.assign(date=d) for d in future_index], ignore_index=True)
                result = prophet_forecast(fitted, full_train, horizon, future_regressors=future_regressors)
                forecast_points = [
                    {"date": str(r.date.date()), "predicted": round(r.predicted, 2), "lower": round(r.lower, 2), "upper": round(r.upper, 2)}
                    for r in result.itertuples()
                ]
            else:
                if model_type == "moving_average":
                    predictions = moving_average_forecast(full_train["revenue"].tolist(), horizon)
                elif model_type == "arima":
                    predictions, _order = arima_forecast(full_train["revenue"].tolist(), horizon)
                elif model_type == "xgboost":
                    trained = train_xgboost(full_train)
                    predictions = xgboost_forecast(trained, full_train, horizon)
                elif model_type == "lstm":
                    model, normalization = build_and_train_lstm(full_train["revenue"].tolist())
                    predictions = lstm_forecast(model, normalization, full_train["revenue"].tolist(), horizon)
                else:
                    predictions = [None] * horizon

                # No native interval for these models — approximate with the
                # model's own rolling-evaluation RMSE (a real, measured number
                # from this run, not an invented margin).
                margin = 1.96 * metrics.rmse
                forecast_points = [
                    {
                        "date": str(d.date()),
                        "predicted": round(p, 2),
                        "lower": round(p - margin, 2),
                        "upper": round(p + margin, 2),
                    }
                    for d, p in zip(future_index, predictions)
                ]
        except Exception as exc:  # a single model's final-forecast step failing must not break the others
            forecast_points = []
            notes = f"final forecast generation failed: {exc}"
        else:
            notes = None

        row = build_forecast_result_row(
            run_id=run_id,
            model_type=model_type,
            variant=variant,
            horizon_days=horizon,
            dataset_version=dataset_version,
            evaluation_period_start=eval_start,
            evaluation_period_end=eval_end,
            metrics=metrics,
            forecast_points=forecast_points,
            notes=notes,
        )
        rows.append(row)

    select_best(rows)
    return ComparisonResult(rows=rows, lstm_decision=(lstm_ok, lstm_reason))


def write_comparison(result: ComparisonResult, results_dir: Path, run_id: str) -> Path:
    return write_forecast_results_json(result.rows, results_dir, run_id)
