from src.lstm_model import MIN_OBSERVATIONS_FOR_LSTM, should_train_lstm


def test_gate_rejects_short_series():
    ok, reason = should_train_lstm(90)
    assert ok is False
    assert "90" in reason
    assert str(MIN_OBSERVATIONS_FOR_LSTM) in reason


def test_gate_accepts_series_at_threshold():
    ok, reason = should_train_lstm(MIN_OBSERVATIONS_FOR_LSTM)
    assert ok is True
    assert str(MIN_OBSERVATIONS_FOR_LSTM) in reason


def test_gate_accepts_series_above_threshold():
    ok, _reason = should_train_lstm(2000)
    assert ok is True


def test_gate_is_configurable():
    ok, _reason = should_train_lstm(100, min_observations=90)
    assert ok is True
