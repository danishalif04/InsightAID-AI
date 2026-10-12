import numpy as np
import pandas as pd

from src.prophet_model import SENTIMENT_REGRESSOR_COLUMNS, fit_prophet, prophet_forecast


def _daily_df(n=40, seed=0):
    rng = np.random.RandomState(seed)
    dates = pd.date_range("2026-01-01", periods=n, freq="D")
    revenue = 100 + np.arange(n) * 1.5 + rng.normal(0, 3, n)
    return pd.DataFrame(
        {
            "date": dates,
            "revenue": revenue,
            "avg_rating_sentiment": rng.normal(0.2, 0.1, n),
            "negative_ratio": rng.uniform(0, 0.3, n),
            "comment_volume": rng.randint(0, 20, n),
        }
    )


def test_sales_only_fit_and_forecast_shape():
    df = _daily_df()
    fitted = fit_prophet(df, variant="sales_only")
    assert fitted.regressor_columns == []

    result = prophet_forecast(fitted, df, horizon=5)
    assert len(result) == 5
    assert list(result.columns) == ["date", "predicted", "lower", "upper"]
    assert (result["lower"] <= result["predicted"]).all()
    assert (result["predicted"] <= result["upper"]).all()


def test_sentiment_enhanced_uses_all_three_regressors():
    df = _daily_df()
    fitted = fit_prophet(df, variant="sentiment_enhanced")
    assert fitted.regressor_columns == SENTIMENT_REGRESSOR_COLUMNS

    future_regressors = df[["date", *SENTIMENT_REGRESSOR_COLUMNS]].tail(5).assign(
        date=pd.date_range(df["date"].max() + pd.Timedelta(days=1), periods=5)
    )
    result = prophet_forecast(fitted, df, horizon=5, future_regressors=future_regressors)
    assert len(result) == 5


def test_sentiment_enhanced_requires_future_regressors():
    df = _daily_df()
    fitted = fit_prophet(df, variant="sentiment_enhanced")
    try:
        prophet_forecast(fitted, df, horizon=5, future_regressors=None)
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_unknown_variant_raises():
    try:
        fit_prophet(_daily_df(), variant="not_a_real_variant")
        assert False, "expected ValueError"
    except ValueError:
        pass
