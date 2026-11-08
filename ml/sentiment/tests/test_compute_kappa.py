import csv
from pathlib import Path

import pytest

from src.compute_kappa import compute_kappa, compute_kappa_from_csv, interpret_kappa


def test_perfect_agreement_gives_kappa_of_one():
    labels = ["positive", "negative", "neutral", "positive"]
    result = compute_kappa(labels, labels)
    assert result.kappa == 1.0
    assert result.interpretation == "almost perfect"
    assert result.agreement_rate == 1.0


def test_landis_koch_bands():
    assert interpret_kappa(-0.1) == "poor (worse than chance agreement)"
    assert interpret_kappa(0.1) == "slight"
    assert interpret_kappa(0.35) == "fair"
    assert interpret_kappa(0.55) == "moderate"
    assert interpret_kappa(0.75) == "substantial"
    assert interpret_kappa(0.9) == "almost perfect"


def test_mismatched_lengths_raise():
    with pytest.raises(ValueError):
        compute_kappa(["positive"], ["positive", "negative"])


def test_empty_input_raises():
    with pytest.raises(ValueError):
        compute_kappa([], [])


def test_from_csv_skips_rows_where_second_annotator_left_it_blank(tmp_path):
    csv_path = tmp_path / "sample.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "language", "raw_text", "cleaned_text", "annotator_1_label", "annotator_2_label"])
        writer.writeheader()
        writer.writerow({"id": "1", "language": "en", "raw_text": "x", "cleaned_text": "x", "annotator_1_label": "positive", "annotator_2_label": "positive"})
        writer.writerow({"id": "2", "language": "en", "raw_text": "y", "cleaned_text": "y", "annotator_1_label": "negative", "annotator_2_label": ""})  # not yet annotated
        writer.writerow({"id": "3", "language": "ms", "raw_text": "z", "cleaned_text": "z", "annotator_1_label": "neutral", "annotator_2_label": "negative"})

    result = compute_kappa_from_csv(csv_path)
    assert result.n_pairs == 2  # row 2 excluded, blank annotator_2_label


def test_from_csv_raises_a_clear_error_when_nothing_is_annotated_yet(tmp_path):
    csv_path = tmp_path / "unannotated.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "language", "raw_text", "cleaned_text", "annotator_1_label", "annotator_2_label"])
        writer.writeheader()
        writer.writerow({"id": "1", "language": "en", "raw_text": "x", "cleaned_text": "x", "annotator_1_label": "positive", "annotator_2_label": ""})

    with pytest.raises(ValueError, match="still blank"):
        compute_kappa_from_csv(csv_path)
