"""
FYP II Phase 4 — the real Prophet sales-only vs sentiment-enhanced
comparison for Olist (the only series in the sales dataset with paired
review data), completing what `04_train_forecasting_models.ipynb`
deliberately left as a manual step (see that notebook's "Optional: real
sentiment-enhanced comparison for Olist" cell).

Sentiment-regressor mapping (documented, not guessed — see
docs/SENTIMENT_REGRESSOR_MAPPING.md for the full write-up):
  avg_rating_sentiment = (avg_review_score - 3) / 2   [-1, 1], same
                          formula as src/ratingSentimentHeuristic.js in
                          the live app, reused here for consistency
                          rather than inventing a second mapping.
  negative_ratio        = neg_review_ratio              (already computed
                          per day by 02_sales_data_preparation.ipynb's
                          join of Olist's real review data onto its
                          sales series — reused directly, not re-derived,
                          since re-deriving independently risks a subtly
                          different and undocumented definition of
                          "negative")
  comment_volume         = review_count                 (total reviews
                          that day — the volume analogue of the live
                          app's daily_aggregates.comment_volume)

Usage:
    python scripts/run_sentiment_regressor_comparison.py <path-to-olist_daily.csv> [<path-to-output-dir>]

Run from ml/forecasting/. The Olist CSVs are not stored in this repo
(they come from the external dataset prep step — see
docs/datasets/sales/DATASET_REPORT.md); pass the real file's location on
whichever machine has it.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.dm_test import diebold_mariano_test  # noqa: E402
from src.evaluate import _prophet_fn  # noqa: E402
from src.metrics import average_metrics, compute_forecast_metrics  # noqa: E402
from src.rolling_split import rolling_origin_splits  # noqa: E402

HORIZON = 30
MAX_FOLDS = 2
LAG_MAX_DAYS = 21


def build_daily_df(olist_daily_csv: Path) -> pd.DataFrame:
    raw = pd.read_csv(olist_daily_csv)
    series = raw.loc[raw["series_id"] == "olist_total"].sort_values("date").reset_index(drop=True)
    if series.empty:
        raise ValueError(f"No 'olist_total' rows found in {olist_daily_csv}")

    df = pd.DataFrame(
        {
            "date": pd.to_datetime(series["date"]),
            "revenue": series["y"].astype(float),
            # Documented mapping (see module docstring) - not guessed.
            "avg_rating_sentiment": (series["avg_review_score"].astype(float) - 3) / 2,
            "negative_ratio": series["neg_review_ratio"].astype(float),
            "comment_volume": series["review_count"].astype(float),
        }
    )
    # Prophet regressors cannot contain NaN - a day with zero reviews has
    # no review-score average, which is a real "no signal that day," not
    # a value to guess. 0 is the documented fill (matches
    # prophet_model.py's own _to_prophet_frame fillna(0) policy).
    for col in ("avg_rating_sentiment", "negative_ratio", "comment_volume"):
        df[col] = df[col].fillna(0)
    return df


def run_comparison(daily_df: pd.DataFrame) -> dict:
    n_obs = len(daily_df)
    initial_train_size = max(30, n_obs - HORIZON * (MAX_FOLDS + 1))
    folds = rolling_origin_splits(n_obs, initial_train_size, HORIZON, max_folds=MAX_FOLDS)

    sales_only_fn = _prophet_fn("sales_only")
    sentiment_fn = _prophet_fn("sentiment_enhanced")

    sales_only_metrics, sentiment_metrics = [], []
    combined_actual: list[float] = []
    combined_sales_only_pred: list[float] = []
    combined_sentiment_pred: list[float] = []

    for fold in folds:
        train_df = daily_df.iloc[list(fold.train_index)]
        test_df = daily_df.iloc[list(fold.test_index)]
        actual = test_df["revenue"].tolist()

        pred_sales_only = sales_only_fn(train_df, test_df, HORIZON)
        pred_sentiment = sentiment_fn(train_df, test_df, HORIZON)

        sales_only_metrics.append(compute_forecast_metrics(actual, pred_sales_only, y_train=train_df["revenue"].tolist()))
        sentiment_metrics.append(compute_forecast_metrics(actual, pred_sentiment, y_train=train_df["revenue"].tolist()))

        combined_actual.extend(actual)
        combined_sales_only_pred.extend(pred_sales_only)
        combined_sentiment_pred.extend(pred_sentiment)

    sales_only_avg = average_metrics(sales_only_metrics)
    sentiment_avg = average_metrics(sentiment_metrics)

    dm_result = diebold_mariano_test(
        combined_actual, combined_sales_only_pred, combined_sentiment_pred, h=HORIZON
    )

    return {
        "n_folds": len(folds),
        "n_combined_test_points": len(combined_actual),
        "prophet_sales_only": vars(sales_only_avg),
        "prophet_sentiment_enhanced": vars(sentiment_avg),
        "diebold_mariano": {
            "dm_statistic": dm_result.dm_statistic,
            "p_value": dm_result.p_value,
            "mean_loss_diff": dm_result.mean_loss_diff,
            "n": dm_result.n,
            "h": dm_result.h,
            "significant_at_05": dm_result.significant_at_05,
            "interpretation": dm_result.interpretation("Prophet sales-only", "Prophet sentiment-enhanced"),
        },
    }


def lag_analysis(daily_df: pd.DataFrame, max_lag: int = LAG_MAX_DAYS) -> list[dict]:
    """Cross-correlation of avg_rating_sentiment vs revenue at lags 0..max_lag
    days — does today's sentiment correlate with revenue some days later?
    `sentiment.shift(lag)` means "sentiment from `lag` days ago," correlated
    against today's revenue."""
    revenue = daily_df["revenue"]
    sentiment = daily_df["avg_rating_sentiment"]
    results = []
    for lag in range(0, max_lag + 1):
        shifted = sentiment.shift(lag)
        valid = shifted.notna()
        corr = revenue[valid].corr(shifted[valid]) if valid.sum() > 2 else None
        results.append({"lag_days": lag, "correlation": None if corr is None or pd.isna(corr) else round(float(corr), 4)})
    return results


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    olist_daily_csv = Path(sys.argv[1])
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "results" / "phase4_sentiment_regressor"
    out_dir.mkdir(parents=True, exist_ok=True)

    daily_df = build_daily_df(olist_daily_csv)
    print(f"olist_total: {len(daily_df)} days, {daily_df['date'].min().date()} to {daily_df['date'].max().date()}")
    print(f"days with any real review data: {(daily_df['comment_volume'] > 0).sum()}")

    comparison = run_comparison(daily_df)
    lags = lag_analysis(daily_df)

    output = {"series": "olist_total", "comparison": comparison, "lag_analysis_sentiment_vs_revenue": lags}
    out_path = out_dir / "results.json"
    out_path.write_text(json.dumps(output, indent=2, default=str), encoding="utf-8")
    print(f"\nWrote {out_path}")
    print(json.dumps(comparison, indent=2, default=str))
    best_lag = max(lags, key=lambda r: abs(r["correlation"]) if r["correlation"] is not None else -1)
    print(f"\nStrongest |correlation| lag: {best_lag}")


if __name__ == "__main__":
    main()
