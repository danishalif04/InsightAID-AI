import math

import pytest

from src.dm_test import diebold_mariano_test


def test_identical_forecasts_give_zero_statistic_and_p_equals_one():
    y_true = [100, 110, 95, 120, 105, 98, 115, 102, 108, 97]
    y_pred = [101, 109, 96, 118, 106, 99, 114, 103, 107, 98]
    result = diebold_mariano_test(y_true, y_pred, y_pred, h=1)
    assert result.dm_statistic == 0.0
    assert result.p_value == 1.0
    assert result.significant_at_05 is False


def test_a_much_better_forecaster_is_detected_as_significant():
    # model_1 is very close to perfect (small varying noise); model_2 is
    # consistently, substantially wrong by a LARGE but slightly varying
    # margin. The loss differential must have some real variance across
    # points (a perfectly constant differential is a genuine degenerate
    # case for the DM statistic's variance term - not this test's concern)
    # - realistic forecast errors always vary a little point to point.
    noise = [3, -2, 1, -1, 2, -3, 0, 1, -2, 3] * 3
    y_true = [100 + i for i in range(30)]
    y_pred_1 = [v + n * 0.2 for v, n in zip(y_true, noise)]  # tiny error
    y_pred_2 = [v + 50 + n for v, n in zip(y_true, noise)]  # off by ~50, varying
    result = diebold_mariano_test(y_true, y_pred_1, y_pred_2, h=1)
    assert result.mean_loss_diff < 0  # model_1 (near-perfect) has the lower loss
    assert result.significant_at_05 is True
    assert result.p_value < 0.05


def test_interpretation_reports_no_significant_difference_honestly():
    y_true = [100, 110, 95, 120, 105, 98, 115, 102, 108, 97]
    y_pred_1 = [101, 109, 96, 118, 106, 99, 114, 103, 107, 98]
    y_pred_2 = [99, 111, 94, 122, 104, 97, 116, 101, 109, 96]
    result = diebold_mariano_test(y_true, y_pred_1, y_pred_2, h=1)
    text = result.interpretation("Sales-only", "Sentiment-enhanced")
    if result.significant_at_05:
        assert "significantly lower" in text
    else:
        assert "No statistically significant difference" in text


def test_mismatched_lengths_raise():
    with pytest.raises(ValueError):
        diebold_mariano_test([1, 2, 3], [1, 2], [1, 2, 3])


def test_too_few_points_raise():
    with pytest.raises(ValueError):
        diebold_mariano_test([1], [1], [1])


def test_result_is_antisymmetric_when_models_are_swapped():
    y_true = [100, 95, 110, 102, 98, 107, 103, 99, 105, 101]
    y_pred_1 = [105, 90, 115, 97, 103, 112, 98, 104, 100, 106]
    y_pred_2 = [99, 96, 109, 101, 99, 106, 104, 100, 106, 102]
    forward = diebold_mariano_test(y_true, y_pred_1, y_pred_2, h=1)
    backward = diebold_mariano_test(y_true, y_pred_2, y_pred_1, h=1)
    assert math.isclose(forward.dm_statistic, -backward.dm_statistic, abs_tol=1e-9)
    assert math.isclose(forward.p_value, backward.p_value, abs_tol=1e-9)
