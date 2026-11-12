"""
Runs the FULL forecasting protocol and saves real artefacts.

Why this file exists
--------------------
`src/evaluate.run_comparison` already evaluates all six model families on
identical rolling-origin folds, and `metrics.select_best` already picks the
winner from measured numbers. Nothing was missing except a run whose output
was SAVED. Table 4.4 in the dissertation is empty for that reason alone.

Protocol pre-registration
-------------------------
The three protocols below are fixed in this file BEFORE any run. Each is a
legitimate but DIFFERENT evaluation, and each is reported separately with
its frequency and horizon stated. Picking whichever one happens to produce
the lowest MAPE and reporting only that would be threshold-hacking; report
the whole matrix.

Usage (Colab):
    !python ml/forecasting/run_protocol.py \
        --sales ml/forecasting/data/olist_sales.csv \
        --aggregates ml/forecasting/data/olist_sentiment.csv \
        --country BR --dataset-version olist_v1
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))

from src.data_loader import build_daily_series, resample_series  # noqa: E402
from src.dm_test import diebold_mariano_test  # noqa: E402
from src.evaluate import run_comparison  # noqa: E402
from src.metrics import compute_forecast_metrics, write_forecast_results_json  # noqa: E402
from src.prophet_model import (  # noqa: E402
    SENTIMENT_REGRESSOR_COLUMNS,
    ProphetConfig,
    fit_prophet,
    prophet_forecast,
)
from src.rolling_split import rolling_origin_splits  # noqa: E402

RESULTS_DIR = Path(__file__).parent / "results"


@dataclass(frozen=True)
class Protocol:
    name: str
    freq: str | None      # None = daily, else a pandas offset alias
    horizon: int
    seasonal_period: int  # for MASE
    note: str


PROTOCOLS = [
    Protocol("daily_h30", None, 30, 7,
             "Original protocol: daily series, 30-day horizon."),
    Protocol("daily_h7", None, 7, 7,
             "Daily series, 7-day horizon - matches the in-app forecast."),
    Protocol("weekly_h4", "W-MON", 4, 1,
             "Weekly totals, 4-week horizon - removes day-of-week noise."),
]


def _prophet_fold_predictions(df, config, initial_train_size, horizon, step, max_folds, freq="D"):
    """Paired per-fold predictions for both Prophet variants on IDENTICAL
    folds. The DM test is only valid on paired errors from the same windows."""
    folds = rolling_origin_splits(len(df), initial_train_size, horizon,
                                  step=step, max_folds=max_folds)
    actual, sales_only, enhanced = [], [], []
    for fold in folds:
        train_df = df.iloc[list(fold.train_index)]
        test_df = df.iloc[list(fold.test_index)]

        a = fit_prophet(train_df, variant="sales_only", config=config)
        pa = prophet_forecast(a, train_df, horizon, freq=freq)["predicted"].tolist()

        future = test_df[["date", *SENTIMENT_REGRESSOR_COLUMNS]]
        b = fit_prophet(train_df, variant="sentiment_enhanced", config=config)
        pb = prophet_forecast(b, train_df, horizon, future_regressors=future, freq=freq)["predicted"].tolist()

        actual += test_df["revenue"].tolist()
        sales_only += pa
        enhanced += pb
    return actual, sales_only, enhanced, len(folds)


def run_sentiment_comparison(df, config, label, initial_train_size, horizon,
                             seasonal_period, step=None, max_folds=None, freq="D"):
    """The O2 hypothesis test for one series, reported whichever way it falls."""
    actual, so, en, n_folds = _prophet_fold_predictions(
        df, config, initial_train_size, horizon, step, max_folds, freq)
    train_head = df["revenue"].tolist()[:initial_train_size]

    m_so = compute_forecast_metrics(actual, so, y_train=train_head, seasonal_period=seasonal_period)
    m_en = compute_forecast_metrics(actual, en, y_train=train_head, seasonal_period=seasonal_period)
    dm = diebold_mariano_test(actual, so, en, h=horizon)

    return {
        "series": label,
        "n_folds": n_folds,
        "n_combined_test_points": len(actual),
        "prophet_sales_only": asdict(m_so),
        "prophet_sentiment_enhanced": asdict(m_en),
        "diebold_mariano": {
            **asdict(dm),
            "interpretation": dm.interpretation(
                "Prophet sales-only", "Prophet sentiment-enhanced"),
        },
    }


def tally_series_winners(per_series: list[dict]) -> dict:
    """How many series each model family won.

    Table 4.4 in the dissertation has a "Series where best" column. A
    single-series run CANNOT fill it - with one series every count is 0 or 1
    and the column is meaningless. It is filled only from a multi-series run,
    and left blank otherwise rather than guessed.
    """
    families: dict[str, int] = {}
    wins: dict[str, int] = {}
    for entry in per_series:
        for r in entry["rows"]:
            key = "{}:{}".format(r["model_type"], r["variant"])
            families[key] = 0
            if r.get("is_best"):
                wins[key] = wins.get(key, 0) + 1
    return {k: wins.get(k, 0) for k in families}


def aggregate_metrics_across_series(per_series: list[dict]) -> dict:
    """Unweighted mean of each family's fold-averaged metrics across series.

    Unweighted because MAPE is already scale-free; averaging MAE across series
    of different revenue scale is reported but is the weaker of the two columns.
    Series where a family produced no metric are excluded from its mean and the
    surviving count is reported as n_series, so a family that failed on most
    series cannot look strong on the one it survived.
    """
    acc: dict[str, dict[str, list]] = {}
    for entry in per_series:
        for r in entry["rows"]:
            key = "{}:{}".format(r["model_type"], r["variant"])
            acc.setdefault(key, {"mae": [], "rmse": [], "mape": []})
            for m in ("mae", "rmse", "mape"):
                if r.get(m) is not None:
                    acc[key][m].append(r[m])
    out = {}
    for key, v in acc.items():
        out[key] = {m: (round(sum(x) / len(x), 4) if x else None)
                    for m, x in v.items()}
        out[key]["n_series"] = len(v["mae"])
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sales", required=True, help="processed_data / forecast sales CSV")
    ap.add_argument("--aggregates", default=None, help="daily_aggregates / sentiment CSV")
    ap.add_argument("--country", default=None, help="ISO-2 holiday set, e.g. BR or MY")
    ap.add_argument("--dataset-version", default=None)
    ap.add_argument("--max-folds", type=int, default=None)
    ap.add_argument("--categories", default=None,
                    help="comma-separated product/category values; each becomes one series")
    ap.add_argument("--full-per-category", action="store_true",
                    help="run ALL six model families per category and tally per-series "
                         "winners - required to fill the 'Series where best' column of "
                         "Table 4.4, which a single-series run cannot fill")
    args = ap.parse_args()

    run_id = uuid.uuid4().hex[:12]
    config = ProphetConfig(country_holidays=args.country)
    print("run_id=" + run_id + "  prophet_config=" + json.dumps(config.as_dict()))

    sales = pd.read_csv(args.sales)
    aggregates = pd.read_csv(args.aggregates) if args.aggregates else None
    daily = build_daily_series(sales, aggregates)
    print("daily series: {} days, {} to {}".format(
        len(daily), daily["date"].min().date(), daily["date"].max().date()))

    summary = {
        "run_id": run_id,
        "dataset_version": args.dataset_version,
        "prophet_config": config.as_dict(),
        "protocols": [],
        "sentiment_comparisons": [],
    }

    for proto in PROTOCOLS:
        df = resample_series(daily, proto.freq) if proto.freq else daily
        if len(df) < 40:
            print("[skip] {}: only {} periods".format(proto.name, len(df)))
            continue
        initial = max(20, len(df) // 2)
        print("\n=== {} ({} periods, h={}) ===".format(proto.name, len(df), proto.horizon))

        result = run_comparison(
            df, horizon=proto.horizon, initial_train_size=initial,
            dataset_version="{}:{}".format(args.dataset_version, proto.name),
            run_id="{}_{}".format(run_id, proto.name), max_folds=args.max_folds,
            freq=proto.freq or "D",
        )
        path = write_forecast_results_json(
            result.rows, RESULTS_DIR, "{}_{}".format(run_id, proto.name))
        print("saved " + str(path))
        for r in result.rows:
            mape = "n/a" if r.mape is None else round(r.mape, 2)
            print("  {:<16} {:<20} MAE={:>12.2f}  RMSE={:>12.2f}  MAPE={:>8}  best={}".format(
                r.model_type, r.variant, r.mae, r.rmse, mape, r.is_best))

        summary["protocols"].append({
            "protocol": asdict(proto),
            "results_file": path.name,
            "rows": [asdict(r) for r in result.rows],
            "lstm_decision": {"trained": result.lstm_decision[0],
                              "reason": result.lstm_decision[1]},
        })

        if aggregates is not None:
            try:
                summary["sentiment_comparisons"].append({
                    "protocol": proto.name,
                    **run_sentiment_comparison(df, config, "total", initial,
                                               proto.horizon, proto.seasonal_period,
                                               max_folds=args.max_folds,
                                               freq=proto.freq or "D"),
                })
            except (KeyError, ValueError) as exc:
                print("  [skip sentiment comparison] {}".format(exc))

    # Per-category O2 test: review sentiment is product-specific, so testing it
    # against a marketplace-wide total is a weak specification of the hypothesis.
    per_series: list[dict] = []
    if args.categories and aggregates is not None:
        for cat in [c.strip() for c in args.categories.split(",") if c.strip()]:
            try:
                cdf = build_daily_series(sales, aggregates, product=cat)
                if len(cdf) < 120:
                    print("[skip category {}] only {} days".format(cat, len(cdf)))
                    continue
                initial = max(30, len(cdf) // 2)
                if args.full_per_category:
                    cres = run_comparison(
                        cdf, horizon=7, initial_train_size=initial,
                        dataset_version="{}:cat_{}".format(args.dataset_version, cat),
                        run_id="{}_cat_{}".format(run_id, cat),
                        max_folds=args.max_folds,
                    )
                    per_series.append({
                        "series": cat,
                        "n_days": len(cdf),
                        "rows": [asdict(r) for r in cres.rows],
                    })
                    print("  full comparison done: {} ({} days)".format(cat, len(cdf)))
                summary["sentiment_comparisons"].append({
                    "protocol": "daily_h7_per_category",
                    **run_sentiment_comparison(cdf, config, cat, initial, 7, 7,
                                               max_folds=args.max_folds),
                })
                print("  per-category O2 test done: " + cat)
            except (KeyError, ValueError) as exc:
                print("[skip category {}] {}".format(cat, exc))

    if per_series:
        summary["per_series"] = per_series
        summary["series_winner_counts"] = tally_series_winners(per_series)
        summary["mean_metrics_across_series"] = aggregate_metrics_across_series(per_series)
        print("\n=== Table 4.4 inputs: mean across {} series ===".format(len(per_series)))
        for key, m in summary["mean_metrics_across_series"].items():
            print("  {:<42} MAE={:<12} RMSE={:<12} MAPE={:<9} best_on={} of {} series".format(
                key, m["mae"], m["rmse"], m["mape"],
                summary["series_winner_counts"].get(key, 0), len(per_series)))
    else:
        print("\n[Table 4.4] single series only - leave the 'Series where best' "
              "column blank or drop it; it is not measurable from one series.")

    out = RESULTS_DIR / "protocol_summary_{}.json".format(run_id)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    print("\nsummary written to " + str(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
