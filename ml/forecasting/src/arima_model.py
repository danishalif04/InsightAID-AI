"""
ARIMA baseline (FYP2.md §51's baseline model, alongside moving-average).

Uses statsmodels directly with a small (p, d, q) grid selected by AIC,
rather than depending on pmdarima (which has had recurring compatibility
issues with newer numpy/statsmodels releases) — this keeps the dependency
surface reproducible for Colab.
"""

from __future__ import annotations

import itertools
import warnings
from dataclasses import dataclass
from typing import Sequence

from statsmodels.tsa.arima.model import ARIMA

DEFAULT_P_RANGE = range(0, 3)
DEFAULT_D_RANGE = range(0, 2)
DEFAULT_Q_RANGE = range(0, 3)


@dataclass
class FittedArima:
    order: tuple[int, int, int]
    aic: float
    result: object  # statsmodels ARIMAResultsWrapper


def fit_arima_auto(
    history: Sequence[float],
    p_range: range = DEFAULT_P_RANGE,
    d_range: range = DEFAULT_D_RANGE,
    q_range: range = DEFAULT_Q_RANGE,
) -> FittedArima:
    """Grid-searches (p, d, q) over the given ranges, picks the lowest-AIC
    fit. Orders that fail to converge (common for some (p, d, q) on short/
    flat series) are skipped rather than raising."""
    best: FittedArima | None = None

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for p, d, q in itertools.product(p_range, d_range, q_range):
            if p == 0 and q == 0 and d == 0:
                continue  # a (0,0,0) model is not a meaningful ARIMA fit
            try:
                fit = ARIMA(list(history), order=(p, d, q)).fit()
            except Exception:
                continue
            if best is None or fit.aic < best.aic:
                best = FittedArima(order=(p, d, q), aic=float(fit.aic), result=fit)

    if best is None:
        raise RuntimeError(
            "ARIMA grid search failed to converge for any (p, d, q) in the given ranges "
            f"(p in {list(p_range)}, d in {list(d_range)}, q in {list(q_range)})"
        )
    return best


def arima_forecast(history: Sequence[float], horizon: int, **grid_kwargs) -> tuple[list[float], tuple[int, int, int]]:
    fitted = fit_arima_auto(history, **grid_kwargs)
    forecast = fitted.result.forecast(steps=horizon)
    return list(forecast), fitted.order
