"""
Scheme B — the crisis-detection design as literally specified in the FYP II
master prompt's Part A3: "rule = share of negative comments > threshold
(provisionally 60%) in a time window PLUS the rate of increase of that
share (not average sentiment, because positive and negative comments
co-occur during real crises), then a secondary Scikit-learn classifier to
suppress false alarms from ordinary volume spikes."

This is a NEW, independent implementation — not a port of Scheme A — built
specifically to compare against it in evaluate_ablation.py.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.linear_model import LogisticRegression

NEGATIVE_SHARE_THRESHOLD = 0.6  # "provisionally 60%" per Part A3
VELOCITY_WINDOW_DAYS = 7  # rate-of-increase comparison window, same convention as Scheme A


@dataclass
class SchemeBSignal:
    negative_share: float
    negative_share_baseline: float | None
    velocity: float | None  # negative_share - baseline, None if not enough history
    raw_flag: bool  # before the secondary classifier
    raw_reason: str


def evaluate_raw_rule(daily_series: list[dict]) -> SchemeBSignal:
    """The two-part rule only (no classifier yet): today's negative_share is
    over NEGATIVE_SHARE_THRESHOLD, AND it's rising vs. the prior baseline.
    `daily_series`: [{date, negative_ratio, mention_volume, avg_rating}],
    ascending, same shape as Scheme A's input (negative_ratio IS the
    negative share here — same underlying quantity, different rule)."""
    series = sorted(daily_series, key=lambda d: d["date"])
    latest = series[-1]
    negative_share = latest.get("negative_ratio")
    if negative_share is None:
        return SchemeBSignal(0.0, None, None, False, "No negative-ratio data for today.")

    prior = series[:-1][-VELOCITY_WINDOW_DAYS:]
    prior_values = [p["negative_ratio"] for p in prior if p.get("negative_ratio") is not None]
    baseline = sum(prior_values) / len(prior_values) if prior_values else None
    velocity = (negative_share - baseline) if baseline is not None else None

    level_ok = negative_share > NEGATIVE_SHARE_THRESHOLD
    rising_ok = velocity is not None and velocity > 0
    raw_flag = level_ok and rising_ok

    if raw_flag:
        reason = f"Negative share {negative_share:.1%} exceeds {NEGATIVE_SHARE_THRESHOLD:.0%} AND is rising (+{velocity:.1%} vs {VELOCITY_WINDOW_DAYS}-day baseline)."
    elif not level_ok:
        reason = f"Negative share {negative_share:.1%} does not exceed {NEGATIVE_SHARE_THRESHOLD:.0%}."
    else:
        reason = "Negative share is high but not rising versus its baseline."

    return SchemeBSignal(negative_share, baseline, velocity, raw_flag, reason)


def build_features(daily_series: list[dict]) -> np.ndarray | None:
    """Features the secondary classifier uses to tell a real crisis apart
    from an ordinary volume spike: the raw rule's own two numbers, plus
    mention-volume-vs-baseline ratio (a spike-only day has a high volume
    ratio but did NOT pass the raw rule's negative-share gate in the
    labelled training data this is fit on — see FalseAlarmClassifier).
    Returns None when there isn't enough series to compute mention-volume
    baseline (mirrors the raw rule's own 'insufficient data' honesty)."""
    series = sorted(daily_series, key=lambda d: d["date"])
    latest = series[-1]
    signal = evaluate_raw_rule(daily_series)

    prior = series[:-1][-VELOCITY_WINDOW_DAYS:]
    volumes = [p["mention_volume"] for p in prior if p.get("mention_volume") is not None]
    volume_baseline = sum(volumes) / len(volumes) if volumes else None
    if volume_baseline is None or volume_baseline <= 0 or latest.get("mention_volume") is None:
        return None
    volume_ratio = latest["mention_volume"] / volume_baseline

    return np.array([
        signal.negative_share,
        signal.velocity if signal.velocity is not None else 0.0,
        volume_ratio,
    ])


class FalseAlarmClassifier:
    """A simple, defensible logistic regression — not an unnecessarily
    complex model, per the master prompt's own instruction — trained to
    suppress Scheme B raw-rule false positives caused by an ordinary
    volume spike with no real negative-sentiment crisis. Fit on labelled
    (features, is_real_crisis) pairs from the crisis injector's own
    synthetic scenarios (true crises + spike-only negative controls) —
    never on live user data, and never claimed accurate beyond what it
    was actually evaluated on in evaluate_ablation.py."""

    def __init__(self):
        self.model = LogisticRegression(max_iter=1000)
        self.fitted = False

    def fit(self, features: np.ndarray, labels: np.ndarray) -> None:
        self.model.fit(features, labels)
        self.fitted = True

    def predict(self, features: np.ndarray) -> bool:
        if not self.fitted:
            raise RuntimeError("FalseAlarmClassifier.predict() called before fit().")
        return bool(self.model.predict(features.reshape(1, -1))[0])


def detect_scheme_b(daily_series: list[dict], classifier: FalseAlarmClassifier | None = None) -> dict:
    """Full Scheme B: raw two-part rule, then (if a fitted classifier is
    given) the secondary classifier gets the final say on whether to
    actually alert. Passing classifier=None evaluates the raw rule alone
    (the 'before' half of the master prompt's before/after comparison)."""
    signal = evaluate_raw_rule(daily_series)
    if not signal.raw_flag:
        return {"alert": False, "raw_flag": False, "reason": signal.raw_reason}

    if classifier is None:
        return {"alert": True, "raw_flag": True, "reason": signal.raw_reason}

    features = build_features(daily_series)
    if features is None:
        # Not enough data to run the classifier -> fall back to the raw
        # rule's own verdict rather than silently suppressing it.
        return {"alert": True, "raw_flag": True, "reason": signal.raw_reason + " (classifier: insufficient data, raw rule stands)"}

    suppressed = not classifier.predict(features)
    return {
        "alert": not suppressed,
        "raw_flag": True,
        "reason": signal.raw_reason + (" (suppressed by false-alarm classifier)" if suppressed else " (confirmed by false-alarm classifier)"),
    }
