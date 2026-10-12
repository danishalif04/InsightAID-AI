"""
XGBoost — the ML comparison model (FYP2.md §50's "Potential models" list,
selected per the user's methodology as the ML comparison alongside
Prophet). Uses lag + calendar features rather than raw dates (XGBoost has
no notion of time order on its own), and forecasts multi-step horizons
recursively: each predicted value becomes an input lag for the next step,
since future lag features aren't otherwise available at forecast time.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from xgboost import XGBRegressor

DEFAULT_LAGS = (1, 7, 14)
DEFAULT_ROLLING_WINDOWS = (7, 14)

FEATURE_COLUMNS = (
    ["dayofweek", "day", "month"]
    + [f"lag_{lag}" for lag in DEFAULT_LAGS]
    + [f"rolling_mean_{w}" for w in DEFAULT_ROLLING_WINDOWS]
)


def build_features(daily_df: pd.DataFrame, target_col: str = "revenue") -> pd.DataFrame:
    df = daily_df.sort_values("date").reset_index(drop=True).copy()
    dates = pd.to_datetime(df["date"])
    df["dayofweek"] = dates.dt.dayofweek
    df["day"] = dates.dt.day
    df["month"] = dates.dt.month

    for lag in DEFAULT_LAGS:
        df[f"lag_{lag}"] = df[target_col].shift(lag)
    for window in DEFAULT_ROLLING_WINDOWS:
        df[f"rolling_mean_{window}"] = df[target_col].shift(1).rolling(window).mean()

    return df


@dataclass
class TrainedXgboost:
    model: XGBRegressor
    target_col: str


def train_xgboost(daily_df: pd.DataFrame, target_col: str = "revenue", **xgb_kwargs) -> TrainedXgboost:
    features = build_features(daily_df, target_col=target_col).dropna(subset=list(FEATURE_COLUMNS))
    if features.empty:
        raise ValueError(
            "no rows left after building lag/rolling features — need at least "
            f"{max(DEFAULT_LAGS + DEFAULT_ROLLING_WINDOWS) + 1} days of history"
        )

    params = {"n_estimators": 200, "max_depth": 4, "learning_rate": 0.05, "random_state": 42}
    params.update(xgb_kwargs)
    model = XGBRegressor(**params)
    model.fit(features[list(FEATURE_COLUMNS)], features[target_col])

    return TrainedXgboost(model=model, target_col=target_col)


def xgboost_forecast(trained: TrainedXgboost, daily_df: pd.DataFrame, horizon: int) -> list[float]:
    """Recursive multi-step forecast: predicts day 1, appends it to the
    working history, rebuilds lag/rolling features, predicts day 2, etc."""
    history = daily_df.sort_values("date").reset_index(drop=True).copy()
    last_date = pd.to_datetime(history["date"]).max()

    predictions: list[float] = []
    for step in range(horizon):
        next_date = last_date + pd.Timedelta(days=step + 1)
        working = pd.concat(
            [history, pd.DataFrame({"date": [next_date], trained.target_col: [np.nan]})],
            ignore_index=True,
        )
        features = build_features(working, target_col=trained.target_col)
        row = features.iloc[[-1]][list(FEATURE_COLUMNS)]
        prediction = float(trained.model.predict(row)[0])
        predictions.append(prediction)

        history = pd.concat(
            [history, pd.DataFrame({"date": [next_date], trained.target_col: [prediction]})],
            ignore_index=True,
        )

    return predictions
