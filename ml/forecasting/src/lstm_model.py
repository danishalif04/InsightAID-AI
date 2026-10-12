"""
LSTM forecasting model — conditional on data volume, per the user's own
instruction: "LSTM only if data volume justifies it — tell me."

`should_train_lstm()` is the answer: a documented, empirically-checkable
gate rather than a one-off judgment call made without real data in front of
it. Reasoning: an LSTM has orders of magnitude more parameters than
Prophet/ARIMA/XGBoost for this problem size, and a single business's daily
sales series is one series, not a panel of many - there's no cross-series
signal to help it generalize. Published forecasting benchmarks (e.g. the
M4 competition) consistently show classical/GBM methods matching or beating
LSTM-style models on short, single, non-massive daily series; LSTM tends to
need on the order of hundreds-to-thousands of time steps before it has any
realistic chance of learning a useful temporal pattern instead of just
memorizing noise. This project sets that floor at 730 daily observations
(~2 years) as a conservative, documented threshold - below it, training an
LSTM would almost certainly overfit and produce a worse, less interpretable
model than the alternatives already in this package, for no benefit.

Nothing in this project has 730 days of real sales history yet (nothing has
any real data yet - see ../README.md), so as of this phase the gate has
never returned True against real data. It is fully wired and tested against
synthetic series so it's not vaporware: run it against a real export and it
will give a real answer.

The actual Keras/TensorFlow model is only imported inside
`build_and_train_lstm`, which is only ever called after the gate passes -
so nothing here requires tensorflow to be installed unless you actually
have enough data to train one.
"""

from __future__ import annotations

MIN_OBSERVATIONS_FOR_LSTM = 730  # ~2 years of daily data


def should_train_lstm(
    n_observations: int, min_observations: int = MIN_OBSERVATIONS_FOR_LSTM
) -> tuple[bool, str]:
    if n_observations >= min_observations:
        return True, (
            f"{n_observations} daily observations meets the {min_observations}-day "
            "threshold — training LSTM alongside the other models."
        )
    return False, (
        f"Only {n_observations} daily observations available (threshold: "
        f"{min_observations}, ~2 years of daily data). LSTM is skipped for this run — "
        "see this module's docstring for why the threshold is set where it is. "
        "Moving-average, ARIMA, Prophet, and XGBoost still run and are compared "
        "normally."
    )


def build_and_train_lstm(
    train_series,
    lookback: int = 30,
    epochs: int = 50,
    batch_size: int = 16,
):
    """Builds and trains a small single-layer LSTM on a windowed univariate
    series. Only call this after `should_train_lstm()` returns True — it
    does not check the gate itself, so it can also be unit-exercised
    directly against a synthetic series without needing 730 real days."""
    import numpy as np
    from tensorflow import keras  # deferred: heavy, optional dependency

    values = np.asarray(train_series, dtype="float32")
    if len(values) <= lookback:
        raise ValueError(f"train_series must have more than {lookback} points")

    mean, std = values.mean(), values.std() or 1.0
    normalized = (values - mean) / std

    X, y = [], []
    for i in range(len(normalized) - lookback):
        X.append(normalized[i : i + lookback])
        y.append(normalized[i + lookback])
    X = np.array(X).reshape(-1, lookback, 1)
    y = np.array(y)

    model = keras.Sequential(
        [
            keras.layers.Input(shape=(lookback, 1)),
            keras.layers.LSTM(32),
            keras.layers.Dense(1),
        ]
    )
    model.compile(optimizer="adam", loss="mse")
    model.fit(X, y, epochs=epochs, batch_size=batch_size, verbose=0)

    return model, {"mean": float(mean), "std": float(std), "lookback": lookback}


def lstm_forecast(model, normalization: dict, history, horizon: int) -> list[float]:
    import numpy as np

    lookback = normalization["lookback"]
    mean, std = normalization["mean"], normalization["std"]
    window = list((np.asarray(history[-lookback:], dtype="float32") - mean) / std)

    predictions = []
    for _ in range(horizon):
        x = np.array(window[-lookback:]).reshape(1, lookback, 1)
        next_normalized = float(model.predict(x, verbose=0)[0, 0])
        predictions.append(next_normalized * std + mean)
        window.append(next_normalized)

    return predictions
