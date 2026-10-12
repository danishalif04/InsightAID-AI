from src.weak_labels import classify_by_rating


def test_five_stars_is_positive():
    label = classify_by_rating(5)
    assert label.sentiment == "positive"
    assert label.score == 1.0
    assert label.confidence == 0.6


def test_four_stars_is_positive():
    label = classify_by_rating(4)
    assert label.sentiment == "positive"
    assert label.score == 0.5


def test_three_stars_is_neutral():
    label = classify_by_rating(3)
    assert label.sentiment == "neutral"
    assert label.score == 0.0
    assert label.confidence == 0.5


def test_two_stars_is_negative():
    label = classify_by_rating(2)
    assert label.sentiment == "negative"
    assert label.score == -0.5


def test_one_star_is_negative():
    label = classify_by_rating(1)
    assert label.sentiment == "negative"
    assert label.score == -1.0


def test_non_integer_rating_that_is_neither_gte_4_nor_exactly_3_falls_to_negative():
    """Mirrors ratingSentimentHeuristic.js exactly: this is existing production
    behavior (e.g. 3.5 stars is classified negative, not neutral), not a new
    design choice made in this port."""
    label = classify_by_rating(3.5)
    assert label.sentiment == "negative"


def test_numeric_string_rating_is_accepted():
    label = classify_by_rating("4")
    assert label.sentiment == "positive"


def test_missing_rating_returns_none():
    assert classify_by_rating(None) is None


def test_non_numeric_rating_returns_none():
    assert classify_by_rating("not-a-rating") is None


def test_out_of_range_rating_returns_none():
    assert classify_by_rating(0) is None
    assert classify_by_rating(6) is None
    assert classify_by_rating(-1) is None
