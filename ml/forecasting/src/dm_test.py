"""
Diebold-Mariano test (Diebold & Mariano, 1995) — FYP II Phase 4 / O2's
stated acceptance target: "a statistically tested improvement over the
sales-only version," not just a numerically lower MAPE. Tests whether two
forecasts' squared-error loss differs significantly on the SAME held-out
points, using the Harvey, Leybourne & Newbold (1997) small-sample
correction (the evaluation sets here are tens of points, not thousands,
so the correction matters).

Scientific honesty rule (CLAUDE.md): this module reports whatever p-value
comes out. A result that does NOT show a significant improvement is a
real, reportable finding, not a failure to hide.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

from scipy import stats


@dataclass
class DMTestResult:
    dm_statistic: float
    p_value: float
    mean_loss_diff: float  # mean(squared_error(model_1) - squared_error(model_2))
    n: int
    h: int
    significant_at_05: bool

    def interpretation(self, model_1_name: str = "model 1", model_2_name: str = "model 2") -> str:
        if not self.significant_at_05:
            return (
                f"No statistically significant difference between {model_1_name} and {model_2_name} "
                f"(DM={self.dm_statistic}, p={self.p_value}, n={self.n}) — cannot claim one beats the other."
            )
        better = model_2_name if self.mean_loss_diff > 0 else model_1_name
        worse = model_1_name if self.mean_loss_diff > 0 else model_2_name
        return (
            f"{better} has significantly lower squared-error loss than {worse} "
            f"(DM={self.dm_statistic}, p={self.p_value}, n={self.n})."
        )


def _squared_errors(y_true: Sequence[float], y_pred: Sequence[float]) -> list[float]:
    return [(t - p) ** 2 for t, p in zip(y_true, y_pred)]


def _autocovariance(d: list[float], mean_d: float, lag: int) -> float:
    n = len(d)
    return sum((d[t] - mean_d) * (d[t - lag] - mean_d) for t in range(lag, n)) / n


def diebold_mariano_test(
    y_true: Sequence[float],
    y_pred_1: Sequence[float],
    y_pred_2: Sequence[float],
    h: int = 1,
    alpha: float = 0.05,
) -> DMTestResult:
    """H0: model_1 and model_2 have equal predictive accuracy (squared-error
    loss). Two-sided alternative. `h` = forecast horizon (steps ahead) —
    sets how many autocorrelation lags (h-1) of the loss differential are
    added into the long-run variance estimate, since an h-step forecast's
    errors are commonly autocorrelated up to lag h-1 even under the null.
    `mean_loss_diff` > 0 means model_1 has the HIGHER average loss (model_2
    is better); < 0 means model_1 is better.
    """
    if len(y_true) != len(y_pred_1) or len(y_true) != len(y_pred_2):
        raise ValueError("y_true, y_pred_1, y_pred_2 must be the same length")
    n = len(y_true)
    if n < 2:
        raise ValueError("need at least 2 points to run the DM test")

    loss_1 = _squared_errors(y_true, y_pred_1)
    loss_2 = _squared_errors(y_true, y_pred_2)
    d = [l1 - l2 for l1, l2 in zip(loss_1, loss_2)]
    mean_d = sum(d) / n

    long_run_var = _autocovariance(d, mean_d, 0)
    for lag in range(1, min(h - 1, n - 1) + 1):
        long_run_var += 2 * _autocovariance(d, mean_d, lag)

    if long_run_var <= 0:
        # Degenerate case (e.g. identical forecasts -> d is all zero): no
        # evidence of any difference. Report that plainly rather than
        # dividing by zero or inventing a statistic.
        return DMTestResult(
            dm_statistic=0.0, p_value=1.0, mean_loss_diff=round(mean_d, 6), n=n, h=h, significant_at_05=False
        )

    dm_stat = mean_d / math.sqrt(long_run_var / n)

    # Harvey, Leybourne & Newbold (1997) small-sample correction.
    correction = math.sqrt(max(0.0, (n + 1 - 2 * h + h * (h - 1) / n)) / n)
    dm_stat_corrected = dm_stat * correction

    df = n - 1
    p_value = float(2 * (1 - stats.t.cdf(abs(dm_stat_corrected), df=df)))

    return DMTestResult(
        dm_statistic=round(float(dm_stat_corrected), 6),
        p_value=round(p_value, 6),
        mean_loss_diff=round(mean_d, 6),
        n=n,
        h=h,
        significant_at_05=bool(p_value < alpha),
    )
