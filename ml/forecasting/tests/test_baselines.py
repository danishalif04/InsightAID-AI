from src.baselines import moving_average_forecast


def test_forecasts_flat_line_at_the_window_mean():
    history = [10, 20, 30, 40, 50, 60, 70]  # last 7 -> mean 40
    forecast = moving_average_forecast(history, horizon=3, window=7)
    assert forecast == [40.0, 40.0, 40.0]


def test_uses_full_history_when_shorter_than_window():
    history = [10, 20]
    forecast = moving_average_forecast(history, horizon=2, window=7)
    assert forecast == [15.0, 15.0]


def test_only_uses_the_trailing_window():
    history = [1000, 1000, 10, 20, 30]  # window=3 -> ignores the two 1000s
    forecast = moving_average_forecast(history, horizon=1, window=3)
    assert forecast == [20.0]


def test_empty_history_raises():
    try:
        moving_average_forecast([], horizon=3)
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_non_positive_horizon_raises():
    try:
        moving_average_forecast([1, 2, 3], horizon=0)
        assert False, "expected ValueError"
    except ValueError:
        pass
