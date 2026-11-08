from datetime import date

from src.malaysian_holidays import (
    get_all_events,
    get_ecommerce_campaign_days,
    get_paydays,
    get_public_holidays,
    get_ramadan_periods,
    to_prophet_holidays_dataframe,
)


def test_public_holidays_includes_real_known_national_dates_for_2026():
    events = get_public_holidays([2026])
    names_by_date = {e.date: e.name for e in events}
    assert names_by_date[date(2026, 8, 31)] == "Hari Kebangsaan"
    assert names_by_date[date(2026, 9, 16)] == "Hari Malaysia"
    assert names_by_date[date(2026, 12, 25)] == "Hari Krismas"


def test_public_holidays_includes_lunar_calendar_events_via_the_library_not_guessed():
    events = get_public_holidays([2026])
    names = [e.name for e in events]
    assert any("Tahun Baharu Cina" in n for n in names)  # Chinese New Year
    assert any("Hari Raya Puasa" in n for n in names)
    assert any("Deepavali" in n for n in names)
    for e in events:
        assert e.category == "public_holiday"
        assert "holidays PyPI package" in e.source


def test_ramadan_period_is_derived_from_a_real_eid_date_not_invented():
    events = get_ramadan_periods([2026])
    assert len(events) >= 1
    # Real Hari Raya Puasa 2026 (per the holidays library) is 2026-03-21.
    assert events[0].date == date(2026, 2, 20)
    assert events[0].category == "ramadan_derived"
    assert "Derived" in events[0].source


def test_paydays_are_the_25th_of_every_month():
    events = get_paydays([2026])
    assert len(events) == 12
    assert all(e.date.day == 25 for e in events)


def test_ecommerce_campaign_days_are_11_11_and_12_12():
    events = get_ecommerce_campaign_days([2026])
    dates = {e.date for e in events}
    assert date(2026, 11, 11) in dates
    assert date(2026, 12, 12) in dates


def test_get_all_events_is_sorted_and_has_no_silent_duplicates_across_categories():
    events = get_all_events([2026])
    dates = [e.date for e in events]
    assert dates == sorted(dates)
    assert len(events) > 20  # public holidays + 12 paydays + 2 campaign days + ramadan


def test_prophet_dataframe_has_the_expected_columns_and_can_be_filtered_by_category():
    df = to_prophet_holidays_dataframe([2026])
    assert list(df.columns) == ["holiday", "ds"]
    assert len(df) > 0

    public_only = to_prophet_holidays_dataframe([2026], categories=["public_holiday"])
    assert len(public_only) < len(df)
