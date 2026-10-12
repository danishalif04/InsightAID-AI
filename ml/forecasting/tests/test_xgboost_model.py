import numpy as np
import pandas as pd

from src.xgboost_model import build_features, train_xgboost, xgboost_forecast


def _daily_df(n=60, seed=0):
    rng = np.random.RandomState(seed)
    dates = pd.date_range("2026-01-01", periods=n, freq="D")
    revenue = 100 + np.arange(n) * 1.2 + rng.normal(0, 3, n)
    return pd.DataFrame({"date": dates, "revenue": revenue})


def test_build_features_creates_lag_and_calendar_columns():
    features = build_features(_daily_df())
    for col in ("dayofweek", "day", "month", "lag_1", "lag_7", "lag_14", "rolling_mean_7", "rolling_mean_14"):
        assert col in features.columns


def test_train_xgboost_fits_without_error():
    trained = train_xgboost(_daily_df())
    assert trained.model is not None
    assert trained.target_col == "revenue"


def test_train_xgboost_raises_on_too_little_history():
    try:
        train_xgboost(_daily_df(n=5))
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_forecast_returns_horizon_length_predictions():
    df = _daily_df()
    trained = train_xgboost(df)
    predictions = xgboost_forecast(trained, df, horizon=5)
    assert len(predictions) == 5
    assert all(isinstance(p, float) for p in predictions)


def test_forecast_is_recursive_and_deterministic():
    df = _daily_df()
    trained = train_xgboost(df)
    first_run = xgboost_forecast(trained, df, horizon=3)
    second_run = xgboost_forecast(trained, df, horizon=3)
    assert first_run == second_run
