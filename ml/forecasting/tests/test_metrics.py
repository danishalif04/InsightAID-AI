import json
from pathlib import Path

from src.metrics import (
    ForecastMetrics,
    average_metrics,
    build_forecast_result_row,
    compute_forecast_metrics,
    select_best,
    write_forecast_results_json,
)


def test_perfect_forecast_has_zero_error():
    metrics = compute_forecast_metrics([100, 200, 300], [100, 200, 300])
    assert metrics.mae == 0
    assert metrics.rmse == 0
    assert metrics.mape == 0


def test_known_mae_rmse_mape():
    y_true = [100, 200]
    y_pred = [110, 180]  # errors: -10, 20
    metrics = compute_forecast_metrics(y_true, y_pred)
    assert metrics.mae == 15.0
    assert metrics.rmse == round((((10**2 + 20**2) / 2) ** 0.5), 4)
    assert metrics.mape == round(((10 / 100 + 20 / 200) / 2) * 100, 4)


def test_mape_skips_zero_actuals():
    metrics = compute_forecast_metrics([0, 100], [5, 110])
    assert metrics.n_points == 2
    assert metrics.n_mape_points == 1
    assert metrics.mape == 10.0  # only the |110-100|/100 term


def test_mape_is_none_when_every_actual_is_zero():
    metrics = compute_forecast_metrics([0, 0], [1, 2])
    assert metrics.mape is None


def test_mismatched_lengths_raise():
    try:
        compute_forecast_metrics([1], [1, 2])
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_average_metrics_across_folds():
    fold_a = ForecastMetrics(mae=10, rmse=12, mape=5, n_points=5, n_mape_points=5)
    fold_b = ForecastMetrics(mae=20, rmse=24, mape=15, n_points=5, n_mape_points=5)
    averaged = average_metrics([fold_a, fold_b])
    assert averaged.mae == 15
    assert averaged.rmse == 18
    assert averaged.mape == 10
    assert averaged.n_points == 10


def test_average_metrics_handles_missing_mape():
    fold_a = ForecastMetrics(mae=10, rmse=12, mape=None, n_points=3, n_mape_points=0)
    fold_b = ForecastMetrics(mae=20, rmse=24, mape=10, n_points=3, n_mape_points=3)
    averaged = average_metrics([fold_a, fold_b])
    assert averaged.mape == 10  # only fold_b contributes


def _row(model_type, variant, mae, rmse, mape):
    metrics = ForecastMetrics(mae=mae, rmse=rmse, mape=mape, n_points=10, n_mape_points=10)
    return build_forecast_result_row(
        run_id="test-run",
        model_type=model_type,
        variant=variant,
        horizon_days=7,
        dataset_version=None,
        evaluation_period_start="2026-01-01",
        evaluation_period_end="2026-01-10",
        metrics=metrics,
        forecast_points=[],
    )


def test_select_best_picks_lowest_mape():
    rows = [
        _row("moving_average", "sales_only", mae=50, rmse=60, mape=20),
        _row("prophet", "sentiment_enhanced", mae=10, rmse=12, mape=8),
        _row("xgboost", "sales_only", mae=15, rmse=18, mape=12),
    ]
    best = select_best(rows)
    assert best.model_type == "prophet"
    assert best.is_best is True
    assert sum(r.is_best for r in rows) == 1


def test_select_best_breaks_ties_on_rmse():
    rows = [
        _row("arima", "sales_only", mae=10, rmse=20, mape=10),
        _row("xgboost", "sales_only", mae=10, rmse=15, mape=10),
    ]
    best = select_best(rows)
    assert best.model_type == "xgboost"


def test_select_best_falls_back_when_no_mape_defined():
    rows = [
        _row("moving_average", "sales_only", mae=10, rmse=20, mape=None),
        _row("arima", "sales_only", mae=5, rmse=8, mape=None),
    ]
    best = select_best(rows)
    assert best.model_type == "arima"  # lowest RMSE among the undefined-MAPE pool


def test_select_best_empty_list_returns_none():
    assert select_best([]) is None


def test_write_forecast_results_json_round_trips(tmp_path: Path):
    rows = [_row("prophet", "sales_only", mae=10, rmse=12, mape=8)]
    select_best(rows)
    path = write_forecast_results_json(rows, tmp_path, run_id="test-run")
    assert path.exists()
    loaded = json.loads(path.read_text(encoding="utf-8"))
    assert loaded[0]["model_type"] == "prophet"
    assert loaded[0]["is_best"] is True
