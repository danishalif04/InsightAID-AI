"""
Builds a single daily time series from the two tables that actually hold
the relevant data (supabase/migrations/0003_data_pipeline.sql):

  - `processed_data` — transaction/row-level `sales`/`revenue` numeric
    columns, dated by `published_at` (falling back to `collected_at`). No
    daily rollup exists for these on the database side, so this module
    does the sum-per-day aggregation.
  - `daily_aggregates` — already daily-rolled-up sentiment/engagement
    signals (`comment_volume`, `negative_ratio`, `avg_rating_sentiment`,
    `mention_volume`, `positive_ratio`), keyed by (user_id, date, source,
    platform). These become the "sentiment-enhanced" Prophet regressors
    (FYP2.md §50 Model B) — collapsed across source/platform into one
    row per day by summing volumes and taking a volume-weighted average
    of the ratio/score columns (documented below), since Model B needs one
    number per signal per day, not one per platform per day.

There is currently no way in this app to export either table to CSV — see
../README.md for what actually has to exist before this module can run
against real data. Until then, it only has synthetic fixtures exercised by
the tests.
"""

from __future__ import annotations

import pandas as pd

REQUIRED_PROCESSED_COLUMNS = {"published_at", "collected_at", "sales", "revenue"}
REQUIRED_AGGREGATE_COLUMNS = {
    "date",
    "mention_volume",
    "comment_volume",
    "avg_rating_sentiment",
    "positive_ratio",
    "negative_ratio",
}


def build_daily_sales(processed_df: pd.DataFrame, product: str | None = None) -> pd.DataFrame:
    """Sums `sales`/`revenue` per calendar day from row-level `processed_data`.
    `published_at` is preferred as the date field (falls back to
    `collected_at` when null), matching how the JS pipeline treats the two
    per FYP2.md §42. Pass `product` to forecast a single product/category
    instead of the whole business."""
    missing = REQUIRED_PROCESSED_COLUMNS - set(processed_df.columns)
    if missing:
        raise ValueError(f"processed_df is missing required columns: {sorted(missing)}")

    df = processed_df.copy()
    if product is not None:
        df = df.loc[df["product"] == product]

    date = pd.to_datetime(df["published_at"]).fillna(pd.to_datetime(df["collected_at"]))
    df = df.assign(date=date.dt.normalize())

    daily = (
        df.groupby("date")[["sales", "revenue"]]
        .sum(min_count=1)
        .reset_index()
        .sort_values("date")
    )
    return daily


def build_daily_sentiment_regressors(daily_aggregates_df: pd.DataFrame) -> pd.DataFrame:
    """Collapses `daily_aggregates` (one row per source/platform per day)
    into one row per day, for use as Prophet regressors. Volumes
    (`mention_volume`, `comment_volume`) are summed across sources; ratio/
    score columns (`avg_rating_sentiment`, `positive_ratio`,
    `negative_ratio`) are averaged, weighted by that day's `comment_volume`
    where available so a source with more comments has proportionally more
    influence on the day's sentiment signal, falling back to a simple mean
    when every row that day has zero/null comment_volume."""
    missing = REQUIRED_AGGREGATE_COLUMNS - set(daily_aggregates_df.columns)
    if missing:
        raise ValueError(f"daily_aggregates_df is missing required columns: {sorted(missing)}")

    df = daily_aggregates_df.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    df["comment_volume"] = df["comment_volume"].fillna(0)

    def _weighted_or_mean(group: pd.DataFrame, column: str) -> float | None:
        values = group[column].dropna()
        if values.empty:
            return None
        weights = group.loc[values.index, "comment_volume"]
        if weights.sum() > 0:
            return float((values * weights).sum() / weights.sum())
        return float(values.mean())

    rows = []
    for date, group in df.groupby("date"):
        rows.append(
            {
                "date": date,
                "mention_volume": int(group["mention_volume"].fillna(0).sum()),
                "comment_volume": int(group["comment_volume"].sum()),
                "avg_rating_sentiment": _weighted_or_mean(group, "avg_rating_sentiment"),
                "positive_ratio": _weighted_or_mean(group, "positive_ratio"),
                "negative_ratio": _weighted_or_mean(group, "negative_ratio"),
            }
        )
    return pd.DataFrame(rows).sort_values("date").reset_index(drop=True)


def build_daily_series(
    processed_df: pd.DataFrame,
    daily_aggregates_df: pd.DataFrame | None = None,
    product: str | None = None,
) -> pd.DataFrame:
    """The single entry point every model in this package trains against:
    a daily-indexed DataFrame with at minimum `date`, `sales`, `revenue`,
    reindexed to a continuous daily range (missing days filled with 0 sales/
    revenue - no sales that day is a real, meaningful zero, not missing
    data) and, when `daily_aggregates_df` is supplied, the sentiment
    regressor columns joined in (left join on date; days with no social
    activity get 0 volume and null ratios, since "no data that day" and
    "measured zero sentiment" are different claims and are kept distinct)."""
    daily = build_daily_sales(processed_df, product=product)
    if daily.empty:
        return daily

    full_range = pd.date_range(daily["date"].min(), daily["date"].max(), freq="D")
    daily = daily.set_index("date").reindex(full_range).rename_axis("date").reset_index()
    daily[["sales", "revenue"]] = daily[["sales", "revenue"]].fillna(0)

    if daily_aggregates_df is not None and len(daily_aggregates_df):
        regressors = build_daily_sentiment_regressors(daily_aggregates_df)
        daily = daily.merge(regressors, on="date", how="left")
        daily[["mention_volume", "comment_volume"]] = daily[["mention_volume", "comment_volume"]].fillna(0)
        # avg_rating_sentiment / positive_ratio / negative_ratio stay null where
        # there was no social data that day - filled by the model wrapper
        # (Prophet regressors need no NaNs), not silently zeroed here.

    return daily
