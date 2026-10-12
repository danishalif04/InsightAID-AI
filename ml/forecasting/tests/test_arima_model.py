import numpy as np

from src.arima_model import arima_forecast, fit_arima_auto

SMALL_GRID = dict(p_range=range(0, 2), d_range=range(0, 2), q_range=range(0, 2))


def _synthetic_series(n=40, seed=0):
    rng = np.random.RandomState(seed)
    return list(100 + np.arange(n) * 0.8 + rng.normal(0, 2, n))


def test_fit_arima_auto_picks_a_real_order():
    fitted = fit_arima_auto(_synthetic_series(), **SMALL_GRID)
    assert isinstance(fitted.order, tuple)
    assert len(fitted.order) == 3
    assert fitted.aic == fitted.aic  # not NaN


def test_arima_forecast_returns_horizon_length_predictions():
    predictions, order = arima_forecast(_synthetic_series(), horizon=5, **SMALL_GRID)
    assert len(predictions) == 5
    assert all(isinstance(p, float) for p in predictions)
    assert order[0] in range(0, 2)


def test_arima_forecast_tracks_an_upward_trend():
    series = _synthetic_series()
    predictions, _order = arima_forecast(series, horizon=3, **SMALL_GRID)
    # a rising series' forecast shouldn't collapse to something far below history
    assert min(predictions) > min(series)
