"""
Forecast accuracy metrics (FYP2.md §51: MAE, RMSE, MAPE), the model/variant
comparison, and the `forecast_results` row shape. "Never hardcode which
model performs better. Display actual calculated results." - `select_best`
is the one function allowed to decide that, and it decides purely from the
metrics it's given; nothing else in this package (or the frontend) should
ever assign `is_best` by any other means.
"""

from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Sequence


@dataclass
class ForecastMetrics:
    mae: float
    rmse: float
    mape: Optional[float]  # None when every actual in the window was 0 (MAPE undefined)
    n_points: int
    n_mape_points: int  # how many points actually contributed to MAPE (excludes actual==0)
    mase: Optional[float] = None  # None when no y_train was given, or training history was too short


def _seasonal_naive_scale(y_train: Sequence[float], seasonal_period: int) -> Optional[float]:
    """Mean absolute seasonal difference over the TRAINING set (Hyndman &
    Koehler, 2006) - the denominator MASE divides a model's MAE by. Not
    computed from the test set: MASE asks "how much better than a naive
    seasonal repeat am I," using only information the model actually had
    at training time."""
    if len(y_train) <= seasonal_period:
        return None
    diffs = [abs(y_train[i] - y_train[i - seasonal_period]) for i in range(seasonal_period, len(y_train))]
    if not diffs:
        return None
    scale = sum(diffs) / len(diffs)
    return scale if scale > 0 else None


def compute_forecast_metrics(
    y_true: Sequence[float],
    y_pred: Sequence[float],
    y_train: Optional[Sequence[float]] = None,
    seasonal_period: int = 7,
) -> ForecastMetrics:
    if len(y_true) != len(y_pred):
        raise ValueError("y_true and y_pred must be the same length")
    n = len(y_true)
    if n == 0:
        raise ValueError("cannot compute metrics on an empty set")

    errors = [t - p for t, p in zip(y_true, y_pred)]
    mae = sum(abs(e) for e in errors) / n
    rmse = math.sqrt(sum(e * e for e in errors) / n)

    mape_terms = [abs((t - p) / t) for t, p in zip(y_true, y_pred) if t != 0]
    mape = (sum(mape_terms) / len(mape_terms)) * 100 if mape_terms else None

    mase = None
    if y_train is not None:
        scale = _seasonal_naive_scale(list(y_train), seasonal_period)
        if scale is not None:
            mase = round(mae / scale, 4)

    return ForecastMetrics(
        mae=round(mae, 4),
        rmse=round(rmse, 4),
        mape=round(mape, 4) if mape is not None else None,
        n_points=n,
        n_mape_points=len(mape_terms),
        mase=mase,
    )


def average_metrics(fold_metrics: Sequence[ForecastMetrics]) -> ForecastMetrics:
    """Averages metrics across rolling-origin folds (equal weight per fold,
    not per point - a fold with more points doesn't dominate)."""
    if not fold_metrics:
        raise ValueError("no fold metrics to average")

    mae = sum(m.mae for m in fold_metrics) / len(fold_metrics)
    rmse = sum(m.rmse for m in fold_metrics) / len(fold_metrics)
    mape_values = [m.mape for m in fold_metrics if m.mape is not None]
    mape = sum(mape_values) / len(mape_values) if mape_values else None
    mase_values = [m.mase for m in fold_metrics if m.mase is not None]
    mase = round(sum(mase_values) / len(mase_values), 4) if mase_values else None
    total_points = sum(m.n_points for m in fold_metrics)
    total_mape_points = sum(m.n_mape_points for m in fold_metrics)

    return ForecastMetrics(
        mae=round(mae, 4),
        rmse=round(rmse, 4),
        mape=round(mape, 4) if mape is not None else None,
        mase=mase,
        n_points=total_points,
        n_mape_points=total_mape_points,
    )


@dataclass
class ForecastResultRow:
    """Mirrors the forecast_results table
    (supabase/migrations/0005_forecast_results.sql)."""

    run_id: str
    model_type: str  # 'moving_average' | 'arima' | 'prophet' | 'xgboost' | 'lstm'
    variant: str  # 'sales_only' | 'sentiment_enhanced'
    generated_at: str
    horizon_days: int
    dataset_version: Optional[str]
    evaluation_period_start: Optional[str]
    evaluation_period_end: Optional[str]
    mae: float
    rmse: float
    mape: Optional[float]
    forecast_points: list  # [{date, predicted, lower, upper}]
    is_best: bool = False
    notes: Optional[str] = None
    # MASE was computed and averaged correctly but had nowhere to go, so every
    # saved result reported mase=null. It is the metric that matters most on
    # low-volume series: MAPE divides by the actual, so a handful of near-zero
    # days sends it toward 100% and makes it useless for ranking models.
    # MASE divides by the seasonal-naive error instead, so >1 means "worse
    # than repeating last week".
    mase: Optional[float] = None
    n_folds: Optional[int] = None


def build_forecast_result_row(
    *,
    run_id: str,
    model_type: str,
    variant: str,
    horizon_days: int,
    dataset_version: Optional[str],
    evaluation_period_start: Optional[str],
    evaluation_period_end: Optional[str],
    metrics: ForecastMetrics,
    forecast_points: list,
    notes: Optional[str] = None,
    n_folds: Optional[int] = None,
) -> ForecastResultRow:
    return ForecastResultRow(
        run_id=run_id,
        model_type=model_type,
        variant=variant,
        generated_at=datetime.now(timezone.utc).isoformat(),
        horizon_days=horizon_days,
        dataset_version=dataset_version,
        evaluation_period_start=evaluation_period_start,
        evaluation_period_end=evaluation_period_end,
        mae=metrics.mae,
        rmse=metrics.rmse,
        mape=metrics.mape,
        forecast_points=forecast_points,
        is_best=False,
        notes=notes,
        mase=metrics.mase,
        n_folds=n_folds,
    )


def select_best(rows: list[ForecastResultRow], metric: str = "mase") -> Optional[ForecastResultRow]:
    """Picks the best row by `metric` ("mase" by default, or "mape"), breaking
    ties on RMSE. Mutates `is_best` on the winner and returns it; None for an
    empty list.

    Why MASE and not MAPE, even though the project's acceptance target is
    stated in MAPE: MAPE divides by each actual value, so on a series with
    near-zero days a model can be ranked first on a number that is dominated
    by a few tiny denominators rather than by forecast quality. Measured on
    this project's olist category series, mean MAPE ran 87-103% while the
    models were not that bad - the metric was. MASE divides by the
    seasonal-naive error on the TRAINING set instead, so it is scale-free,
    defined when actuals are zero, and interpretable: >1 means the model did
    worse than repeating the previous season.

    The MAPE target is still reported against the winner, unchanged. This
    function decides which model is best; it does not decide whether the
    target was met.

    Rows with no value for the chosen metric are only selected if NO row has
    one, since an undefined metric is neither good nor bad.
    """
    if not rows:
        return None
    if metric not in ("mase", "mape"):
        raise ValueError("metric must be 'mase' or 'mape', got " + repr(metric))

    for row in rows:
        row.is_best = False

    def _value(row: "ForecastResultRow") -> Optional[float]:
        return row.mase if metric == "mase" else row.mape

    ranked = [r for r in rows if _value(r) is not None]
    pool = ranked if ranked else rows

    best = min(pool, key=lambda r: (_value(r) if _value(r) is not None else float("inf"), r.rmse))
    best.is_best = True
    return best


def write_forecast_results_json(rows: list[ForecastResultRow], out_dir: Path, run_id: str) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"forecast_results_{run_id}.json"
    path.write_text(json.dumps([asdict(r) for r in rows], indent=2), encoding="utf-8")
    return path
