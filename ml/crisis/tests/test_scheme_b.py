import numpy as np

from ml.crisis.src.scheme_b import FalseAlarmClassifier, build_features, detect_scheme_b, evaluate_raw_rule


def _day(date, negative_ratio=0.15, mention_volume=10, avg_rating=4.2):
    return {"date": date, "negative_ratio": negative_ratio, "mention_volume": mention_volume, "avg_rating": avg_rating}


def test_raw_rule_requires_both_level_and_rising_velocity():
    # High (70%) but flat vs baseline -> should NOT raw-flag (not rising).
    series = [_day(f"2026-01-{i+1:02d}", negative_ratio=0.7) for i in range(8)]
    signal = evaluate_raw_rule(series)
    assert signal.raw_flag is False
    assert "not rising" in signal.raw_reason


def test_raw_rule_fires_when_over_threshold_and_rising():
    series = [_day(f"2026-01-{i+1:02d}", negative_ratio=0.2) for i in range(7)]
    series.append(_day("2026-01-08", negative_ratio=0.75))
    signal = evaluate_raw_rule(series)
    assert signal.raw_flag is True


def test_raw_rule_never_fires_on_volume_alone_by_construction():
    # The master-prompt point: a volume spike with LOW negative share must never raw-flag.
    series = [_day(f"2026-01-{i+1:02d}", negative_ratio=0.1, mention_volume=10) for i in range(7)]
    series.append(_day("2026-01-08", negative_ratio=0.1, mention_volume=50))
    assert evaluate_raw_rule(series).raw_flag is False


def test_detect_scheme_b_without_classifier_matches_raw_rule():
    series = [_day(f"2026-01-{i+1:02d}", negative_ratio=0.2) for i in range(7)]
    series.append(_day("2026-01-08", negative_ratio=0.75))
    result = detect_scheme_b(series, classifier=None)
    assert result["alert"] is True
    assert result["raw_flag"] is True


def test_classifier_can_suppress_a_raw_flagged_case():
    # Real crises: strongly negative, rising, but only a MODERATE volume
    # bump (label 1). "Barely-over-the-gate" cases: negative share just
    # clears 60% and ticks up slightly, but volume has exploded far more
    # than the negative share did (label 0) — the pattern the classifier
    # should learn to tell apart from a genuine crisis.
    features = np.array([
        [0.75, 0.30, 1.1], [0.80, 0.25, 1.2], [0.70, 0.20, 1.0],  # real crises (label 1)
        [0.63, 0.04, 5.0], [0.65, 0.06, 5.5], [0.62, 0.03, 6.0],  # volume exploded, negative share barely moved (label 0)
    ])
    labels = np.array([1, 1, 1, 0, 0, 0])
    clf = FalseAlarmClassifier()
    clf.fit(features, labels)

    # Held-out case matching the label-0 pattern: negative share just over
    # 60% (so the raw rule still flags it) but mention volume spikes ~5x
    # baseline — the "ordinary attention spike" pattern, not a real crisis.
    series = [_day(f"2026-01-{i+1:02d}", negative_ratio=0.58, mention_volume=10) for i in range(7)]
    series.append(_day("2026-01-08", negative_ratio=0.64, mention_volume=50))
    result = detect_scheme_b(series, classifier=clf)
    assert result["raw_flag"] is True
    assert result["alert"] is False  # suppressed
    assert "suppressed" in result["reason"]


def test_predict_before_fit_raises():
    clf = FalseAlarmClassifier()
    try:
        clf.predict(np.array([0.1, 0.1, 1.0]))
        assert False, "expected RuntimeError"
    except RuntimeError:
        pass


def test_build_features_returns_none_without_enough_history():
    assert build_features([_day("2026-01-01")]) is None
