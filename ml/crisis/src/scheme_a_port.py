"""
Scheme A — a pure-Python PORT of the real, production crisis detector for
evaluation purposes only (src/utils/crisisDetection.js +
src/config/crisisThresholds.js). This file does NOT replace the JS
implementation; the live app keeps using the JS version. This port exists
solely so Phase 5's ablation (scheme_a vs scheme_b) can run both schemes
inside the same Python evaluation harness against the same injected data.

Every threshold and formula below is copied verbatim from the JS source
(same baseline window, same severity points, same risk-level cutoffs) —
see test_scheme_a_port.py for worked-example cases confirming parity with
the JS logic's documented behaviour, not just "looks similar".
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

BASELINE_WINDOW_DAYS = 7
MIN_BASELINE_POINTS = 3
ZERO_VARIANCE_EPSILON = 1e-9

THRESHOLDS = {
    "negative_ratio_level": {"warning": 0.3, "critical": 0.5},
    "negative_ratio_velocity": {"warning": 0.1, "critical": 0.2},
    "mention_volume_level": {"warning": 1.5, "critical": 2.5},
    "mention_volume_velocity": {"warning": 0.5, "critical": 1.0},
    "rating_deterioration": {"warning": 0.3, "critical": 0.6},
    "sentiment_anomaly": {"warning": 1.5, "critical": 2.5},
    "review_volume_anomaly": {"warning": 1.5, "critical": 2.5},
}
SEVERITY_POINTS = {"warning": 10, "critical": 20}
RISK_LEVEL_THRESHOLDS = {"warning": 25, "critical": 60}


@dataclass
class Signal:
    id: str
    level: str  # 'normal' | 'warning' | 'critical' | 'insufficient_data'
    value: float | None = None


@dataclass
class CrisisResult:
    risk_level: str
    risk_score: int
    data_sufficient: bool
    triggered_signals: list[Signal] = field(default_factory=list)
    all_signals: list[Signal] = field(default_factory=list)


def _baseline(series: list[dict], field_name: str, exclude_last: bool):
    points = series[:-1] if exclude_last else series
    points = points[-BASELINE_WINDOW_DAYS:]
    values = [p[field_name] for p in points if p.get(field_name) is not None]
    if len(values) < MIN_BASELINE_POINTS:
        return None, None, len(values)
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return mean, math.sqrt(variance), len(values)


def _level_for(value: float, thresholds: dict) -> str:
    if value >= thresholds["critical"]:
        return "critical"
    if value >= thresholds["warning"]:
        return "warning"
    return "normal"


def detect_crisis(daily_series: list[dict]) -> CrisisResult:
    """`daily_series`: list of {date, negative_ratio, mention_volume, avg_rating},
    ascending by date, any field may be None for a given day. Mirrors
    crisisDetection.js's detectCrisis() exactly."""
    series = sorted(daily_series, key=lambda d: d["date"])
    if not series:
        return CrisisResult(risk_level="normal", risk_score=0, data_sufficient=False)

    latest = series[-1]
    signals: list[Signal] = []

    # 1. negative_ratio_level
    if latest.get("negative_ratio") is None:
        signals.append(Signal("negative_ratio_level", "insufficient_data"))
    else:
        signals.append(Signal("negative_ratio_level", _level_for(latest["negative_ratio"], THRESHOLDS["negative_ratio_level"]), latest["negative_ratio"]))

    # 2. negative_ratio_velocity
    mean, _, n = _baseline(series, "negative_ratio", exclude_last=True)
    if latest.get("negative_ratio") is None or mean is None:
        signals.append(Signal("negative_ratio_velocity", "insufficient_data"))
    else:
        delta = latest["negative_ratio"] - mean
        level = "normal" if delta <= 0 else _level_for(delta, THRESHOLDS["negative_ratio_velocity"])
        signals.append(Signal("negative_ratio_velocity", level, delta))

    # 3. mention_volume_level
    mean, _, n = _baseline(series, "mention_volume", exclude_last=True)
    if latest.get("mention_volume") is None or mean is None or mean <= 0:
        signals.append(Signal("mention_volume_level", "insufficient_data"))
    else:
        ratio = latest["mention_volume"] / mean
        signals.append(Signal("mention_volume_level", _level_for(ratio, THRESHOLDS["mention_volume_level"]), ratio))

    # 4. mention_volume_velocity
    previous = series[-2] if len(series) >= 2 else None
    if latest.get("mention_volume") is None or not previous or previous.get("mention_volume") is None or previous["mention_volume"] <= 0:
        signals.append(Signal("mention_volume_velocity", "insufficient_data"))
    else:
        change = (latest["mention_volume"] - previous["mention_volume"]) / previous["mention_volume"]
        level = "normal" if change <= 0 else _level_for(change, THRESHOLDS["mention_volume_velocity"])
        signals.append(Signal("mention_volume_velocity", level, change))

    # 5. rating_deterioration
    mean, _, n = _baseline(series, "avg_rating", exclude_last=True)
    if latest.get("avg_rating") is None or mean is None:
        signals.append(Signal("rating_deterioration", "insufficient_data"))
    else:
        drop = mean - latest["avg_rating"]
        level = "normal" if drop <= 0 else _level_for(drop, THRESHOLDS["rating_deterioration"])
        signals.append(Signal("rating_deterioration", level, drop))

    # 6 & 7. z-score anomalies
    for sig_id, field_name, thresholds_key in [
        ("sentiment_anomaly", "negative_ratio", "sentiment_anomaly"),
        ("review_volume_anomaly", "mention_volume", "review_volume_anomaly"),
    ]:
        mean, std, n = _baseline(series, field_name, exclude_last=True)
        if latest.get(field_name) is None or mean is None or std is None or std < ZERO_VARIANCE_EPSILON:
            signals.append(Signal(sig_id, "insufficient_data"))
        else:
            z = (latest[field_name] - mean) / std
            signals.append(Signal(sig_id, _level_for(abs(z), THRESHOLDS[thresholds_key]), z))

    computed = [s for s in signals if s.level != "insufficient_data"]
    triggered = [s for s in computed if s.level != "normal"]
    risk_score = min(100, sum(SEVERITY_POINTS[s.level] for s in triggered))

    risk_level = "normal"
    if risk_score >= RISK_LEVEL_THRESHOLDS["critical"]:
        risk_level = "critical"
    elif risk_score >= RISK_LEVEL_THRESHOLDS["warning"]:
        risk_level = "warning"

    return CrisisResult(
        risk_level=risk_level,
        risk_score=risk_score,
        data_sufficient=len(computed) > 0,
        triggered_signals=triggered,
        all_signals=signals,
    )
