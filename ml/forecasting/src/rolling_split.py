"""
Time-aware rolling-origin evaluation (FYP2.md §51): "Use time-aware
evaluation. Do not randomly split time-series data. Where appropriate use
rolling evaluation."

Every model in this package (moving-average baseline, ARIMA, both Prophet
variants, XGBoost, and LSTM when it runs) is evaluated against the SAME set
of folds produced by `rolling_origin_splits`, so MAE/RMSE/MAPE are always
compared "on identical periods" (the user's own requirement) rather than
each model picking its own convenient window.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Fold:
    train_index: range
    test_index: range


def rolling_origin_splits(
    n_observations: int,
    initial_train_size: int,
    horizon: int,
    step: int | None = None,
    max_folds: int | None = None,
) -> list[Fold]:
    """Walk-forward folds: fold 0 trains on [0, initial_train_size) and
    tests on the next `horizon` points; fold 1's training window grows by
    `step` (default: `horizon`, i.e. non-overlapping test windows) and so
    on, until there isn't a full horizon of test data left. Never shuffles,
    never samples backward in time - the training window for any fold only
    ever contains observations strictly before that fold's test window.
    """
    if initial_train_size <= 0:
        raise ValueError("initial_train_size must be positive")
    if horizon <= 0:
        raise ValueError("horizon must be positive")
    step = horizon if step is None else step
    if step <= 0:
        raise ValueError("step must be positive")

    folds: list[Fold] = []
    train_end = initial_train_size
    while train_end + horizon <= n_observations:
        folds.append(Fold(train_index=range(0, train_end), test_index=range(train_end, train_end + horizon)))
        train_end += step
        if max_folds is not None and len(folds) >= max_folds:
            break

    if not folds:
        raise ValueError(
            f"no valid rolling-origin folds: n_observations={n_observations}, "
            f"initial_train_size={initial_train_size}, horizon={horizon} "
            "(need at least one full training window + horizon)"
        )

    return folds
