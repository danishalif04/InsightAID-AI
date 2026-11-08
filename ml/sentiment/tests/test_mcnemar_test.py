from src.mcnemar_test import mcnemar_from_contingency, mcnemar_from_predictions


def test_identical_models_show_no_significant_difference():
    # Every discordant cell is zero - models always agree.
    result = mcnemar_from_contingency(both_correct=90, a_correct_b_wrong=0, a_wrong_b_correct=0, both_wrong=10)
    assert result.significant_at_05 is False


def test_a_lopsided_disagreement_is_significant():
    # A wins 80 disagreements, B wins only 5 - a real, large asymmetry.
    result = mcnemar_from_contingency(both_correct=200, a_correct_b_wrong=80, a_wrong_b_correct=5, both_wrong=50)
    assert result.significant_at_05 is True
    assert result.p_value < 0.05


def test_a_balanced_disagreement_is_not_significant():
    # Similar counts on both sides of the disagreement - no real asymmetry.
    result = mcnemar_from_contingency(both_correct=200, a_correct_b_wrong=42, a_wrong_b_correct=40, both_wrong=50)
    assert result.significant_at_05 is False


def test_from_predictions_matches_manual_contingency_counting():
    y_true = ["pos", "pos", "neg", "neg", "pos"]
    pred_a = ["pos", "neg", "neg", "pos", "pos"]  # correct vs y_true: T,F,T,F,T
    pred_b = ["pos", "pos", "pos", "neg", "neg"]  # correct vs y_true: T,T,F,T,F
    result = mcnemar_from_predictions(y_true, pred_a, pred_b)
    # row0: both correct. row1: A wrong, B correct. row2: A correct, B wrong.
    # row3: A wrong, B correct. row4: A correct, B wrong.
    assert result.contingency_table == [[1, 2], [2, 0]]


def test_mismatched_lengths_raise():
    import pytest

    with pytest.raises(ValueError):
        mcnemar_from_predictions(["pos"], ["pos", "neg"], ["pos"])
