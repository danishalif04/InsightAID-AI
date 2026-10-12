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


def compute_forecast_metrics(y_true: Sequence[float], y_pred: Sequence[float]) -> ForecastMetrics:
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

    return ForecastMetrics(
        mae=round(mae, 4),
        rmse=round(rmse, 4),
        mape=round(mape, 4) if mape is not None else None,
        n_points=n,
        n_mape_points=len(mape_terms),
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
    total_points = sum(m.n_points for m in fold_metrics)
    total_mape_points = sum(m.n_mape_points for m in fold_metrics)

    return ForecastMetrics(
        mae=round(mae, 4),
        rmse=round(rmse, 4),
        mape=round(mape, 4) if mape is not None else None,
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
    )


def select_best(rows: list[ForecastResultRow]) -> Optional[ForecastResultRow]:
    """Picks the row with the lowest MAPE (the user's target metric - "target
    MAPE < 15%"), breaking ties on RMSE. Rows with no defined MAPE (every
    actual in their evaluation window was 0) are only chosen if NOTHING
    else has a defined MAPE, since MAPE is undefined rather than good or
    bad for them. Mutates `is_best` on the winning row in place and returns
    it; returns None for an empty list."""
    if not rows:
        return None

    for row in rows:
        row.is_best = False

    ranked = [r for r in rows if r.mape is not None]
    pool = ranked if ranked else rows

    best = min(pool, key=lambda r: (r.mape if r.mape is not None else float("inf"), r.rmse))
    best.is_best = True
    return best


def write_forecast_results_json(rows: list[ForecastResultRow], out_dir: Path, run_id: str) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"forecast_results_{run_id}.json"
    path.write_text(json.dumps([asdict(r) for r in rows], indent=2), encoding="utf-8")
    return path
