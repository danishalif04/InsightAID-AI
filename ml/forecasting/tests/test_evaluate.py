import numpy as np
import pandas as pd

from src.evaluate import evaluate_candidate, run_comparison
from src.metrics import compute_forecast_metrics


def _daily_df(n=50, seed=0):
    rng = np.random.RandomState(seed)
    dates = pd.date_range("2026-01-01", periods=n, freq="D")
    revenue = 200 + np.arange(n) * 1.0 + rng.normal(0, 5, n)
    return pd.DataFrame(
        {
            "date": dates,
            "revenue": revenue,
            "sales": (revenue / 20).round(),
            "avg_rating_sentiment": rng.normal(0.1, 0.1, n),
            "negative_ratio": rng.uniform(0, 0.3, n),
            "comment_volume": rng.randint(0, 15, n),
        }
    )


def test_evaluate_candidate_averages_across_folds():
    df = _daily_df()

    def constant_fn(train_df, _test_df, horizon):
        return [train_df["revenue"].mean()] * horizon

    metrics = evaluate_candidate(df, constant_fn, initial_train_size=40, horizon=5, step=5)
    assert metrics.n_points == 10  # 2 folds x horizon 5
    assert metrics.mae > 0


def test_run_comparison_produces_one_row_per_candidate_with_real_metrics():
    df = _daily_df()
    # only 50 obs -> far below the LSTM gate, keeps this test fast and
    # exercises the "LSTM skipped" path for real.
    result = run_comparison(df, horizon=5, initial_train_size=40, step=5)

    model_types = {row.model_type for row in result.rows}
    assert model_types == {"moving_average", "arima", "prophet", "xgboost"}
    assert result.lstm_decision[0] is False

    for row in result.rows:
        assert row.mae >= 0
        assert row.rmse >= 0
        assert len(row.forecast_points) == 5


def test_run_comparison_marks_exactly_one_row_as_best():
    df = _daily_df()
    result = run_comparison(df, horizon=5, initial_train_size=40, step=5)
    assert sum(row.is_best for row in result.rows) == 1


def test_run_comparison_prophet_variants_use_identical_evaluation_periods():
    df = _daily_df()
    result = run_comparison(df, horizon=5, initial_train_size=40, step=5)
    prophet_rows = [r for r in result.rows if r.model_type == "prophet"]
    assert len(prophet_rows) == 2
    periods = {(r.evaluation_period_start, r.evaluation_period_end) for r in prophet_rows}
    assert len(periods) == 1  # same evaluation window for both variants


def test_run_comparison_skips_sentiment_enhanced_gracefully_when_no_regressor_columns_exist():
    # Real bug found before this test existed: most of this project's real
    # public sales series (favorita/online_retail_ii) have no paired
    # sentiment signal at all. run_comparison() used to crash ENTIRELY
    # (not just skip prophet_sentiment_enhanced) the moment it hit that
    # candidate, taking every other model's real result down with it.
    df = _daily_df()[["date", "revenue", "sales"]]  # no sentiment columns
    result = run_comparison(df, horizon=5, initial_train_size=40, step=5)

    model_variant_pairs = {(row.model_type, row.variant) for row in result.rows}
    assert ("prophet", "sentiment_enhanced") not in model_variant_pairs
    assert ("prophet", "sales_only") in model_variant_pairs
    assert ("arima", "sales_only") in model_variant_pairs
    assert ("xgboost", "sales_only") in model_variant_pairs
    assert ("moving_average", "sales_only") in model_variant_pairs
    assert sum(row.is_best for row in result.rows) == 1


def test_metrics_computation_is_not_fabricated_smoke_check():
    # sanity: a forecaster that's obviously wrong should score obviously worse
    # than one that's obviously right, on the same actuals.
    good = compute_forecast_metrics([100, 100, 100], [100, 100, 100])
    bad = compute_forecast_metrics([100, 100, 100], [50, 50, 50])
    assert good.mae < bad.mae
    assert good.rmse < bad.rmse
