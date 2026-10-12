"""
Simple moving-average baseline (FYP2.md §51's "Baseline" side of the
Baseline-vs-Sentiment-Enhanced comparison, and the user's own request for a
"simple moving average" baseline alongside ARIMA).
"""

from __future__ import annotations

from typing import Sequence


def moving_average_forecast(history: Sequence[float], horizon: int, window: int = 7) -> list[float]:
    """Forecasts every point in the horizon as the mean of the last `window`
    observed values - the simplest possible baseline, and the floor every
    other model in this package needs to beat to justify its complexity."""
    if horizon <= 0:
        raise ValueError("horizon must be positive")
    if len(history) == 0:
        raise ValueError("history must not be empty")

    effective_window = history[-window:] if len(history) >= window else history
    average = sum(effective_window) / len(effective_window)
    return [average] * horizon
