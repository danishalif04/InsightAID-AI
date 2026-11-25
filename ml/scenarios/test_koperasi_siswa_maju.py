import statistics
from datetime import date

from koperasi_siswa_maju import (BREAK_END, BREAK_START, END, INCIDENT_DAY, INCIDENT_ITEM, ITEMS, START,
                                 Config, generate_reviews, generate_sales)


def test_same_seed_is_reproducible():
    assert generate_sales(Config(seed=1)) == generate_sales(Config(seed=1))
    assert generate_reviews(Config(seed=1)) == generate_reviews(Config(seed=1))


def test_different_seed_differs():
    assert generate_sales(Config(seed=1)) != generate_sales(Config(seed=2))


def test_sunday_and_public_holidays_are_genuinely_absent():
    dates = {r["date"] for r in generate_sales(Config())}
    assert "2026-08-30" not in dates  # a Sunday
    assert "2026-08-31" not in dates  # Merdeka Day
    assert all(START.isoformat() <= d <= END.isoformat() for d in dates)


def test_every_item_has_rows_and_margins_are_positive():
    names = {r["item"] for r in generate_sales(Config())}
    assert names == {i[0] for i in ITEMS}
    assert all(i[3] > i[4] > 0 for i in ITEMS)


def test_mid_semester_break_lowers_sales():
    rows = generate_sales(Config())
    def mean_units(pred):
        return statistics.mean(int(r["units_sold"]) for r in rows if r["item"] == "Air Mineral" and pred(date.fromisoformat(r["date"])))
    assert mean_units(lambda d: BREAK_START <= d <= BREAK_END) < 0.6 * mean_units(lambda d: not (BREAK_START <= d <= BREAK_END))


def test_reviews_cover_all_languages_and_stale_incident_names_the_item():
    reviews = generate_reviews(Config())
    assert {r["language"] for r in reviews} == {"en", "ms", "zh", "ms-en"}
    incident = [r for r in reviews if r["date"] == INCIDENT_DAY.isoformat() and r["sentiment_label"] == "negative"]
    assert incident and all(r["item"] == INCIDENT_ITEM for r in incident)
    assert not any("username" in r for r in reviews)
