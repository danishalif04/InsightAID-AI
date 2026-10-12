"""
Rating-derived weak sentiment label (FYP2.md §37).

This is a direct Python port of src/utils/ratingSentimentHeuristic.js — the
project's one documented rating->sentiment methodology. It must stay in sync
with that file: "4-5 stars -> potential Positive, 3 -> potential Neutral,
1-2 -> potential Negative. Rating does not automatically equal sentiment."

This is a weak-label heuristic, not a trained model. Every label it produces
is stored/tagged with RATING_HEURISTIC_MODEL_NAME so it is never confused
with real model output (from XLM-R/mBERT/the TF-IDF baseline) once those
exist. Used here only to derive TRAINING labels for rows that have a star
rating but no manual annotation — see data/schema.md for how this combines
with the optional manually-labelled validation subset.

Mirrors the JS branch order exactly, including its edge case: a rating of
exactly 3 is neutral, and anything that is neither >=4 nor ==3 falls to
negative (so e.g. 3.5 -> negative, same as the JS implementation). This is
intentional parity with production code, not a new design choice.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Union

RATING_HEURISTIC_MODEL_NAME = "rating_heuristic_v1"

Rating = Union[int, float, str, None]


@dataclass(frozen=True)
class WeakLabel:
    sentiment: str  # 'positive' | 'neutral' | 'negative'
    score: float  # rating normalized to [-1, 1]: 1*->-1, 3*->0, 5*->1
    confidence: float


def classify_by_rating(rating: Rating) -> Optional[WeakLabel]:
    """Returns None when rating is missing, non-numeric, or outside [1, 5]."""
    try:
        value = float(rating)
    except (TypeError, ValueError):
        return None

    if value != value or value < 1 or value > 5:  # NaN check via value != value
        return None

    score = round(((value - 3) / 2) * 100) / 100

    if value >= 4:
        return WeakLabel(sentiment="positive", score=score, confidence=0.6)
    if value == 3:
        return WeakLabel(sentiment="neutral", score=score, confidence=0.5)
    return WeakLabel(sentiment="negative", score=score, confidence=0.6)
