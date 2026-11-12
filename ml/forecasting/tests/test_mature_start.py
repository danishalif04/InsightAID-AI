"""Tests for the launch-ramp trim.

The rule exists because olist's own series grew tenfold inside the observation
window (monthly median revenue 3,308 in Jan 2017 against 33,306 in Aug 2018),
so a rolling-origin split trained on the ramp and scored against the mature
business. The date must be DERIVED from the data by a fixed rule, never picked
after seeing which date gives the best error.
"""

import pandas as pd

from src.data_loader import find_mature_start, trim_to_mature


def _series(values, start="2024-01-01"):
    dates = pd.date_range(start, periods=len(values), freq="D")
    return pd.DataFrame({"date": dates, "sales": 1, "revenue": [float(v) for v in values]})


def test_find_mature_start_detects_a_launch_ramp():
    df = _series([100] * 60 + [1000] * 365)
    start = find_mature_start(df)
    assert start is not None
    # The ramp is at a tenth of the mature level, so the threshold cannot be
    # met until the rolling window has moved into the mature period.
    assert start >= pd.Timestamp("2024-03-01")


def test_find_mature_start_returns_none_for_an_already_flat_series():
    """A flat series is mature from its first full window, so nothing is
    dropped - but the function must not claim maturity before it can measure
    a window at all."""
    df = _series([500] * 200)
    start = find_mature_start(df)
    assert start is not None
    assert start == df["date"].iloc[13]  # min_periods = window // 2


def test_find_mature_start_returns_none_when_series_shorter_than_window():
    assert find_mature_start(_series([10] * 10)) is None


def test_find_mature_start_returns_none_when_reference_median_is_zero():
    assert find_mature_start(_series([0] * 100)) is None


def test_trim_to_mature_drops_only_the_ramp():
    df = _series([100] * 60 + [1000] * 200)
    start = find_mature_start(df)
    trimmed = trim_to_mature(df, start)
    assert len(trimmed) < len(df)
    assert pd.to_datetime(trimmed["date"]).min() == start
    assert trimmed["revenue"].median() == 1000


def test_trim_to_mature_is_a_noop_for_none():
    df = _series([100] * 50)
    assert len(trim_to_mature(df, None)) == len(df)


def test_trim_to_mature_never_returns_an_empty_frame():
    """A start date after the whole series would otherwise empty it, which
    would look like a data problem rather than a trimming problem."""
    df = _series([100] * 50)
    out = trim_to_mature(df, pd.Timestamp("2030-01-01"))
    assert len(out) == len(df)
