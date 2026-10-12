"""
Prophet — the primary forecasting model (FYP2.md §50), run twice per the
user's methodology:

  - 'sales_only'        — Model A (§50): historical sales/revenue only.
  - 'sentiment_enhanced' — Model B (§50): sales/revenue plus sentiment
    score, negative ratio, and comment volume as Prophet regressors —
    exactly the three signals the user named, sourced from
    data_loader.build_daily_sentiment_regressors() (avg_rating_sentiment
    standing in for "sentiment score", since that's the one continuous
    sentiment signal daily_aggregates actually has).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import pandas as pd
from prophet import Prophet

SENTIMENT_REGRESSOR_COLUMNS = ["avg_rating_sentiment", "negative_ratio", "comment_volume"]


@dataclass
class FittedProphet:
    model: Prophet
    variant: str  # 'sales_only' | 'sentiment_enhanced'
    regressor_columns: list[str]


def _to_prophet_frame(daily_df: pd.DataFrame, regressor_columns: list[str]) -> pd.DataFrame:
    frame = daily_df.rename(columns={"date": "ds", "revenue": "y"})[["ds", "y", *regressor_columns]].copy()
    for col in regressor_columns:
        # Prophet regressors cannot contain NaN — days with no social data
        # that made it this far get 0, a documented, deliberate choice (see
        # data_loader.build_daily_series), not a silent one.
        frame[col] = frame[col].fillna(0)
    return frame


def fit_prophet(daily_df: pd.DataFrame, variant: str = "sales_only") -> FittedProphet:
    if variant not in ("sales_only", "sentiment_enhanced"):
        raise ValueError(f"unknown variant: {variant}")

    regressor_columns = SENTIMENT_REGRESSOR_COLUMNS if variant == "sentiment_enhanced" else []
    frame = _to_prophet_frame(daily_df, regressor_columns)

    model = Prophet()
    for col in regressor_columns:
        model.add_regressor(col)
    model.fit(frame)

    return FittedProphet(model=model, variant=variant, regressor_columns=regressor_columns)


def prophet_forecast(
    fitted: FittedProphet,
    daily_df: pd.DataFrame,
    horizon: int,
    future_regressors: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """`future_regressors` (needed only for the sentiment_enhanced variant)
    must have `date` + the same regressor columns for the `horizon` days
    being forecast. There is no way to know future sentiment for real, so
    in practice this is the caller's own held-out actuals during
    evaluation, or a documented carry-forward assumption at true
    forecast time — never invented here."""
    last_date = pd.to_datetime(daily_df["date"]).max()
    future_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=horizon, freq="D")
    future = pd.DataFrame({"ds": future_dates})

    for col in fitted.regressor_columns:
        if future_regressors is None or col not in future_regressors.columns:
            raise ValueError(
                f"variant '{fitted.variant}' requires future_regressors with a '{col}' column "
                f"for all {horizon} forecast days"
            )
        values = future_regressors.set_index("date").reindex(future_dates)[col].fillna(0)
        future[col] = values.to_numpy()

    forecast = fitted.model.predict(future)
    return forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].rename(
        columns={"ds": "date", "yhat": "predicted", "yhat_lower": "lower", "yhat_upper": "upper"}
    )
