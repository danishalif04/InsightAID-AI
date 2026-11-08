"""
Synthetic data generator for the Local Malaysian Shop scenario (FYP II
Phase 2). No real-world dataset of Malaysian kedai runcit / kopitiam /
bakery / mamak daily sales exists to source, so a documented, parameterized
synthetic generator is the right tool here -- never presented as real data.
Every output file and this module are labelled "synthetic" in their own
name/docstring; if ever uploaded into the app for a demo, use the same
"clearly synthetic demo data" framing already used for the existing Embun
Botanica demo account.

Output columns match the app's real "Local Shop" CSV upload template
exactly (date, item, quantity, amount_RM, payment_method -- see
src/utils/csvTemplates.js's buildLocalShopSalesCsvContent()), so generated
output can be uploaded through the real ingestion pipeline unchanged.

Parameters modelled, each independently configurable via ShopConfig:
  - weekly pattern (per-weekday multiplier)
  - a slow linear-in-log trend (% growth per 30 days)
  - festive uplift on real Malaysian public-holiday/e-commerce-campaign
    days (dates from ml/forecasting/src/malaysian_holidays.py -- reused,
    never re-implemented or re-guessed here)
  - payday uplift (~25th of the month)
  - Gaussian noise
  - missing days (a real closed day -- dropped entirely, never filled
    with a guessed value, consistent with this project's "never fabricate"
    rule)
  - a sentiment -> demand LAG effect: a synthetic daily sentiment series
    (itself clearly synthetic, not real customer opinion) shifts demand
    `sentiment_lag_days` days later, by `sentiment_demand_elasticity`
"""

from __future__ import annotations

import argparse
import csv
import random
import sys
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "forecasting" / "src"))
from malaysian_holidays import get_all_events  # noqa: E402 -- path set above

PAYMENT_METHODS = ["cash", "DuitNow", "Touch 'n Go eWallet", "GrabPay"]
OUTPUT_COLUMNS = ["date", "item", "quantity", "amount_RM", "payment_method"]


@dataclass
class ShopConfig:
    shop_name: str = "Kedai Kopi Pak Mat (SYNTHETIC)"
    start_date: date = date(2026, 1, 1)
    n_days: int = 180
    items: list = field(
        default_factory=lambda: [
            ("Kopi O", 3.5),
            ("Teh Tarik", 3.0),
            ("Roti Bakar", 4.0),
            ("Nasi Lemak", 6.5),
            ("Mee Goreng", 7.0),
        ]
    )
    base_daily_transactions: int = 40
    # Monday=0 .. Sunday=6 -- weekends busier, a documented assumption, not
    # measured from any real shop.
    weekly_multipliers: dict = field(
        default_factory=lambda: {0: 0.9, 1: 0.9, 2: 0.95, 3: 1.0, 4: 1.1, 5: 1.3, 6: 1.2}
    )
    trend_pct_per_30_days: float = 2.0
    festive_uplift_pct: float = 35.0
    payday_uplift_pct: float = 15.0
    noise_std_pct: float = 10.0
    missing_day_prob: float = 0.03
    sentiment_lag_days: int = 3
    sentiment_demand_elasticity: float = 0.15  # fraction swing in demand per unit of sentiment swing
    seed: int = 42


def generate_sentiment_series(cfg: ShopConfig) -> list[float]:
    """A synthetic daily sentiment series in [-1, 1] (a slow random walk),
    used ONLY to drive the lag effect below -- explicitly not a model of
    real customer opinion, just a documented mechanism for the lag test."""
    rng = random.Random(cfg.seed + 1)
    series = []
    level = 0.3
    for _ in range(cfg.n_days):
        level = max(-1.0, min(1.0, level + rng.uniform(-0.05, 0.05)))
        series.append(level)
    return series


def generate(cfg: ShopConfig) -> list[dict]:
    """Returns a list of transaction-row dicts. Deterministic for a given
    `cfg.seed` -- same seed, same output, every time (reproducibility, per
    the master prompt's rule 5)."""
    rng = random.Random(cfg.seed)
    events = get_all_events([cfg.start_date.year, cfg.start_date.year + 1])
    festive_dates = {e.date for e in events if e.category in ("public_holiday", "ecommerce_campaign")}
    payday_dates = {e.date for e in events if e.category == "payday"}
    sentiment = generate_sentiment_series(cfg)

    rows: list[dict] = []
    for day_index in range(cfg.n_days):
        day = cfg.start_date + timedelta(days=day_index)

        if rng.random() < cfg.missing_day_prob:
            continue  # a real closed/missing day -- skipped, never filled with a guess

        multiplier = cfg.weekly_multipliers.get(day.weekday(), 1.0)
        multiplier *= (1 + cfg.trend_pct_per_30_days / 100) ** (day_index / 30)
        if day in festive_dates:
            multiplier *= 1 + cfg.festive_uplift_pct / 100
        if day in payday_dates:
            multiplier *= 1 + cfg.payday_uplift_pct / 100

        lag_index = day_index - cfg.sentiment_lag_days
        if 0 <= lag_index < len(sentiment):
            multiplier *= 1 + cfg.sentiment_demand_elasticity * sentiment[lag_index]

        noise = 1 + rng.gauss(0, cfg.noise_std_pct / 100)
        n_transactions = max(0, round(cfg.base_daily_transactions * multiplier * noise))

        for _ in range(n_transactions):
            item, price = rng.choice(cfg.items)
            quantity = rng.choice([1, 1, 1, 2])
            rows.append(
                {
                    "date": day.isoformat(),
                    "item": item,
                    "quantity": quantity,
                    "amount_RM": round(price * quantity, 2),
                    "payment_method": rng.choice(PAYMENT_METHODS),
                }
            )
    return rows


def write_csv(rows: list[dict], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="ml/scenarios/output/synthetic_local_shop_sales.csv")
    parser.add_argument("--days", type=int, default=180)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    cfg = ShopConfig(n_days=args.days, seed=args.seed)
    rows = generate(cfg)
    out_path = Path(args.out)
    write_csv(rows, out_path)
    print(f"Wrote {len(rows)} SYNTHETIC rows to {out_path} (shop: {cfg.shop_name}) -- not real data.")


if __name__ == "__main__":
    main()
