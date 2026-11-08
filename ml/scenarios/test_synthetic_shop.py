import statistics
from datetime import date

from synthetic_shop import OUTPUT_COLUMNS, ShopConfig, generate


def test_output_columns_match_the_real_local_shop_csv_template():
    cfg = ShopConfig(n_days=30)
    rows = generate(cfg)
    assert len(rows) > 0
    assert set(rows[0].keys()) == set(OUTPUT_COLUMNS)


def test_same_seed_is_reproducible():
    rows_a = generate(ShopConfig(n_days=60, seed=7))
    rows_b = generate(ShopConfig(n_days=60, seed=7))
    assert rows_a == rows_b


def test_different_seed_gives_different_output():
    rows_a = generate(ShopConfig(n_days=60, seed=1))
    rows_b = generate(ShopConfig(n_days=60, seed=2))
    assert rows_a != rows_b


def test_missing_days_are_genuinely_absent_not_filled_with_a_guess():
    cfg = ShopConfig(n_days=200, missing_day_prob=1.0)  # every day "closed"
    rows = generate(cfg)
    assert rows == []


def test_festive_days_show_higher_average_daily_revenue_than_baseline():
    # 2026-08-31 = Merdeka Day, a real public holiday from the verified calendar.
    cfg = ShopConfig(start_date=date(2026, 8, 1), n_days=60, noise_std_pct=0, missing_day_prob=0, seed=3)
    rows = generate(cfg)
    by_date = {}
    for row in rows:
        by_date.setdefault(row["date"], 0.0)
        by_date[row["date"]] += row["amount_RM"]
    merdeka_total = by_date.get("2026-08-31")
    other_totals = [v for d, v in by_date.items() if d != "2026-08-31"]
    assert merdeka_total is not None
    assert merdeka_total > statistics.mean(other_totals)


def test_payday_uplift_of_zero_removes_the_25th_bump():
    cfg_with = ShopConfig(n_days=60, noise_std_pct=0, missing_day_prob=0, festive_uplift_pct=0, seed=5)
    cfg_without = ShopConfig(n_days=60, noise_std_pct=0, missing_day_prob=0, festive_uplift_pct=0, payday_uplift_pct=0, seed=5)

    def total_on_25th(rows):
        return sum(r["amount_RM"] for r in rows if r["date"].endswith("-25"))

    assert total_on_25th(generate(cfg_with)) > total_on_25th(generate(cfg_without))
