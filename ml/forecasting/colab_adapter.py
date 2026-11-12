"""Adapter: notebook 02's output -> the two CSVs run_protocol.py expects.

Why this exists
---------------
`ml/notebooks/02_sales_data_preparation.ipynb` writes the long format
    dataset, series_id, date, y, units, orders, review_count,
    avg_review_score, neg_review_ratio, pos_review_ratio, review_text_count
but `src/data_loader.build_daily_series` expects the app's own schema
(`processed_data` / `daily_aggregates`, see data/schema.md). They are
different column sets, so run_protocol.py cannot read olist_daily.csv
directly. This maps one to the other and nothing else - no resampling,
no imputation, no new rows.

The sentiment mapping is a RESCALING of the star-based ratios notebook 02
already computes, not a sentiment model. avg_rating_sentiment is the mean
review score mapped from the 1-5 star range onto [-1, 1] by (score-3)/2.
Once XLM-R predictions exist for `olist_review_text_for_sentiment.csv`,
replace that column with the model's output and re-run; the dissertation
must say which of the two produced the reported numbers.

Usage (Colab):
    !python ml/forecasting/colab_adapter.py \
        --long /content/drive/MyDrive/INSIGHTAID_AI/ml_data/sales/olist_daily.csv \
        --out-dir /content/adapted
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

SALES_OUT = "olist_processed_data.csv"
AGG_TOTAL_OUT = "olist_daily_aggregates_total.csv"
AGG_BY_PRODUCT_OUT = "olist_daily_aggregates_by_product.csv"

REVIEW_COLS = ["review_count", "avg_review_score", "neg_review_ratio",
               "pos_review_ratio", "review_text_count"]


def _require(df: pd.DataFrame, cols: list[str], what: str) -> None:
    missing = sorted(set(cols) - set(df.columns))
    if missing:
        raise SystemExit("{} is missing required columns: {}".format(what, missing))


def to_processed_data(long_df: pd.DataFrame) -> pd.DataFrame:
    """series_id becomes `product`; y becomes `revenue`; units become `sales`."""
    _require(long_df, ["series_id", "date", "y"], "--long")
    out = pd.DataFrame({
        "published_at": pd.to_datetime(long_df["date"]).dt.strftime("%Y-%m-%d"),
        "collected_at": pd.to_datetime(long_df["date"]).dt.strftime("%Y-%m-%d"),
        "product": long_df["series_id"].astype(str),
        "revenue": pd.to_numeric(long_df["y"], errors="coerce"),
    })
    # `units` is olist-specific and absent from some datasets; when it is
    # missing the unit count is genuinely unknown, so it is left as 0 rather
    # than derived from revenue. revenue is the forecast target either way.
    out["sales"] = (pd.to_numeric(long_df["units"], errors="coerce").fillna(0)
                    if "units" in long_df.columns else 0)
    return out.dropna(subset=["revenue"])


def to_daily_aggregates(long_df: pd.DataFrame, keep_product: bool) -> pd.DataFrame:
    """Rescales notebook 02's star-based review features to the regressor names.

    A day with no reviews keeps NULL ratios rather than 0: "no reviews that
    day" and "measured zero negativity" are different claims, and
    build_daily_series relies on that distinction.
    """
    _require(long_df, ["series_id", "date"], "--long")
    present = [c for c in REVIEW_COLS if c in long_df.columns]
    if not present:
        raise SystemExit(
            "--long has none of the review columns {}. Re-run notebook 02 for "
            "olist; only olist carries paired review features.".format(REVIEW_COLS))

    out = pd.DataFrame({"date": pd.to_datetime(long_df["date"]).dt.strftime("%Y-%m-%d")})
    if keep_product:
        out["product"] = long_df["series_id"].astype(str)

    rc = pd.to_numeric(long_df.get("review_count"), errors="coerce")
    rtc = pd.to_numeric(long_df.get("review_text_count"), errors="coerce")
    out["mention_volume"] = rc.fillna(0) if rc is not None else 0
    out["comment_volume"] = rtc.fillna(0) if rtc is not None else out["mention_volume"]

    score = pd.to_numeric(long_df.get("avg_review_score"), errors="coerce")
    out["avg_rating_sentiment"] = (score - 3.0) / 2.0 if score is not None else None
    out["negative_ratio"] = pd.to_numeric(long_df.get("neg_review_ratio"), errors="coerce")
    out["positive_ratio"] = pd.to_numeric(long_df.get("pos_review_ratio"), errors="coerce")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--long", required=True,
                    help="olist_daily.csv (or sales_daily_long.parquet) from notebook 02")
    ap.add_argument("--out-dir", default="adapted")
    ap.add_argument("--total-series", default="olist_total",
                    help="series_id treated as the whole-business series")
    args = ap.parse_args()

    path = Path(args.long)
    long_df = pd.read_parquet(path) if path.suffix == ".parquet" else pd.read_csv(path)
    if "dataset" in long_df.columns:
        long_df = long_df[long_df["dataset"] == "olist"]
    if long_df.empty:
        raise SystemExit("No olist rows in {}".format(path))

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    to_processed_data(long_df).to_csv(out_dir / SALES_OUT, index=False)

    total = long_df[long_df["series_id"] == args.total_series]
    if total.empty:
        raise SystemExit(
            "No rows for --total-series '{}'. Available: {}".format(
                args.total_series, sorted(long_df['series_id'].unique())[:12]))
    to_daily_aggregates(total, keep_product=False).to_csv(out_dir / AGG_TOTAL_OUT, index=False)
    to_daily_aggregates(long_df, keep_product=True).to_csv(out_dir / AGG_BY_PRODUCT_OUT, index=False)

    series = sorted(long_df["series_id"].unique())
    print("wrote {} / {} / {}".format(SALES_OUT, AGG_TOTAL_OUT, AGG_BY_PRODUCT_OUT))
    print("series available ({}): {}".format(len(series), ", ".join(series)))
    print()
    print("--categories \"{}\"".format(
        ",".join(s for s in series if s != args.total_series)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
