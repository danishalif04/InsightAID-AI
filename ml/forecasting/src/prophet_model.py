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

from dataclasses import dataclass, field
from typing import Optional

import pandas as pd
from prophet import Prophet

SENTIMENT_REGRESSOR_COLUMNS = ["avg_rating_sentiment", "negative_ratio", "comment_volume"]


@dataclass(frozen=True)
class ProphetConfig:
    """Explicit, recorded Prophet configuration.

    The previous default was a bare `Prophet()`. On a growing retail series
    that produced MASE > 1 (worse than a seasonal-naive repeat), because an
    additive seasonality cannot track a weekly pattern whose amplitude grows
    with the level, and because large retail holidays were modelled as noise.
    Every field here is written into the run's results JSON so the number in
    the dissertation can be reproduced from the artefact.

    `country_holidays` is an ISO-2 code passed to Prophet's built-in holiday
    sets ('BR' for the Olist Brazilian marketplace, 'MY' for Malaysian data).
    None disables holidays entirely.
    """

    seasonality_mode: str = "multiplicative"
    changepoint_prior_scale: float = 0.01
    weekly_seasonality: bool | int | str = "auto"
    yearly_seasonality: bool | int | str = "auto"
    daily_seasonality: bool | int = False
    country_holidays: str | None = None

    def as_dict(self) -> dict:
        return {
            "seasonality_mode": self.seasonality_mode,
            "changepoint_prior_scale": self.changepoint_prior_scale,
            "weekly_seasonality": self.weekly_seasonality,
            "yearly_seasonality": self.yearly_seasonality,
            "daily_seasonality": self.daily_seasonality,
            "country_holidays": self.country_holidays,
        }


# Kept so an experiment can reproduce the original bare-default behaviour on
# purpose rather than by accident.
LEGACY_DEFAULTS = ProphetConfig(
    seasonality_mode="additive",
    changepoint_prior_scale=0.05,
    country_holidays=None,
)


@dataclass
class FittedProphet:
    model: Prophet
    variant: str  # 'sales_only' | 'sentiment_enhanced'
    regressor_columns: list[str]
    config: ProphetConfig = field(default_factory=ProphetConfig)
    holidays_applied: bool = False


def _to_prophet_frame(daily_df: pd.DataFrame, regressor_columns: list[str]) -> pd.DataFrame:
    frame = daily_df.rename(columns={"date": "ds", "revenue": "y"})[["ds", "y", *regressor_columns]].copy()
    for col in regressor_columns:
        # Prophet regressors cannot contain NaN — days with no social data
        # that made it this far get 0, a documented, deliberate choice (see
        # data_loader.build_daily_series), not a silent one.
        frame[col] = frame[col].fillna(0)
    return frame


def fit_prophet(
    daily_df: pd.DataFrame,
    variant: str = "sales_only",
    config: ProphetConfig | None = None,
) -> FittedProphet:
    if variant not in ("sales_only", "sentiment_enhanced"):
        raise ValueError(f"unknown variant: {variant}")

    config = config or ProphetConfig()
    regressor_columns = SENTIMENT_REGRESSOR_COLUMNS if variant == "sentiment_enhanced" else []
    frame = _to_prophet_frame(daily_df, regressor_columns)

    model = Prophet(
        seasonality_mode=config.seasonality_mode,
        changepoint_prior_scale=config.changepoint_prior_scale,
        weekly_seasonality=config.weekly_seasonality,
        yearly_seasonality=config.yearly_seasonality,
        daily_seasonality=config.daily_seasonality,
    )

    holidays_applied = False
    if config.country_holidays:
        # A missing holiday table must not silently become "no holidays" in a
        # run whose results claim holidays were modelled - record what happened.
        try:
            model.add_country_holidays(country_name=config.country_holidays)
            holidays_applied = True
        except Exception as exc:  # noqa: BLE001 - reported, not swallowed
            print(f"[fit_prophet] country_holidays={config.country_holidays!r} not applied: {exc}")

    for col in regressor_columns:
        model.add_regressor(col)
    model.fit(frame)

    return FittedProphet(
        model=model,
        variant=variant,
        regressor_columns=regressor_columns,
        config=config,
        holidays_applied=holidays_applied,
    )


def prophet_forecast(
    fitted: FittedProphet,
    daily_df: pd.DataFrame,
    horizon: int,
    future_regressors: Optional[pd.DataFrame] = None,
    freq: str = "D",
) -> pd.DataFrame:
    """`future_regressors` (needed only for the sentiment_enhanced variant)
    must have `date` + the same regressor columns for the `horizon` days
    being forecast. There is no way to know future sentiment for real, so
    in practice this is the caller's own held-out actuals during
    evaluation, or a documented carry-forward assumption at true
    forecast time — never invented here."""
    last_date = pd.to_datetime(daily_df["date"]).max()
    # `freq` must match the series' own spacing. A weekly-aggregated series
    # forecast at freq='D' silently predicts the next `horizon` DAYS against
    # `horizon` WEEKLY actuals, which inflates every error metric - the
    # weekly protocol caught exactly that.
    offset = pd.tseries.frequencies.to_offset(freq)
    future_dates = pd.date_range(last_date + offset, periods=horizon, freq=freq)
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
