import pandas as pd

from src.data_loader import build_daily_sales, build_daily_sentiment_regressors, build_daily_series


def _processed_df():
    return pd.DataFrame(
        [
            {"published_at": "2026-01-01", "collected_at": "2026-01-01", "sales": 5, "revenue": 100.0, "product": "A"},
            {"published_at": "2026-01-01", "collected_at": "2026-01-01", "sales": 2, "revenue": 40.0, "product": "B"},
            {"published_at": None, "collected_at": "2026-01-02", "sales": 3, "revenue": 60.0, "product": "A"},
            {"published_at": "2026-01-04", "collected_at": "2026-01-04", "sales": 1, "revenue": 20.0, "product": "A"},
        ]
    )


def _aggregates_df():
    return pd.DataFrame(
        [
            {"date": "2026-01-01", "source": "social", "platform": "tiktok", "mention_volume": 10, "comment_volume": 4, "avg_rating_sentiment": 0.5, "positive_ratio": 0.6, "negative_ratio": 0.1},
            {"date": "2026-01-01", "source": "social", "platform": "x", "mention_volume": 5, "comment_volume": 1, "avg_rating_sentiment": -0.2, "positive_ratio": 0.2, "negative_ratio": 0.5},
            {"date": "2026-01-04", "source": "social", "platform": "tiktok", "mention_volume": 2, "comment_volume": 0, "avg_rating_sentiment": 0.1, "positive_ratio": 0.4, "negative_ratio": 0.2},
        ]
    )


def test_build_daily_sales_sums_same_day_rows():
    daily = build_daily_sales(_processed_df())
    day1 = daily.loc[daily["date"] == pd.Timestamp("2026-01-01")]
    assert day1["revenue"].iat[0] == 140.0
    assert day1["sales"].iat[0] == 7


def test_build_daily_sales_falls_back_to_collected_at():
    daily = build_daily_sales(_processed_df())
    # row 3 has published_at=None, collected_at=2026-01-02
    day2 = daily.loc[daily["date"] == pd.Timestamp("2026-01-02")]
    assert day2["revenue"].iat[0] == 60.0


def test_build_daily_sales_filters_by_product():
    daily = build_daily_sales(_processed_df(), product="A")
    assert daily["revenue"].sum() == 100.0 + 60.0 + 20.0


def test_missing_required_columns_raises():
    try:
        build_daily_sales(pd.DataFrame({"revenue": [1]}))
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_sentiment_regressors_collapse_platforms_with_volume_weighting():
    regressors = build_daily_sentiment_regressors(_aggregates_df())
    day1 = regressors.loc[regressors["date"] == pd.Timestamp("2026-01-01")].iloc[0]
    assert day1["mention_volume"] == 15
    assert day1["comment_volume"] == 5
    # weighted by comment_volume: (0.5*4 + -0.2*1) / 5 = 0.36
    assert round(day1["avg_rating_sentiment"], 4) == 0.36


def test_sentiment_regressors_fall_back_to_mean_when_no_comment_volume():
    day4 = build_daily_sentiment_regressors(_aggregates_df())
    day4 = day4.loc[day4["date"] == pd.Timestamp("2026-01-04")].iloc[0]
    assert day4["avg_rating_sentiment"] == 0.1


def test_build_daily_series_fills_missing_days_with_zero():
    daily = build_daily_series(_processed_df())
    # 2026-01-01 through 2026-01-04 = 4 days, including the gap on 01-03
    assert len(daily) == 4
    day3 = daily.loc[daily["date"] == pd.Timestamp("2026-01-03")].iloc[0]
    assert day3["revenue"] == 0
    assert day3["sales"] == 0


def test_build_daily_series_joins_sentiment_regressors():
    daily = build_daily_series(_processed_df(), _aggregates_df())
    day1 = daily.loc[daily["date"] == pd.Timestamp("2026-01-01")].iloc[0]
    assert day1["comment_volume"] == 5
    day3 = daily.loc[daily["date"] == pd.Timestamp("2026-01-03")].iloc[0]
    assert day3["comment_volume"] == 0  # no social activity that day -> 0 volume
    assert pd.isna(day3["avg_rating_sentiment"])  # but ratio stays null, not zeroed
