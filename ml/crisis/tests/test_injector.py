from ml.crisis.src.injector import build_crisis_scenario, build_spike_only_scenario, verify_cascade_is_staggered


def test_crisis_scenario_has_known_injection_point_and_rising_negative_share():
    scenario = build_crisis_scenario()
    assert scenario.kind == "crisis"
    pre = scenario.daily_series[scenario.start_index - 1]
    peak = scenario.daily_series[scenario.start_index + 4]
    assert peak["negative_ratio"] > pre["negative_ratio"]
    assert peak["mention_volume"] > pre["mention_volume"]
    assert peak["avg_rating"] < pre["avg_rating"]


def test_crisis_scenario_sales_drop_is_lagged_after_first_complaint_not_simultaneous():
    scenario = build_crisis_scenario(sales_lag_days=3)
    assert scenario.sales_drop_index == scenario.start_index + 3
    assert scenario.sales_series[scenario.sales_drop_index] < scenario.sales_series[scenario.start_index]


def test_multilingual_cascade_is_genuinely_staggered_not_same_day():
    scenario = build_crisis_scenario()
    assert verify_cascade_is_staggered(scenario) is True
    languages_by_day = {}
    for post in scenario.posts:
        languages_by_day.setdefault(post["day_offset"], set()).add(post["language"])
    # ms (TikTok) on day 0, zh (Shopee) on day 1, en (X) on day 2 - distinct days.
    assert languages_by_day[0] == {"ms"}
    assert languages_by_day[1] == {"zh"}
    assert languages_by_day[2] == {"en"}


def test_spike_only_scenario_has_no_sentiment_or_sales_change():
    scenario = build_spike_only_scenario()
    assert scenario.kind == "spike_only"
    assert scenario.sales_drop_index is None
    peak = scenario.daily_series[scenario.start_index + 4]
    pre = scenario.daily_series[scenario.start_index - 1]
    assert peak["mention_volume"] > pre["mention_volume"]  # volume DOES spike
    assert peak["negative_ratio"] <= 0.25  # but sentiment stays clean


def test_different_seeds_produce_different_series_reproducibly():
    a1 = build_crisis_scenario(seed=1)
    a2 = build_crisis_scenario(seed=1)
    b = build_crisis_scenario(seed=2)
    assert a1.daily_series == a2.daily_series  # reproducible
    assert a1.daily_series != b.daily_series  # not just a static fixture
