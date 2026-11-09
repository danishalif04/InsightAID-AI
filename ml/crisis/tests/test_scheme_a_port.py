"""Worked-example parity checks against crisisDetection.js's documented
behaviour (src/config/crisisThresholds.js's own comments), not just
"looks plausible"."""

from ml.crisis.src.scheme_a_port import detect_crisis


def _day(date, negative_ratio=0.15, mention_volume=10, avg_rating=4.2):
    return {"date": date, "negative_ratio": negative_ratio, "mention_volume": mention_volume, "avg_rating": avg_rating}


def test_empty_series_is_normal_and_data_insufficient():
    result = detect_crisis([])
    assert result.risk_level == "normal"
    assert result.risk_score == 0
    assert result.data_sufficient is False


def test_insufficient_history_marks_velocity_signals_insufficient_not_normal():
    # Only 1 day of history -> below MIN_BASELINE_POINTS (3) for velocity/anomaly signals.
    result = detect_crisis([_day("2026-01-01", negative_ratio=0.9)])
    velocity_signal = next(s for s in result.all_signals if s.id == "negative_ratio_velocity")
    assert velocity_signal.level == "insufficient_data"
    # But the LEVEL check (no baseline needed) should still fire on 90% negative.
    level_signal = next(s for s in result.all_signals if s.id == "negative_ratio_level")
    assert level_signal.level == "critical"


def test_matches_documented_threshold_critical_50_percent_negative_ratio():
    series = [_day(f"2026-01-0{i+1}", negative_ratio=0.15) for i in range(6)]
    series.append(_day("2026-01-07", negative_ratio=0.5))  # exactly at critical threshold
    result = detect_crisis(series)
    level_signal = next(s for s in result.all_signals if s.id == "negative_ratio_level")
    assert level_signal.level == "critical"


def test_risk_score_sums_severity_points_and_caps_at_100():
    # Construct a day that trips every signal at critical level to confirm the cap.
    series = [_day(f"2026-01-{i+1:02d}", negative_ratio=0.1, mention_volume=10, avg_rating=4.5) for i in range(7)]
    series.append(_day("2026-01-08", negative_ratio=0.9, mention_volume=100, avg_rating=1.0))
    result = detect_crisis(series)
    assert result.risk_score <= 100
    assert result.risk_level == "critical"  # >= 60 threshold


def test_risk_score_is_exactly_the_sum_of_triggered_signal_severity_points():
    from ml.crisis.src.scheme_a_port import SEVERITY_POINTS

    series = [_day(f"2026-01-{i+1:02d}") for i in range(6)]
    series.append(_day("2026-01-07", negative_ratio=0.55))
    result = detect_crisis(series)
    expected = sum(SEVERITY_POINTS[s.level] for s in result.triggered_signals)
    assert result.risk_score == expected
    assert expected > 0  # sanity: this scenario really does trigger something


def test_risk_level_normal_strictly_below_25():
    # No signal should ever cross into any severity at all here -> risk_score 0 -> normal.
    series = [_day(f"2026-01-{i+1:02d}") for i in range(8)]  # perfectly flat, nothing moves
    result = detect_crisis(series)
    assert result.risk_score == 0
    assert result.risk_level == "normal"


def test_risk_level_critical_at_or_above_60():
    series = [_day(f"2026-01-{i+1:02d}", negative_ratio=0.1, mention_volume=10, avg_rating=4.5) for i in range(7)]
    series.append(_day("2026-01-08", negative_ratio=0.9, mention_volume=100, avg_rating=1.0))
    result = detect_crisis(series)
    assert result.risk_score >= 60
    assert result.risk_level == "critical"


def test_mention_volume_spike_alone_can_trigger_without_any_sentiment_change():
    # A purely positive viral spike: negative_ratio stays low, volume spikes 3x baseline.
    series = [_day(f"2026-01-{i+1:02d}", negative_ratio=0.1, mention_volume=10) for i in range(7)]
    series.append(_day("2026-01-08", negative_ratio=0.1, mention_volume=30))
    result = detect_crisis(series)
    volume_signal = next(s for s in result.all_signals if s.id == "mention_volume_level")
    assert volume_signal.level in ("warning", "critical")
    assert result.risk_level != "normal"  # confirms Scheme A's real, structural false-alarm exposure
